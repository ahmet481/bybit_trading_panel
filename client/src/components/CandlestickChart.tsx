import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  candles: Candle[];
  isLoading?: boolean;
}

export function CandlestickChart({ symbol, candles, isLoading = false }: CandlestickChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Mum Grafiği (1H)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Grafik yükleniyor...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (candles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Mum Grafiği (1H)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Veri yok
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for Recharts
  const data = candles.map((candle) => ({
    time: new Date(candle.time).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume / 1000000, // Scale down volume
    range: [candle.low, candle.high],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} - Mum Grafiği (1H)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#999", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" tick={{ fill: "#999", fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#999", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #444",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fff" }}
              formatter={(value: any) => {
                if (typeof value === "number") {
                  return value.toFixed(2);
                }
                return value;
              }}
            />
            <Legend />

            {/* Hacim Barları */}
            <Bar
              yAxisId="right"
              dataKey="volume"
              fill="#3b82f6"
              opacity={0.3}
              name="Hacim (M)"
            />

            {/* Açılış Fiyatı */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="open"
              stroke="#8b5cf6"
              dot={false}
              name="Açılış"
              strokeWidth={1}
            />

            {/* Kapanış Fiyatı */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="close"
              stroke="#22c55e"
              dot={false}
              name="Kapanış"
              strokeWidth={2}
            />

            {/* Yüksek Fiyat */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="high"
              stroke="#ef4444"
              dot={false}
              name="Yüksek"
              strokeWidth={1}
              strokeDasharray="5 5"
            />

            {/* Düşük Fiyat */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="low"
              stroke="#06b6d4"
              dot={false}
              name="Düşük"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
