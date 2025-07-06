"use client";

import React from "react";
import { StrategyStep } from "../types/strategy";

interface StrategyStepCardsProps {
  steps: StrategyStep[];
}

const StrategyStepCards: React.FC<StrategyStepCardsProps> = ({ steps }) => {
  // Calculate final summary
  const lastStep = steps[steps.length - 1];
  const initialCapital = parseFloat(
    steps[0].details.totalValueUSD.replace(/[^0-9.-]+/g, "")
  );
  const finalValue = parseFloat(
    lastStep.details.totalValueUSD.replace(/[^0-9.-]+/g, "")
  );
  const totalProfit = finalValue - initialCapital;
  const totalProfitPercentage = (totalProfit / initialCapital) * 100;
  const maxDrawdown = Math.min(...steps.map((step) => step.profitLoss));
  const successfulLoops = steps.filter((step) =>
    step.task.includes("Complete Loop")
  ).length;

  return (
    <div className="space-y-6 p-4">
      {/* Strategy Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Strategy Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-80">Initial Capital</p>
            <p className="text-lg font-semibold">
              {steps[0].details.totalValueUSD}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80">Final Value</p>
            <p className="text-lg font-semibold">
              {lastStep.details.totalValueUSD}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80">Total Profit/Loss</p>
            <p
              className={`text-lg font-semibold ${
                totalProfit >= 0 ? "text-green-300" : "text-red-300"
              }`}
            >
              {totalProfit >= 0 ? "+" : ""}
              {totalProfit.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}{" "}
              ({totalProfitPercentage.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80">Successful Loops</p>
            <p className="text-lg font-semibold">{successfulLoops}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Max Drawdown</p>
            <p className="text-lg font-semibold text-red-300">
              {maxDrawdown.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80">Final Health Factor</p>
            <p className="text-lg font-semibold">
              {lastStep.healthFactor.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Vertical Timeline of Steps */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {steps.map((step, index) => (
          <div key={`${step.loopNo}-${index}`} className="relative pl-8">
            {/* Timeline Dot */}
            <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow"></div>

            {/* Step Card */}
            <div
              className={`rounded-lg shadow-lg p-6 ${
                step.task.includes("Error") || step.task.includes("Paused")
                  ? "bg-red-50 border-l-4 border-red-500"
                : step.task.includes("Complete")
                  ? "bg-green-50 border-l-4 border-green-500"
                  : "bg-white border-l-4 border-blue-500"
              }`}
            >
              {/* Step Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      Step {step.loopNo}
                    </span>
                    <h3 className="text-lg font-semibold">{step.task}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(step.date).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Add special highlight for completion step */}
              {step.task === "Strategy Complete" && (
                <div className="mb-4 p-4 bg-green-100 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">Strategy Completed</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <p className="text-sm font-medium text-green-800">Final Total Value</p>
                      <p className="text-2xl font-bold text-green-900">{step.details.totalValueUSD}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-green-800">Initial Capital</p>
                        <p className="text-lg font-semibold text-green-900">{steps[0].details.totalValueUSD}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">Total Profit/Loss</p>
                        <p className={`text-lg font-semibold ${step.profitLoss >= 0 ? "text-green-900" : "text-red-900"}`}>
                          {step.profitLoss >= 0 ? "+" : ""}{step.profitLoss.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Information */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">ETH Price</p>
                  <p className="font-medium text-blue-600">
                    {step.ethPrice.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">wstETH Price</p>
                  <p className="font-medium text-blue-600">
                    {step.wstethPrice.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
              </div>

              {/* Position Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">ETH Balance</p>
                    <p className="font-medium">{step.details.ethBalance} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">wstETH Balance</p>
                    <p className="font-medium">{step.details.wstEthBalance} wstETH</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Borrowed ETH</p>
                    <p className="font-medium">{step.details.borrowedEth} ETH</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="font-medium">{step.details.totalValueUSD}</p>
                  </div>
                </div>
              </div>

              {/* Health Metrics */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Health Factor</p>
                    <p
                      className={`font-medium ${
                        step.healthFactor < 1.1
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {step.healthFactor.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Profit/Loss</p>
                    <p
                      className={`font-medium ${
                        step.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {step.profitLoss >= 0 ? "+" : ""}
                      {step.profitLoss.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Reason/Note */}
              {step.reason && (
                <div className="mt-4 p-3 rounded-md bg-gray-50 border-l-4 border-yellow-400">
                  <p className="text-sm text-gray-600">⚠️ {step.reason}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyStepCards;
