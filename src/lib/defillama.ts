import { cache } from './cache';

interface DeFiLlamaResponse {
  coins: {
    [key: string]: {
      prices: [number, number][]; // [timestamp, price]
      symbol: string;
      name: string;
    };
  };
}

interface EtherscanGasResponse {
  status: string;
  message: string;
  result: {
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
  };
}

export async function fetchHistoricalPrices(
  startDate: Date,
  endDate: Date,
  tokens: string[] = [
    "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "ethereum:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  ]
): Promise<{
  [key: string]: {
    timestamp: number;
    price: number;
  }[];
}> {
  try {
    const cacheKey = `historical_prices_${startDate.getTime()}_${endDate.getTime()}`;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      console.log('Using cached historical price data');
      return cachedData;
    }

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Calculate time span in days
    const timeSpanDays = Math.ceil((endTimestamp - startTimestamp) / 86400);
    console.log(`Fetching prices for ${timeSpanDays} days`);

    // Generate daily timestamps
    const dailyTimestamps: number[] = [];
    for (let t = startTimestamp; t <= endTimestamp; t += 86400) {
      dailyTimestamps.push(t);
    }

    // Map contract addresses to internal names
    const tokenMapping: { [key: string]: string } = {
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "ethereum", // WETH
      "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wsteth", // wstETH
    };

    const result: { [key: string]: { timestamp: number; price: number }[] } =
      {};

    // Fetch historical data for each token using the chart endpoint
    await Promise.all(
      tokens.map(async (token) => {
        const contractAddress = token.split(":")[1];
        if (!contractAddress) {
          throw new Error(`Invalid token format: ${token}`);
        }

        const internalKey = tokenMapping[contractAddress];
        if (!internalKey) {
          throw new Error(`Unknown token address: ${contractAddress}`);
        }

        // Using the chart endpoint with adjusted parameters for longer time ranges
        const url = `https://coins.llama.fi/chart/${token}?start=${startTimestamp}&span=${timeSpanDays}&period=1d`;
        console.log(`Fetching historical data for ${internalKey} from:`, url);

        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch historical prices for ${internalKey}: ${response.statusText}. Response: ${errorText}`
          );
        }

        const data = await response.json();
        console.log(`Historical data response for ${internalKey} (sample):`, {
          token,
          pricesCount: data.coins?.[token]?.prices?.length || 0,
          firstPrice: data.coins?.[token]?.prices?.[0],
          lastPrice:
            data.coins?.[token]?.prices?.[
              data.coins?.[token]?.prices?.length - 1
            ],
        });

        if (
          !data.coins ||
          !data.coins[token] ||
          !data.coins[token].prices ||
          !Array.isArray(data.coins[token].prices)
        ) {
          throw new Error(`Invalid price data format for ${internalKey}`);
        }

        // Convert the data to our format
        const prices = data.coins[token].prices.map((p: any) => ({
          timestamp: p.timestamp,
          price: p.price,
        }));

        if (prices.length === 0) {
          throw new Error(`No price data available for ${internalKey}`);
        }

        // Sort prices by timestamp
        const sortedPrices = [...prices].sort(
          (a, b) => a.timestamp - b.timestamp
        );

        // Generate daily prices using linear interpolation
        result[internalKey] = dailyTimestamps.map((timestamp) => {
          // Find the closest price points
          const index = sortedPrices.findIndex((p) => p.timestamp > timestamp);

          if (index === -1) {
            // If all prices are before this timestamp, use the last price
            const lastPrice = sortedPrices[sortedPrices.length - 1];
            return {
              timestamp,
              price: lastPrice.price,
            };
          }

          if (index === 0) {
            // If all prices are after this timestamp, use the first price
            const firstPrice = sortedPrices[0];
            return {
              timestamp,
              price: firstPrice.price,
            };
          }

          // Interpolate between the two closest points
          const before = sortedPrices[index - 1];
          const after = sortedPrices[index];
          const ratio =
            (timestamp - before.timestamp) /
            (after.timestamp - before.timestamp);
          const price = before.price + (after.price - before.price) * ratio;

          return {
            timestamp,
            price,
          };
        });

        // Verify the data coverage
        console.log(`Data coverage for ${internalKey}:`, {
          requestedDays: timeSpanDays,
          receivedDataPoints: prices.length,
          generatedDataPoints: result[internalKey].length,
          firstDate: new Date(
            result[internalKey][0].timestamp * 1000
          ).toISOString(),
          lastDate: new Date(
            result[internalKey][result[internalKey].length - 1].timestamp * 1000
          ).toISOString(),
        });
      })
    );

    // Verify we have data for all required tokens
    for (const internalKey of ["ethereum", "wsteth"]) {
      if (!result[internalKey] || result[internalKey].length === 0) {
        console.error(
          `Missing or empty price data for ${internalKey}. Available data:`,
          result
        );
        throw new Error(`Missing or empty price data for ${internalKey}`);
      }
    }

    await cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    throw error;
  }
}

export async function fetchHistoricalGasPrices(
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: number; price: number }[]> {
  try {
    const cacheKey = `historical_gas_${startDate.getTime()}_${endDate.getTime()}`;
    const cachedData = await cache.get(cacheKey);
    
    if (cachedData) {
      console.log('Using cached gas price data');
      return cachedData;
    }

    const startBlock = await getBlockNumberFromTimestamp(startDate);
    const endBlock = await getBlockNumberFromTimestamp(endDate);
    
    // Fetch historical gas prices from Etherscan
    const response = await fetch(
      `https://api.etherscan.io/api?module=stats&action=dailyavggasprice&startdate=${startDate.toISOString().split('T')[0]}&enddate=${endDate.toISOString().split('T')[0]}&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch historical gas prices');
    }

    const data = await response.json();
    
    if (data.status === '0' && data.message === 'NOTOK') {
      throw new Error(`Etherscan API error: ${data.result}`);
    }

    // Process and format the gas price data
    const gasPrices = data.result.map((entry: any) => ({
      timestamp: Math.floor(new Date(entry.UTCDate).getTime() / 1000),
      price: Math.floor(entry.avgGasPrice_Wei / 1e9), // Convert Wei to Gwei
    }));

    // Fill in any missing days using linear interpolation
    const dailyGasPrices = interpolateDailyPrices(gasPrices, startDate, endDate);

    await cache.set(cacheKey, dailyGasPrices);
    return dailyGasPrices;
  } catch (error) {
    console.error('Error fetching historical gas prices:', error);
    // Fallback to estimated gas prices if historical data fetch fails
    return fetchEstimatedGasPrices(startDate, endDate);
  }
}

async function getBlockNumberFromTimestamp(date: Date): Promise<number> {
  const timestamp = Math.floor(date.getTime() / 1000);
  const response = await fetch(
    `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${process.env.ETHERSCAN_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch block number');
  }

  const data = await response.json();
  return parseInt(data.result);
}

function interpolateDailyPrices(
  prices: { timestamp: number; price: number }[],
  startDate: Date,
  endDate: Date
): { timestamp: number; price: number }[] {
  const dailyPrices: { timestamp: number; price: number }[] = [];
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 86400) {
    // Find the closest price points
    const index = prices.findIndex(p => p.timestamp > timestamp);
    
    if (index === -1) {
      // Use the last available price
      dailyPrices.push({
        timestamp,
        price: prices[prices.length - 1].price,
      });
    } else if (index === 0) {
      // Use the first available price
      dailyPrices.push({
        timestamp,
        price: prices[0].price,
      });
    } else {
      // Interpolate between two points
      const before = prices[index - 1];
      const after = prices[index];
      const ratio = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
      const price = before.price + (after.price - before.price) * ratio;
      
      dailyPrices.push({
        timestamp,
        price: Math.round(price),
      });
    }
  }

  return dailyPrices;
}

// Fallback function for estimated gas prices
async function fetchEstimatedGasPrices(
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: number; price: number }[]> {
  try {
    // Get current gas price as baseline
    const response = await fetch(
      `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch current gas price');
    }

    const data = await response.json() as EtherscanGasResponse;
    const baseGasPrice = parseInt(data.result.SafeGasPrice);

    // Generate estimated historical prices with realistic variations
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);
    const prices: { timestamp: number; price: number }[] = [];

    for (let t = startTimestamp; t <= endTimestamp; t += 86400) {
      // Add realistic variations based on time of week and randomness
      const dayOfWeek = new Date(t * 1000).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const timeVariation = isWeekend ? 0.8 : 1.2; // Lower gas on weekends
      const randomVariation = 0.9 + Math.random() * 0.2; // ±10% random variation
      
      prices.push({
        timestamp: t,
        price: Math.round(baseGasPrice * timeVariation * randomVariation),
      });
    }

    return prices;
  } catch (error) {
    console.error('Error in fallback gas price estimation:', error);
    throw error;
  }
}

