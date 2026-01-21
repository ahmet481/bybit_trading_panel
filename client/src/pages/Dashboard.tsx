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
import { ProChart } from "@/components/ProChart";

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
  const { data: chartData } = trpc.trading.getChartData.useQuery({
    symbol: selectedSymbol,
    interval: "60",
  });

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
        toast.success("Bot başlandı!");
      } else {
        toast.error(`Hata: ${result.error}`);
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
        toast.error(`Hata: ${result.error}`);
      }
    } catch (error) {
      toast.error("Bot durdurma hatası");
    }
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
                <div className="text-2xl font-bold text-gray-400">Yükleniyor...</div>
              ) : balance?.error ? (
                <div className="text-sm text-red-600">{balance.error}</div>
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
        </div>

        {/* Profesyonel Grafik */}
        {chartData?.data && chartData.data.length > 0 && (
          <div className="mb-8">
            <ProChart symbol={selectedSymbol} candles={chartData.data} />
          </div>
        )}

        {/* Açık İşlemler */}
        <div className="mb-8">
          <OpenPositions positions={[]} />
        </div>

        {/* İşlem Geçmişi */}
        <div className="mb-8">
          <TradeHistory trades={[]} />
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
