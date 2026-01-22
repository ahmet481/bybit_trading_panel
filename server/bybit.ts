import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

/**
 * Bybit API Manager - Cüzdan, piyasa verileri ve işlem yönetimi
 */
export class BybitManager {
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;
  private client: AxiosInstance;
  private isMainnet: boolean;

  constructor(apiKey: string, apiSecret: string, isMainnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isMainnet = isMainnet;
    this.baseURL = isMainnet
      ? "https://api.bybit.com"
      : "https://api-testnet.bybit.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Bybit V5 API imzası oluştur
   * Resmi format: timestamp + api_key + recv_window + query_string
   */
  private generateSignature(timestamp: number, recvWindow: number, queryString: string): string {
    const preSign = `${timestamp}${this.apiKey}${recvWindow}${queryString}`;
    console.log("[Bybit] Signature pre-sign:", preSign);
    
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(preSign)
      .digest("hex");
    
    console.log("[Bybit] Generated signature:", signature);
    return signature;
  }

  /**
   * Cüzdan bakiyesini al
   */
  async getBalance(coin: string = "USDT"): Promise<string> {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = `accountType=UNIFIED&coin=${coin}`;
      const signature = this.generateSignature(timestamp, recvWindow, params);

      console.log("[Bybit] Fetching balance...", {
        baseURL: this.baseURL,
        coin,
        timestamp,
        apiKey: this.apiKey.substring(0, 5) + "...",
      });

      const response = await this.client.get(`/v5/account/wallet-balance?${params}`, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      console.log("[Bybit] Balance response:", response.data);

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg || "API Error");
      }

      const balance = response.data.result.list[0]?.coin[0]?.walletBalance || "0";
      console.log("[Bybit] Balance retrieved:", balance);
      return balance;
    } catch (error: any) {
      console.error("[Bybit] Balance Error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return "0";
    }
  }

  /**
   * Güncel fiyat al
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await this.client.get(`/v5/market/tickers?category=linear&symbol=${symbol}`);

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg || "API Error");
      }

      const price = parseFloat(response.data.result.list[0]?.lastPrice || "0");
      console.log(`[Bybit] ${symbol} price: ${price}`);
      return price;
    } catch (error: any) {
      console.error("[Bybit] Price Error:", error.message);
      return 0;
    }
  }

  /**
   * K-Line verilerini al
   */
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const response = await this.client.get(
        `/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg || "API Error");
      }

      const klines = response.data.result.list.map((item: any) => ({
        time: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));

      console.log(`[Bybit] Fetched ${klines.length} klines for ${symbol}`);
      return klines;
    } catch (error: any) {
      console.error("[Bybit] Kline Data Error:", error.message);
      return [];
    }
  }

  /**
   * İşlem aç
   */
  async placeOrder(
    symbol: string,
    side: "Buy" | "Sell",
    qty: string,
    orderType: string = "Market",
    price?: string,
    stopLoss?: string,
    takeProfit?: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;

      const body: any = {
        category: "linear",
        symbol: symbol,
        side: side,
        orderType: orderType,
        qty: qty,
      };

      if (price) body.price = price;
      if (stopLoss) body.stopLoss = stopLoss;
      if (takeProfit) body.takeProfit = takeProfit;

      const queryString = JSON.stringify(body);
      const signature = this.generateSignature(timestamp, recvWindow, queryString);

      console.log("[Bybit] Placing order:", body);

      const response = await this.client.post("/v5/order/create", body, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      console.log("[Bybit] Order response:", response.data);

      if (response.data.retCode !== 0) {
        return { success: false, error: response.data.retMsg || "Order failed" };
      }

      return {
        success: true,
        orderId: response.data.result.orderId || "unknown",
      };
    } catch (error: any) {
      console.error("[Bybit] Order Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kaldıraç ayarla
   */
  async setLeverage(symbol: string, leverage: number): Promise<boolean> {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const body = { category: "linear", symbol, buyLeverage: leverage, sellLeverage: leverage };
      const queryString = JSON.stringify(body);
      const signature = this.generateSignature(timestamp, recvWindow, queryString);

      const response = await this.client.post("/v5/position/set-leverage", body, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      return response.data.retCode === 0;
    } catch (error: any) {
      console.error("[Bybit] Leverage Error:", error.message);
      return false;
    }
  }

  /**
   * Açık pozisyonları al
   */
  async getOpenPositions(): Promise<any[]> {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = "category=linear&settleCoin=USDT";
      const signature = this.generateSignature(timestamp, recvWindow, params);

      const response = await this.client.get(`/v5/position/list?${params}`, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg || "API Error");
      }

      return response.data.result.list || [];
    } catch (error: any) {
      console.error("[Bybit] Positions Error:", error.message);
      return [];
    }
  }

  /**
   * İşlem geçmişini al
   */
  async getTradeHistory(symbol: string, limit: number = 50): Promise<any[]> {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = `category=linear&symbol=${symbol}&limit=${limit}`;
      const signature = this.generateSignature(timestamp, recvWindow, params);

      const response = await this.client.get(`/v5/execution/list?${params}`, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg || "API Error");
      }

      return response.data.result.list || [];
    } catch (error: any) {
      console.error("[Bybit] Trade history error:", error.message);
      return [];
    }
  }
}