export async function fetchGasPrices(
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: number; price: number }[]> {
  try {
    // Using Etherscan's free API for gas prices
    const response = await fetch(
      `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch gas prices");
    }

    const data = await response.json();

    if (data.status === "0" && data.message === "NOTOK") {
      throw new Error(`Etherscan API error: ${data.result}`);
    }

    if (!data.result || !data.result.SafeGasPrice) {
      throw new Error("Invalid response format from Etherscan API");
    }

    const gasPrice = parseInt(data.result.SafeGasPrice);

    // Generate daily gas price data points
    const timestamps = [];
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    for (let t = startTimestamp; t <= endTimestamp; t += 86400) {
      timestamps.push({
        timestamp: t,
        price: gasPrice * (0.9 + Math.random() * 0.2), // Add some variation to the gas price
      });
    }

    return timestamps;
  } catch (error) {
    console.error("Error fetching gas prices:", error);
    throw error;
  }
}

// New function to fetch protocol TVL data
export async function fetchProtocolTVL(protocol: string): Promise<number> {
  try {
    const response = await fetch(`https://api.llama.fi/protocol/${protocol}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch TVL for ${protocol}`);
    }

    const data = await response.json();
    return data.currentChainTvls.Ethereum || 0;
  } catch (error) {
    console.error(`Error fetching TVL for ${protocol}:`, error);
    throw error;
  }
}

