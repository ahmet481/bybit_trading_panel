import { BybitManager } from "./bybit";
import { BybitWebSocketManager } from "./bybitWebSocket";

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
  const sma = closes.slice(-period).reduce((a, b) => a + b) / period;
  const variance =
    closes.slice(-period).reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
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
  private bybitWS: BybitWebSocketManager | null = null;
  private running: boolean = false;
  private isMainnet: boolean = false; // Varsayılan olarak testnet

  constructor(
    userId: number,
    symbol: string,
    leverage: number,
    riskPercent: number,
    stopLossPercent: number,
    takeProfitPercent: number,
    isMainnet: boolean = false
  ) {
    this.userId = userId;
    this.symbol = symbol;
    this.leverage = leverage;
    this.riskPercent = riskPercent;
    this.stopLossPercent = stopLossPercent;
    this.takeProfitPercent = takeProfitPercent;
    this.isMainnet = isMainnet;
  }

  /**
   * Mainnet/Testnet modunu ayarla
   */
  setMainnetMode(isMainnet: boolean) {
    this.isMainnet = isMainnet;
    console.log(`[TradingBot] Switched to ${isMainnet ? 'MAINNET' : 'TESTNET'} mode`);
  }

  /**
   * Şu anki modu döndür
   */
  isMainnetMode(): boolean {
    return this.isMainnet;
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

      // REST API manager
      this.bybit = new BybitManager(apiKey, apiSecret, this.isMainnet);
      
      // WebSocket manager (işlem için)
      this.bybitWS = new BybitWebSocketManager(apiKey, apiSecret, this.isMainnet);
      const wsConnected = await this.bybitWS.connect();
      
      if (wsConnected) {
        console.log(`[TradingBot] Bot initialized with WebSocket in ${this.isMainnet ? 'MAINNET' : 'TESTNET'} mode`);
      } else {
        console.warn(`[TradingBot] WebSocket connection failed, using REST API fallback`);
      }
      
      return true;
    } catch (error) {
      console.error("[TradingBot] Initialize error:", error);
      return false;
    }
  }

  /**
   * Piyasayı analiz et ve sinyal üret
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

    // Sinyal üret
    let signal: "buy" | "sell" | "hold" = "hold";
    let confidence = 0;
    let reasons: string[] = [];
    let pattern: string | null = null;

    const currentPrice = closes[closes.length - 1];

    // **1. RSI Analizi**
    if (rsi < 30) {
      signal = "buy";
      confidence += 40;
      reasons.push("RSI çok düşük (aşırı satım)");
    } else if (rsi > 70) {
      signal = "sell";
      confidence += 40;
      reasons.push("RSI çok yüksek (aşırı alım)");
    }

    // **2. MACD Analizi**
    if (macdHistogram > 0 && macdValue > macdSignal) {
      if (signal === "buy") confidence += 25;
      else if (signal === "hold") {
        signal = "buy";
        confidence += 35;
      }
      reasons.push("MACD pozitif histogram");
    } else if (macdHistogram < 0 && macdValue < macdSignal) {
      if (signal === "sell") confidence += 25;
      else if (signal === "hold") {
        signal = "sell";
        confidence += 35;
      }
      reasons.push("MACD negatif histogram");
    }

    // **3. Bollinger Bands**
    if (currentPrice < bb.lower) {
      if (signal === "buy") confidence += 20;
      reasons.push("Fiyat alt bandın altında");
    } else if (currentPrice > bb.upper) {
      if (signal === "sell") confidence += 20;
      reasons.push("Fiyat üst bandın üstünde");
    }

    // **4. Formasyon Tespiti**
    if (doubleBottom && signal === "buy") {
      confidence += 30;
      pattern = "double_bottom";
      reasons.push("Çift Dip Formasyonu");
    } else if (doubleTop && signal === "sell") {
      confidence += 30;
      pattern = "double_top";
      reasons.push("Çift Tepe Formasyonu");
    }

    // **5. Volatilite Kontrolü**
    const volatility = Math.sqrt(
      closes.slice(-20).reduce((sum: number, close: number) => sum + Math.pow(close - closes[closes.length - 1], 2), 0) / 20
    );
    if (volatility < 0.5) {
      confidence *= 0.7; // Düşük volatilite = zayıf sinyal
      reasons.push("Düşük volatilite (zayıf sinyal)");
    }

    return {
      signal,
      confidence: Math.min(100, Math.max(0, confidence)),
      reason: reasons.join(" | "),
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
    if (recentLows[1] > recentLows[0] && recentLows[3] > recentLows[2] && recentLows[0] === recentLows[2]) {
      return "double_bottom";
    }

    // Çift Tepe
    if (recentHighs[1] < recentHighs[0] && recentHighs[3] < recentHighs[2] && recentHighs[0] === recentHighs[2]) {
      return "double_top";
    }

    return null;
  }

  /**
   * İşlem yürüt
   */
  async executeTrade(side: "buy" | "sell", confidence: number, reason: string) {
    if (!this.bybit) return { success: false, error: "Bot not initialized" };

    try {
      // Bakiye kontrolü kaldırıldı - WebSocket ile direkt işlem aç
      // Sabit miktar: risk yüzdesine göre hesapla (varsayılan bakiye: $100)
      const assumedBalance = 100; // Varsayılan bakiye
      const currentPrice = await this.bybit.getCurrentPrice(this.symbol);
      const tradeAmount = (assumedBalance * this.riskPercent) / 100;
      const qty = (tradeAmount / currentPrice).toFixed(3);
      
      console.log("[TradingBot] Assumed balance: $" + assumedBalance + ", Trade amount: $" + tradeAmount + ", Qty: " + qty);

      // Kaldıraç ayarı WebSocket'te yapılacak

      // Stop Loss ve Take Profit hesapla
      const stopLoss = side === "buy"
        ? (currentPrice * (1 - this.stopLossPercent / 100)).toFixed(2)
        : (currentPrice * (1 + this.stopLossPercent / 100)).toFixed(2);

      const takeProfit = side === "buy"
        ? (currentPrice * (1 + this.takeProfitPercent / 100)).toFixed(2)
        : (currentPrice * (1 - this.takeProfitPercent / 100)).toFixed(2);

      console.log("[TradingBot] Executing trade:", {
        side: side === "buy" ? "Buy" : "Sell",
        qty,
        currentPrice,
        stopLoss,
        takeProfit,
        confidence,
      });

      // WebSocket ile işlem aç (REST API fallback ile)
      let result;
      if (this.bybitWS?.isConnected()) {
        result = await this.bybitWS.placeOrder(
          this.symbol,
          side === "buy" ? "Buy" : "Sell",
          qty,
          stopLoss,
          takeProfit
        );
      } else {
        // REST API fallback
        result = await this.bybit.placeOrder(
          this.symbol,
          side === "buy" ? "Buy" : "Sell",
          qty,
          "Market",
          undefined,
          stopLoss,
          takeProfit
        );
      }

      if (result.success) {
        console.log(`[TradingBot] Trade opened successfully: ${result.orderId}`);
      }

      return result;
    } catch (error: any) {
      console.error("[TradingBot] Trade execution error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bot döngüsünü başlat
   */
  async start() {
    if (this.running) return;
    this.running = true;
    console.log(`[TradingBot] Bot started in ${this.isMainnet ? 'MAINNET' : 'TESTNET'} mode`);

    while (this.running) {
      try {
        const analysis = await this.analyzeMarket();

        if (analysis.confidence >= 50 && analysis.signal !== "hold") {
          await this.executeTrade(analysis.signal, analysis.confidence, analysis.reason);
        }

        // 20 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 20000));
      } catch (error) {
        console.error("[TradingBot] Error in bot loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Bot döngüsünü durdur
   */
  stop() {
    this.running = false;
    console.log("[TradingBot] Bot stopped");
  }

  /**
   * Bot çalışıyor mu?
   */
  isRunning(): boolean {
    return this.running;
  }
}

// Global bot instance
let botInstance: TradingBot | null = null;

export function startBot(userId: number, isMainnet: boolean = false): { success: boolean; message: string; error?: string } {
  if (botInstance?.isRunning()) {
    return { success: false, message: "Bot zaten çalışıyor" };
  }

  botInstance = new TradingBot(userId, "BTCUSDT", 10, 5, 2, 4, isMainnet);

  botInstance.initialize().then((success) => {
    if (success) {
      botInstance?.start();
    } else {
      console.error("[TradingBot] Failed to initialize bot");
    }
  });

  return { success: true, message: `Bot başlatıldı (${isMainnet ? 'MAINNET' : 'TESTNET'})` };
}

export function stopBot(userId: number): { success: boolean; message: string } {
  if (!botInstance?.isRunning()) {
    return { success: false, message: "Bot çalışmıyor" };
  }

  botInstance.stop();
  return { success: true, message: "Bot durduruldu" };
}

export function getBotStatus(userId: number): {
  running: boolean;
  mode: "MAINNET" | "TESTNET";
  symbol: string;
} {
  return {
    running: botInstance?.isRunning() ?? false,
    mode: botInstance?.isMainnetMode() ? "MAINNET" : "TESTNET",
    symbol: "BTCUSDT",
  };
}

export function setTradingMode(userId: number, isMainnet: boolean) {
  if (botInstance) {
    botInstance.setMainnetMode(isMainnet);
    return { success: true, message: `${isMainnet ? 'MAINNET' : 'TESTNET'} moduna geçildi` };
  }
  return { success: false, message: "Bot instance bulunamadı" };
}
