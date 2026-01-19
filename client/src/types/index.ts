export interface Signal {
  id: number;
  userId: number;
  symbol: string;
  signalType: "buy" | "sell";
  confidence: number;
  rsi: string | null;
  macd: string | null;
  pattern: string | null;
  price: string;
  newsInfluence: number | null;
  isExecuted: number;
  createdAt: Date;
}

export interface ApiKey {
  id: number;
  userId: number;
  apiKey: string;
  apiSecret: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: number;
  userId: number;
  symbol: string;
  side: "long" | "short";
  entryPrice: string;
  quantity: string;
  stopLoss?: string;
  takeProfit?: string;
  status: "open" | "closed" | "pending";
  unrealizedPnL?: string;
  createdAt: Date;
  closedAt?: Date;
}

export interface Trade {
  id: number;
  userId: number;
  positionId?: number;
  symbol: string;
  side: "buy" | "sell";
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  pnl: string;
  pnlPercent: string;
  duration: number;
  signalId?: number;
  createdAt: Date;
  closedAt: Date;
}
