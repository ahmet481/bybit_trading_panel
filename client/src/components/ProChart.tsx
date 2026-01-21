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
  ReferenceLine,
} from "recharts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ProChartProps {
  symbol: string;
  candles: Candle[];
  isLoading?: boolean;
}

export function ProChart({ symbol, candles, isLoading = false }: ProChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Profesyonel Grafik</CardTitle>
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
          <CardTitle>{symbol} - Profesyonel Grafik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Veri yok
          </div>
        </CardContent>
      </Card>
    );
  }

  // RSI hesapla
  const calculateRSI = (prices: number[], period = 14) => {
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? -c : 0));

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    return rsi;
  };

  // MACD hesapla
  const calculateMACD = (prices: number[]) => {
    const ema12 = prices.slice(-26).reduce((a, b) => a + b, 0) / 12;
    const ema26 = prices.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macd = ema12 - ema26;
    return macd;
  };

  // Bollinger Bands hesapla
  const calculateBollingerBands = (prices: number[], period = 20) => {
    const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
    const variance =
      prices
        .slice(-period)
        .reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      upper: sma + 2 * std,
      middle: sma,
      lower: sma - 2 * std,
    };
  };

  const closePrices = candles.map((c) => c.close);
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const bb = calculateBollingerBands(closePrices);

  // Format data for Recharts
  const data = candles.map((candle, idx) => ({
    time: new Date(candle.time).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume / 1000000,
    rsi: calculateRSI(closePrices.slice(0, idx + 1)),
    macd: calculateMACD(closePrices.slice(0, idx + 1)),
    bbUpper: idx >= 19 ? calculateBollingerBands(closePrices.slice(0, idx + 1)).upper : null,
    bbMiddle: idx >= 19 ? calculateBollingerBands(closePrices.slice(0, idx + 1)).middle : null,
    bbLower: idx >= 19 ? calculateBollingerBands(closePrices.slice(0, idx + 1)).lower : null,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{symbol} - Profesyonel Grafik (TradingView Benzeri)</CardTitle>
        <div className="text-xs text-muted-foreground mt-2">
          RSI: {rsi.toFixed(2)} | MACD: {macd.toFixed(4)} | BB: {bb.lower.toFixed(2)} - {bb.middle.toFixed(2)} - {bb.upper.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent>
        {/* Ana Grafik - Mum + Bollinger Bands */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-2">Fiyat & Bollinger Bands</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#999", fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" tick={{ fill: "#999", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />

              {/* Bollinger Bands */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bbUpper"
                stroke="#ff6b6b"
                dot={false}
                name="BB Üst"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bbMiddle"
                stroke="#ffd93d"
                dot={false}
                name="BB Orta (SMA)"
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bbLower"
                stroke="#6bcf7f"
                dot={false}
                name="BB Alt"
                strokeWidth={1}
                strokeDasharray="5 5"
              />

              {/* Kapanış Fiyatı */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="close"
                stroke="#00d4ff"
                dot={false}
                name="Kapanış"
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Hacim Grafiği */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-2">Hacim</h3>
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#999", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis yAxisId="right" tick={{ fill: "#999", fontSize: 10 }} />
              <Bar
                yAxisId="right"
                dataKey="volume"
                fill="#3b82f6"
                opacity={0.6}
                name="Hacim (M)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* RSI Göstergesi */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-2">RSI (Relative Strength Index)</h3>
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#999", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "#999", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <ReferenceLine yAxisId="left" y={70} stroke="#ff6b6b" strokeDasharray="3 3" />
              <ReferenceLine yAxisId="left" y={30} stroke="#6bcf7f" strokeDasharray="3 3" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rsi"
                stroke="#ffd93d"
                dot={false}
                name="RSI"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* MACD Göstergesi */}
        <div>
          <h3 className="text-sm font-semibold mb-2">MACD (Moving Average Convergence Divergence)</h3>
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#999", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis yAxisId="left" tick={{ fill: "#999", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #444",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#fff" }}
              />
              <ReferenceLine yAxisId="left" y={0} stroke="#666" strokeDasharray="3 3" />
              <Bar
                yAxisId="left"
                dataKey="macd"
                fill="#6bcf7f"
                opacity={0.6}
                name="MACD Histogram"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="macd"
                stroke="#00d4ff"
                dot={false}
                name="MACD"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