// New function to fetch staking APY
export async function fetchStakingAPY(): Promise<number> {
  try {
    // Using Lido's public API for staking APY
    const response = await fetch(
      "https://api.lido.fi/v1/protocol/steth/apr/sma"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch staking APY: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || typeof data.data.smaApr !== "number") {
      throw new Error("Invalid response format from Lido API");
    }

    // Convert APR to APY (assuming daily compounding)
    const apr = data.data.smaApr;
    const apy = (Math.pow(1 + apr / 365, 365) - 1) * 100;

    return apy;
  } catch (error) {
    console.error("Error fetching staking APY:", error);
    // Return a fallback APY value if the API call fails
    return 4.5; // Current approximate Lido staking APY
  }
}

// Helper function to get current prices
export async function getCurrentPrices(
  tokens: string[] = [
    "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "ethereum:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  ]
): Promise<{ [key: string]: number }> {
  try {
    const url = `https://coins.llama.fi/prices/current/${tokens.join(",")}`;
    console.log("Fetching current prices from:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch current prices: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Current prices response:", data);

    const result: { [key: string]: number } = {};
    const tokenMapping: { [key: string]: string } = {
      "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "ethereum",
      "ethereum:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wsteth",
    };

    Object.entries(data.coins || {}).forEach(([key, value]: [string, any]) => {
      const internalKey = tokenMapping[key];
      if (internalKey && value.price) {
        result[internalKey] = value.price;
      }
    });

    return result;
  } catch (error) {
    console.error("Error fetching current prices:", error);
    throw error;
  }
}
