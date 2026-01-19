import { Signal } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface SignalsTableProps {
  signals: Signal[];
}

export default function SignalsTable({ signals }: SignalsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="text-left py-3 px-4 font-medium">Sembol</th>
            <th className="text-left py-3 px-4 font-medium">Sinyal</th>
            <th className="text-left py-3 px-4 font-medium">Güven</th>
            <th className="text-left py-3 px-4 font-medium">RSI</th>
            <th className="text-left py-3 px-4 font-medium">Formasyon</th>
            <th className="text-left py-3 px-4 font-medium">Fiyat</th>
            <th className="text-left py-3 px-4 font-medium">Zaman</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <tr key={signal.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{signal.symbol}</td>
              <td className="py-3 px-4">
                <Badge
                  variant={signal.signalType === "buy" ? "default" : "destructive"}
                  className="flex w-fit items-center gap-1"
                >
                  {signal.signalType === "buy" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {signal.signalType === "buy" ? "ALIM" : "SATIM"}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        signal.confidence > 70
                          ? "bg-green-600"
                          : signal.confidence > 50
                          ? "bg-yellow-600"
                          : "bg-red-600"
                      }`}
                      style={{ width: `${signal.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{signal.confidence}%</span>
                </div>
              </td>
              <td className="py-3 px-4">{signal.rsi || "-"}</td>
              <td className="py-3 px-4 text-xs">{signal.pattern || "-"}</td>
              <td className="py-3 px-4 font-mono">${signal.price}</td>
              <td className="py-3 px-4 text-xs text-gray-600">
                {format(new Date(signal.createdAt), "dd MMM HH:mm", { locale: tr })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
