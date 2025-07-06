import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PriceChartProps {
  data: {
    ethereum: { timestamp: number; price: number }[];
    wsteth: { timestamp: number; price: number }[];
  };
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  // Combine and format data for the chart
  const chartData = data.ethereum.map((eth, index) => {
    const date = new Date(eth.timestamp * 1000);
    return {
      date: date.toLocaleDateString(),
      ethereum: eth.price,
      wsteth: data.wsteth[index].price,
      timestamp: eth.timestamp,
    };
  });

  // Calculate min and max values for better Y axis scaling
  const allPrices = [
    ...data.ethereum.map((d) => d.price),
    ...data.wsteth.map((d) => d.price),
  ];
  const minPrice = Math.floor(Math.min(...allPrices));
  const maxPrice = Math.ceil(Math.max(...allPrices));
  const yAxisDomain = [minPrice * 0.95, maxPrice * 1.05]; // Add 5% padding

  // Calculate tick values for X axis
  const totalDays = chartData.length;
  const tickInterval = Math.max(Math.floor(totalDays / 6), 1); // Show roughly 6 ticks
  const xAxisTicks = chartData
    .filter((_, index) => index % tickInterval === 0)
    .map((d) => d.timestamp);

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={xAxisTicks}
            tickFormatter={(timestamp) => {
              const date = new Date(timestamp * 1000);
              return date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
            }}
            minTickGap={50}
          />
          <YAxis
            domain={yAxisDomain}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
            formatter={(value: number) => [
              `$${value.toLocaleString()}`,
              undefined,
            ]}
            labelFormatter={(timestamp: number) => {
              const date = new Date(timestamp * 1000);
              return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ethereum"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="ETH"
          />
          <Line
            type="monotone"
            dataKey="wsteth"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="wstETH"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
