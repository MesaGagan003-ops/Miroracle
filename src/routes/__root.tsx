import { createRootRoute } from '@tanstack/react-router';
import { useMarketData } from '@/hooks/useMarketData';
import { OrderBookComponent } from '@/components/charts/OrderBook';
import { CandlestickChartComponent } from '@/components/charts/CandlestickChart';
import { PDFChartComponent } from '@/components/charts/PDFChart';
import { EntropyChartComponent } from '@/components/charts/EntropyChart';
import { MarkovChartComponent } from '@/components/charts/MarkovChart';
import { useState } from 'react';

const Route = createRootRoute({
  component: RootRoute,
});

export default Route;

function RootRoute() {
  const marketData = useMarketData();

  // Extract asset data - assuming we know the symbols or can determine from data
  // For now, we'll use the first asset as Asset A and second as Asset B
  // In a real implementation, we might want to make this configurable
  const assetAData = marketData.dualMarket.assetA;
  const assetBData = marketData.dualMarket.assetB;

  // Tab state for bottom dock
  const [activeTab, setActiveTab] = useState<'pdf' | 'entropy' | 'markov'>('pdf');

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Top section: Two asset columns */}
      <div className="flex h-[60vh] min-h-[240px]">
        {/* Asset A Column (BTC-USD) */}
        <div className="w-[40%] min-w-[200px] max-w-[500px] bg-gray-800 p-4 space-y-4">
          <div className="font-bold text-center text-blue-400">BTC-USD</div>
          <OrderBookComponent symbol="BTC-USD" label="BTC-USD Order Book" />
          <CandlestickChartComponent symbol="BTC-USD" label="BTC-USD Candlesticks" />
        </div>

        {/* Visual separator */}
        <div className="w-[20%] bg-gray-900">
          <div className="h-full border-l border-gray-700"></div>
        </div>

        {/* Asset B Column (ETH-USD) */}
        <div className="w-[40%] min-w-[200px] max-w-[500px] bg-gray-800 p-4 space-y-4">
          <div className="font-bold text-center text-green-400">ETH-USD</div>
          <OrderBookComponent symbol="ETH-USD" label="ETH-USD Order Book" />
          <CandlestickChartComponent symbol="ETH-USD" label="ETH-USD Candlesticks" />
        </div>
      </div>

      {/* Bottom section: Tabbed analytical console */}
      <div className="h-[20%] min-h-[120px] bg-gray-900 p-4 flex flex-col">
        {/* Tab buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            className={`px-4 py-2 rounded-t-lg font-medium
                         ${activeTab === 'pdf' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('pdf')}
          >
            PDF
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-medium
                         ${activeTab === 'entropy' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('entropy')}
          >
            Entropy
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-medium
                         ${activeTab === 'markov' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            onClick={() => setActiveTab('markov')}
          >
            Markov
          </button>
        </div>

        {/* Tab panel */}
        <div className="flex-1 bg-gray-800 rounded-b-lg overflow-hidden">
          {activeTab === 'pdf' && (
            <PDFChartComponent height={180} />
          )}
          {activeTab === 'entropy' && (
            <EntropyChartComponent height={180} />
          )}
          {activeTab === 'markov' && (
            <MarkovChartComponent height={180} />
          )}
        </div>
      </div>
    </div>
  );
}