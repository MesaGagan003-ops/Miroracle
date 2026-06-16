/**
 * Market data types for dual-asset streaming schema
 * Supports 50-level order book depth and 1-minute candlestick granularity
 */

export interface PriceLevel {
  /** Price level as a number (supports fractional pricing) */
  price: number;
  /** Quantity/volume at this price level */
  quantity: number;
}

export interface OrderBook {
  /** Exchange timestamp for the snapshot (milliseconds since epoch) */
  timestamp: number;
  /** Bid levels sorted descending by price (highest first) - exactly 50 levels */
  bids: PriceLevel[];
  /** Ask levels sorted ascending by price (lowest first) - exactly 50 levels */
  asks: PriceLevel[];
}

export interface Candlestick {
  /** Start time of the candle (milliseconds since epoch) */
  timestamp: number;
  /** Opening price */
  open: number;
  /** Highest price during the period */
  high: number;
  /** Lowest price during the period */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume during the period */
  volume: number;
}

export interface AssetData {
  /** Asset symbol (e.g., "BTC-USD", "ETH-USD") */
  symbol: string;
  /** 50-level order book data */
  orderBook: OrderBook;
  /** Recent 1-minute candlesticks for charting (last N candles) */
  recentCandles: Candlestick[];
  /** Latest trade price (close of most recent candle) */
  latestPrice: number;
  /** Overall data timestamp */
  timestamp: number;
}

export interface DualMarketData {
  /** Data for Asset A */
  assetA: AssetData;
  /** Data for Asset B */
  assetB: AssetData;
  /** Synchronization timestamp */
  timestamp: number;
}

/** Log return: ln(P_t / P_{t-1}) */
export interface ReturnsData {
  /** Array of log returns for Asset A */
  assetA: number[];
  /** Array of log returns for Asset B */
  assetB: number[];
  /** Timestamp of the returns calculation */
  timestamp: number;
}

export interface EntropyData {
  /** Shannon entropy value for Asset A [0, log(n)] */
  assetA: number;
  /** Shannon entropy value for Asset B [0, log(n)] */
  assetB: number;
  /** Joint entropy value */
  joint: number;
  /** Timestamp of entropy calculation */
  timestamp: number;
}

/** Discretized state representation for Markov chain (e.g., "UP", "DOWN", "FLAT") */
export interface MarkovState {
  /** State of Asset A */
  stateA: string;
  /** State of Asset B */
  stateB: string;
  /** Joint probability of this state pair */
  probability: number;
}

export interface MarkovTransitionMatrix {
  /** Array of state transitions with probabilities */
  transitions: MarkovState[];
  /** Timestamp of the transition matrix calculation */
  timestamp: number;
}

/**
 * Main market data interface combining all streams
 * Includes pre-calculated analytics for performance
 */
export interface MarketData {
  /** Dual-market synchronized data */
  dualMarket: DualMarketData;
  /** Pre-calculated log returns for PDF computation */
  returns: ReturnsData;
  /** Pre-calculated Shannon entropy values */
  entropy: EntropyData;
  /** Pre-calculated Markov chain transition matrix */
  markov: MarkovTransitionMatrix;
  /** Overall synchronization timestamp */
  timestamp: number;
}