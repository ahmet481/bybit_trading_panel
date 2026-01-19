/**
 * Teknik Analiz Motoru - RSI, MACD ve Formasyon Tespiti
 */

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * RSI (Relative Strength Index) Hesapla
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(0);
      continue;
    }

    const change = closes[i] - closes[i - 1];

    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;

      if (i === period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      } else {
        rsi.push(0);
      }
    } else {
      const prevAvgGain = (rsi[i - 1] * (period - 1) + (change > 0 ? change : 0)) / period;
      const prevAvgLoss = ((100 - rsi[i - 1]) * (period - 1) + (change < 0 ? -change : 0)) / period;
      const rs = prevAvgGain / prevAvgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence) Hesapla
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const ema12 = calculateEMA(closes, fastPeriod);
  const ema26 = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);

  const histogram: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

/**
 * EMA (Exponential Moving Average) Hesapla
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // İlk SMA hesapla
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  const sma = sum / period;
  ema[period - 1] = sma;

  // EMA hesapla
  for (let i = period; i < data.length; i++) {
    const prevEMA = ema[i - 1];
    const currentEMA = (data[i] - prevEMA) * multiplier + prevEMA;
    ema[i] = currentEMA;
  }

  // Başlangıç değerlerini doldur
  for (let i = 0; i < period - 1; i++) {
    ema[i] = 0;
  }

  return ema;
}

/**
 * Çift Tepe / Çift Dip Formasyonu Tespit Et
 */
export function detectDoublePattern(candles: Candle[]): string {
  if (candles.length < 10) return "None";

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);

  // Son 2 tepe noktasını bul
  const recentHighs = findLocalExtrema(highs, "high", 5);
  const recentLows = findLocalExtrema(lows, "low", 5);

  // Çift Tepe Kontrolü
  if (recentHighs.length >= 2) {
    const [idx1, val1] = recentHighs[recentHighs.length - 2];
    const [idx2, val2] = recentHighs[recentHighs.length - 1];
    const tolerance = val1 * 0.002; // %0.2 tolerans

    if (Math.abs(val1 - val2) < tolerance && idx2 - idx1 > 3) {
      return "Double Top";
    }
  }

  // Çift Dip Kontrolü
  if (recentLows.length >= 2) {
    const [idx1, val1] = recentLows[recentLows.length - 2];
    const [idx2, val2] = recentLows[recentLows.length - 1];
    const tolerance = val1 * 0.002; // %0.2 tolerans

    if (Math.abs(val1 - val2) < tolerance && idx2 - idx1 > 3) {
      return "Double Bottom";
    }
  }

  return "None";
}

/**
 * Yerel Ekstremum Noktaları Bul
 */
function findLocalExtrema(
  data: number[],
  type: "high" | "low",
  window: number = 5
): Array<[number, number]> {
  const extrema: Array<[number, number]> = [];

  for (let i = window; i < data.length - window; i++) {
    let isExtrema = true;

    for (let j = 1; j <= window; j++) {
      if (type === "high") {
        if (data[i] < data[i - j] || data[i] < data[i + j]) {
          isExtrema = false;
          break;
        }
      } else {
        if (data[i] > data[i - j] || data[i] > data[i + j]) {
          isExtrema = false;
          break;
        }
      }
    }

    if (isExtrema) {
      extrema.push([i, data[i]]);
    }
  }

  return extrema;
}

/**
 * Sinyal Üret
 */
export function generateSignal(candles: Candle[]) {
  if (candles.length < 26) {
    return { signal: "Hold", confidence: 0, reason: "Yetersiz veri" };
  }

  const closes = candles.map((c) => c.close);

  // Göstergeleri hesapla
  const rsi = calculateRSI(closes);
  const { macdLine, signalLine, histogram } = calculateMACD(closes);
  const pattern = detectDoublePattern(candles);

  const lastRSI = rsi[rsi.length - 1];
  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const lastHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];

  let signal = "Hold";
  let confidence = 0;
  let reason = "";

  // BUY Sinyali
  if (lastRSI < 30 && lastMACD > lastSignal && prevHistogram < 0 && lastHistogram > 0) {
    signal = "Buy";
    confidence = Math.min(100, 50 + (30 - lastRSI));
    reason = "RSI Aşırı Satım + MACD Kesişim";
  } else if (pattern === "Double Bottom") {
    signal = "Buy";
    confidence = 75;
    reason = "Çift Dip Formasyonu";
  }

  // SELL Sinyali
  if (lastRSI > 70 && lastMACD < lastSignal && prevHistogram > 0 && lastHistogram < 0) {
    signal = "Sell";
    confidence = Math.min(100, 50 + (lastRSI - 70));
    reason = "RSI Aşırı Alım + MACD Kesişim";
  } else if (pattern === "Double Top") {
    signal = "Sell";
    confidence = 75;
    reason = "Çift Tepe Formasyonu";
  }

  return {
    signal,
    confidence,
    reason,
    rsi: lastRSI.toFixed(2),
    macd: lastMACD.toFixed(4),
    pattern,
  };
}
