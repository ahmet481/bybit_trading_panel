import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Settings, AlertCircle } from "lucide-react";
import { useState } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import SignalsTable from "@/components/SignalsTable";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const { data: balance } = trpc.trading.getBalance.useQuery();
  const { data: signals } = trpc.trading.getSignals.useQuery();
  const { data: stats } = trpc.trading.getStats.useQuery();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lütfen giriş yapın</h1>
          <p className="text-gray-600">Trading dashboard'una erişmek için oturum açmanız gerekir.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Trading Dashboard</h1>
            <p className="text-gray-600 mt-2">Hoşgeldiniz, {user?.name}</p>
          </div>
          <Button onClick={() => setShowApiKeyModal(true)} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
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
              <div className="text-2xl font-bold">${balance?.balance || "0"}</div>
              <p className="text-xs text-gray-500 mt-1">USDT</p>
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
              <div className={`text-2xl font-bold ${parseFloat(stats?.totalPnL || "0") > 0 ? "text-green-600" : "text-red-600"}`}>
                ${stats?.totalPnL || "0"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Kar/Zarar</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="signals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signals">Sinyaller</TabsTrigger>
            <TabsTrigger value="chart">Grafik</TabsTrigger>
            <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Son Sinyaller</CardTitle>
                <CardDescription>Son 50 otomatik sinyal</CardDescription>
              </CardHeader>
              <CardContent>
                {signals && signals.length > 0 ? (
                  <SignalsTable signals={signals} />
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Henüz sinyal yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>TradingView Grafik</CardTitle>
                <CardDescription>Canlı fiyat grafiği</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-600">TradingView widget yükleniyor...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ayarlar</CardTitle>
                <CardDescription>Trading parametrelerini yapılandırın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sembol</label>
                    <input type="text" placeholder="BTCUSDT" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Grafik Aralığı</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>15 dakika</option>
                      <option>1 saat</option>
                      <option>4 saat</option>
                      <option>1 gün</option>
                    </select>
                  </div>
                  <Button className="w-full">Ayarları Kaydet</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
    </div>
  );
}
