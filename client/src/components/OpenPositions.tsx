import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Position {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  stopLoss: number;
  takeProfit: number;
  openTime: string;
}

interface OpenPositionsProps {
  positions: Position[];
  isLoading?: boolean;
}

export function OpenPositions({ positions, isLoading = false }: OpenPositionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Açık İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Açık İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Açık işlem yok</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Açık İşlemler ({positions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.map((position) => (
            <div
              key={position.id}
              className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Symbol & Side */}
                <div>
                  <div className="text-sm text-muted-foreground">Sembol</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant={position.side === "Long" ? "default" : "destructive"}>
                      {position.side === "Long" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {position.side}
                    </Badge>
                  </div>
                </div>

                {/* Entry Price */}
                <div>
                  <div className="text-sm text-muted-foreground">Giriş Fiyatı</div>
                  <div className="font-semibold mt-1">${position.entryPrice.toFixed(2)}</div>
                </div>

                {/* Current Price */}
                <div>
                  <div className="text-sm text-muted-foreground">Mevcut Fiyat</div>
                  <div className="font-semibold mt-1">${position.currentPrice.toFixed(2)}</div>
                </div>

                {/* Quantity */}
                <div>
                  <div className="text-sm text-muted-foreground">Miktar</div>
                  <div className="font-semibold mt-1">{position.quantity.toFixed(4)}</div>
                </div>

                {/* Stop Loss */}
                <div>
                  <div className="text-sm text-muted-foreground">Stop Loss</div>
                  <div className="font-semibold mt-1 text-red-500">${position.stopLoss.toFixed(2)}</div>
                </div>

                {/* Take Profit */}
                <div>
                  <div className="text-sm text-muted-foreground">Take Profit</div>
                  <div className="font-semibold mt-1 text-green-500">${position.takeProfit.toFixed(2)}</div>
                </div>

                {/* PnL */}
                <div>
                  <div className="text-sm text-muted-foreground">PnL</div>
                  <div
                    className={`font-semibold mt-1 ${
                      position.pnl >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    ${position.pnl.toFixed(2)}
                  </div>
                </div>

                {/* PnL % */}
                <div>
                  <div className="text-sm text-muted-foreground">PnL %</div>
                  <div
                    className={`font-semibold mt-1 ${
                      position.pnlPercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Open Time */}
              <div className="text-xs text-muted-foreground mt-3">
                Açılış: {new Date(position.openTime).toLocaleString("tr-TR")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
