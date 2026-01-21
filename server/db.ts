import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, InsertSignal, signals, apiKeys, trades } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * API Key Management
 */
export async function getApiKeyByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function saveApiKey(userId: number, key: string, secret: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getApiKeyByUserId(userId);
  
  if (existing) {
    await db
      .update(apiKeys)
      .set({ apiKey: key, apiSecret: secret, updatedAt: new Date() })
      .where(eq(apiKeys.userId, userId));
  } else {
    await db.insert(apiKeys).values({ userId, apiKey: key, apiSecret: secret });
  }
}

/**
 * Signal Management
 */
export async function createSignal(signal: InsertSignal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(signals).values(signal);
  return result;
}

export async function getRecentSignals(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(signals)
    .where(eq(signals.userId, userId))
    .orderBy((s) => desc(s.createdAt))
    .limit(limit);
}

export async function getSignalStats(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const userTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId));
  
  if (userTrades.length === 0) return null;
  
  const totalTrades = userTrades.length;
  const winningTrades = userTrades.filter((t) => parseFloat(t.pnl) > 0).length;
  const totalPnL = userTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
  
  return {
    totalTrades,
    winningTrades,
    winRate: ((winningTrades / totalTrades) * 100).toFixed(2),
    totalPnL: totalPnL.toFixed(2),
  };
}


/**
 * Trade Management - İşlem Kayıt ve PnL Hesaplama
 */
export async function saveTrade(
  userId: number,
  symbol: string,
  side: "buy" | "sell",
  entryPrice: string,
  exitPrice: string,
  quantity: string,
  positionId?: number,
  signalId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const entry = parseFloat(entryPrice);
  const exit = parseFloat(exitPrice);
  const qty = parseFloat(quantity);

  // PnL hesapla
  let pnl: number;
  if (side === "buy") {
    pnl = (exit - entry) * qty;
  } else {
    pnl = (entry - exit) * qty;
  }

  const pnlPercent = ((pnl / (entry * qty)) * 100).toFixed(2);

  const result = await db.insert(trades).values({
    userId,
    symbol,
    side,
    entryPrice,
    exitPrice,
    quantity,
    pnl: pnl.toFixed(2),
    pnlPercent,
    duration: 0,
    positionId,
    signalId,
    createdAt: new Date(),
    closedAt: new Date(),
  });

  return result;
}

export async function getUserTrades(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy((t) => desc(t.closedAt))
    .limit(limit);
}

export async function getTradesBySymbol(userId: number, symbol: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId) && eq(trades.symbol, symbol))
    .orderBy((t) => desc(t.closedAt))
    .limit(limit);
}

export async function getTradeStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const userTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId));

  if (userTrades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: "0",
      totalPnL: "0",
      avgPnL: "0",
      profitFactor: "0",
    };
  }

  const totalTrades = userTrades.length;
  const winningTrades = userTrades.filter((t) => parseFloat(t.pnl) > 0).length;
  const losingTrades = userTrades.filter((t) => parseFloat(t.pnl) < 0).length;

  const totalPnL = userTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
  const avgPnL = totalPnL / totalTrades;

  const grossProfit = userTrades
    .filter((t) => parseFloat(t.pnl) > 0)
    .reduce((sum, t) => sum + parseFloat(t.pnl), 0);

  const grossLoss = Math.abs(
    userTrades
      .filter((t) => parseFloat(t.pnl) < 0)
      .reduce((sum, t) => sum + parseFloat(t.pnl), 0)
  );

  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : "0";

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: ((winningTrades / totalTrades) * 100).toFixed(2),
    totalPnL: totalPnL.toFixed(2),
    avgPnL: avgPnL.toFixed(2),
    profitFactor,
  };
}
