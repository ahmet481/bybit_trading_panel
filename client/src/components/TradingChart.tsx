import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradingChartProps {
  symbol: string;
  data: CandleData[];
  height?: number;
}

export default function TradingChart({ symbol, data, height = 400 }: TradingChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-gray-800 rounded-lg overflow-hidden p-4">
        <p className="text-gray-400">Grafik verisi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{symbol} - 1H</h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              labelStyle={{ color: "#d1d5db" }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorClose)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
