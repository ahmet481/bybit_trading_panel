import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { BybitManager } from "./bybit";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  trading: router({
    getBalance: protectedProcedure.query(async ({ ctx }) => {
      try {
        const apiKey = await db.getApiKeyByUserId(ctx.user.id);
        if (!apiKey) return { balance: "0", error: "API anahtarı yapılandırılmamış" };
        
        try {
          console.log("[Trading] Getting balance for user:", ctx.user.id, "(Mainnet)");
          
          const bybit = new BybitManager(apiKey.apiKey, apiKey.apiSecret);
          const balance = await bybit.getBalance("USDT");
          
          console.log("[Trading] Balance retrieved:", balance);
          return { balance, error: null };
        } catch (bybitError: any) {
          console.error("[Trading] Bybit API Error:", {
            message: bybitError.message,
            status: bybitError.response?.status,
            data: bybitError.response?.data,
          });
          return { 
            balance: "0", 
            error: `Bybit bağlantı hatası: ${bybitError.message}` 
          };
        }
      } catch (error: any) {
        console.error("[Trading] Balance fetch error:", error);
        return { balance: "0", error: String(error.message) };
      }
    }),

    saveApiKey: protectedProcedure
      .input(z.object({ apiKey: z.string(), apiSecret: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await db.saveApiKey(ctx.user.id, input.apiKey, input.apiSecret);
          return { success: true };
        } catch (error: any) {
          console.error("[Trading] Save API key error:", error);
          return { success: false, error: String(error.message) };
        }
      }),

    getChartData: protectedProcedure
      .input(z.object({ symbol: z.string(), interval: z.string().default("60") }))
      .query(async ({ input }) => {
        try {
          const bybit = new BybitManager("dummy", "dummy");
          const klineData = await bybit.getKlineData(input.symbol, input.interval, 100);
          
          return { data: klineData, error: null };
        } catch (error: any) {
          console.error("[Trading] Chart data error:", error);
          return { data: [], error: String(error.message) };
        }
      }),

    analyzeSentiment: protectedProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const { marketAnalysis } = await import("./marketAnalysis");
          const sentiment = await marketAnalysis.analyzeSentiment(input.symbol);
          return sentiment;
        } catch (error: any) {
          console.error("[Trading] Sentiment analysis error:", error);
          return { sentiment: "neutral", score: 0, summary: "Analiz yapılamadı" };
        }
      }),

    startBot: protectedProcedure
      .input(z.object({
        symbol: z.string().default("BTCUSDT"),
        leverage: z.number().default(10),
        riskPercent: z.number().default(5),
        stopLossPercent: z.number().default(2),
        takeProfitPercent: z.number().default(4),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const { startBot } = await import("./tradingBot");
          const result = await startBot(
            ctx.user.id,
            input.symbol,
            input.leverage,
            input.riskPercent,
            input.stopLossPercent,
            input.takeProfitPercent
          );
          return result;
        } catch (error: any) {
          console.error("[Trading] Start bot error:", error);
          return { success: false, error: error.message };
        }
      }),

    stopBot: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        const { stopBot } = await import("./tradingBot");
        const result = stopBot(ctx.user.id);
        return result;
      } catch (error: any) {
        console.error("[Trading] Stop bot error:", error);
        return { success: false, error: error.message };
      }
    }),

    getBotStatus: protectedProcedure.query(async ({ ctx }) => {
      try {
        const { getBotStatus } = await import("./tradingBot");
        const status = getBotStatus(ctx.user.id);
        return status;
      } catch (error: any) {
        console.error("[Trading] Get bot status error:", error);
        return { running: false };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
