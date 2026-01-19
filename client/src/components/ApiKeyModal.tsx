import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const saveApiKeyMutation = trpc.trading.saveApiKey.useMutation({
    onSuccess: () => {
      toast.success("API anahtarları kaydedildi");
      setApiKey("");
      setApiSecret("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Hata oluştu");
    },
  });

  const handleSave = () => {
    if (!apiKey || !apiSecret) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    saveApiKeyMutation.mutate({ apiKey, apiSecret });
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
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="api-secret">API Secret</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="api-secret"
                type={showSecret ? "text" : "password"}
                placeholder="API Secret"
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ API anahtarlarınızı asla kimseyle paylaşmayın. Sadece "Trading" izni verilen anahtarları kullanın.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveApiKeyMutation.isPending}
            >
              {saveApiKeyMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
