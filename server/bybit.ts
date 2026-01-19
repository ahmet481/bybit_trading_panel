import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

/**
 * Bybit API Manager - Cüzdan ve piyasa verilerine erişim
 */
export class BybitManager {
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;
  private client: AxiosInstance;

  constructor(apiKey: string, apiSecret: string, isMainnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    // Mainnet'e bağlan (varsayılan)
    this.baseURL = "https://api.bybit.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * İstek imzasını oluştur
   */
  private generateSignature(params: Record<string, any>, timestamp: number): string {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const message = `${queryString}${timestamp}`;

    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("hex");
  }

  /**
   * Cüzdan bakiyesini al
   */
  async getBalance(coin: string = "USDT") {
    try {
      const timestamp = Date.now();
      const params = {
        accountType: "UNIFIED",
        coin,
      };

      const signature = this.generateSignature(params, timestamp);

      console.log("[Bybit] Fetching balance...", { baseURL: this.baseURL, coin });

      const response = await this.client.get("/v5/account/wallet-balance", {
        params,
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp,
        },
      });

      console.log("[Bybit] Balance response:", response.data);
      return response.data.result.list[0]?.coin[0]?.walletBalance || "0";
    } catch (error: any) {
      console.error("[Bybit] Balance Error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * K-Line verilerini TradingView formatında al
   */
  async getKlineData(symbol: string = "BTCUSDT", interval: string = "60", limit: number = 100) {
    try {
      const response = await this.client.get("/v5/market/kline", {
        params: {
          category: "linear",
          symbol,
          interval,
          limit,
        },
      });

      const data = response.data.result.list.map((item: any[]) => ({
        time: Math.floor(parseInt(item[0]) / 1000),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
      }));

      return data.reverse();
    } catch (error) {
      console.error("[Bybit] Kline data error:", error);
      throw error;
    }
  }

  /**
   * K-Line (Mum) verilerini al
   */
  async getKlines(
    symbol: string = "BTCUSDT",
    interval: string = "15",
    limit: number = 100
  ) {
    try {
      const response = await this.client.get("/v5/market/kline", {
        params: {
          category: "linear",
          symbol,
          interval,
          limit,
        },
      });

      // Verileri DataFrame'e dönüştürülecek formata çevir
      const data = response.data.result.list.map((item: any[]) => ({
        timestamp: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));

      return data.reverse(); // Eski veriden yeniye sırala
    } catch (error) {
      console.error("Bybit Kline Error:", error);
      throw error;
    }
  }

  /**
   * Piyasa işlem hacmini al
   */
  async getTicker(symbol: string = "BTCUSDT") {
    try {
      const response = await this.client.get("/v5/market/tickers", {
        params: {
          category: "linear",
          symbol,
        },
      });

      return response.data.result.list[0];
    } catch (error) {
      console.error("Bybit Ticker Error:", error);
      throw error;
    }
  }
}
