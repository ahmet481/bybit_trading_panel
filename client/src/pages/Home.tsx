import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { TrendingUp, BarChart3, Zap } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bybit Trading Panel</h1>
          </div>
          <Button onClick={() => window.location.href = getLoginUrl()}>
            Giriş Yap
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Otomatik Kripto Trading Sinyalleri
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            RSI, MACD ve grafik formasyonlarını kullanarak gerçek zamanlı alım-satım sinyalleri alın.
            Bybit borsasıyla entegre, güvenli ve kullanıcı dostu trading dashboard.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Hemen Başla
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">Teknik Analiz</h3>
            <p className="text-gray-600">
              RSI, MACD ve Çift Tepe/Dip formasyonlarıyla güvenilir sinyaller üretin.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <Zap className="h-12 w-12 text-yellow-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">Gerçek Zamanlı</h3>
            <p className="text-gray-600">
              Bybit API'si ile canlı fiyatları takip edin ve anında sinyaller alın.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">Performans Takibi</h3>
            <p className="text-gray-600">
              İşlem geçmişinizi ve sinyal performansını detaylı istatistiklerle izleyin.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-lg p-8 text-center shadow-md">
          <h3 className="text-2xl font-bold mb-4">Başlamaya Hazır mısınız?</h3>
          <p className="text-gray-600 mb-6">
            Bybit hesabınız ile giriş yapın ve otomatik trading sinyallerini kullanmaya başlayın.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Giriş Yap
          </Button>
        </div>
      </main>
    </div>
  );
}
