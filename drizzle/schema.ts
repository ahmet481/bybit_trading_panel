import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * API Keys - Kullanıcıların Bybit API anahtarlarını şifreli olarak saklar
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiKey: text("apiKey").notNull(), // şifreli olarak saklanacak
  apiSecret: text("apiSecret").notNull(), // şifreli olarak saklanacak
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Signals - Otomatik olarak üretilen alım/satım sinyalleri
 */
export const signals = mysqlTable("signals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(), // BTCUSDT, ETHUSDT vb.
  signalType: mysqlEnum("signalType", ["buy", "sell"]).notNull(),
  confidence: int("confidence").notNull(), // 0-100 arası güven skoru
  rsi: varchar("rsi", { length: 10 }),
  macd: varchar("macd", { length: 10 }),
  pattern: varchar("pattern", { length: 50 }), // Double Bottom, Double Top vb.
  price: varchar("price", { length: 20 }).notNull(),
  newsInfluence: int("newsInfluence").default(0), // LLM tabanlı haber etkisi
  isExecuted: int("isExecuted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = typeof signals.$inferInsert;

/**
 * Positions - Açık işlem pozisyonları
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  entryPrice: varchar("entryPrice", { length: 20 }).notNull(),
  quantity: varchar("quantity", { length: 20 }).notNull(),
  stopLoss: varchar("stopLoss", { length: 20 }),
  takeProfit: varchar("takeProfit", { length: 20 }),
  status: mysqlEnum("status", ["open", "closed", "pending"]).default("open").notNull(),
  unrealizedPnL: varchar("unrealizedPnL", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Trades - Tamamlanan işlemler ve performans verisi
 */
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  positionId: int("positionId").references(() => positions.id),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  side: mysqlEnum("side", ["buy", "sell"]).notNull(),
  entryPrice: varchar("entryPrice", { length: 20 }).notNull(),
  exitPrice: varchar("exitPrice", { length: 20 }).notNull(),
  quantity: varchar("quantity", { length: 20 }).notNull(),
  pnl: varchar("pnl", { length: 20 }).notNull(),
  pnlPercent: varchar("pnlPercent", { length: 10 }).notNull(),
  duration: int("duration").notNull(), // Saniye cinsinden
  signalId: int("signalId").references(() => signals.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt").notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

/**
 * Signal History - Sinyal performans takibi
 */
export const signalHistory = mysqlTable("signal_history", {
  id: int("id").autoincrement().primaryKey(),
  signalId: int("signalId").notNull().references(() => signals.id, { onDelete: "cascade" }),
  tradeId: int("tradeId").references(() => trades.id),
  outcome: mysqlEnum("outcome", ["win", "loss", "pending"]).default("pending").notNull(),
  profitLoss: varchar("profitLoss", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SignalHistory = typeof signalHistory.$inferSelect;
export type InsertSignalHistory = typeof signalHistory.$inferInsert;