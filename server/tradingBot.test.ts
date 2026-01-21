import { describe, it, expect, vi } from "vitest";
import * as tradingBot from "./tradingBot";
import { TradingBot } from "./tradingBot";

describe("Trading Bot", () => {
  it("should get bot status", () => {
    const status = tradingBot.getBotStatus(1);
    expect(status).toBeDefined();
    expect(status).toHaveProperty("running");
  });

  it("should handle stop bot when no bot is running", () => {
    const result = tradingBot.stopBot(999);
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  describe("Signal Generation", () => {
    it("should generate buy signal when RSI is low", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      // Mock bybit with downtrend (low RSI)
      const mockBybit = {
        getKlines: vi.fn().mockResolvedValue(
          Array(100)
            .fill(null)
            .map((_, i) => ({
              close: 100 - i * 0.5,
              high: 100 - i * 0.5 + 0.5,
              low: 100 - i * 0.5 - 0.5,
              volume: 1000,
            }))
        ),
        getBalance: vi.fn().mockResolvedValue("1000"),
        getCurrentPrice: vi.fn().mockResolvedValue(50),
        placeOrder: vi.fn().mockResolvedValue({
          success: true,
          orderId: "test-order",
        }),
        getPositions: vi.fn().mockResolvedValue([]),
      };

      (bot as any).bybit = mockBybit;
      const analysis = await bot.analyzeMarket();

      // Downtrend should generate buy signal
      expect(analysis.signal).toBe("buy");
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it("should generate sell signal when RSI is high", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      // Mock bybit with uptrend (high RSI)
      const mockBybit = {
        getKlines: vi.fn().mockResolvedValue(
          Array(100)
            .fill(null)
            .map((_, i) => ({
              close: 100 + i * 0.5,
              high: 100 + i * 0.5 + 0.5,
              low: 100 + i * 0.5 - 0.5,
              volume: 1000,
            }))
        ),
        getBalance: vi.fn().mockResolvedValue("1000"),
        getCurrentPrice: vi.fn().mockResolvedValue(150),
        placeOrder: vi.fn().mockResolvedValue({
          success: true,
          orderId: "test-order",
        }),
        getPositions: vi.fn().mockResolvedValue([]),
      };

      (bot as any).bybit = mockBybit;
      const analysis = await bot.analyzeMarket();

      // Uptrend should generate sell signal
      expect(analysis.signal).toBe("sell");
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe("Trade Execution", () => {
    it("should execute trade with sufficient balance", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getBalance: vi.fn().mockResolvedValue("100"),
        getCurrentPrice: vi.fn().mockResolvedValue(50000),
        placeOrder: vi.fn().mockResolvedValue({
          success: true,
          orderId: "order-123",
        }),
      };

      (bot as any).bybit = mockBybit;
      const result = await bot.executeTrade("buy", 80, "Test signal");

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order-123");
    });

    it("should reject trade with insufficient balance", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getBalance: vi.fn().mockResolvedValue("5"),
        getCurrentPrice: vi.fn().mockResolvedValue(50000),
      };

      (bot as any).bybit = mockBybit;
      const result = await bot.executeTrade("buy", 80, "Test signal");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Yetersiz bakiye");
    });
  });
});
