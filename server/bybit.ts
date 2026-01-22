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

  constructor(apiKey: string, apiSecret: string, isMainnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    // Testnet veya Mainnet URL'sini seç
    this.baseURL = isMainnet 
      ? "https://api.bybit.com" 
      : "https://api-testnet.bybit.com";
    
    console.log(`[Bybit] Initialized with ${isMainnet ? 'MAINNET' : 'TESTNET'} - ${this.baseURL}`);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Bybit V5 API imzası oluştur (DOĞRU SIRA)
   */
  private generateSignature(timestamp: number, recvWindow: number, queryString: string): string {
    // Doğru sıra: timestamp + api_key + recvWindow + queryString
    const preSign = `${timestamp}${this.apiKey}${recvWindow}${queryString}`;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(preSign)
      .digest("hex");
  }

  /**
   * Cüzdan bakiyesini al
   */
  async getBalance(coin: string = "USDT") {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = `accountType=UNIFIED&coin=${coin}`;
      const signature = this.generateSignature(timestamp, recvWindow, params);

      console.log("[Bybit] Fetching balance...", { baseURL: this.baseURL, coin, timestamp });

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
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Açık pozisyonları al
   */
  async getPositions(symbol?: string) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = symbol ? `symbol=${symbol}&settleCoin=USDT` : "settleCoin=USDT";
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
   * Güncel fiyatı al
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await this.client.get(`/v5/market/tickers?category=linear&symbol=${symbol}`);
      
      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return parseFloat(response.data.result.list[0].lastPrice);
    } catch (error: any) {
      console.error("[Bybit] Price Error:", error.message);
      return 0;
    }
  }

  /**
   * K-Line verilerini al (mum grafikleri)
   */
  async getKlines(symbol: string, interval: string, limit: number = 100) {
    try {
      const response = await this.client.get(
        `/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return response.data.result.list.map((k: any) => ({
        time: parseInt(k[0]) / 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (error: any) {
      console.error("[Bybit] Kline Error:", error.message);
      return [];
    }
  }

  /**
   * K-Line verilerini al (grafik için)
   */
  async getKlineData(symbol: string, interval: string, limit: number = 100) {
    try {
      const response = await this.client.get(
        `/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return response.data.result.list.map((k: any) => ({
        time: parseInt(k[0]) / 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (error: any) {
      console.error("[Bybit] Kline Data Error:", error.message);
      return [];
    }
  }

  /**
   * Kaldıraç ayarla
   */
  async setLeverage(symbol: string, leverage: number) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;
      const params = `symbol=${symbol}&buyLeverage=${leverage}&sellLeverage=${leverage}`;
      const signature = this.generateSignature(timestamp, recvWindow, params);

      const response = await this.client.post(`/v5/position/set-leverage?${params}`, {}, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Bybit] Leverage Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * İşlem aç (Market Order)
   */
  async placeOrder(
    symbol: string,
    side: "Buy" | "Sell",
    qty: string,
    orderType: string = "Market",
    price?: string,
    stopLoss?: string,
    takeProfit?: string
  ) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;

      // Query string oluştur
      let params = `category=linear&symbol=${symbol}&side=${side}&orderType=${orderType}&qty=${qty}`;
      
      if (stopLoss) {
        params += `&stopLoss=${stopLoss}`;
      }
      if (takeProfit) {
        params += `&takeProfit=${takeProfit}`;
      }
      if (price && orderType === "Limit") {
        params += `&price=${price}`;
      }

      const signature = this.generateSignature(timestamp, recvWindow, params);

      const response = await this.client.post(`/v5/order/create?${params}`, {}, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      console.log("[Bybit] Order placed:", response.data.result.orderId);
      return {
        success: true,
        orderId: response.data.result.orderId,
      };
    } catch (error: any) {
      console.error("[Bybit] Order Error:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * İşlem geçmişini al
   */
  async getTradeHistory(symbol: string, limit: number = 20) {
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
        throw new Error(response.data.retMsg);
      }

      return response.data.result.list || [];
    } catch (error: any) {
      console.error("[Bybit] Trade history error:", error.message);
      return [];
    }
  }
}
