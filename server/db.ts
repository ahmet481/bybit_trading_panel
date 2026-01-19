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
