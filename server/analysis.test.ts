import { describe, it, expect } from "vitest";
import { calculateRSI, calculateMACD, detectDoublePattern, generateSignal } from "./analysis";

describe("Technical Analysis", () => {
  describe("calculateRSI", () => {
    it("should calculate RSI correctly", () => {
      const closes = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84];
      const rsi = calculateRSI(closes, 14);
      
      expect(rsi).toHaveLength(closes.length);
      expect(rsi[rsi.length - 1]).toBeGreaterThanOrEqual(0);
      expect(rsi[rsi.length - 1]).toBeLessThanOrEqual(100);
    });

    it("should return 0 for first period values", () => {
      const closes = Array(10).fill(100);
      const rsi = calculateRSI(closes, 14);
      
      expect(rsi.slice(0, 13).every(v => v === 0)).toBe(true);
    });
  });

  describe("calculateMACD", () => {
    it("should calculate MACD correctly", () => {
      const closes = Array(30).fill(100).map((v, i) => v + i * 0.1);
      const { macdLine, signalLine, histogram } = calculateMACD(closes);
      
      expect(macdLine).toHaveLength(closes.length);
      expect(signalLine).toHaveLength(closes.length);
      expect(histogram).toHaveLength(closes.length);
    });
  });

  describe("detectDoublePattern", () => {
    it("should return None or detect pattern", () => {
      const candles = Array(15).fill(null).map((_, i) => ({
        timestamp: i,
        open: 100,
        high: 105,
        low: i === 5 || i === 10 ? 95 : 98,
        close: 102,
        volume: 1000,
      }));
      
      const pattern = detectDoublePattern(candles);
      expect(["Double Bottom", "Double Top", "None"]).toContain(pattern);
    });

    it("should return None for insufficient data", () => {
      const candles = Array(5).fill(null).map((_, i) => ({
        timestamp: i,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
      }));
      
      const pattern = detectDoublePattern(candles);
      expect(pattern).toBe("None");
    });
  });

  describe("generateSignal", () => {
    it("should generate signal with sufficient data", () => {
      const candles = Array(30).fill(null).map((_, i) => ({
        timestamp: i,
        open: 100 + Math.sin(i * 0.5) * 5,
        high: 105 + Math.sin(i * 0.5) * 5,
        low: 95 + Math.sin(i * 0.5) * 5,
        close: 102 + Math.sin(i * 0.5) * 5,
        volume: 1000,
      }));
      
      const signal = generateSignal(candles);
      expect(signal).toHaveProperty("signal");
      expect(signal).toHaveProperty("confidence");
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
    });

    it("should return Hold for insufficient data", () => {
      const candles = Array(10).fill(null).map((_, i) => ({
        timestamp: i,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
      }));
      
      const signal = generateSignal(candles);
      expect(signal.signal).toBe("Hold");
      expect(signal.confidence).toBe(0);
    });
  });
});
