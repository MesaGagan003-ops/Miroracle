import { useEffect, useRef, useState } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { ReturnsData } from '@/types/market';

interface EntropyChartProps {
  height?: number;
}

export const EntropyChartComponent: React.FC<EntropyChartProps> = ({ height = 200 }) => {
  const marketData = useMarketData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [entropyHistoryA, setEntropyHistoryA] = useState<number[]>([]);
  const [entropyHistoryB, setEntropyHistoryB] = useState<number[]>([]);
  const [timestamps, setTimestamps] = useState<number[]>([]);

  const returnsData: ReturnsData = marketData.returns;

  // Helper function to calculate Shannon entropy from returns array
  const calculateShannonEntropy = (returns: number[]): number => {
    if (returns.length === 0) return 0;
    const bins = 20;
    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);
    if (minReturn === maxReturn) return 0; // avoid division by zero
    const binWidth = (maxReturn - minReturn) / bins;
    const histogram = new Array(bins).fill(0);
    returns.forEach(r => {
      const binIndex = Math.floor((r - minReturn) / binWidth);
      if (binIndex >= 0 && binIndex < bins) {
        histogram[binIndex]++;
      }
    });
    let entropy = 0;
    const total = returns.length;
    histogram.forEach(count => {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    });
    return entropy;
  };

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
    drawEntropyChart(ctx, entropyHistoryA, entropyHistoryB, timestamps, canvas.width / window.devicePixelRatio, height);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [entropyHistoryA, entropyHistoryB, timestamps, height]);

  // Update entropy history when returns data changes
  useEffect(() => {
    if (returnsData.assetA.length > 0 && returnsData.assetB.length > 0) {
      const entropyA = calculateShannonEntropy(returnsData.assetA);
      const entropyB = calculateShannonEntropy(returnsData.assetB);
      const timestamp = Date.now();

      setEntropyHistoryA(prev => {
        const newHistory = [...prev, entropyA];
        return newHistory.slice(-200); // keep last 200 entropy values
      });
      setEntropyHistoryB(prev => {
        const newHistory = [...prev, entropyB];
        return newHistory.slice(-200);
      });
      setTimestamps(prev => {
        const newTimestamps = [...prev, timestamp];
        return newTimestamps.slice(-200);
      });
    }
  }, [returnsData.assetA, returnsData.assetB]);

  const drawEntropyChart = (ctx: CanvasRenderingContext2D, historyA: number[], historyB: number[], times: number[], width: number, height: number) => {
    if (historyA.length === 0 || historyB.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Time range
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const timeRange = maxTime - minTime;

    // Entropy range: we'll set y-axis from 0 to max possible entropy for the bin size used in calculation
    // For 20 bins, max entropy is log2(20) ≈ 4.32
    const maxEntropy = 5; // a bit of headroom
    const minEntropy = 0;

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

    // Draw lines for Asset A and Asset B
    // Asset A: blue
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    historyA.forEach((entropy, index) => {
      const time = times[index];
      const x = padding + ((time - minTime) / timeRange) * chartWidth;
      const y = padding + chartHeight - ((entropy - minEntropy) / (maxEntropy - minEntropy)) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Asset B: red
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    historyB.forEach((entropy, index) => {
      const time = times[index];
      const x = padding + ((time - minTime) / timeRange) * chartWidth;
      const y = padding + chartHeight - ((entropy - minEntropy) / (maxEntropy - minEntropy)) * chartHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw horizontal grid lines for entropy levels
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 5; i++) {
      const entropy = minEntropy + (maxEntropy - minEntropy) * i / 5;
      const y = padding + chartHeight - ((entropy - minEntropy) / (maxEntropy - minEntropy)) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time', padding + chartWidth / 2, height - padding / 2);
    ctx.save();
    ctx.translate(padding / 3, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Entropy', 0, 0);
    ctx.restore();
  };

  return (
    <div className="relative w-full">
      <div className="font-bold text-center mb-2">Entropy Chart</div>
      <div className="w-full h-[200px] relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};