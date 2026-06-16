import { useEffect, useRef } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { Candlestick } from '@/types/market';

interface CandlestickChartProps {
  symbol: string;
  label: string;
  height?: number;
}

export const CandlestickChartComponent: React.FC<CandlestickChartProps> = ({
  symbol,
  label,
  height = 200
}) => {
  const marketData = useMarketData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Find the asset data for the given symbol
  const assetData = marketData.dualMarket.assetA.symbol === symbol
    ? marketData.dualMarket.assetA
    : marketData.dualMarket.assetB;

  const candles: Candlestick[] = assetData.recentCandles;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      canvas.width = containerWidth * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawCandlesticks(ctx, candles, canvas.width / window.devicePixelRatio, height);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [candles, height, symbol]);

  const drawCandlesticks = (ctx: CanvasRenderingContext2D, candles: Candlestick[], width: number, height: number) => {
    if (candles.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    // Calculate padding
    const padding = 20;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find min and max prices for scaling
    let minPrice = candles[0].low;
    let maxPrice = candles[0].high;
    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    const priceRange = maxPrice - minPrice;
    const priceScale = chartHeight / priceRange;

    // Calculate candle width
    const candleWidth = Math.max(1, chartWidth / candles.length - 2); // 2px gap between candles

    candles.forEach((candle, index) => {
      const x = padding + index * (candleWidth + 2) + candleWidth / 2;

      // Convert prices to y coordinates (y increases downwards in canvas)
      const highY = padding + chartHeight - (candle.high - minPrice) * priceScale;
      const lowY = padding + chartHeight - (candle.low - minPrice) * priceScale;
      const openY = padding + chartHeight - (candle.open - minPrice) * priceScale;
      const closeY = padding + chartHeight - (candle.close - minPrice) * priceScale;

      // Determine candle color
      const isBullish = candle.close >= candle.open;
      ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444'; // green for bullish, red for bearish
      ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';

      // Draw wick (high to low)
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight > 0 ? bodyHeight : 1); // ensure at least 1px for doji
    });

    // Draw horizontal price lines for reference (optional)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange * i) / 5;
      const y = padding + chartHeight - (price - minPrice) * priceScale;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  };

  return (
    <div className="relative w-full">
      <div className="font-bold text-center mb-2">{label} Candlestick Chart</div>
      <div className="w-full h-[200px] relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};