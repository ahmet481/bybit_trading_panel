import React, { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ProfessionalChartProps {
  data: CandleData[];
  symbol: string;
  onTimeframeChange?: (timeframe: string) => void;
}

export const ProfessionalChart: React.FC<ProfessionalChartProps> = ({
  data,
  symbol,
  onTimeframeChange,
}) => {
  const [timeframe, setTimeframe] = useState("1h");

  // Grafik verilerini hazırla
  const chartData = data.map((d, i) => ({
    time: new Date(d.time * 1000).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume / 1000000, // Milyonlara dönüştür
    index: i,
  }));

  // Bollinger Bands hesapla (20 periyot, 2 standart sapma)
  const sma20 = (arr: number[]) => {
    if (arr.length < 20) return arr.map(() => 0);
    return arr.map((_, i) => {
      if (i < 19) return 0;
      const sum = arr.slice(i - 19, i + 1).reduce((a, b) => a + b, 0);
      return sum / 20;
    });
  };

  const closes = chartData.map((d) => d.close);
  const smaValues = sma20(closes);
  const stdDev = (arr: number[], sma: number[]) => {
    return arr.map((_, i) => {
      if (i < 19 || sma[i] === 0) return 0;
      const variance =
        arr
          .slice(i - 19, i + 1)
          .reduce((sum, val) => sum + Math.pow(val - sma[i], 2), 0) / 20;
      return Math.sqrt(variance);
    });
  };

  const stdDevValues = stdDev(closes, smaValues);

  // Bollinger Bands
  const dataWithBands = chartData.map((d, i) => ({
    ...d,
    sma: smaValues[i],
    upper: smaValues[i] + stdDevValues[i] * 2,
    lower: smaValues[i] - stdDevValues[i] * 2,
  }));

  // RSI hesapla
  const calculateRSI = (prices: number[], period = 14) => {
    const changes = prices.map((p, i) => (i === 0 ? 0 : p - prices[i - 1]));
    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? -c : 0));

    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };

  const rsiValue = calculateRSI(closes);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
        <div>
          <h3 className="text-lg font-bold text-white">{symbol}</h3>
          <p className="text-sm text-gray-400">
            Fiyat: ${data[data.length - 1]?.close.toFixed(2)} | RSI: {rsiValue.toFixed(2)} | Hacim: {(data[data.length - 1]?.volume / 1000000).toFixed(2)}M
          </p>
        </div>

        {/* Timeframe Butonları */}
        <div className="flex gap-2">
          {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                onTimeframeChange?.(tf);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Grafik */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={dataWithBands}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              interval={Math.floor(data.length / 6)}
            />

            {/* Fiyat Y Ekseni */}
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              domain={["dataMin - 100", "dataMax + 100"]}
            />

            {/* Hacim Y Ekseni */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              opacity={0.3}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: any) => {
                if (typeof value === "number") {
                  return value.toFixed(2);
                }
                return value;
              }}
            />

            {/* Bollinger Bands */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="upper"
              stroke="#ef4444"
              dot={false}
              strokeWidth={1}
              strokeDasharray="5 5"
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sma"
              stroke="#fbbf24"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="lower"
              stroke="#ef4444"
              dot={false}
              strokeWidth={1}
              strokeDasharray="5 5"
              isAnimationActive={false}
            />

            {/* Kapanış Fiyatı */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="close"
              stroke="#10b981"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />

            {/* Hacim */}
            <Bar
              yAxisId="right"
              dataKey="volume"
              fill="url(#colorVolume)"
              radius={[2, 2, 0, 0]}
            />

            {/* RSI Referans Çizgileri */}
            <ReferenceLine
              yAxisId="left"
              y={data[data.length - 1]?.close}
              stroke="#6b7280"
              strokeDasharray="5 5"
              label={{ value: "Cari Fiyat", position: "right", fill: "#9ca3af" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Alt Bilgi Paneli */}
      <div className="grid grid-cols-4 gap-4 p-4 border-t border-gray-700 bg-gray-800 text-sm">
        <div>
          <p className="text-gray-400">Açılış</p>
          <p className="text-white font-bold">${data[data.length - 1]?.open.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400">Yüksek</p>
          <p className="text-green-400 font-bold">${data[data.length - 1]?.high.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400">Düşük</p>
          <p className="text-red-400 font-bold">${data[data.length - 1]?.low.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400">Kapanış</p>
          <p className="text-white font-bold">${data[data.length - 1]?.close.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};
