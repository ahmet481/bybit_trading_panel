import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  openTime: string;
  closeTime: string;
  duration: string;
}

interface TradeHistoryProps {
  trades: Trade[];
  isLoading?: boolean;
}

export function TradeHistory({ trades, isLoading = false }: TradeHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        </CardContent>
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Henüz işlem yok</div>
        </CardContent>
      </Card>
    );
  }

  const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winRate = (trades.filter((t) => t.pnl > 0).length / trades.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>İşlem Geçmişi ({trades.length})</CardTitle>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Toplam PnL:</span>
              <span className={`ml-2 font-semibold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                ${totalPnL.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Kazanç Oranı:</span>
              <span className="ml-2 font-semibold text-blue-500">{winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Sembol</th>
                <th className="text-left py-2 px-2">Yön</th>
                <th className="text-right py-2 px-2">Giriş Fiyatı</th>
                <th className="text-right py-2 px-2">Çıkış Fiyatı</th>
                <th className="text-right py-2 px-2">Miktar</th>
                <th className="text-right py-2 px-2">PnL</th>
                <th className="text-right py-2 px-2">PnL %</th>
                <th className="text-left py-2 px-2">Süre</th>
                <th className="text-left py-2 px-2">Açılış Zamanı</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b hover:bg-accent/50 transition-colors">
                  <td className="py-2 px-2 font-semibold">{trade.symbol}</td>
                  <td className="py-2 px-2">
                    <Badge variant={trade.side === "Long" ? "default" : "destructive"}>
                      {trade.side === "Long" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {trade.side}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-right">${trade.entryPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">${trade.exitPrice.toFixed(2)}</td>
                  <td className="py-2 px-2 text-right">{trade.quantity.toFixed(4)}</td>
                  <td
                    className={`py-2 px-2 text-right font-semibold ${
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    ${trade.pnl.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-semibold ${
                      trade.pnlPercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
                  </td>
                  <td className="py-2 px-2">{trade.duration}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">
                    {new Date(trade.openTime).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
