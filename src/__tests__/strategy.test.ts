import { simulateStrategy } from '../lib/strategy';
import { SimulationParams, PricePoint } from '../types/strategy';

describe('DeFi Looping Strategy Tests', () => {
  // Helper function to create mock price data
  const createMockPriceData = (
    startPrice: number,
    priceChange: number,
    days: number
  ): PricePoint[] => {
    return Array.from({ length: days }, (_, i) => ({
      timestamp: Math.floor(Date.now() / 1000) + i * 86400, // Daily intervals
      price: startPrice + (priceChange * i)
    }));
  };

  // Test case 1: Basic strategy initialization
  test('Strategy initializes correctly with valid input data', async () => {
    const params: SimulationParams = {
      initialCapital: 10000, // $10,000 initial capital
      historicalData: {
        ethPrices: createMockPriceData(2000, 0, 10), // Stable ETH price at $2000
        wstethPrices: createMockPriceData(2050, 0, 10), // Stable wstETH price at $2050
        gasPrices: createMockPriceData(50, 0, 10), // Stable gas price at 50 Gwei
      }
    };

    const result = await simulateStrategy(params);
    
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].task).toBe('Initialize Strategy');
    expect(result[0].stepType).toBe('enter');
  });

  // Test case 2: Strategy behavior in favorable market conditions
  test('Strategy enters position in favorable market conditions', async () => {
    const params: SimulationParams = {
      initialCapital: 10000,
      historicalData: {
        ethPrices: createMockPriceData(2000, 10, 10), // Rising ETH price
        wstethPrices: createMockPriceData(2050, 12, 10), // Rising wstETH price (slightly faster)
        gasPrices: createMockPriceData(30, 0, 10), // Low stable gas price
      }
    };

    const result = await simulateStrategy(params);
    
    // Check if strategy entered a position
    const entryStep = result.find(step => step.stepType === 'borrow');
    expect(entryStep).toBeDefined();
    expect(entryStep?.details.borrowedEth).not.toBe('0.0000');
  });

  // Test case 3: Strategy risk management
  test('Strategy maintains safe health factor', async () => {
    const params: SimulationParams = {
      initialCapital: 10000,
      historicalData: {
        ethPrices: createMockPriceData(2000, -20, 10), // Declining ETH price
        wstethPrices: createMockPriceData(2050, -18, 10), // Declining wstETH price
        gasPrices: createMockPriceData(50, 0, 10),
      }
    };

    const result = await simulateStrategy(params);
    
    // Check all steps maintain safe health factor
    result.forEach(step => {
      if (step.healthFactor !== Number.POSITIVE_INFINITY) {
        expect(step.healthFactor).toBeGreaterThan(1.1); // Minimum health factor
      }
    });
  });

  // Test case 4: Strategy exit conditions
  test('Strategy exits position in unfavorable conditions', async () => {
    const params: SimulationParams = {
      initialCapital: 10000,
      historicalData: {
        ethPrices: createMockPriceData(2000, 10, 5).concat(createMockPriceData(2050, -50, 5)), // Severe price crash after day 5
        wstethPrices: createMockPriceData(2050, 12, 5).concat(createMockPriceData(2110, -55, 5)), // Even more severe crash for wstETH
        gasPrices: createMockPriceData(30, 5, 10), // Rising gas prices
      }
    };

    const result = await simulateStrategy(params);
    
    // Check if strategy exited position
    const exitStep = result.find(step => step.stepType === 'exit' && step.reason?.includes('Exited position due to risk conditions'));
    expect(exitStep).toBeDefined();
    expect(typeof exitStep?.reason).toBe('string');
    expect(exitStep?.reason).toMatch(/Exited position due to risk conditions:.+/);
  });

  // Test case 5: Error handling
  test('Strategy handles invalid input data', async () => {
    const params: SimulationParams = {
      initialCapital: 10000,
      historicalData: {
        ethPrices: [], // Empty price data
        wstethPrices: [],
        gasPrices: [],
      }
    };

    await expect(simulateStrategy(params)).rejects.toThrow('No ETH price data');
  });

  // Test case 6: Profit calculation
  test('Strategy tracks profit/loss correctly', async () => {
    const params: SimulationParams = {
      initialCapital: 10000,
      historicalData: {
        ethPrices: createMockPriceData(2000, 5, 10), // Steadily rising prices
        wstethPrices: createMockPriceData(2050, 6, 10),
        gasPrices: createMockPriceData(40, 0, 10),
      }
    };

    const result = await simulateStrategy(params);
    
    // Check profit calculation consistency
    result.forEach((step, index) => {
      if (index > 0) {
        expect(step.cumulativeProfitLoss).toBeDefined();
        // Ensure cumulative P/L matches the step's details
        const totalValue = parseFloat(step.details.totalValueUSD.replace(/[$,]/g, ''));
        const expectedProfitLoss = ((totalValue - params.initialCapital) / params.initialCapital) * 100;
        expect(step.profitLoss).toBeCloseTo(expectedProfitLoss, 1);
      }
    });
  });
}); 