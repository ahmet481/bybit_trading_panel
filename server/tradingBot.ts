import { BybitManager } from "./bybit";

/**
 * Teknik Analiz Fonksiyonları
 */
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;

  // Signal line (9-period EMA of MACD)
  const macdValues = [];
  for (let i = 25; i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    macdValues.push(e12 - e26);
  }

  const signal = calculateEMA(macdValues, 9);
  return { macd, signal, histogram: macd - signal };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2) {
  const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const variance =
    closes
      .slice(-period)
      .reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + std * stdDev,
    middle: sma,
    lower: sma - std * stdDev,
  };
}

/**
 * Trading Bot - Otomatik işlem yönetimi
 */
export class TradingBot {
  private userId: number;
  private symbol: string;
  private leverage: number;
  private riskPercent: number;
  private stopLossPercent: number;
  private takeProfitPercent: number;
  private bybit: BybitManager | null = null;
  private running: boolean = false;

  constructor(
    userId: number,
    symbol: string,
    leverage: number,
    riskPercent: number,
    stopLossPercent: number,
    takeProfitPercent: number
  ) {
    this.userId = userId;
    this.symbol = symbol;
    this.leverage = leverage;
    this.riskPercent = riskPercent;
    this.stopLossPercent = stopLossPercent;
    this.takeProfitPercent = takeProfitPercent;
  }

  /**
   * Bot'u başlat
   */
  async initialize(): Promise<boolean> {
    try {
      // API anahtarlarını localStorage'dan al
      const apiKey = localStorage?.getItem(`apiKey_${this.userId}`);
      const apiSecret = localStorage?.getItem(`apiSecret_${this.userId}`);

      if (!apiKey || !apiSecret) {
        console.error("[TradingBot] API anahtarları bulunamadı");
        return false;
      }

      this.bybit = new BybitManager(apiKey, apiSecret);
      return true;
    } catch (error) {
      console.error("[TradingBot] Initialize error:", error);
      return false;
    }
  }

  /**
   * Piyasayı analiz et ve sinyal üret (İYİLEŞTİRİLMİŞ)
   */
  async analyzeMarket(): Promise<{
    signal: "buy" | "sell" | "hold";
    confidence: number;
    reason: string;
    rsi: number;
    macdHistogram: number;
    pattern: string | null;
  }> {
    if (!this.bybit) throw new Error("Bot not initialized");

    // K-Line verilerini al (1 dakikalık mumlar daha sık sinyaller için)
    const klines = await this.bybit.getKlines(this.symbol, "1", 100);
    const closes = klines.map((k: any) => k.close);
    const highs = klines.map((k: any) => k.high);
    const lows = klines.map((k: any) => k.low);

    // Teknik göstergeleri hesapla
    const rsi = calculateRSI(closes);
    const { macd: macdValue, signal: macdSignal, histogram: macdHistogram } = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);

    // Formasyon tespiti
    const detectedPattern = this.detectPattern(closes, highs, lows);
    const doubleTop = detectedPattern === "double_top";
    const doubleBottom = detectedPattern === "double_bottom";

    // Sinyal üret (İYİLEŞTİRİLMİŞ MANTIK)
    let signal: "buy" | "sell" | "hold" = "hold";
    let confidence = 0;
    let reasons: string[] = [];
    let pattern: string | null = null;

    const currentPrice = closes[closes.length - 1];

    // **1. RSI Analizi (Daha Güçlü)**
    if (rsi < 30) {
      signal = "buy";
      confidence += 40; // Artırıldı
      reasons.push("RSI çok düşük (aşırı satım)");
    } else if (rsi > 70) {
      signal = "sell";
      confidence += 40; // Artırıldı
      reasons.push("RSI çok yüksek (aşırı alım)");
    } else if (rsi < 40) {
      signal = "buy";
      confidence += 20;
      reasons.push("RSI düşük");
    } else if (rsi > 60) {
      signal = "sell";
      confidence += 20;
      reasons.push("RSI yüksek");
    }

