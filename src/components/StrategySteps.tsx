"use client";

import { useState, useEffect } from "react";

interface Step {
  loopNo: number;
  date: string;
  task: string;
  reason?: string;
  ethPrice: number;
  wstethPrice: number;
  gasPrice: number;
  liquidationRatio: number;
  profitLoss: number;
  healthFactor: number;
  details: {
    currentCapital: string;
    ethBalance: string;
    wstEthBalance: string;
    borrowedEth: string;
    totalValueUSD: string;
    profitLossUSD: string;
  };
  isInitialization?: boolean;
}

interface StrategyStepsProps {
  steps: Step[];
  onComplete?: () => void;
}

export default function StrategySteps({ steps, onComplete }: StrategyStepsProps) {
  const [visibleSteps, setVisibleSteps] = useState<Step[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isPlaying && currentIndex < steps.length) {
      timeoutId = setTimeout(() => {
        setVisibleSteps(prev => [...prev, steps[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
        
        if (currentIndex >= steps.length - 1) {
          setIsPlaying(false);
          onComplete?.();
        }
      }, 2000 / playbackSpeed);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying, currentIndex, steps, playbackSpeed, onComplete]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setVisibleSteps([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  if (!steps || steps.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-blue-100">
        <p className="text-gray-600">No simulation steps available.</p>
      </div>
    );
  }

  const progress = (currentIndex / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 bg-white p-4 rounded-lg shadow-md z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
            type="button"
          >
            {isPlaying ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>Pause</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Play</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
            type="button"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
            <span>Reset</span>
          </button>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Speed:</label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="rounded-lg border-gray-300 text-sm focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Step {currentIndex} of {steps.length}
          </span>
          <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vertical Timeline of Steps */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {visibleSteps.map((step, index) => (
          <div key={`${step.loopNo}-${index}`} className="relative pl-8 animate-fade-in">
            {/* Timeline Dot */}
            <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white bg-blue-500 shadow"></div>

            {/* Step Card */}
            <div
              className={`rounded-lg shadow-lg p-6 ${
                step.isInitialization
                  ? "bg-blue-50 border-l-4 border-blue-500"
                  : step.task.includes("Error") || step.task.includes("Paused")
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
                      {step.isInitialization ? "Initialization" : `Step ${step.loopNo}`}
                    </span>
                    <h3 className="text-lg font-semibold">
                      {step.isInitialization ? "Initial Capital Conversion" : step.task}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(step.date).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Price Information */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">ETH Price</p>
                  <p className="font-medium text-blue-600">
                    {(step.ethPrice ?? 0).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                </div>
                {!step.isInitialization && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">wstETH Price</p>
                    <p className="font-medium text-blue-600">
                      {(step.wstethPrice ?? 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Position Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">Initial Capital</p>
                    <p className="font-medium">{step.details.currentCapital}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ETH Balance</p>
                    <p className="font-medium">{step.details.ethBalance} ETH</p>
                  </div>
                </div>
                {!step.isInitialization && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">wstETH Balance</p>
                      <p className="font-medium">{step.details.wstEthBalance} wstETH</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Borrowed ETH</p>
                      <p className="font-medium">{step.details.borrowedEth} ETH</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Value */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="font-medium">{step.details.totalValueUSD}</p>
                  </div>
                  {!step.isInitialization && (
                    <div>
                      <p className="text-sm text-gray-500">Profit/Loss</p>
                      <p className={`font-medium ${step.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {step.profitLoss >= 0 ? "+" : ""}
                        {step.profitLoss.toFixed(2)}%
                      </p>
                    </div>
                  )}
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
}
