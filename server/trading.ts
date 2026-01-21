import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { positions } from "../drizzle/schema";

export async function executeManualTrade(
  userId: number,
  symbol: string,
  side: "long" | "short",
  quantity: string,
  stopLoss: string,
  takeProfit: string,
  entryPrice: string
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Bybit'e emir gönder (simülasyon)
    // Gerçek ortamda Bybit API'ye bağlanılacak

    // İşlemi veritabanına kaydet
    await db.insert(positions).values({
      userId,
      symbol,
      side: side as "long" | "short",
      quantity,
      entryPrice,
      stopLoss,
      takeProfit,
      status: "open",
      createdAt: new Date(),
    });

    return {
      success: true,
      message: `${side === "long" ? "Alış" : "Satış"} emri başarıyla gönderildi`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "İşlem başarısız",
    };
  }
}

export async function closeManualTrade(userId: number, positionId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // İşlemi kapat
    await db
      .update(positions)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(positions.id, positionId));

    return {
      success: true,
      message: "İşlem kapatıldı",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "İşlem kapatılamadı",
    };
  }
}
