import { BybitManager } from "./bybit";
import { calculateRSI, calculateMACD, detectDoublePattern } from "./analysis";
import { getDb, getApiKeyByUserId } from "./db";
import { signals, positions } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

/**
 * Otomatik Trading Bot
 * RSI + MACD + Formasyon stratejisi ile işlem açar
 */
export class TradingBot {
  private userId: number;
  private bybit: BybitManager | null = null;
  private isRunning: boolean = false;
  private symbol: string;
  private leverage: number;
  private riskPercent: number;
  private stopLossPercent: number;
  private takeProfitPercent: number;

  constructor(
    userId: number,
    symbol: string = "BTCUSDT",
    leverage: number = 10,
    riskPercent: number = 5,
    stopLossPercent: number = 2,
    takeProfitPercent: number = 4
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
      const apiKey = await getApiKeyByUserId(this.userId);
      if (!apiKey) {
        console.log("[TradingBot] No API key found for user:", this.userId);
        return false;
      }

      this.bybit = new BybitManager(apiKey.apiKey, apiKey.apiSecret);
      
      // Kaldıracı ayarla
      await this.bybit.setLeverage(this.symbol, this.leverage);
      
      console.log("[TradingBot] Initialized for user:", this.userId);
      return true;
    } catch (error) {
      console.error("[TradingBot] Initialization error:", error);
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

    // Teknik analiz yap
    const rsiValues = calculateRSI(closes);
    const rsi = rsiValues[rsiValues.length - 1];
    
    const macdResult = calculateMACD(closes);
    const macdHistogram = macdResult.histogram[macdResult.histogram.length - 1];
    const macdValue = macdResult.macdLine[macdResult.macdLine.length - 1];
    const macdSignal = macdResult.signalLine[macdResult.signalLine.length - 1];
    
    // Formasyon tespiti için candle verilerini hazırla
    const candles = closes.map((close: number, i: number) => ({
      timestamp: i,
      open: closes[i],
      high: highs[i],
      low: lows[i],
      close: close,
      volume: 0,
    }));
    
    const detectedPattern = detectDoublePattern(candles);
    const doubleTop = detectedPattern === "double_top";
    const doubleBottom = detectedPattern === "double_bottom";

    // Sinyal üret
    let signal: "buy" | "sell" | "hold" = "hold";
    let confidence = 0;
    let reasons: string[] = [];
    let pattern: string | null = null;

    // RSI Analizi (daha gevşek eşikler)
    if (rsi < 35) {
      signal = "buy";
      confidence += 25;
      reasons.push("RSI satım bölgesinde");
    } else if (rsi > 65) {
      signal = "sell";
      confidence += 25;
      reasons.push("RSI alım bölgesinde");
    } else if (rsi < 50) {
      signal = "buy";
      confidence += 10;
      reasons.push("RSI düşüş trendi");
    } else if (rsi > 50) {
      signal = "sell";
      confidence += 10;
      reasons.push("RSI yükseliş trendi");
    }

    // MACD Analizi
    if (macdHistogram > 0 && macdValue > macdSignal) {
      if (signal === "buy" || signal === "hold") {
        signal = "buy";
        confidence += 25;
        reasons.push("MACD pozitif kesişim");
      }
    } else if (macdHistogram < 0 && macdValue < macdSignal) {
      if (signal === "sell" || signal === "hold") {
        signal = "sell";
        confidence += 25;
        reasons.push("MACD negatif kesişim");
      }
    }

    // Formasyon Analizi
    if (doubleBottom) {
      if (signal === "buy" || signal === "hold") {
        signal = "buy";
        confidence += 25;
        reasons.push("Çift Dip formasyonu tespit edildi");
        pattern = detectedPattern;
      }
    }
    
    if (doubleTop) {
      if (signal === "sell" || signal === "hold") {
        signal = "sell";
        confidence += 25;
        reasons.push("Çift Tepe formasyonu tespit edildi");
        pattern = detectedPattern;
      }
    }

    // Trend Analizi (Son 20 mum)
    const recentCloses = closes.slice(-20);
    const avgRecent = recentCloses.reduce((a: number, b: number) => a + b, 0) / recentCloses.length;
    const currentPrice = closes[closes.length - 1];

    if (currentPrice > avgRecent * 1.01) {
      if (signal === "buy") confidence += 10;
      reasons.push("Yükseliş trendi");
    } else if (currentPrice < avgRecent * 0.99) {
      if (signal === "sell") confidence += 10;
      reasons.push("Düşüş trendi");
    }

    // Minimum güven eşiği (çok gevşetildi - daha kolay işlem açsın)
    if (confidence < 15) {
      signal = "hold";
    }

    return {
      signal,
      confidence: Math.min(confidence, 100),
      reason: reasons.join(", "),
      rsi,
      macdHistogram,
      pattern,
    };
  }

