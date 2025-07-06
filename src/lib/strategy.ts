import { SimulationParams, StrategyStep, PricePoint, MarketConditions, RiskMetrics } from "../types/strategy";
import { 
  calculateHealthFactor,
  calculateMaxSafeExposure,
  assessRisk,
  shouldEnterLoop,
  shouldExitLoop,
  shouldReenterLoop,
  calculateOptimalBorrowAmount
} from "./risk-management";

const LIQUIDATION_THRESHOLD = 0.825; // 82.5% liquidation threshold for wstETH on Aave
const MIN_HEALTH_FACTOR = 1.1; // Minimum health factor before stopping
const MAX_LOOPS = 5; // Maximum number of loops to prevent infinite looping
const MAX_VOLATILITY = 0.2; // Maximum volatility level for exit conditions
const CRITICAL_VOLATILITY = 0.3; // Critical volatility level for exit conditions
const SAFETY_MARGIN = 0.05; // Safety margin for exit conditions

// Helper function to calculate health factor following Aave's methodology
const calculateAaveHealthFactor = (
  collateralBalance: number,
  collateralPrice: number,
  borrowBalance: number,
  borrowPrice: number
): number => {
  if (borrowBalance === 0) return Number.POSITIVE_INFINITY;
  
  // Calculate total values in USD
  const collateralValueUSD = collateralBalance * collateralPrice;
  const borrowValueUSD = borrowBalance * borrowPrice;
  
  // Health Factor = (Collateral Value × Liquidation Threshold) / Total Borrowed Value
  return (collateralValueUSD * LIQUIDATION_THRESHOLD) / borrowValueUSD;
};

// Helper function to calculate safe borrow amount
const calculateSafeBorrowAmount = (
  collateralBalance: number,
  collateralPrice: number,
  ethPrice: number,
  existingBorrow: number
): number => {
  // Calculate maximum borrow to maintain minimum health factor
  const maxBorrowValueUSD = (collateralBalance * collateralPrice * LIQUIDATION_THRESHOLD) / MIN_HEALTH_FACTOR;
  const totalAllowedBorrowETH = maxBorrowValueUSD / ethPrice;
  
  // Subtract existing borrow to get additional borrow capacity
  const additionalBorrowCapacity = totalAllowedBorrowETH - existingBorrow;
  
  // Add 5% safety margin
  return additionalBorrowCapacity * 0.95;
};

