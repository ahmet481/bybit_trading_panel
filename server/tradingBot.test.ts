import { describe, it, expect } from "vitest";
import * as tradingBot from "./tradingBot";

describe("Trading Bot", () => {
  it("should get bot status", () => {
    const status = tradingBot.getBotStatus(1);
    expect(status).toBeDefined();
    expect(status).toHaveProperty("running");
  });

  it("should stop bot successfully", () => {
    const result = tradingBot.stopBot(1);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
