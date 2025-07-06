"use client";

import React from "react";
import { useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import HistoricalDataChart from "@/components/HistoricalDataChart";
import StrategySteps from "@/components/StrategySteps";
import StrategyPerformance from "@/components/StrategyPerformance";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-12-31"),
  });
  const [capitalAmount, setCapitalAmount] = useState<number>(1000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayedAllSteps, setHasPlayedAllSteps] = useState(false);

  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      setError(null);
      setHasPlayedAllSteps(false); // Reset the played state when starting new simulation
      console.log("Starting simulation with:", {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        capitalAmount,
      });

      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          initialCapital: capitalAmount,
        }),
      });

      const data = await response.json();
      console.log("Simulation response:", data);

      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Failed to simulate strategy"
        );
      }

      if (!Array.isArray(data.steps)) {
        throw new Error("Invalid simulation data: steps array is missing");
      }

      setSimulationSteps(data.steps);
      console.log("Simulation steps set:", data.steps);
    } catch (err) {
      console.error("Simulation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleStepsComplete = () => {
    setHasPlayedAllSteps(true);
  };

  // Debug log for simulationSteps
  console.log("Current simulation steps:", simulationSteps);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DeFi Strategy Simulator
          </h1>
          <p className="text-lg text-gray-600">
            Simulate and visualize your ETH staking and leverage strategies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Strategy Parameters
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={setDateRange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Capital (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={capitalAmount}
                    onChange={(e) => setCapitalAmount(Number(e.target.value))}
                    className="pl-8 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all duration-200"
                    min="100"
                    step="100"
                  />
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
              >
                {isSimulating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Simulating...</span>
                  </>
                ) : (
                  "Start Simulation"
                )}
              </button>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 animate-fade-in">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">
              Historical Data
            </h2>
            <HistoricalDataChart dateRange={dateRange} />
          </div>
        </div>

        {simulationSteps.length > 0 && (
          <>
            <div className="mt-8 bg-white p-8 rounded-2xl shadow-lg border border-blue-100 animate-fade-in">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                Simulation Results
              </h2>
              <StrategySteps
                key={simulationSteps.length}
                steps={simulationSteps}
                onComplete={handleStepsComplete}
              />
            </div>
            
            {hasPlayedAllSteps && (
              <div className="mt-8 bg-white p-8 rounded-2xl shadow-lg border border-blue-100 animate-fade-in">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                  Strategy Performance Analysis
                </h2>
                <StrategyPerformance steps={simulationSteps} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
