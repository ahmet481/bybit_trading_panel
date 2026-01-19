import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  totalPnL: string;
  averagePnL: string;
  bestTrade: string;
  worstTrade: string;
}

interface PerformanceStatsProps {
  data: PerformanceData;
}

export default function PerformanceStats({ data }: PerformanceStatsProps) {
  const chartData = [
    {
      name: "Kazanç",
      value: String(data.winningTrades) ? parseInt(String(data.winningTrades)) : 0,
    },
    {
      name: "Kayıp",
      value: String(data.losingTrades) ? parseInt(String(data.losingTrades)) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Win Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Kazanç Oranı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{data.winRate}%</div>
          <p className="text-xs text-gray-500 mt-2">
            {String(data.winningTrades)} kazanç / {String(data.losingTrades)} kayıp
          </p>
        </CardContent>
      </Card>

      {/* Total PnL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Toplam PnL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${parseFloat(data.totalPnL || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${data.totalPnL}
          </div>
          <p className="text-xs text-gray-500 mt-2">Ortalama: ${data.averagePnL}</p>
        </CardContent>
      </Card>

      {/* Best/Worst Trade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">En İyi İşlem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${data.bestTrade}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">En Kötü İşlem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">${data.worstTrade}</div>
        </CardContent>
      </Card>

      {/* Win/Loss Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Kazanç/Kayıp Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
