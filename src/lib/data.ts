import { PricePoint } from "@/types/strategy";

const WSTETH_CONTRACT = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";
const ETH_CONTRACT = "ethereum";

async function fetchPriceHistory(
  contract: string,
  startTimestamp: number,
  endTimestamp: number
): Promise<PricePoint[]> {
  try {
    console.log(
      `Fetching price history for ${contract} from ${new Date(
        startTimestamp * 1000
      ).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`
    );

    const url = `https://coins.llama.fi/chart/${contract}?start=${startTimestamp}&span=1d&period=1d&searchWidth=1d`;
    console.log("Request URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error for ${contract}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.coins || !data.coins[contract]) {
      console.error("Invalid API response structure:", data);
      throw new Error(`No price data found for ${contract}`);
    }

    // Filter and validate data points
    const prices = data.coins[contract].prices
      .filter((point: any) => {
        const timestamp = point[0];
        const price = point[1];
        const isValid =
          timestamp >= startTimestamp &&
          timestamp <= endTimestamp &&
          typeof price === "number" &&
          !isNaN(price) &&
          price > 0;

        if (!isValid) {
          console.warn(`Filtered out invalid price point:`, {
            timestamp,
            price,
          });
        }
        return isValid;
      })
      .map((point: any) => ({
        timestamp: point[0],
        price: point[1],
      }));

    if (prices.length === 0) {
      throw new Error(
        `No valid price points found for ${contract} in the specified date range`
      );
    }

    console.log(
      `Successfully fetched ${prices.length} price points for ${contract}`
    );
    return prices;
  } catch (error) {
    console.error(`Error fetching price history for ${contract}:`, error);
    throw new Error(
      `Failed to fetch price data for ${contract}: ${error.message}`
    );
  }
}

async function fetchGasPrice(
  startTimestamp: number,
  endTimestamp: number
): Promise<PricePoint[]> {
  try {
    console.log(
      `Fetching gas prices from ${new Date(
        startTimestamp * 1000
      ).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`
    );

    const url = `https://coins.llama.fi/chart/fees-ethereum?start=${startTimestamp}&span=1d&period=1d&searchWidth=1d`;
    console.log("Request URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gas Price API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.coins || !data.coins["fees-ethereum"]) {
      console.error("Invalid gas price API response structure:", data);
      throw new Error("No gas price data found");
    }

    // Filter and validate data points
    const prices = data.coins["fees-ethereum"].prices
      .filter((point: any) => {
        const timestamp = point[0];
        const price = point[1];
        const isValid =
          timestamp >= startTimestamp &&
          timestamp <= endTimestamp &&
          typeof price === "number" &&
          !isNaN(price) &&
          price > 0;

        if (!isValid) {
          console.warn(`Filtered out invalid gas price point:`, {
            timestamp,
            price,
          });
        }
        return isValid;
      })
      .map((point: any) => ({
        timestamp: point[0],
        price: point[1] / 1e9, // Convert to Gwei
      }));

    if (prices.length === 0) {
      throw new Error(
        "No valid gas price points found in the specified date range"
      );
    }

    console.log(`Successfully fetched ${prices.length} gas price points`);
    return prices;
  } catch (error) {
    console.error("Error fetching gas price history:", error);
    throw new Error(`Failed to fetch gas price data: ${error.message}`);
  }
}

function interpolateMissingPoints(
  points: PricePoint[],
  startTimestamp: number,
  endTimestamp: number
): PricePoint[] {
  try {
    console.log(
      `Interpolating data points from ${new Date(
        startTimestamp * 1000
      ).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()}`
    );
    console.log(`Input points: ${points.length}`);

    const interpolated: PricePoint[] = [];
    const dayInSeconds = 86400;

    // Create a map of existing points
    const pointMap = new Map(points.map((p) => [p.timestamp, p]));

    // Generate all timestamps we need
    for (
      let timestamp = startTimestamp;
      timestamp <= endTimestamp;
      timestamp += dayInSeconds
    ) {
      if (pointMap.has(timestamp)) {
        // Use existing point
        interpolated.push(pointMap.get(timestamp)!);
      } else {
        // Find nearest points before and after
        const before = [...pointMap.entries()]
          .filter(([t]) => t < timestamp)
          .sort((a, b) => b[0] - a[0])[0];

        const after = [...pointMap.entries()]
          .filter(([t]) => t > timestamp)
          .sort((a, b) => a[0] - b[0])[0];

        if (before && after) {
          // Linear interpolation
          const timeDiff = after[0] - before[0];
          const priceDiff = after[1].price - before[1].price;
          const ratio = (timestamp - before[0]) / timeDiff;
          const interpolatedPrice = before[1].price + priceDiff * ratio;

          interpolated.push({
            timestamp,
            price: interpolatedPrice,
          });
        } else if (before) {
          // Use last known price
          interpolated.push({
            timestamp,
            price: before[1].price,
          });
        } else if (after) {
          // Use next known price
          interpolated.push({
            timestamp,
            price: after[1].price,
          });
        }
      }
    }

    console.log(`Successfully interpolated to ${interpolated.length} points`);
    return interpolated;
  } catch (error) {
    console.error("Error during interpolation:", error);
    throw new Error(`Failed to interpolate data points: ${error.message}`);
  }
}

export async function fetchHistoricalData(startDate: Date, endDate: Date) {
  try {
    console.log("Fetching historical data for:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Fetch all data in parallel
    const [ethPrices, wstethPrices, gasPrices] = await Promise.all([
      fetchPriceHistory(ETH_CONTRACT, startTimestamp, endTimestamp),
      fetchPriceHistory(WSTETH_CONTRACT, startTimestamp, endTimestamp),
      fetchGasPrice(startTimestamp, endTimestamp),
    ]);

    // Validate we have data for all assets
    if (!ethPrices.length || !wstethPrices.length || !gasPrices.length) {
      throw new Error("Missing price data for one or more assets");
    }

    // Interpolate missing points if any
    const interpolatedEthPrices = interpolateMissingPoints(
      ethPrices,
      startTimestamp,
      endTimestamp
    );
    const interpolatedWstethPrices = interpolateMissingPoints(
      wstethPrices,
      startTimestamp,
      endTimestamp
    );
    const interpolatedGasPrices = interpolateMissingPoints(
      gasPrices,
      startTimestamp,
      endTimestamp
    );

    // Validate interpolated data
    if (
      interpolatedEthPrices.length !== interpolatedWstethPrices.length ||
      interpolatedEthPrices.length !== interpolatedGasPrices.length
    ) {
      throw new Error("Inconsistent number of data points after interpolation");
    }

    console.log("Successfully fetched and processed all historical data");

    return {
      ethPrices: interpolatedEthPrices,
      wstethPrices: interpolatedWstethPrices,
      gasPrices: interpolatedGasPrices,
    };
  } catch (error) {
    console.error("Error in fetchHistoricalData:", error);
    throw new Error(`Failed to fetch historical price data: ${error.message}`);
  }
}
