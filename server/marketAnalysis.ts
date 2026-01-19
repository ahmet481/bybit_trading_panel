import { invokeLLM } from "./_core/llm";

/**
 * LLM Tabanlı Piyasa Analizi - Haberler ve trendleri analiz eder
 */
export class MarketAnalysis {
  /**
   * Piyasa haberlerini analiz et ve sinyal güvenilirliğini güçlendir
   */
  async analyzeMarketNews(symbol: string, signal: string, confidence: number): Promise<{
    newsInfluence: number;
    analysis: string;
    recommendation: string;
  }> {
    try {
      console.log(`[MarketAnalysis] Analyzing news for ${symbol}...`);

      const prompt = `
Kripto para piyasasında ${symbol} sembolü için ${signal} sinyali oluşturuldu (Güven: %${confidence}).

Lütfen aşağıdaki hususları analiz edin:
1. Son piyasa haberleri ve trendleri
2. Sosyal medya duyarlılığı
3. Teknik analiz ile haber uyumu
4. Sinyal güvenilirliğini artırıp artırmadığı

Cevabınızı JSON formatında verin:
{
  "newsInfluence": 0-100 arası sayı,
  "analysis": "Kısa analiz",
  "recommendation": "BUY/SELL/HOLD"
}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Kripto para piyasasında uzman bir analist olarak hareket et. Haberler ve trendleri analiz ederek sinyal güvenilirliğini değerlendir.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Cevabı parse et
      const content = typeof response.choices[0]?.message?.content === 'string' ? response.choices[0].message.content : "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : { newsInfluence: 0, analysis: "", recommendation: signal };

      return {
        newsInfluence: analysisData.newsInfluence || 0,
        analysis: analysisData.analysis || "",
        recommendation: analysisData.recommendation || signal,
      };
    } catch (error) {
      console.error("[MarketAnalysis] Error analyzing news:", error);
      return {
        newsInfluence: 0,
        analysis: "Analiz yapılamadı",
        recommendation: signal,
      };
    }
  }

  /**
   * Piyasa duyarlılığını analiz et
   */
  async analyzeSentiment(symbol: string): Promise<{
    sentiment: "positive" | "negative" | "neutral";
    score: number;
    summary: string;
  }> {
    try {
      console.log(`[MarketAnalysis] Analyzing sentiment for ${symbol}...`);

      const prompt = `
${symbol} kripto para sembolü için şu anda piyasa duyarlılığını analiz et.

Sosyal medya, haberler ve genel piyasa durumunu göz önüne alarak:
- Duyarlılık: positive/negative/neutral
- Skor: -100 (çok negatif) ile +100 (çok pozitif) arasında
- Özet: Kısa açıklama

JSON formatında cevap ver:
{
  "sentiment": "positive|negative|neutral",
  "score": -100 ile 100 arasında sayı,
  "summary": "Kısa özet"
}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Kripto para piyasasında duyarlılık analisti olarak hareket et.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = typeof response.choices[0]?.message?.content === 'string' ? response.choices[0].message.content : "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const sentimentData = jsonMatch ? JSON.parse(jsonMatch[0]) : { sentiment: "neutral", score: 0, summary: "" };

      return {
        sentiment: sentimentData.sentiment || "neutral",
        score: sentimentData.score || 0,
        summary: sentimentData.summary || "",
      };
    } catch (error) {
      console.error("[MarketAnalysis] Error analyzing sentiment:", error);
      return {
        sentiment: "neutral",
        score: 0,
        summary: "Duyarlılık analizi yapılamadı",
      };
    }
  }
}

export const marketAnalysis = new MarketAnalysis();
