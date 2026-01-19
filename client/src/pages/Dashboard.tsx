import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Settings, AlertCircle } from "lucide-react";
import { useState } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import SignalsTable from "@/components/SignalsTable";
import TradingChart from "@/components/TradingChart";
import PerformanceStats from "@/components/PerformanceStats";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const { data: balance, isLoading: balanceLoading } = trpc.trading.getBalance.useQuery();
  const { data: signals } = trpc.trading.getSignals.useQuery();
  const { data: stats } = trpc.trading.getStats.useQuery();
  const { data: chartData } = trpc.trading.getChartData.useQuery({ symbol: "BTCUSDT", interval: "60" });

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
          <Button onClick={() => setShowApiKeyModal(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            API Ayarları
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cüzdan Bakiyesi</CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="text-gray-500">Yükleniyor...</div>
              ) : balance?.error ? (
                <div className="text-red-600 text-sm">{balance.error}</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">${balance?.balance || "0"}</div>
                  <p className="text-xs text-gray-500 mt-1">USDT</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Toplam İşlem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTrades || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Tamamlanan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Kazanç Oranı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.winRate || "0"}%</div>
              <p className="text-xs text-gray-500 mt-1">{stats?.winningTrades || 0} kazanç</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Toplam PnL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${parseFloat(stats?.totalPnL || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${stats?.totalPnL || "0"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Kar/Zarar</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section */}
        {chartData?.data && chartData.data.length > 0 && (
          <div className="mb-8">
            <TradingChart symbol="BTCUSDT" data={chartData.data} height={400} />
          </div>
        )}

        {/* Performance Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performans İstatistikleri</h2>
          <PerformanceStats data={(stats as any) || { totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: "0", totalPnL: "0", averagePnL: "0", bestTrade: "0", worstTrade: "0" }} />
        </div>

        {/* Signals Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Son Sinyaller</h2>
            <p className="text-sm text-gray-600 mt-1">Son 50 otomatik sinyal</p>
          </div>
          <div className="p-6">
            {signals && signals.length > 0 ? (
              <SignalsTable signals={signals} />
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz sinyal yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </div>
  );
}
