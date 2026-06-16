import { useEffect, useRef } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { MarkovTransitionMatrix, MarkovState } from '@/types/market';

interface MarkovChartProps {
  height?: number;
}

export const MarkovChartComponent: React.FC<MarkovChartProps> = ({ height = 200 }) => {
  const marketData = useMarketData();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const markovData: MarkovTransitionMatrix = marketData.markov;

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
    drawMarkovChart(ctx, markovData, canvas.width / window.devicePixelRatio, height);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [markovData, height]);

  const drawMarkovChart = (ctx: CanvasRenderingContext2D, markovData: MarkovTransitionMatrix, width: number, height: number) => {
    if (markovData.transitions.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // We know we have 4 states based on our fixed bins
    const numStates = 4;
    const stateLabels = ['≤ -1%', '-1% to 0%', '0% to +1%', '> +1%'];

    // Initialize matrix
    const matrix: number[][] = [];
    for (let i = 0; i < numStates; i++) {
      matrix[i] = new Array(numStates).fill(0);
    }

    // Fill matrix from transitions
    markovData.transitions.forEach(t => {
      const stateA = parseInt(t.stateA, 10);
      const stateB = parseInt(t.stateB, 10);
      if (!isNaN(stateA) && !isNaN(stateB) && stateA >= 0 && stateA < numStates && stateB >= 0 && stateB < numStates) {
        matrix[stateA][stateB] = t.probability;
      }
    });

    // Find max probability for scaling
    let maxProb = 0;
    matrix.forEach(row => {
      row.forEach(prob => {
        if (prob > maxProb) maxProb = prob;
      });
    });
    // Avoid division by zero
    if (maxProb === 0) maxProb = 0.001;

    // Draw axes labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    // Draw column labels (stateA) at top
    stateLabels.forEach((label, col) => {
      const x = padding + (col + 0.5) * (chartWidth / numStates);
      ctx.fillText(x, padding, padding / 2);
    });

    // Draw row labels (stateB) on left
    stateLabels.forEach((label, row) => {
      const y = padding + (row + 0.5) * (chartHeight / numStates);
      ctx.save();
      ctx.translate(padding / 2, y + 5);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // Draw heatmap cells
    matrix.forEach((row, rowIndex) => {
      row.forEach((prob, colIndex) => {
        const x = padding + colIndex * (chartWidth / numStates);
        const y = padding + rowIndex * (chartHeight / numStates);
        const cellWidth = chartWidth / numStates;
        const cellHeight = chartHeight / numStates;

        // Background color based on probability (blue to red)
        const intensity = prob / maxProb; // 0 to 1
        // Blue (low) to Red (high)
        const r = Math.floor(255 * intensity);
        const b = Math.floor(255 * (1 - intensity));
        ctx.fillStyle = `rgb(${r}, 0, ${b})`;
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // Draw probability text
        ctx.fillStyle = prob > maxProb / 2 ? '#ffffff' : '#000000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prob.toFixed(3), x + cellWidth / 2, y + cellHeight / 2);
      });
    });

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i < numStates; i++) {
      // Vertical lines
      const x = padding + i * (chartWidth / numStates);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
      // Horizontal lines
      const y = padding + i * (chartHeight / numStates);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Draw border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, chartWidth, chartHeight);

    // Draw title
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Markov Transition Matrix', padding + chartWidth / 2, padding / 2);
  };

  return (
    <div className="relative w-full">
      <div className="font-bold text-center mb-2">Markov Chart</div>
      <div className="w-full h-[200px] relative">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};