// Helper function to get price at a specific timestamp
function getPrice(priceData: PricePoint[], targetTimestamp: number): number {
  const price = priceData.find(p => p.timestamp === targetTimestamp);
  return price ? price.price : 0;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Helper function to calculate position metrics
function calculatePositionMetrics(
  currentEthBalance: number,
  currentWstEthBalance: number,
  borrowedEth: number,
  ethPrice: number,
  wstethPrice: number,
  initialCapital: number
) {
  // Calculate the total value of all assets minus borrowed amount
  const totalValueUSD = 
    (currentEthBalance * ethPrice) +
    (currentWstEthBalance * wstethPrice) -
    (borrowedEth * ethPrice);
    
  const borrowValueUSD = borrowedEth * ethPrice;
  const netValueUSD = totalValueUSD; // totalValueUSD already includes borrowed amount subtraction
  const profitLossUSD = netValueUSD - initialCapital;
  const profitLossPercent = (profitLossUSD / initialCapital) * 100;

  return {
    totalValueUSD,
    borrowValueUSD,
    netValueUSD,
    profitLossUSD,
    profitLossPercent,
  };
}

// Helper function to analyze market conditions
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function determinePriceTrend(prices: number[]): 'up' | 'down' | 'stable' {
  if (prices.length < 2) return 'stable';
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = (lastPrice - firstPrice) / firstPrice;
  if (change > 0.02) return 'up';
  if (change < -0.02) return 'down';
  return 'stable';
}

function calculateProfitPotential(prices: number[]): number {
  // Simplified profit potential calculation
  return 5; // Default to 5% potential
}

function determineGasConditions(avgGasPrice: number): 'high' | 'medium' | 'low' {
  if (avgGasPrice > 100) return 'high';
  if (avgGasPrice > 50) return 'medium';
  return 'low';
}

function analyzeMarketConditions(
  historicalData: SimulationParams['historicalData'],
  timestamp: number,
  lookbackPeriod: number = 7
): MarketConditions {
  const ethPrices = historicalData.ethPrices
    .filter(p => p.timestamp <= timestamp && p.timestamp > timestamp - lookbackPeriod * 86400)
    .map(p => p.price);

  const volatility = calculateVolatility(ethPrices);
  const priceTrend = determinePriceTrend(ethPrices);
  const gasPrices = historicalData.gasPrices
    .filter(p => p.timestamp <= timestamp && p.timestamp > timestamp - lookbackPeriod * 86400)
    .map(p => p.price);
  const avgGasPrice = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;

  return {
    isFavorable: volatility < 0.05 && priceTrend !== 'down',
    volatility,
    priceTrend,
    profitPotential: calculateProfitPotential(ethPrices),
    gasConditions: determineGasConditions(avgGasPrice),
  };
}

// Helper function to create a strategy step
function createStrategyStep(
  params: {
    loopNo: number;
    timestamp: number;
    stepType: StrategyStep['stepType'];
    task: string;
    ethPrice: number;
    wstethPrice: number;
    gasPrice: number;
    currentEthBalance: number;
    currentWstEthBalance: number;
    borrowedEth: number;
    initialCapital: number;
    marketConditions: MarketConditions;
    reason?: string;
  }
): StrategyStep {
  const metrics = calculatePositionMetrics(
    params.currentEthBalance,
    params.currentWstEthBalance,
    params.borrowedEth,
    params.ethPrice,
    params.wstethPrice,
    params.initialCapital
  );

  // For the final "Strategy Complete" step, extract profit/loss from reason if available
  let profitLoss = metrics.profitLossPercent;
  if (params.task === 'Strategy Complete' && params.reason) {
    const match = params.reason.match(/(-?\d+\.?\d*)%/);
    if (match) {
      profitLoss = parseFloat(match[1]);
    }
  }

  return {
    loopNo: params.loopNo,
    date: new Date(params.timestamp * 1000).toISOString().split('T')[0],
    time: new Date(params.timestamp * 1000).toISOString().split('T')[1].split('.')[0],
    stepType: params.stepType,
    task: params.task,
    reason: params.reason,
    ethPrice: params.ethPrice,
    wstethPrice: params.wstethPrice,
    gasPrice: params.gasPrice,
    healthFactor: calculateHealthFactor(
      params.currentWstEthBalance * params.wstethPrice,
      params.borrowedEth * params.ethPrice
    ),
    profitLoss: profitLoss,
    cumulativeProfitLoss: profitLoss,
    details: {
      currentCapital: formatCurrency(params.initialCapital),
      ethBalance: params.currentEthBalance.toFixed(4),
      wstEthBalance: params.currentWstEthBalance.toFixed(4),
      borrowedEth: params.borrowedEth.toFixed(4),
      totalValueUSD: formatCurrency(metrics.totalValueUSD),
      profitLossUSD: formatCurrency(metrics.profitLossUSD),
    },
    marketConditions: params.marketConditions,
    riskMetrics: {
      volatility: params.marketConditions.volatility,
      projectedHealthFactor: calculateHealthFactor(
        params.currentWstEthBalance * params.wstethPrice,
        params.borrowedEth * params.ethPrice
      ) * (1 - params.marketConditions.volatility),
      safetyMargin: profitLoss,
    },
  };
}

export async function simulateStrategy(
  params: SimulationParams
): Promise<StrategyStep[]> {
  try {
    if (!params.historicalData.ethPrices?.length) throw new Error("No ETH price data");
    if (!params.historicalData.wstethPrices?.length) throw new Error("No wstETH price data");
    if (!params.historicalData.gasPrices?.length) throw new Error("No gas price data");

    let currentEthBalance = params.initialCapital / params.historicalData.ethPrices[0].price;
    let currentWstEthBalance = 0;
    let borrowedEth = 0;
    let isInPosition = false;
    let lastExitProfit = 0;
    let loopCount = 0;
    const steps: StrategyStep[] = [];

    // Add initial step
    steps.push(createStrategyStep({
      loopNo: 0,
      timestamp: params.historicalData.ethPrices[0].timestamp,
      stepType: 'enter',
      task: 'Initialize Strategy',
      ethPrice: params.historicalData.ethPrices[0].price,
      wstethPrice: params.historicalData.wstethPrices[0].price,
      gasPrice: params.historicalData.gasPrices[0].price,
      currentEthBalance,
      currentWstEthBalance,
      borrowedEth,
      initialCapital: params.initialCapital,
      marketConditions: analyzeMarketConditions(
        params.historicalData,
        params.historicalData.ethPrices[0].timestamp,
        7
      ),
    }));

    let currentTimestamp = params.historicalData.ethPrices[0].timestamp;
    const endTimestamp = params.historicalData.ethPrices[params.historicalData.ethPrices.length - 1].timestamp;

    while (currentTimestamp <= endTimestamp) {
      const ethPrice = getPrice(params.historicalData.ethPrices, currentTimestamp);
      const wstethPrice = getPrice(params.historicalData.wstethPrices, currentTimestamp);
      const gasPrice = getPrice(params.historicalData.gasPrices, currentTimestamp);
      
      const marketConditions = analyzeMarketConditions(
        params.historicalData,
        currentTimestamp,
        7
      );

      const currentMetrics = calculatePositionMetrics(
        currentEthBalance,
        currentWstEthBalance,
        borrowedEth,
        ethPrice,
        wstethPrice,
        params.initialCapital
      );

      const healthFactor = calculateHealthFactor(
        currentWstEthBalance * wstethPrice,
              borrowedEth * ethPrice
      );

      if (!isInPosition) {
        // Check entry conditions
        if (shouldEnterLoop(marketConditions, currentMetrics.profitLossPercent)) {
          loopCount++;
          // Enter new position
          const swapAmount = currentEthBalance;
          currentEthBalance = 0;
          currentWstEthBalance = (swapAmount * ethPrice) / wstethPrice;

          steps.push(createStrategyStep({
            loopNo: loopCount,
            timestamp: currentTimestamp,
            stepType: 'swap',
            task: `Swap ETH to wstETH - Loop ${loopCount}`,
            ethPrice,
            wstethPrice,
            gasPrice,
            currentEthBalance,
            currentWstEthBalance,
            borrowedEth,
            initialCapital: params.initialCapital,
            marketConditions,
          }));

          // Calculate optimal borrow amount
          const borrowAmount = calculateOptimalBorrowAmount(
            currentWstEthBalance * wstethPrice,
            ethPrice,
            marketConditions.volatility
          );

          currentEthBalance += borrowAmount;
          borrowedEth += borrowAmount;

          steps.push(createStrategyStep({
            loopNo: loopCount,
            timestamp: currentTimestamp,
            stepType: 'borrow',
            task: `Borrow ETH Against Collateral - Loop ${loopCount}`,
            ethPrice,
            wstethPrice,
            gasPrice,
            currentEthBalance,
            currentWstEthBalance,
            borrowedEth,
            initialCapital: params.initialCapital,
            marketConditions,
            reason: `Borrowed ${borrowAmount.toFixed(4)} ETH optimally`,
          }));

          isInPosition = true;
        }
      } else {
        // Check exit conditions
        const exitDecision = shouldExitLoop(
          healthFactor,
          marketConditions,
          currentMetrics.profitLossPercent
        );

        if (exitDecision.shouldExit) {
          // Exit position
          // First repay borrowed ETH
          const repaymentAmount = Math.min(currentEthBalance, borrowedEth);
          currentEthBalance -= repaymentAmount;
          borrowedEth -= repaymentAmount;

          // Then convert remaining wstETH back to ETH if loan is fully repaid
          if (borrowedEth === 0 && currentWstEthBalance > 0) {
            currentEthBalance += currentWstEthBalance * (wstethPrice / ethPrice);
            currentWstEthBalance = 0;
          }

          lastExitProfit = currentMetrics.profitLossPercent;
          isInPosition = false;

          steps.push(createStrategyStep({
            loopNo: loopCount,
            timestamp: currentTimestamp,
            stepType: 'exit',
            task: 'Exit Position',
            ethPrice,
            wstethPrice,
            gasPrice,
            currentEthBalance,
            currentWstEthBalance,
            borrowedEth,
            initialCapital: params.initialCapital,
            marketConditions,
            reason: exitDecision.reason,
          }));
        }
      }

      // Move to next day
      currentTimestamp += 86400;
    }

    // Add final step
    const finalMetrics = calculatePositionMetrics(
      currentEthBalance,
      currentWstEthBalance,
      borrowedEth,
      getPrice(params.historicalData.ethPrices, currentTimestamp),
      getPrice(params.historicalData.wstethPrices, currentTimestamp),
      params.initialCapital
    );

    // Calculate the actual final value including all assets
    const finalTotalValue = 
      (currentEthBalance * getPrice(params.historicalData.ethPrices, currentTimestamp)) +
      (currentWstEthBalance * getPrice(params.historicalData.wstethPrices, currentTimestamp)) -
      (borrowedEth * getPrice(params.historicalData.ethPrices, currentTimestamp));

    steps.push(createStrategyStep({
      loopNo: loopCount,
      timestamp: currentTimestamp,
      stepType: 'exit',
      task: 'Strategy Complete',
      ethPrice: getPrice(params.historicalData.ethPrices, currentTimestamp),
      wstethPrice: getPrice(params.historicalData.wstethPrices, currentTimestamp),
      gasPrice: getPrice(params.historicalData.gasPrices, currentTimestamp),
      currentEthBalance,
      currentWstEthBalance,
      borrowedEth,
      initialCapital: params.initialCapital,
      marketConditions: analyzeMarketConditions(params.historicalData, currentTimestamp, 7),
      reason: `Final strategy result: ${lastExitProfit.toFixed(2)}% profit/loss | Final Total Value: ${formatCurrency(finalTotalValue)}`,
    }));

    return steps;
  } catch (error) {
    console.error("Error in strategy simulation:", error);
    throw error;
  }
}
