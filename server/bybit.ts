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
    this.baseURL = "https://api.bybit.com";

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  /**
   * Bybit V5 API imzası oluştur
   */
  private generateSignature(timestamp: number, recvWindow: number, queryString: string): string {
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

      console.log("[Bybit] Fetching balance...", { baseURL: this.baseURL, coin });

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
        throw new Error(response.data.retMsg);
      }
      
      return response.data.result.list[0]?.coin[0]?.walletBalance || "0";
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
      const params = symbol 
        ? `category=linear&symbol=${symbol}` 
        : `category=linear&settleCoin=USDT`;
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
        throw new Error(response.data.retMsg);
      }

      return response.data.result.list || [];
    } catch (error: any) {
      console.error("[Bybit] Positions Error:", error.message);
      return [];
    }
  }

  /**
   * İşlem aç (Long/Short)
   */
  async placeOrder(
    symbol: string,
    side: "Buy" | "Sell",
    qty: string,
    orderType: "Market" | "Limit" = "Market",
    price?: string,
    stopLoss?: string,
    takeProfit?: string
  ) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;

      const orderData: any = {
        category: "linear",
        symbol,
        side,
        orderType,
        qty,
        timeInForce: "GTC",
      };

      if (orderType === "Limit" && price) {
        orderData.price = price;
      }

      if (stopLoss) {
        orderData.stopLoss = stopLoss;
      }

      if (takeProfit) {
        orderData.takeProfit = takeProfit;
      }

      const jsonBody = JSON.stringify(orderData);
      const signature = this.generateSignature(timestamp, recvWindow, jsonBody);

      console.log("[Bybit] Placing order:", orderData);

      const response = await this.client.post("/v5/order/create", orderData, {
        headers: {
          "Content-Type": "application/json",
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      console.log("[Bybit] Order response:", response.data);

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return {
        success: true,
        orderId: response.data.result.orderId,
        data: response.data.result,
      };
    } catch (error: any) {
      console.error("[Bybit] Order Error:", {
        message: error.message,
        data: error.response?.data,
      });
      return {
        success: false,
        error: error.response?.data?.retMsg || error.message,
      };
    }
  }

  /**
   * Pozisyonu kapat
   */
  async closePosition(symbol: string, side: "Buy" | "Sell", qty: string) {
    // Pozisyonu kapatmak için ters yönde işlem aç
    const closeSide = side === "Buy" ? "Sell" : "Buy";
    return this.placeOrder(symbol, closeSide, qty, "Market");
  }

  /**
   * Stop-Loss ve Take-Profit güncelle
   */
  async setTradingStop(
    symbol: string,
    stopLoss?: string,
    takeProfit?: string,
    positionIdx: number = 0
  ) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;

      const data: any = {
        category: "linear",
        symbol,
        positionIdx,
      };

      if (stopLoss) data.stopLoss = stopLoss;
      if (takeProfit) data.takeProfit = takeProfit;

      const jsonBody = JSON.stringify(data);
      const signature = this.generateSignature(timestamp, recvWindow, jsonBody);

      const response = await this.client.post("/v5/position/trading-stop", data, {
        headers: {
          "Content-Type": "application/json",
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(response.data.retMsg);
      }

      return { success: true, data: response.data.result };
    } catch (error: any) {
      console.error("[Bybit] Trading Stop Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kaldıraç ayarla
   */
  async setLeverage(symbol: string, leverage: number) {
    try {
      const timestamp = Date.now();
      const recvWindow = 5000;

      const data = {
        category: "linear",
        symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString(),
      };

      const jsonBody = JSON.stringify(data);
      const signature = this.generateSignature(timestamp, recvWindow, jsonBody);

      const response = await this.client.post("/v5/position/set-leverage", data, {
        headers: {
          "Content-Type": "application/json",
          "X-BAPI-SIGN": signature,
          "X-BAPI-API-KEY": this.apiKey,
          "X-BAPI-TIMESTAMP": timestamp.toString(),
          "X-BAPI-RECV-WINDOW": recvWindow.toString(),
        },
      });

      if (response.data.retCode !== 0 && response.data.retCode !== 110043) {
        // 110043 = leverage already set
        throw new Error(response.data.retMsg);
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Bybit] Leverage Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Güncel fiyatı al
   */
  async getCurrentPrice(symbol: string = "BTCUSDT") {
    try {
      const response = await this.client.get("/v5/market/tickers", {
        params: {
          category: "linear",
          symbol,
        },
      });

      return parseFloat(response.data.result.list[0]?.lastPrice || "0");
    } catch (error) {
      console.error("[Bybit] Price Error:", error);
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

      const data = response.data.result.list.map((item: any[]) => ({
        timestamp: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));

      return data.reverse();
    } catch (error) {
      console.error("[Bybit] Kline Error:", error);
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
   * İşlem geçmişini al
   */
  async getTradeHistory(symbol: string = "BTCUSDT", limit: number = 20) {
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
