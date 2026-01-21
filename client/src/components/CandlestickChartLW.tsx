import React, { useRef, useState, useEffect } from "react";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartLWProps {
  data: CandleData[];
  symbol: string;
  onTimeframeChange?: (timeframe: string) => void;
}

const TIMEFRAME_INTERVALS: Record<string, { ms: number; label: string }> = {
  "1m": { ms: 60000, label: "1 dakika" },
  "5m": { ms: 300000, label: "5 dakika" },
  "15m": { ms: 900000, label: "15 dakika" },
  "1h": { ms: 3600000, label: "1 saat" },
  "4h": { ms: 14400000, label: "4 saat" },
  "1d": { ms: 86400000, label: "1 gün" },
};

export const CandlestickChartLW: React.FC<CandlestickChartLWProps> = ({
  data,
  symbol,
  onTimeframeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [scrollOffset, setScrollOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [timeUntilClose, setTimeUntilClose] = useState<string>("");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    setScrollOffset(0);
    setZoom(1);
    onTimeframeChange?.(tf);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newZoom = Math.max(0.5, Math.min(3, zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStart;
    setScrollOffset(scrollOffset + delta);
    setDragStart(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mum kapanışa kalan zamanı hesapla
  useEffect(() => {
    const updateTimer = setInterval(() => {
      if (data.length > 0) {
        const lastCandle = data[data.length - 1];
        const candleOpenTime = lastCandle.time * 1000;
        const interval = TIMEFRAME_INTERVALS[timeframe]?.ms || 3600000;
        const candleCloseTime = candleOpenTime + interval;
        const now = Date.now();
        const remaining = candleCloseTime - now;

        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setTimeUntilClose(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        } else {
          setTimeUntilClose("0:00");
        }
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, [data, timeframe]);

  // Grafik çiz
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas boyutlarını ayarla
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Arka plan
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Grid çiz
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;

    // Dikey gridler
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Yatay gridler
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Fiyat aralığını bul
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    data.forEach((candle) => {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
    });

    const priceRange = maxPrice - minPrice;
    const priceScale = chartHeight / priceRange;

    // Mumları çiz
    const candleWidth = Math.max(2, (chartWidth / data.length) * zoom);
    const candleSpacing = candleWidth + 2;

    data.forEach((candle, index) => {
      const x = padding + scrollOffset + index * candleSpacing;

      // Ekran dışında mı kontrol et
      if (x + candleWidth < padding || x > width - padding) return;

      const openY = height - padding - (candle.open - minPrice) * priceScale;
      const closeY = height - padding - (candle.close - minPrice) * priceScale;
      const highY = height - padding - (candle.high - minPrice) * priceScale;
      const lowY = height - padding - (candle.low - minPrice) * priceScale;

      // Renk seç (yeşil = yükseliş, kırmızı = düşüş)
      const isGreen = candle.close >= candle.open;
      const bodyColor = isGreen ? "#10b981" : "#ef4444";
      const wickColor = isGreen ? "#34d399" : "#f87171";

      // Fitil çiz
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Gövde çiz
      ctx.fillStyle = bodyColor;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      ctx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 1));

      // Hacim çubuğu (alt kısımda)
      const volumeHeight = (candle.volume / Math.max(...data.map((d) => d.volume))) * 20;
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(x, height - padding + 5, candleWidth, volumeHeight);
    });

    // Son fiyatı güncelle
    if (data.length > 0) {
      const lastCandle = data[data.length - 1];
      setCurrentPrice(lastCandle.close);
      if (data.length > 1) {
        const prevCandle = data[data.length - 2];
        setPriceChange(lastCandle.close - prevCandle.close);
      }
    }

    // Fiyat etiketi çiz (sağ taraf)
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i;
      const y = height - padding - (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), width - 10, y + 4);
    }

    // X ekseni (zaman etiketi)
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";

    const timeLabels = data.length > 0 ? Math.min(5, Math.floor(data.length / 5)) : 0;
    for (let i = 0; i <= timeLabels; i++) {
      const index = Math.floor((data.length - 1) * (i / timeLabels));
      const candle = data[index];
      const x = padding + scrollOffset + index * candleSpacing + candleWidth / 2;
      const date = new Date(candle.time * 1000);
      const timeStr = date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      ctx.fillText(timeStr, x, height - 10);
    }
  }, [data, scrollOffset, zoom, timeframe]);

  return (
    <div className="bg-slate-900 rounded-lg shadow-lg p-4 border border-slate-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">{symbol}</h3>
            <div className="flex gap-2 items-center">
              <span className="text-2xl font-bold text-white">${currentPrice.toFixed(2)}</span>
              <span
                className={`text-sm font-semibold ${
                  priceChange >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} (
                {((priceChange / (currentPrice - priceChange)) * 100).toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Mum Kapanış Sayacı */}
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Kapanışa Kalan</p>
            <p className="text-xl font-bold text-blue-400 font-mono">{timeUntilClose}</p>
          </div>
        </div>

        {/* Timeframe Butonları */}
        <div className="flex gap-2">
          {Object.keys(TIMEFRAME_INTERVALS).map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full bg-slate-950 rounded cursor-grab active:cursor-grabbing"
          style={{ height: "400px" }}
        />

        {/* Kontrol Bilgisi */}
        <div className="absolute bottom-2 left-2 text-xs text-slate-500">
          <p>🖱️ Sürükle: Kaydır | 🔄 Tekerlek: Yakınlaştır</p>
        </div>

        {/* Zoom Göstergesi */}
        <div className="absolute top-2 right-2 bg-slate-800 px-2 py-1 rounded text-xs text-slate-300 border border-slate-600">
          Zoom: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-2 text-xs text-slate-400 flex justify-between">
        <span>Timeframe: {TIMEFRAME_INTERVALS[timeframe]?.label}</span>
        <span>Mumlar: {data.length} | Son Güncelleme: {new Date().toLocaleTimeString("tr-TR")}</span>
      </div>
    </div>
  );
};
