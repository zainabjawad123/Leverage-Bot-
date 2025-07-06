"use client";

import React from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: Date;
  value: number;
  profitLoss: number;
  healthFactor: number;
}

interface LineChartProps {
  data: ChartData[];
}

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatHealthFactor = (value: number) => {
    return value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-semibold">{formatDate(label)}</p>
          <div className="space-y-1 mt-2">
            <p className="text-blue-600">
              Portfolio Value: {formatValue(payload[0].value)}
            </p>
            <p
              className={
                payload[1].value >= 0 ? "text-green-600" : "text-red-600"
              }
            >
              Profit/Loss: {formatPercent(payload[1].value)}
            </p>
            <p
              className={
                payload[2].value >= 1.1 ? "text-green-600" : "text-red-600"
              }
            >
              Health Factor: {formatHealthFactor(payload[2].value)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={50} />
        <YAxis
          yAxisId="value"
          tickFormatter={formatValue}
          label={{
            value: "Portfolio Value (USD)",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <YAxis
          yAxisId="percent"
          orientation="right"
          tickFormatter={(value) => `${value}%`}
          label={{
            value: "Profit/Loss & Health Factor",
            angle: 90,
            position: "insideRight",
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          yAxisId="value"
          type="monotone"
          dataKey="value"
          name="Portfolio Value"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="percent"
          type="monotone"
          dataKey="profitLoss"
          name="Profit/Loss %"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="percent"
          type="monotone"
          dataKey="healthFactor"
          name="Health Factor"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};
