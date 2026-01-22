import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Settings, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import SignalsTable from "@/components/SignalsTable";
import TradingChart from "@/components/TradingChart";
import PerformanceStats from "@/components/PerformanceStats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { OpenPositions } from "@/components/OpenPositions";
import { CandlestickChart } from "@/components/CandlestickChart";
import { TradeHistory } from "@/components/TradeHistory";
import { CandlestickChartLW } from "@/components/CandlestickChartLW";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "DOGEUSDT"];

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"loaded" | "not-loaded">("not-loaded");
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [chartInterval, setChartInterval] = useState("60");

  // API anahtarlarını otomatik yükle
  useEffect(() => {
    if (user) {
      const savedApiKey = localStorage.getItem(`apiKey_${user.id}`);
      if (savedApiKey) {
        setApiKeyStatus("loaded");
      } else {
        setApiKeyStatus("not-loaded");
      }
    }
  }, [user]);

  const { data: balance, isLoading: balanceLoading } = trpc.trading.getBalance.useQuery();
  const { data: botStatus } = trpc.trading.getBotStatus.useQuery();
  const { data: chartData, refetch: refetchChartData } = trpc.trading.getChartData.useQuery(
    {
      symbol: selectedSymbol,
      interval: chartInterval,
    },
    {
      refetchInterval: 30000,
    }
  );
  const { data: openPositions } = trpc.trading.getOpenPositions.useQuery(
    { symbol: selectedSymbol },
    {
      refetchInterval: 10000,
    }
  );
  const { data: tradeHistory } = trpc.trading.getTradeHistory.useQuery(
    { symbol: selectedSymbol, limit: 20 },
    {
      refetchInterval: 15000,
    }
  );
  const { data: tradeStats } = trpc.trading.getTradeStats.useQuery(
    undefined,
    {
      refetchInterval: 20000,
    }
  );
  const { data: userTrades } = trpc.trading.getUserTrades.useQuery(
    { limit: 50 },
    {
      refetchInterval: 20000,
    }
  );

  const handleTrade = async () => {
    if (!tradeQuantity || !stopLoss || !takeProfit) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    toast.success(`${tradeType === "buy" ? "Alım" : "Satım"} emri gönderildi: ${selectedSymbol} x ${tradeQuantity}`);
    setTradeQuantity("");
    setStopLoss("");
    setTakeProfit("");
    setShowTradeForm(false);
  };

  const startBotMutation = trpc.trading.startBot.useMutation();
  const stopBotMutation = trpc.trading.stopBot.useMutation();

  const handleStartBot = async () => {
    try {
      const result = await startBotMutation.mutateAsync({
        symbol: selectedSymbol,
        leverage: 10,
        riskPercent: 5,
        stopLossPercent: 2,
        takeProfitPercent: 4,
      });
      if (result.success) {
        toast.success("Bot başlatıldı!");
      } else {
        toast.error(`Hata: ${(result as any).error || (result as any).message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      toast.error("Bot başlatma hatası");
    }
  };

  const handleStopBot = async () => {
    try {
      const result = await stopBotMutation.mutateAsync();
      if (result.success) {
        toast.success("Bot durduruldu!");
      } else {
        toast.error(`Hata: ${(result as any).error || (result as any).message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      toast.error("Bot durdurma hatası");
    }
  };

  const handleTimeframeChange = (tf: string) => {
    const intervalMap: Record<string, string> = {
      "1m": "1",
      "5m": "5",
      "15m": "15",
      "1h": "60",
      "4h": "240",
      "1d": "1440",
    };
    setChartInterval(intervalMap[tf] || "60");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trading Dashboard</h1>
          <p className="text-gray-600">Giriş yapmanız gerekiyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Dashboard</h1>
            <p className="text-gray-600">Hoşgeldiniz, {user?.name || "Kullanıcı"}</p>
          </div>
          <div className="flex gap-2 items-center">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                apiKeyStatus === "loaded" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {apiKeyStatus === "loaded" ? "✓ Bağlı" : "✗ Bağlı Değil"}
            </div>
            <Button onClick={() => setShowApiKeyModal(true)} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              API Ayarları
            </Button>
          </div>
        </div>

        {/* Sembol Seçimi */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <Label className="text-lg font-semibold mb-3 block">Analiz Sembolü Seçin</Label>
          <div className="flex gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowTradeForm(!showTradeForm)} variant="default">
              {showTradeForm ? "Kapat" : "İşlem Aç"}
            </Button>
          </div>
        </div>

        {/* İşlem Formu */}
        {showTradeForm && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Manuel İşlem - {selectedSymbol}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>İşlem Türü</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant={tradeType === "buy" ? "default" : "outline"}
                      onClick={() => setTradeType("buy")}
                      className={tradeType === "buy" ? "bg-green-600" : ""}
                    >
                      Alış
                    </Button>
                    <Button
                      size="sm"
                      variant={tradeType === "sell" ? "default" : "outline"}
                      onClick={() => setTradeType("sell")}
                      className={tradeType === "sell" ? "bg-red-600" : ""}
                    >
                      Satış
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    placeholder="0.01"
                    value={tradeQuantity}
                    onChange={(e) => setTradeQuantity(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Stop Loss</Label>
                  <Input
                    type="number"
                    placeholder="Fiyat"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Take Profit</Label>
                  <Input
                    type="number"
                    placeholder="Fiyat"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleTrade} className="bg-blue-600 hover:bg-blue-700">
                  İşlemi Gönder
                </Button>
                <Button onClick={() => setShowTradeForm(false)} variant="outline">
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cüzdan Bakiyesi</CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="text-2xl font-bold text-gray-400">Yüklenıyor...</div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">${balance?.balance || "0"}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bot Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${botStatus?.running ? "text-green-600" : "text-red-600"}`}>
                {botStatus?.running ? "🟢 Çalışıyor" : "🔴 Durmuş"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam PnL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${parseFloat(tradeStats?.totalPnL || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${tradeStats?.totalPnL || "0"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Win Rate: {tradeStats?.winRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">İşlem İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{tradeStats?.totalTrades || 0} işlem</div>
              <p className="text-xs text-gray-500 mt-1">
                Kazanan: {tradeStats?.winningTrades || 0} | Kaybeden: {tradeStats?.losingTrades || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profesyonel Grafik */}
        {chartData?.data && chartData.data.length > 0 && (
          <div className="mb-8">
            <CandlestickChartLW 
              symbol={selectedSymbol} 
              data={chartData.data}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>
        )}

        {/* Açık İşlemler */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Açık Pozisyonlar</CardTitle>
            </CardHeader>
            <CardContent>
              {openPositions?.positions && openPositions.positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Sembol</th>
                        <th className="text-left py-2">Yön</th>
                        <th className="text-left py-2">Miktar</th>
                        <th className="text-left py-2">Giriş Fiyatı</th>
                        <th className="text-left py-2">Cari Fiyat</th>
                        <th className="text-left py-2">PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.positions.map((pos: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="py-2">{pos.symbol}</td>
                          <td className="py-2">
                            <span className={pos.side === "Buy" ? "text-green-600" : "text-red-600"}>
                              {pos.side === "Buy" ? "📈 Long" : "📉 Short"}
                            </span>
                          </td>
                          <td className="py-2">{pos.size}</td>
                          <td className="py-2">${parseFloat(pos.entryPrice).toFixed(2)}</td>
                          <td className="py-2">${parseFloat(pos.markPrice).toFixed(2)}</td>
                          <td className={`py-2 font-bold ${parseFloat(pos.unrealisedPnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${parseFloat(pos.unrealisedPnl).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">Açık pozisyon yok</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* İşlem Geçmişi */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>İşlem Geçmişi (Son 50)</CardTitle>
            </CardHeader>
            <CardContent>
              {userTrades?.trades && userTrades.trades.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Sembol</th>
                        <th className="text-left py-2">Yön</th>
                        <th className="text-left py-2">Giriş</th>
                        <th className="text-left py-2">Çıkış</th>
                        <th className="text-left py-2">Miktar</th>
                        <th className="text-left py-2">PnL</th>
                        <th className="text-left py-2">PnL %</th>
                        <th className="text-left py-2">Zaman</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTrades.trades.map((trade: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-2 font-medium">{trade.symbol}</td>
                          <td className="py-2">
                            <span className={trade.side === "buy" ? "text-green-600" : "text-red-600"}>
                              {trade.side === "buy" ? "📈 Alış" : "📉 Satış"}
                            </span>
                          </td>
                          <td className="py-2">${parseFloat(trade.entryPrice).toFixed(2)}</td>
                          <td className="py-2">${parseFloat(trade.exitPrice).toFixed(2)}</td>
                          <td className="py-2">{trade.quantity}</td>
                          <td className={`py-2 font-bold ${parseFloat(trade.pnl) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${parseFloat(trade.pnl).toFixed(2)}
                          </td>
                          <td className={`py-2 font-bold ${parseFloat(trade.pnlPercent) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {parseFloat(trade.pnlPercent).toFixed(2)}%
                          </td>
                          <td className="py-2 text-gray-500 text-xs">
                            {new Date(trade.closedAt).toLocaleString("tr-TR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">İşlem geçmişi yok</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bot Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bot Kontrolleri</h2>
          <div className="flex gap-4">
            <Button onClick={() => handleStartBot()} disabled={botStatus?.running} className="bg-green-600 hover:bg-green-700">
              Bot Başlat
            </Button>
            <Button onClick={() => handleStopBot()} disabled={!botStatus?.running} className="bg-red-600 hover:bg-red-700">
              Bot Durdur
            </Button>
          </div>
        </div>
      </div>

      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </div>
  );
}
