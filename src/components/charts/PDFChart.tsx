import { useEffect, useRef } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { ReturnsData } from '@/types/market';

interface PDFChartProps {
  height?: number;
}

export const PDFChartComponent: React.FC<PDFChartProps> = ({ height = 200 }) => {
  const marketData = useMarketData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const returnsData: ReturnsData = marketData.returns;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const containerWidth = canvas.parentElement?.clientWidth || 400;
      canvas.width = containerWidth * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawPDF(ctx, returnsData, canvas.width / window.devicePixelRatio, height);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [returnsData, height]);

  const drawPDF = (ctx: CanvasRenderingContext2D, returnsData: ReturnsData, width: number, height: number) => {
    if (returnsData.assetA.length === 0 && returnsData.assetB.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const padding = 40; // more padding for y-axis labels
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Combine returns to find overall range
    const allReturns = [...returnsData.assetA, ...returnsData.assetB];
    if (allReturns.length === 0) return;

    // Calculate min and max for binning
    let minReturn = allReturns[0];
    let maxReturn = allReturns[0];
    allReturns.forEach(r => {
      if (r < minReturn) minReturn = r;
      if (r > maxReturn) maxReturn = r;
    });
    const range = maxReturn - minReturn;
    const paddingRange = range * 0.1; // add 10% padding on each side
    const adjustedMin = minReturn - paddingRange;
    const adjustedMax = maxReturn + paddingRange;
    const adjustedRange = adjustedMax - adjustedMin;

    // Number of bins
    const bins = 50;
    const binWidth = adjustedRange / bins;

    // Initialize bins for each asset
    const histA = new Array(bins).fill(0);
    const histB = new Array(bins).fill(0);

    // Fill histograms
    returnsData.assetA.forEach(r => {
      const binIndex = Math.floor((r - adjustedMin) / binWidth);
      if (binIndex >= 0 && binIndex < bins) {
        histA[binIndex]++;
      }
    });

    returnsData.assetB.forEach(r => {
      const binIndex = Math.floor((r - adjustedMin) / binWidth);
      if (binIndex >= 0 && binIndex < bins) {
        histB[binIndex]++;
      }
    });

    // Normalize to get density (area = 1)
    const totalA = returnsData.assetA.length;
    const totalB = returnsData.assetB.length;
    const binArea = binWidth;
    for (let i = 0; i < bins; i++) {
      if (totalA > 0) histA[i] = histA[i] / (totalA * binArea);
      if (totalB > 0) histB[i] = histB[i] / (totalB * binArea);
    }

    // Find max density for scaling
    let maxDensity = 0;
    histA.forEach(v => { if (v > maxDensity) maxDensity = v; });
    histB.forEach(v => { if (v > maxDensity) maxDensity = v; });
    const densityScale = chartHeight / maxDensity;

    // Draw axes
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw Gaussian baseline (mean 0, std 1) for reference
    // We'll scale it to fit in the chart
    const gaussian = (x: number) => {
      return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    };
    // Find max of gaussian in our range for scaling
    let maxGaussian = 0;
    for (let i = 0; i <= bins; i++) {
      const x = adjustedMin + (adjustedRange * i) / bins;
      const g = gaussian(x);
      if (g > maxGaussian) maxGaussian = g;
    }
    const gaussianScale = chartHeight / maxGaussian;

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= bins; i++) {
      const x = adjustedMin + (adjustedRange * i) / bins;
      const g = gaussian(x);
      const screenX = padding + ((x - adjustedMin) / adjustedRange) * chartWidth;
      const screenY = padding + chartHeight - g * gaussianScale;
      if (i === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }
    ctx.stroke();

    // Draw PDF for Asset A
    ctx.strokeStyle = '#3b82f6'; // blue
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = adjustedMin + (i + 0.5) * binWidth;
      const density = histA[i];
      const screenX = padding + ((x - adjustedMin) / adjustedRange) * chartWidth;
      const screenY = padding + chartHeight - density * densityScale;
      if (i === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }
    ctx.stroke();

    // Draw PDF for Asset B
    ctx.strokeStyle = '#ef4444'; // red
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = adjustedMin + (i + 0.5) * binWidth;
      const density = histB[i];
      const screenX = padding + ((x - adjustedMin) / adjustedRange) * chartWidth;
      const screenY = padding + chartHeight - density * densityScale;
      if (i === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }
    ctx.stroke();

    // Draw horizontal grid lines for density (optional)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 5; i++) {
      const density = (maxDensity * i) / 5;
      const y = padding + chartHeight - density * densityScale;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw labels (simplified)
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Return', padding + chartWidth / 2, height - padding / 2);
    ctx.save();
    ctx.translate(padding / 3, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Density', 0, 0);
    ctx.restore();
  };

  return (
    <div className="relative w-full">
      <div className="font-bold text-center mb-2">PDF Chart</div>
      <div className="w-full h-[200px] relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};