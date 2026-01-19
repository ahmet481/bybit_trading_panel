import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
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
        if (!apiKey) return { balance: "0", error: "API Key not configured" };
        
        return { balance: "0" };
      } catch (error) {
        return { balance: "0", error: String(error) };
      }
    }),

    saveApiKey: protectedProcedure
      .input(z.object({ apiKey: z.string(), apiSecret: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await db.saveApiKey(ctx.user.id, input.apiKey, input.apiSecret);
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }),

    getSignals: protectedProcedure.query(async ({ ctx }) => {
      try {
        const signals = await db.getRecentSignals(ctx.user.id, 50);
        return signals;
      } catch (error) {
        return [];
      }
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      try {
        const stats = await db.getSignalStats(ctx.user.id);
        return stats || { totalTrades: 0, winningTrades: 0, winRate: "0", totalPnL: "0" };
      } catch (error) {
        return { totalTrades: 0, winningTrades: 0, winRate: "0", totalPnL: "0" };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
