import { useMarketData } from '@/hooks/useMarketData';
import { OrderBook } from '@/types/market';

interface OrderBookProps {
  symbol: string;
  label: string;
}

export const OrderBookComponent: React.FC<OrderBookProps> = ({ symbol, label }) => {
  const marketData = useMarketData();

  // Find the order book for the given symbol
  const assetData = marketData.dualMarket.assetA.symbol === symbol
    ? marketData.dualMarket.assetA
    : marketData.dualMarket.assetB;

  const orderBook: OrderBook = assetData.orderBook;

  return (
    <div className="flex flex-col w-full">
      <div className="font-bold text-center mb-2">{label} Order Book</div>
      <div className="flex flex-col w-full">
        <div className="flex-1 flex">
          {/* Bids (descending) - higher prices at top */}
          <div className="w-1/2 border-r">
            <div className="font-semibold text-center pb-1 bg-gray-200">BIDS</div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {orderBook.bids.map((level, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-2 py-1 text-right text-xs font-medium">{level.price.toFixed(2)}</td>
                      <td className="px-2 py-1 text-left text-xs font-medium">{level.quantity.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Asks (ascending) - lower prices at top */}
          <div className="w-1/2 border-l">
            <div className="font-semibold text-center pb-1 bg-gray-200">ASKS</div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {orderBook.asks.map((level, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-2 py-1 text-right text-xs font-medium">{level.price.toFixed(2)}</td>
                      <td className="px-2 py-1 text-left text-xs font-medium">{level.quantity.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};