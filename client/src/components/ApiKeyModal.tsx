import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Açılırken kaydedilmiş anahtarları kontrol et
  useEffect(() => {
    if (open && user) {
      const savedKey = localStorage.getItem(`apiKey_${user.id}`);
      const savedSecret = localStorage.getItem(`apiSecret_${user.id}`);
      
      if (savedKey && savedSecret) {
        setApiKey(savedKey);
        setApiSecret(savedSecret);
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
    }
  }, [open, user]);

  const saveApiKeyMutation = trpc.trading.saveApiKey.useMutation({
    onSuccess: () => {
      if (user) {
        // localStorage'a kaydet
        localStorage.setItem(`apiKey_${user.id}`, apiKey);
        localStorage.setItem(`apiSecret_${user.id}`, apiSecret);
        
        // Veritabanına da kaydet
        console.log("[ApiKeyModal] API keys saved to database and localStorage");
        setIsSaved(true);
        toast.success("✅ API anahtarları başarıyla kaydedildi!");
      }
    },
    onError: (error) => {
      console.error("[ApiKeyModal] Save error:", error);
      toast.error(`❌ Hata: ${error.message || "API anahtarı kaydedilemedi"}`);
    },
  });

  const handleSave = async () => {
    if (!apiKey || !apiSecret) {
      toast.error("❌ Lütfen tüm alanları doldurun");
      return;
    }

    if (apiKey.length < 10 || apiSecret.length < 10) {
      toast.error("❌ API anahtarları çok kısa görünüyor. Lütfen kontrol edin.");
      return;
    }

    setIsLoading(true);
    try {
      await saveApiKeyMutation.mutateAsync({ apiKey, apiSecret });
      
      // 2 saniye sonra modal kapat
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error("[ApiKeyModal] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (user) {
      localStorage.removeItem(`apiKey_${user.id}`);
      localStorage.removeItem(`apiSecret_${user.id}`);
      setApiKey("");
      setApiSecret("");
      setIsSaved(false);
      toast.success("API anahtarları temizlendi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bybit API Anahtarları</DialogTitle>
          <DialogDescription>
            API anahtarlarınız şifreli olarak saklanacaktır. Lütfen Bybit'ten aldığınız anahtarları girin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Durum Göstergesi */}
          {isSaved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">✅ API anahtarları kaydedildi</p>
            </div>
          )}

          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="API Key (örn: XXXXXXXXXXXXXX)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Bybit Dashboard → Account → API Management</p>
          </div>

          <div>
            <Label htmlFor="api-secret">API Secret</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="api-secret"
                type={showSecret ? "text" : "password"}
                placeholder="API Secret (örn: XXXXXXXXXXXXXX)"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => setShowSecret(!showSecret)}
                className="px-3"
              >
                {showSecret ? "Gizle" : "Göster"}
              </Button>
            </div>
          </div>

          {/* Uyarı */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Güvenlik Uyarısı</p>
              <p className="text-xs text-yellow-700 mt-1">
                • API anahtarlarınızı asla kimseyle paylaşmayın<br/>
                • Sadece "Trading" izni verilen anahtarları kullanın<br/>
                • IP whitelist'e bu sunucuyu ekleyin
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={!isSaved || isLoading}
            >
              Temizle
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || saveApiKeyMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading || saveApiKeyMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