    // **2. MACD Analizi (Daha Güçlü)**
    if (macdHistogram > 0 && macdValue > macdSignal) {
      if (signal !== "sell") {
        signal = "buy";
        confidence += 35; // Artırıldı
        reasons.push("MACD pozitif kesişim");
      }
    } else if (macdHistogram < 0 && macdValue < macdSignal) {
      if (signal !== "buy") {
        signal = "sell";
        confidence += 35; // Artırıldı
        reasons.push("MACD negatif kesişim");
      }
    }

    // **3. Bollinger Bands Analizi (YENİ)**
    if (currentPrice < bb.lower) {
      signal = "buy";
      confidence += 25;
      reasons.push("Fiyat alt bandın altında");
    } else if (currentPrice > bb.upper) {
      signal = "sell";
      confidence += 25;
      reasons.push("Fiyat üst bandın üstünde");
    }

    // **4. EMA Trend Analizi (YENİ)**
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);

    if (ema20 > ema50 && signal === "buy") {
      confidence += 15;
      reasons.push("EMA yükseliş trendi");
    } else if (ema20 < ema50 && signal === "sell") {
      confidence += 15;
      reasons.push("EMA düşüş trendi");
    }

    // **5. Volatilite Kontrolü (YENİ)**
    const volatility = (bb.upper - bb.lower) / bb.middle;
    if (volatility < 0.01) {
      // Çok düşük volatilite = sinyal güvenilmez
      confidence = Math.max(0, confidence - 20);
      reasons.push("Düşük volatilite (sinyal zayıf)");
    }

    // **6. Formasyon Analizi**
    if (doubleBottom && signal === "buy") {
      confidence += 30;
      reasons.push("Çift Dip formasyonu");
      pattern = detectedPattern;
    } else if (doubleTop && signal === "sell") {
      confidence += 30;
      reasons.push("Çift Tepe formasyonu");
      pattern = detectedPattern;
    }

    // Minimum güven eşiği (daha yüksek = daha seçici)
    if (confidence < 50) {
      signal = "hold";
    }

    return {
      signal,
      confidence: Math.min(confidence, 100),
      reason: reasons.join(" + "),
      rsi,
      macdHistogram,
      pattern,
    };
  }

  /**
   * Formasyon tespiti
   */
  private detectPattern(closes: number[], highs: number[], lows: number[]): string | null {
    if (closes.length < 5) return null;

    const recent = closes.slice(-5);
    const recentHighs = highs.slice(-5);
    const recentLows = lows.slice(-5);

    // Çift Dip
    if (
      recentLows[1] > recentLows[0] &&
      recentLows[2] < recentLows[1] &&
      recentLows[3] < recentLows[2] &&
      recentLows[4] > recentLows[3]
    ) {
      return "double_bottom";
    }

    // Çift Tepe
    if (
      recentHighs[1] < recentHighs[0] &&
      recentHighs[2] > recentHighs[1] &&
      recentHighs[3] > recentHighs[2] &&
      recentHighs[4] < recentHighs[3]
    ) {
      return "double_top";
    }

    return null;
  }

  /**
   * İşlem yürüt
   */
  async executeTrade(
    signal: "buy" | "sell",
    confidence: number,
    reason: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      if (!this.bybit) throw new Error("Bot not initialized");

      // Bakiye kontrol et
      const balance = await this.bybit.getBalance("USDT");
      const balanceNum = parseFloat(balance);

      if (balanceNum < 10) {
        return { success: false, error: "Yetersiz bakiye (min 10 USDT)" };
      }

      // Güncel fiyatı al
      const currentPrice = await this.bybit.getCurrentPrice(this.symbol);

      // Kaldıraç ayarla
      await this.bybit.setLeverage(this.symbol, this.leverage);

      // İşlem miktarını hesapla (risk yönetimi)
      const riskAmount = (balanceNum * this.riskPercent) / 100;
      const qty = ((riskAmount * this.leverage) / currentPrice).toFixed(3);

      // Stop Loss ve Take Profit hesapla
      const stopLossPrice = (currentPrice * (1 - this.stopLossPercent / 100)).toFixed(2);
      const takeProfitPrice = (currentPrice * (1 + this.takeProfitPercent / 100)).toFixed(2);

      console.log("[TradingBot] Executing trade:", {
        side: signal === "buy" ? "Buy" : "Sell",
        qty,
        currentPrice,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        confidence,
      });

      // İşlem aç
      const result = await this.bybit.placeOrder(
        this.symbol,
        signal === "buy" ? "Buy" : "Sell",
        qty,
        "Market",
        undefined,
        stopLossPrice,
        takeProfitPrice
      );

      if (result.success) {
        console.log("[TradingBot] Trade opened successfully:", result.orderId);
        return { success: true, orderId: result.orderId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error("[TradingBot] Trade execution error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Açık pozisyonları kontrol et
   */
  async checkOpenPositions(): Promise<any[]> {
    try {
      if (!this.bybit) return [];
      const positions = await this.bybit.getPositions(this.symbol);
      return positions.filter((p: any) => parseFloat(p.size) > 0);
    } catch (error) {
      console.error("[TradingBot] Check positions error:", error);
      return [];
    }
  }

  /**
   * Bot döngüsünü çalıştır
   */
  async run() {
    this.running = true;
    console.log(`[TradingBot] Bot started for ${this.symbol}`);

    while (this.running) {
      try {
        // Açık pozisyon kontrol et
        const openPositions = await this.checkOpenPositions();

        if (openPositions.length === 0) {
          // Piyasayı analiz et
          const analysis = await this.analyzeMarket();
          console.log("[TradingBot] Analysis:", analysis);

          // Sinyal varsa işlem aç (confidence eşiği yükseltildi)
          if (analysis.signal !== "hold" && analysis.confidence >= 50) {
            const result = await this.executeTrade(
              analysis.signal,
              analysis.confidence,
              analysis.reason
            );
            console.log("[TradingBot] Trade result:", result);
          }
        } else {
          console.log("[TradingBot] Open position exists, skipping...");
        }

        // 20 saniye bekle (daha sık analiz)
        await new Promise((resolve) => setTimeout(resolve, 20000));
      } catch (error) {
        console.error("[TradingBot] Error in loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  /**
   * Bot'u durdur
   */
  stop() {
    this.running = false;
    console.log(`[TradingBot] Bot stopped for ${this.symbol}`);
  }
}

// Bot instance'larını sakla
const activeBots: Map<number, TradingBot> = new Map();

/**
 * Kullanıcı için bot başlat
 */
export async function startBot(
  userId: number,
  symbol: string = "BTCUSDT",
  leverage: number = 10,
  riskPercent: number = 5,
  stopLossPercent: number = 2,
  takeProfitPercent: number = 4
): Promise<{ success: boolean; error?: string }> {
  if (activeBots.has(userId)) {
    return { success: false, error: "Bot zaten çalışıyor" };
  }

  const bot = new TradingBot(
    userId,
    symbol,
    leverage,
    riskPercent,
    stopLossPercent,
    takeProfitPercent
  );

  const initialized = await bot.initialize();
  if (!initialized) {
    return { success: false, error: "Bot başlatılamadı. API anahtarlarını kontrol edin." };
  }

  activeBots.set(userId, bot);

  // Bot'u arka planda çalıştır
  bot.run().catch((err) => {
    console.error("[TradingBot] Fatal error:", err);
    activeBots.delete(userId);
  });

  return { success: true };
}

/**
 * Kullanıcı için bot durdur
 */
export function stopBot(userId: number): { success: boolean; error?: string } {
  const bot = activeBots.get(userId);
  if (!bot) {
    return { success: false, error: "Bot çalışmıyor" };
  }

  bot.stop();
  activeBots.delete(userId);
  return { success: true };
}

/**
 * Bot durumunu al
 */
export function getBotStatus(userId: number): { running: boolean } {
  return { running: activeBots.has(userId) };
}
