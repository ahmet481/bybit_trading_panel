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
          console.log("[Trading] Saving API key for user:", ctx.user.id);
          await db.saveApiKey(ctx.user.id, input.apiKey, input.apiSecret);
          return { success: true, message: "API anahtarları başarıyla kaydedildi" };
        } catch (error: any) {
          console.error("[Trading] Save API key error:", error);
          return { success: false, error: String(error.message) };
        }
      }),

    getSignals: protectedProcedure.query(async ({ ctx }) => {
      try {
        const signals = await db.getRecentSignals(ctx.user.id, 50);
        return signals;
      } catch (error: any) {
        console.error("[Trading] Get signals error:", error);
        return [];
      }
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      try {
        const stats = await db.getSignalStats(ctx.user.id);
        return stats || { totalTrades: 0, winningTrades: 0, winRate: "0", totalPnL: "0" };
      } catch (error: any) {
        console.error("[Trading] Get stats error:", error);
        return { totalTrades: 0, winningTrades: 0, winRate: "0", totalPnL: "0" };
      }
    }),

    getChartData: protectedProcedure
      .input(z.object({ symbol: z.string(), interval: z.string().default("60") }))
      .query(async ({ ctx, input }) => {
        try {
          const apiKey = await db.getApiKeyByUserId(ctx.user.id);
          if (!apiKey) return { data: [], error: "API anahtarı yapılandırılmamış" };
          
          const bybit = new BybitManager(apiKey.apiKey, apiKey.apiSecret);
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
  }),
});

export type AppRouter = typeof appRouter;
