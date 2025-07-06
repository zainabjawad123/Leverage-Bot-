import { MarketConditions, PricePoint } from "../types/strategy";

const VOLATILITY_WINDOW = 7; // 7-day window for volatility calculation
const TREND_WINDOW = 3; // 3-day window for trend analysis
const HIGH_GAS_THRESHOLD = 100; // Gwei
const MEDIUM_GAS_THRESHOLD = 50; // Gwei
const PRICE_MOVEMENT_THRESHOLD = 0.02; // 2% price movement threshold
const VOLATILITY_THRESHOLD = 0.03; // 3% volatility threshold for risk assessment

export function calculateVolatility(prices: PricePoint[], window: number = VOLATILITY_WINDOW): number {
  if (prices.length < window) return 0;

  const returns: number[] = [];
  for (let i = 1; i < window; i++) {
    const returnValue = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
    returns.push(returnValue);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

export function assessPriceTrend(
  prices: PricePoint[],
  window: number = TREND_WINDOW
): 'up' | 'down' | 'stable' {
  if (prices.length < window) return 'stable';

  const recentPrices = prices.slice(-window);
  const firstPrice = recentPrices[0].price;
  const lastPrice = recentPrices[recentPrices.length - 1].price;
  const priceChange = (lastPrice - firstPrice) / firstPrice;

  if (priceChange > PRICE_MOVEMENT_THRESHOLD) return 'up';
  if (priceChange < -PRICE_MOVEMENT_THRESHOLD) return 'down';
  return 'stable';
}

export function evaluateGasConditions(gasPrice: number): 'high' | 'medium' | 'low' {
  if (gasPrice > HIGH_GAS_THRESHOLD) return 'high';
  if (gasPrice > MEDIUM_GAS_THRESHOLD) return 'medium';
  return 'low';
}

export function estimateProfitPotential(
  ethPrice: number,
  wstethPrice: number,
  ethTrend: 'up' | 'down' | 'stable',
  wstethTrend: 'up' | 'down' | 'stable',
  gasConditions: 'high' | 'medium' | 'low'
): number {
  let potential = 0;

  // Base potential from price difference
  const priceDiff = (wstethPrice - ethPrice) / ethPrice;
  potential += priceDiff * 100; // Convert to percentage

  // Adjust based on trends
  if (ethTrend === 'up' && wstethTrend === 'up') potential += 2;
  if (ethTrend === 'down' && wstethTrend === 'down') potential -= 2;

  // Adjust for gas conditions
  if (gasConditions === 'high') potential -= 1;
  if (gasConditions === 'low') potential += 1;

  return potential;
}

export function analyzeMarketConditions(
  currentIndex: number,
  ethPrices: PricePoint[],
  wstethPrices: PricePoint[],
  gasPrice: number
): MarketConditions {
  // Get relevant price windows for analysis
  const relevantEthPrices = ethPrices.slice(Math.max(0, currentIndex - VOLATILITY_WINDOW), currentIndex + 1);
  const relevantWstethPrices = wstethPrices.slice(Math.max(0, currentIndex - VOLATILITY_WINDOW), currentIndex + 1);

  // Calculate metrics
  const ethVolatility = calculateVolatility(relevantEthPrices);
  const wstethVolatility = calculateVolatility(relevantWstethPrices);
  const volatility = Math.max(ethVolatility, wstethVolatility);

  const ethTrend = assessPriceTrend(relevantEthPrices);
  const wstethTrend = assessPriceTrend(relevantWstethPrices);
  const gasConditions = evaluateGasConditions(gasPrice);

  const profitPotential = estimateProfitPotential(
    ethPrices[currentIndex].price,
    wstethPrices[currentIndex].price,
    ethTrend,
    wstethTrend,
    gasConditions
  );

  // Determine if market conditions are favorable
  const isFavorable = 
    volatility < VOLATILITY_THRESHOLD &&
    gasConditions !== 'high' &&
    profitPotential > 0 &&
    (ethTrend !== 'down' || wstethTrend !== 'down');

  return {
    isFavorable,
    volatility,
    priceTrend: ethTrend, // Using ETH trend as primary indicator
    profitPotential,
    gasConditions
  };
} 