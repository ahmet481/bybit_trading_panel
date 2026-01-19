import axios, { AxiosInstance } from "axios";
import crypto from "crypto";

/**
 * Bybit API Manager - Cüzdan ve piyasa verilerine erişim
 */
export class BybitManager {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor(apiKey: string, apiSecret: string, testnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = testnet
      ? "https://api-testnet.bybit.com"
      : "https://api.bybit.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * İstek imzasını oluştur
   */
  private generateSignature(params: Record<string, any>, timestamp: number) {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const message = `${timestamp}${this.apiKey}${queryString}`;
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

      const response = await this.client.get("/v5/account/wallet-balance", {
        params,
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp,
        },
      });

      return response.data.result.list[0]?.coin[0]?.walletBalance || "0";
    } catch (error) {
      console.error("Bybit Balance Error:", error);
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

  /**
   * Emir oluştur
   */
  async placeOrder(
    symbol: string,
    side: "Buy" | "Sell",
    qty: string,
    price?: string
  ) {
    try {
      const timestamp = Date.now();
      const params = {
        category: "linear",
        symbol,
        side,
        orderType: price ? "Limit" : "Market",
        qty,
        ...(price && { price }),
      };

      const signature = this.generateSignature(params, timestamp);

      const response = await this.client.post("/v5/order/create", params, {
        headers: {
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Bybit Order Error:", error);
      throw error;
    }
  }
}
