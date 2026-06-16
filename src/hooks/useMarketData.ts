import { useEffect, useState, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PriceLevel,
  OrderBook,
  Candlestick,
  AssetData,
  DualMarketData,
  ReturnsData,
  EntropyData,
  MarkovState,
  MarkovTransitionMatrix,
  MarketData
} from '@/types/market';

// Define the Supabase client type
type SupabaseRealtimeChannel = {
  // Supabase real-time channel subscription
};

/**
 * Custom hook for handling real-time market data and computing analytics
 * @returns MarketData object with real-time data and pre-calculated analytics
 */
export function useMarketData(): MarketData {
  // Environment variables for Supabase connection
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // State for market data
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase URL and Anon Key must be provided in environment variables');
      setLoading(false);
      return;
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // We'll subscribe to real-time changes for both assets
    // Assuming we have tables: order_book, candlesticks, trades
    // And each record has a 'symbol' field to distinguish Asset A and Asset B

    // Define asset symbols (these could be configurable or fetched)
    const assetASymbol = 'ASSET_A'; // Placeholder - should be configured
    const assetBSymbol = 'ASSET_B'; // Placeholder - should be configured

    // We'll maintain separate state for each asset's raw data
    const [assetAData, setAssetAData] = useState<{
      orderBook: OrderBook | null;
      recentCandles: Candlestick[];
      latestPrice: number;
    } | null>(null);
    const [assetBData, setAssetBData] = useState<{
      orderBook: OrderBook | null;
      recentCandles: Candlestick[];
      latestPrice: number;
    } | null>(null);

    // Price history for returns calculation (we'll keep closing prices)
    const [priceHistoryA, setPriceHistoryA] = useState<number[]>([]);
    const [priceHistoryB, setPriceHistoryB] = useState<number[]>([]);

    // Set up subscriptions
    const orderBookSubscription = supabase
      .channel('order_book_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_book' },
        (payload) => {
          // Handle new order book snapshot
          const { symbol, bids, asks, timestamp } = payload.new as {
            symbol: string;
            bids: PriceLevel[];
            asks: PriceLevel[];
            timestamp: number;
          };

          const orderBook: OrderBook = { bids, asks, timestamp };

          if (symbol === assetASymbol) {
            setAssetAData(prev => prev ? {...prev, orderBook} : { orderBook, recentCandles: [], latestPrice: 0 });
          } else if (symbol === assetBSymbol) {
            setAssetBData(prev => prev ? {...prev, orderBook} : { orderBook, recentCandles: [], latestPrice: 0 });
          }
        }
      )
      .subscribe();

    const candlestickSubscription = supabase
      .channel('candlestick_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'candlesticks' },
        (payload) => {
          const { symbol, open, high, low, close, volume, timestamp } = payload.new as {
            symbol: string;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
            timestamp: number;
          };

          const candlestick: Candlestick = { open, high, low, close, volume, timestamp };

          // Update price history for returns calculation
          if (symbol === assetASymbol) {
            setPriceHistoryA(prev => {
              const newHistory = [...prev, close];
              // Keep only the last 200 prices for returns calculation
              return newHistory.slice(-200);
            });
            setAssetAData(prev => {
              if (!prev) return { orderBook: null, recentCandles: [candlestick], latestPrice: close };
              const updatedCandles = [...prev.recentCandles, candlestick].slice(-50); // Keep last 50 candles for charting
              return { ...prev, recentCandles: updatedCandles, latestPrice: close };
            });
          } else if (symbol === assetBSymbol) {
            setPriceHistoryB(prev => {
              const newHistory = [...prev, close];
              return newHistory.slice(-200);
            });
            setAssetBData(prev => {
              if (!prev) return { orderBook: null, recentCandles: [candlestick], latestPrice: close };
              const updatedCandles = [...prev.recentCandles, candlestick].slice(-50);
              return { ...prev, recentCandles: updatedCandles, latestPrice: close };
            });
          }
        }
      )
      .subscribe();

    const tradesSubscription = supabase
      .channel('trades_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trades' },
        (payload) => {
          // If we don't have direct candlestick feeds, we might build candles from trades
          // For now, we'll assume candlesticks are provided directly
          // This subscription could be used for other purposes if needed
        }
      )
      .subscribe();

    // Compute derived analytics when price history updates
    useEffect(() => {
      // Calculate returns, entropy, and Markov transitions when we have enough price history
      if (priceHistoryA.length >= 2 && priceHistoryB.length >= 2) {
        // Calculate log returns
        const returnsA: number[] = [];
        const returnsB: number[] = [];

        for (let i = 1; i < priceHistoryA.length; i++) {
          returnsA.push(Math.log(priceHistoryA[i] / priceHistoryA[i-1]));
        }

        for (let i = 1; i < priceHistoryB.length; i++) {
          returnsB.push(Math.log(priceHistoryB[i] / priceHistoryB[i-1]));
        }

        // Use last 200 returns for analytics (as specified)
        const returnsArrayA = returnsA.slice(-200);
        const returnsArrayB = returnsB.slice(-200);

        // Calculate Shannon entropy
        const entropyA = calculateShannonEntropy(returnsArrayA);
        const entropyB = calculateShannonEntropy(returnsArrayB);
        const jointEntropy = calculateJointEntropy(returnsArrayA, returnsArrayB);

        // Calculate Markov transition matrix
        const markovMatrix = calculateMarkovTransitionMatrix(returnsArrayA, returnsArrayB);

        // Update market data when we have both assets' data
        if (assetAData && assetBData) {
          const dualMarket: DualMarketData = {
            assetA: {
              ...assetAData,
              orderBook: assetAData.orderBook || { bids: [], asks: [], timestamp: Date.now() }
            },
            assetB: {
              ...assetBData,
              orderBook: assetBData.orderBook || { bids: [], asks: [], timestamp: Date.now() }
            },
            timestamp: Date.now()
          };

          const returnsData: ReturnsData = {
            assetA: returnsArrayA,
            assetB: returnsArrayB,
            timestamp: Date.now()
          };

          const entropyData: EntropyData = {
            assetA: entropyA,
            assetB: entropyB,
            joint: jointEntropy,
            timestamp: Date.now()
          };

          const markovData: MarkovTransitionMatrix = {
            transitions: markovMatrix,
            timestamp: Date.now()
          };

          setMarketData({
            dualMarket,
            returns: returnsData,
            entropy: entropyData,
            markov: markovData,
            timestamp: Date.now()
          });
          setLoading(false);
        }
      }
    }, [priceHistoryA, priceHistoryB, assetAData, assetBData]);

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel('order_book_changes');
      supabase.removeChannel('candlestick_changes');
      supabase.removeChannel('trades_changes');
    };
  }, [supabaseUrl, supabaseAnonKey]);

  // Helper function to calculate Shannon entropy
  function calculateShannonEntropy(returns: number[]): number {
    if (returns.length === 0) return 0;

    // Create histogram of returns (using 20 bins as an example)
    const bins = 20;
    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);
    const binWidth = (maxReturn - minReturn) / bins;

    const histogram = new Array(bins).fill(0);
    returns.forEach(r => {
      const binIndex = Math.floor((r - minReturn) / binWidth);
      if (binIndex >= 0 && binIndex < bins) {
        histogram[binIndex]++;
      }
    });

    // Calculate probabilities and entropy
    let entropy = 0;
    const total = returns.length;
    histogram.forEach(count => {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    });

    return entropy;
  }

  // Helper function to calculate joint entropy (simplified)
  function calculateJointEntropy(returnsA: number[], returnsB: number[]): number {
    // For simplicity, we'll calculate joint entropy as the sum of individual entropies
    // In a full implementation, we would create a 2D histogram
    return calculateShannonEntropy(returnsA) + calculateShannonEntropy(returnsB);
  }

  // Helper function to calculate Markov transition matrix
  function calculateMarkovTransitionMatrix(returnsA: number[], returnsB: number[]): MarkovState[] {
    // Discretize returns into fixed bins (as specified)
    // We'll define 4 bins:
    // Bin 0: return <= -0.01 (≤ -1%)
    // Bin 1: -0.01 < return ≤ 0
    // Bin 2: 0 < return ≤ 0.01
    // Bin 3: return > 0.01 (> +1%)
    const bins = 4;
    const binEdges = [-0.01, 0, 0.01];

    const discretize = (returnValue: number): number => {
      if (returnValue <= -0.01) return 0;
      if (returnValue <= 0) return 1;
      if (returnValue <= 0.01) return 2;
      return 3;
    };

    // Get states for each asset
    const statesA = returnsA.map(discretize);
    const statesB = returnsB.map(discretize);

    // Create joint state pairs
    const jointStates: { stateA: number; stateB: number }[] = statesA.map((sA, i) => ({
      stateA: sA,
      stateB: statesB[i] || 0 // Handle potential length mismatch
    }));

    // Count transitions
    const transitionCounts: Record<string, Record<string, number>> = {};
    for (let i = 0; i < jointStates.length - 1; i++) {
      const current = jointStates[i];
      const next = jointStates[i + 1];
      const key = `${current.stateA}-${current.stateB}`;
      const nextKey = `${next.stateA}-${next.stateB}`;

      if (!transitionCounts[key]) {
        transitionCounts[key] = {};
      }
      transitionCounts[key][nextKey] = (transitionCounts[key][nextKey] || 0) + 1;
    }

    // Convert to probabilities
    const transitions: MarkovState[] = [];
    Object.keys(transitionCounts).forEach(key => {
      const [stateA, stateB] = key.split('-').map(Number);
      const nextStates = transitionCounts[key];
      const total = Object.values(nextStates).reduce((sum, count) => sum + count, 0);

      Object.keys(nextStates).forEach(nextKey => {
        const [nextStateA, nextStateB] = nextKey.split('-').map(Number);
        const probability = nextStates[nextKey] / total;

        transitions.push({
          stateA: String(stateA),
          stateB: String(stateB),
          probability
        });
      });
    });

    return transitions;
  }

  // Return loading state or error if applicable
  if (loading) {
    // Return a default structure while loading
    return {
      dualMarket: {
        assetA: {
          symbol: 'ASSET_A',
          orderBook: { bids: [], asks: [], timestamp: Date.now() },
          recentCandles: [],
          latestPrice: 0,
          timestamp: Date.now()
        },
        assetB: {
          symbol: 'ASSET_B',
          orderBook: { bids: [], asks: [], timestamp: Date.now() },
          recentCandles: [],
          latestPrice: 0,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      },
      returns: {
        assetA: [],
        assetB: [],
        timestamp: Date.now()
      },
      entropy: {
        assetA: 0,
        assetB: 0,
        joint: 0,
        timestamp: Date.now()
      },
      markov: {
        transitions: [],
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  }

  if (error) {
    console.error('Market data hook error:', error);
    // In a real implementation, we might want to throw or handle this differently
    // For now, return default data
    return {
      dualMarket: {
        assetA: {
          symbol: 'ASSET_A',
          orderBook: { bids: [], asks: [], timestamp: Date.now() },
          recentCandles: [],
          latestPrice: 0,
          timestamp: Date.now()
        },
        assetB: {
          symbol: 'ASSET_B',
          orderBook: { bids: [], asks: [], timestamp: Date.now() },
          recentCandles: [],
          latestPrice: 0,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      },
      returns: {
        assetA: [],
        assetB: [],
        timestamp: Date.now()
      },
      entropy: {
        assetA: 0,
        assetB: 0,
        joint: 0,
        timestamp: Date.now()
      },
      markov: {
        transitions: [],
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  }

  return marketData || {
    dualMarket: {
      assetA: {
        symbol: 'ASSET_A',
        orderBook: { bids: [], asks: [], timestamp: Date.now() },
        recentCandles: [],
        latestPrice: 0,
        timestamp: Date.now()
      },
      assetB: {
        symbol: 'ASSET_B',
        orderBook: { bids: [], asks: [], timestamp: Date.now() },
        recentCandles: [],
        latestPrice: 0,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    },
    returns: {
      assetA: [],
      assetB: [],
      timestamp: Date.now()
    },
    entropy: {
      assetA: 0,
      assetB: 0,
      joint: 0,
      timestamp: Date.now()
    },
    markov: {
      transitions: [],
      timestamp: Date.now()
    },
    timestamp: Date.now()
  };
}