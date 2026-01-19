import { BybitManager } from "./bybit";
import * as db from "./db";
import { calculateRSI, calculateMACD, detectDoublePattern, generateSignal } from "./analysis";
import { notifyOwner } from "./_core/notification";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Sinyal Üretici - Belirli aralıklarla piyasa verilerini analiz eder
 */
export class SignalGenerator {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  /**
   * Sinyal üretimini başlat
   */
  async start(intervalSeconds: number = 3600) {
    if (this.isRunning) {
      console.log("[SignalGenerator] Already running");
      return;
    }

    this.isRunning = true;
    console.log(`[SignalGenerator] Started with interval: ${intervalSeconds}s`);

    // İlk çalıştırmayı hemen yap
    await this.generateSignals();

    // Sonra belirli aralıklarla çalıştır
    this.interval = setInterval(async () => {
      try {
        await this.generateSignals();
      } catch (error) {
        console.error("[SignalGenerator] Error in interval:", error);
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Sinyal üretimini durdur
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log("[SignalGenerator] Stopped");
  }

  /**
   * Tüm kullanıcılar için sinyaller üret
   */
  private async generateSignals() {
    try {
      console.log("[SignalGenerator] Generating signals...");

      // Örnek semboller
      const symbols = ["BTCUSDT", "ETHUSDT"];
      const interval = "60"; // 1 saat

      for (const symbol of symbols) {
        try {
          // Bybit'ten K-Line verilerini çek (API key olmadan, sadece market data)
          const bybit = new BybitManager("", "");
          const klineData = await bybit.getKlineData(symbol, interval, 100);

          if (!klineData || klineData.length === 0) continue;

          // Candle formatına dönüştür
          const candles: Candle[] = klineData.map((k: any) => ({
            timestamp: typeof k.time === "string" ? parseInt(k.time) : k.time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: 0,
          }));

          // Sinyal oluştur
          const signalData = generateSignal(candles);

          if (signalData.signal !== "Hold" && signalData.confidence >= 50) {
            console.log(
              `[SignalGenerator] ${symbol}: ${signalData.signal} (${signalData.confidence}%) - ${signalData.reason}`
            );

            // Kritik sinyallerde proje sahibine bildirim gönder
            if (signalData.confidence >= 75) {
              try {
                const title = `🚨 Kritik Trading Sinyali: ${symbol}`;
                const content = `${signalData.signal} sinyali olusturuldu!\n\nGuven: %${signalData.confidence}\nNeden: ${signalData.reason}\nRSI: ${signalData.rsi}\nPattern: ${signalData.pattern || "Yok"}`;
                
                await notifyOwner({
                  title,
                  content,
                });
                
                console.log(`[SignalGenerator] Critical signal notification sent for ${symbol}`);
              } catch (error) {
                console.error("[SignalGenerator] Notification error:", error);
              }
            }
          }
        } catch (error) {
          console.error(`[SignalGenerator] Error processing ${symbol}:`, error);
        }
      }
    } catch (error) {
      console.error("[SignalGenerator] Error generating signals:", error);
    }
  }
}

// Global instance
export const signalGenerator = new SignalGenerator();
