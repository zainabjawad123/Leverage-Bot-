"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface HistoricalDataChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

interface ChartData {
  date: string;
  ethPrice: number;
  wstethPrice: number;
  gasPrice: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.name.includes("Price")
              ? `$${entry.value.toFixed(2)}`
              : `${entry.value.toFixed(2)} Gwei`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function HistoricalDataChart({
  dateRange,
}: HistoricalDataChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState({
    ethPrice: true,
    wstethPrice: true,
    gasPrice: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Implement DeFiLlama API calls
        // This is mock data for now
        const mockData: ChartData[] = Array.from({ length: 30 }, (_, i) => ({
          date: format(
            new Date(dateRange.startDate.getTime() + i * 24 * 60 * 60 * 1000),
            "MMM dd, yyyy"
          ),
          ethPrice: 2000 + Math.random() * 500,
          wstethPrice: 2100 + Math.random() * 500,
          gasPrice: 20 + Math.random() * 30,
        }));
        setData(mockData);
      } catch (err) {
        setError("Failed to fetch historical data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() =>
            setSelectedMetrics((prev) => ({
              ...prev,
              ethPrice: !prev.ethPrice,
            }))
          }
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedMetrics.ethPrice
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          ETH Price
        </button>
        <button
          onClick={() =>
            setSelectedMetrics((prev) => ({
              ...prev,
              wstethPrice: !prev.wstethPrice,
            }))
          }
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedMetrics.wstethPrice
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          wstETH Price
        </button>
        <button
          onClick={() =>
            setSelectedMetrics((prev) => ({
              ...prev,
              gasPrice: !prev.gasPrice,
            }))
          }
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            selectedMetrics.gasPrice
              ? "bg-yellow-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Gas Price
        </button>
      </div>

      <div className="h-96 bg-white p-4 rounded-lg shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => format(new Date(value), "MMM dd")}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(0)} Gwei`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetrics.ethPrice && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="ethPrice"
                stroke="#3b82f6"
                name="ETH Price"
                strokeWidth={2}
                dot={false}
              />
            )}
            {selectedMetrics.wstethPrice && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="wstethPrice"
                stroke="#22c55e"
                name="wstETH Price"
                strokeWidth={2}
                dot={false}
              />
            )}
            {selectedMetrics.gasPrice && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gasPrice"
                stroke="#eab308"
                name="Gas Price"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
