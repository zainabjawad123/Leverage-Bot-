import { RiskMetrics, MarketConditions } from "../types/strategy";

const LIQUIDATION_THRESHOLD = 0.8; // 80% liquidation threshold
const MIN_HEALTH_FACTOR = 1.1; // Minimum health factor
const TARGET_HEALTH_FACTOR = 1.5; // Target health factor for new positions
const SAFETY_MARGIN = 0.02; // 2% safety margin for losses
const MIN_PROFIT_POTENTIAL = 0.01; // 1% minimum profit potential
const MAX_VOLATILITY = 0.05; // 5% maximum volatility for entry
const CRITICAL_VOLATILITY = 0.1; // 10% critical volatility for forced exit
const PROFIT_LOCK_THRESHOLD = 0.02; // 2% profit to lock in

export function calculateHealthFactor(
  collateralValueUSD: number,
  borrowValueUSD: number
): number {
  if (borrowValueUSD === 0) return Number.POSITIVE_INFINITY;
  return (collateralValueUSD * LIQUIDATION_THRESHOLD) / borrowValueUSD;
}

export function projectHealthFactor(
  currentCollateral: number,
  additionalCollateral: number,
  currentBorrow: number,
  additionalBorrow: number,
  collateralPrice: number,
  borrowPrice: number
): number {
  const totalCollateral = currentCollateral + additionalCollateral;
  const totalBorrow = currentBorrow + additionalBorrow;
  
  return calculateHealthFactor(
    totalCollateral * collateralPrice,
    totalBorrow * borrowPrice
  );
}

export function calculateMaxSafeExposure(
  collateralValueUSD: number,
  targetHealthFactor: number = TARGET_HEALTH_FACTOR
): number {
  return (collateralValueUSD * LIQUIDATION_THRESHOLD) / targetHealthFactor;
}

export function assessRisk(
  currentProfit: number,
  volatility: number,
  healthFactor: number,
  trendDirection: 'up' | 'down' | 'stable'
): RiskMetrics {
  return {
    volatility,
    projectedHealthFactor: healthFactor * (1 - volatility), // Project health factor considering volatility
    safetyMargin: currentProfit - SAFETY_MARGIN,
  };
}

export function shouldEnterLoop(
  marketConditions: MarketConditions,
  currentProfit: number
): boolean {
  // Only enter if market conditions are favorable and risk is low
  return (
    // Market must be favorable or have good profit potential
    (marketConditions.isFavorable || marketConditions.profitPotential > MIN_PROFIT_POTENTIAL * 100) &&
    // Volatility must be low
    marketConditions.volatility < MAX_VOLATILITY &&
    // Gas conditions should not be high
    marketConditions.gasConditions !== 'high' &&
    // Current position should not be at a loss
    currentProfit >= -SAFETY_MARGIN
  );
}

export function shouldExitLoop(
  healthFactor: number,
  marketConditions: MarketConditions,
  profitLossPercent: number
): { shouldExit: boolean; reason: string } {
  // Exit conditions in order of priority
  
  // 1. Health factor safety
  if (healthFactor < MIN_HEALTH_FACTOR) {
    return {
      shouldExit: true,
      reason: "Health factor below minimum threshold"
    };
  }

  // 2. Loss prevention - Exit on any potential loss
  if (profitLossPercent < -SAFETY_MARGIN) {
    return {
      shouldExit: true,
      reason: "Position showing loss beyond safety margin"
    };
  }

  // 3. High volatility risk
  if (marketConditions.volatility > CRITICAL_VOLATILITY) {
    return {
      shouldExit: true,
      reason: "Market volatility too high"
    };
  }

  // 4. Adverse market conditions with minimal profit
  if (
    marketConditions.priceTrend === 'down' &&
    profitLossPercent > PROFIT_LOCK_THRESHOLD
  ) {
    return {
      shouldExit: true,
      reason: "Locking in profits in downward trend"
    };
  }

  // 5. High gas costs eating into profits
  if (
    marketConditions.gasConditions === 'high' &&
    profitLossPercent > 0
  ) {
    return {
      shouldExit: true,
      reason: "High gas costs with existing profits"
    };
  }

  return {
    shouldExit: false,
    reason: ""
  };
}

export function shouldReenterLoop(
  marketConditions: MarketConditions,
  lastExitProfit: number
): boolean {
  return (
    marketConditions.isFavorable &&
    marketConditions.volatility < MAX_VOLATILITY &&
    marketConditions.priceTrend !== 'down' &&
    marketConditions.gasConditions !== 'high' &&
    lastExitProfit > -SAFETY_MARGIN
  );
}

export function calculateOptimalBorrowAmount(
  collateralValueUSD: number,
  currentPrice: number,
  volatility: number
): number {
  // Calculate base borrow amount targeting the ideal health factor
  const maxSafeBorrow = calculateMaxSafeExposure(collateralValueUSD);
  
  // Reduce borrow amount based on volatility
  const volatilityAdjustment = 1 - (volatility / MAX_VOLATILITY);
  const adjustedBorrow = maxSafeBorrow * volatilityAdjustment;
  
  // Convert USD amount to ETH
  return adjustedBorrow / currentPrice;
} 