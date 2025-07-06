export interface MarketConditions {
  isFavorable: boolean;
  volatility: number;
  priceTrend: 'up' | 'down' | 'stable';
  profitPotential: number;
  gasConditions: 'high' | 'medium' | 'low';
}

export interface RiskMetrics {
  volatility: number;
  projectedHealthFactor: number;
  safetyMargin: number;
}

export interface StrategyStep {
  loopNo: number;
  date: string;
  time: string;
  stepType: 'enter' | 'swap' | 'borrow' | 'lend' | 'exit' | 'reenter';
  task: string;
  reason?: string;
  ethPrice: number;
  wstethPrice: number;
  gasPrice: number;
  healthFactor: number;
  profitLoss: number;
  cumulativeProfitLoss: number;
  details: {
    currentCapital: string;
    ethBalance: string;
    wstEthBalance: string;
    borrowedEth: string;
    totalValueUSD: string;
    profitLossUSD: string;
  };
  marketConditions: MarketConditions;
  riskMetrics: RiskMetrics;
  isInitialization?: boolean;
}

export interface SimulationParams {
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  historicalData: {
    ethPrices: PricePoint[];
    wstethPrices: PricePoint[];
    gasPrices: PricePoint[];
  };
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface StrategyStats {
  totalLoops: number;
  successfulLoops: number;
  totalProfit: number;
  maxDrawdown: number;
  averageLoopDuration: number;
  averageLoopProfit: number;
  finalHealthFactor: number;
  exitPoints: {
    date: string;
    reason: string;
  }[];
  reentryPoints: {
    date: string;
    reason: string;
  }[];
}
