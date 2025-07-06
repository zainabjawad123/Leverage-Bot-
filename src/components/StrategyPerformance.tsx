"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { StrategyStep } from '../types/strategy';

interface StrategyPerformanceProps {
  steps: StrategyStep[];
}

const StrategyPerformance: React.FC<StrategyPerformanceProps> = ({ steps }) => {
  // Prepare data for charts
  const performanceData = steps.map(step => ({
    date: step.date,
    profitLoss: step.profitLoss,
    healthFactor: step.healthFactor,
    totalValue: parseFloat(step.details.totalValueUSD.replace(/[^0-9.-]+/g, "")),
    ethBalance: parseFloat(step.details.ethBalance),
    wstEthBalance: parseFloat(step.details.wstEthBalance),
    borrowedEth: parseFloat(step.details.borrowedEth),
    ethPrice: step.ethPrice,
    wstethPrice: step.wstethPrice
  }));

  // Calculate key metrics
  const maxDrawdown = Math.min(...steps.map(step => step.profitLoss));
  const volatility = steps.length > 1 ? 
    Math.sqrt(
      steps.reduce((acc, step, i) => {
        if (i === 0) return 0;
        const dailyReturn = (step.profitLoss - steps[i-1].profitLoss);
        return acc + dailyReturn * dailyReturn;
      }, 0) / (steps.length - 1)
    ) : 0;

  return (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Volatility</h3>
          <p className="text-2xl font-bold text-blue-600">{volatility.toFixed(2)}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Max Drawdown</h3>
          <p className="text-2xl font-bold text-red-600">{maxDrawdown.toFixed(2)}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Final P/L</h3>
          <p className={`text-2xl font-bold ${performanceData[performanceData.length - 1].profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {performanceData[performanceData.length - 1].profitLoss.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Profit/Loss Chart */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profit/Loss Over Time</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="profitLoss"
                stroke="#2563eb"
                fill="#3b82f6"
                name="Profit/Loss %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Balance Chart */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Balances</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ethBalance" fill="#3b82f6" name="ETH Balance" />
              <Bar dataKey="wstEthBalance" fill="#10b981" name="wstETH Balance" />
              <Bar dataKey="borrowedEth" fill="#ef4444" name="Borrowed ETH" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Health Factor Chart */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Health Factor</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="healthFactor"
                stroke="#10b981"
                name="Health Factor"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Price Comparison Chart */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Prices</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ethPrice"
                stroke="#3b82f6"
                name="ETH Price"
              />
              <Line
                type="monotone"
                dataKey="wstethPrice"
                stroke="#10b981"
                name="wstETH Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance; 