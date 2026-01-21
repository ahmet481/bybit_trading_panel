import React, { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas boyutunu ayarla
    canvas.width = canvas.offsetWidth;
    canvas.height = 600;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Fiyat aralığını bul
    const prices = data.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Hacim aralığını bul
    const volumes = data.map((d) => d.volume);
    const maxVolume = Math.max(...volumes);

    // Arka plan
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Grid çizgileri
    ctx.strokeStyle = "#2d2d2d";
    ctx.lineWidth = 1;

    // Yatay grid çizgileri
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Fiyat etiketleri
      const price = maxPrice - (priceRange / 5) * i;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(price.toFixed(2), width - padding + 10, y + 4);
    }

    // Mum genişliğini zoom'a göre ayarla
    const baseCandleWidth = chartWidth / data.length;
    const candleWidth = baseCandleWidth * zoom;
    const totalWidth = candleWidth * data.length;

    // Dikey grid çizgileri
    const gridInterval = Math.ceil(data.length / 6);
    for (let i = 0; i < data.length; i += gridInterval) {
      const x = padding + scrollOffset + (candleWidth * i + candleWidth / 2);
      if (x > padding && x < width - padding) {
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    }

    // Mumları çiz
    data.forEach((candle, index) => {
      const x = padding + scrollOffset + candleWidth * index + candleWidth / 2;

      // Ekranda görünür mü kontrol et
      if (x + candleWidth / 2 < padding || x - candleWidth / 2 > width - padding) {
        return;
      }

      // Fiyat Y koordinatlarını hesapla
      const getY = (price: number) => {
        return height - padding - ((price - minPrice) / priceRange) * chartHeight;
      };

      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);

      // Mum rengi (yeşil = yükseliş, kırmızı = düşüş)
      const isUp = candle.close >= candle.open;
      ctx.strokeStyle = isUp ? "#10b981" : "#ef4444";
      ctx.fillStyle = isUp ? "#10b981" : "#ef4444";

      // Fitil (wick)
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Mum gövdesi
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyWidth = candleWidth * 0.6;

      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

      // Hacim çubuğu (alt kısım)
      const volumeHeight = (candle.volume / maxVolume) * (chartHeight / 4);
      ctx.fillStyle = isUp ? "#10b98180" : "#ef444480";
      ctx.fillRect(
        x - bodyWidth / 2,
        height - padding + 10,
        bodyWidth,
        volumeHeight
      );
    });

    // Zaman etiketleri
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i < data.length; i += gridInterval) {
      const x = padding + scrollOffset + candleWidth * i + candleWidth / 2;
      if (x > padding && x < width - padding) {
        const time = new Date(data[i].time * 1000).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        ctx.fillText(time, x, height - padding + 20);
      }
    }

    // Zoom seviyesi göster
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Zoom: ${zoom.toFixed(1)}x`, padding + 10, 20);
  }, [data, scrollOffset, zoom]);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
        <div>
          <h3 className="text-lg font-bold text-white">{symbol}</h3>
          <p className="text-sm text-gray-400">
            Fiyat: ${data[data.length - 1]?.close.toFixed(2)} | Hacim: {(data[data.length - 1]?.volume / 1000000).toFixed(2)}M
          </p>
        </div>

        {/* Timeframe Butonları */}
        <div className="flex gap-2">
          {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
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
      <canvas
        ref={canvasRef}
        className="w-full bg-gray-900 cursor-grab active:cursor-grabbing"
        style={{ display: "block" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Kontrol Talimatları */}
      <div className="px-4 py-2 bg-gray-800 text-xs text-gray-400 border-t border-gray-700">
        <span>💡 Fare tekerleği: Zoom | Sürükle: Pan | Timeframe: Veri güncelle</span>
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
