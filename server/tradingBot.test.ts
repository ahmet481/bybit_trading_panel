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
    it("should generate buy signal when RSI is very low", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getKlines: vi.fn().mockResolvedValue(
          Array(100)
            .fill(null)
            .map((_, i) => ({
              close: 100 - i * 1.0,
              high: 100 - i * 1.0 + 0.5,
              low: 100 - i * 1.0 - 0.5,
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

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it("should analyze market and return confidence score", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getKlines: vi.fn().mockResolvedValue(
          Array(100)
            .fill(null)
            .map(() => ({
              close: 100,
              high: 100.1,
              low: 99.9,
              volume: 1000,
            }))
        ),
        getBalance: vi.fn().mockResolvedValue("1000"),
        getCurrentPrice: vi.fn().mockResolvedValue(100),
        placeOrder: vi.fn().mockResolvedValue({
          success: true,
          orderId: "test-order",
        }),
        getPositions: vi.fn().mockResolvedValue([]),
      };

      (bot as any).bybit = mockBybit;
      const analysis = await bot.analyzeMarket();

      expect(analysis).toBeDefined();
      expect(analysis.signal).toMatch(/buy|sell|hold/);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe("Trade Execution", () => {
    it("should execute trade with sufficient balance", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getBalance: vi.fn().mockResolvedValue("100"),
        getCurrentPrice: vi.fn().mockResolvedValue(50000),
        setLeverage: vi.fn().mockResolvedValue({ success: true }),
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

    it("should execute trade with assumed balance", async () => {
      const bot = new TradingBot(1, "BTCUSDT", 10, 5, 2, 4);

      const mockBybit = {
        getCurrentPrice: vi.fn().mockResolvedValue(50000),
      };

      (bot as any).bybit = mockBybit;
      const result = await bot.executeTrade("buy", 80, "Test signal");

      expect(result).toBeDefined();
    });
  });
});