  /**
   * İşlem aç
   */
  async executeTrade(
    side: "buy" | "sell",
    confidence: number,
    reason: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    if (!this.bybit) throw new Error("Bot not initialized");

    try {
      // Bakiyeyi al
      const balance = parseFloat(await this.bybit.getBalance("USDT"));
      if (balance < 10) {
        return { success: false, error: "Yetersiz bakiye (min 10 USDT)" };
      }

      // Güncel fiyatı al
      const currentPrice = await this.bybit.getCurrentPrice(this.symbol);

      // İşlem miktarını hesapla (risk yüzdesi)
      const tradeAmount = (balance * this.riskPercent) / 100;
      const qty = ((tradeAmount * this.leverage) / currentPrice).toFixed(3);

      // Stop-loss ve take-profit hesapla
      let stopLoss: string;
      let takeProfit: string;

      if (side === "buy") {
        stopLoss = (currentPrice * (1 - this.stopLossPercent / 100)).toFixed(2);
        takeProfit = (currentPrice * (1 + this.takeProfitPercent / 100)).toFixed(2);
      } else {
        stopLoss = (currentPrice * (1 + this.stopLossPercent / 100)).toFixed(2);
        takeProfit = (currentPrice * (1 - this.takeProfitPercent / 100)).toFixed(2);
      }

      console.log("[TradingBot] Executing trade:", {
        side,
        qty,
        currentPrice,
        stopLoss,
        takeProfit,
        confidence,
      });

      // İşlemi aç
      const orderSide = side === "buy" ? "Buy" : "Sell";
      const result = await this.bybit.placeOrder(
        this.symbol,
        orderSide,
        qty,
        "Market",
        undefined,
        stopLoss,
        takeProfit
      );

      if (result.success) {
        // Veritabanına kaydet
        const db = await getDb();
        if (db) {
          await db.insert(positions).values({
            userId: this.userId,
            symbol: this.symbol,
            side: side === "buy" ? "long" : "short",
            entryPrice: currentPrice.toString(),
            quantity: qty,
            stopLoss,
            takeProfit,
            status: "open",
          });

          // Sinyal kaydet
          await db.insert(signals).values({
            userId: this.userId,
            symbol: this.symbol,
            signalType: side,
            confidence,
            price: currentPrice.toString(),
            pattern: reason,
            isExecuted: 1,
          });
        }

        // Bildirim gönder
        await notifyOwner({
          title: `🤖 Bot İşlem Açtı: ${side.toUpperCase()}`,
          content: `Symbol: ${this.symbol}\nMiktar: ${qty}\nFiyat: ${currentPrice}\nSL: ${stopLoss}\nTP: ${takeProfit}\nGüven: ${confidence}%\nSebep: ${reason}`,
        });

        return { success: true, orderId: result.orderId };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      console.error("[TradingBot] Trade execution error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Açık pozisyonları kontrol et
   */
  async checkOpenPositions(): Promise<any[]> {
    if (!this.bybit) throw new Error("Bot not initialized");
    return this.bybit.getPositions(this.symbol);
  }

  /**
   * Bot döngüsünü çalıştır
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.log("[TradingBot] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[TradingBot] Starting bot loop...");

    while (this.isRunning) {
      try {
        // Açık pozisyon var mı kontrol et
        const openPositions = await this.checkOpenPositions();
        const hasOpenPosition = openPositions.some(
          (p: any) => parseFloat(p.size) > 0
        );

        if (!hasOpenPosition) {
          // Piyasayı analiz et
          const analysis = await this.analyzeMarket();
          console.log("[TradingBot] Analysis:", analysis);

          // Sinyal varsa işlem aç (confidence eşiği çok düşürüldü)
          if (analysis.signal !== "hold" && analysis.confidence >= 15) {
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

        // 20 saniye        // 20 saniye bekle (daha sık analiz)
        await new Promise((resolve) => setTimeout(resolve, 20000));
      } catch (error) {
        console.error("[TradingBot] Error in loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 10000));      }
    }
  }

  /**
   * Bot'u durdur
   */
  stop(): void {
    this.isRunning = false;
    console.log("[TradingBot] Stopped");
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
 * Bot durumunu kontrol et
 */
export function getBotStatus(userId: number): { running: boolean } {
  return { running: activeBots.has(userId) };
}
