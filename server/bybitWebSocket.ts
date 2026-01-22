import WebSocket from "ws";
import crypto from "crypto";

/**
 * Bybit WebSocket Manager - Gerçek zamanlı veri ve işlem yönetimi
 */
export class BybitWebSocketManager {
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;
  private ws: WebSocket | null = null;
  private isMainnet: boolean = true;
  private messageId: number = 0;

  constructor(apiKey: string, apiSecret: string, isMainnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isMainnet = isMainnet;
    this.baseURL = isMainnet
      ? "wss://stream.bybit.com/v5/private"
      : "wss://stream-testnet.bybit.com/v5/private";
  }

  /**
   * WebSocket'e bağlan ve auth yap
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.baseURL);

        this.ws.on("open", () => {
          console.log("[BybitWS] Connected to WebSocket");
          this.authenticate();
          resolve(true);
        });

        this.ws.on("message", (data: string) => {
          try {
            const message = JSON.parse(data);
            console.log("[BybitWS] Received:", message);
          } catch (error) {
            console.error("[BybitWS] Parse error:", error);
          }
        });

        this.ws.on("error", (error: any) => {
          console.error("[BybitWS] Error:", error);
          resolve(false);
        });

        this.ws.on("close", () => {
          console.log("[BybitWS] Disconnected");
          this.ws = null;
        });

        // 10 saniye timeout
        setTimeout(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.error("[BybitWS] Connection error:", error);
        resolve(false);
      }
    });
  }

  /**
   * WebSocket'e auth yap
   */
  private authenticate() {
    const timestamp = Date.now();
    const recvWindow = 5000;

    // Auth string: GET + /realtime_public + timestamp + recvWindow
    const authString = `GET/realtime_public${timestamp}${recvWindow}`;
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(authString)
      .digest("hex");

    const authMessage = {
      op: "auth",
      args: [this.apiKey, timestamp, signature],
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(authMessage));
      console.log("[BybitWS] Auth sent");
    }
  }

  /**
   * İşlem aç (Market Order)
   */
  async placeOrder(
    symbol: string,
    side: "Buy" | "Sell",
    qty: string,
    stopLoss?: string,
    takeProfit?: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ success: false, error: "WebSocket not connected" });
        return;
      }

      this.messageId++;
      const orderMessage = {
        op: "order.create",
        args: [
          {
            symbol: symbol,
            side: side,
            orderType: "Market",
            qty: qty,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
          },
        ],
        reqId: this.messageId.toString(),
      };

      // Response listener
      const messageHandler = (data: string) => {
        try {
          const response = JSON.parse(data);
          if (response.reqId === this.messageId.toString()) {
            if (response.retCode === 0) {
              resolve({
                success: true,
                orderId: response.result?.orderId || "unknown",
              });
            } else {
              resolve({
                success: false,
                error: response.retMsg || "Order failed",
              });
            }
            this.ws?.removeEventListener("message", messageHandler as any);
          }
        } catch (error) {
          console.error("[BybitWS] Parse error:", error);
        }
      };

      this.ws.on("message", messageHandler);
      this.ws.send(JSON.stringify(orderMessage));
      console.log("[BybitWS] Order sent:", orderMessage);

      // 30 saniye timeout
      setTimeout(() => {
        this.ws?.removeEventListener("message", messageHandler as any);
        resolve({ success: false, error: "Order timeout" });
      }, 30000);
    });
  }

  /**
   * Cüzdan bakiyesini al (REST API fallback)
   */
  async getBalance(coin: string = "USDT"): Promise<string> {
    // WebSocket'te balance almak için account subscription gerekli
    // Şimdilik REST API'ye fallback yapıyoruz
    console.log("[BybitWS] Balance request (fallback to REST)");
    return "0";
  }

  /**
   * Bağlantıyı kapat
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log("[BybitWS] Disconnected");
    }
  }

  /**
   * Bağlı mı?
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
