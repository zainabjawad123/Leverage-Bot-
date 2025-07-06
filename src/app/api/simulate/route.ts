import { NextResponse } from "next/server";
import {
  fetchHistoricalPrices,
  fetchHistoricalGasPrices,
  fetchProtocolTVL,
  fetchStakingAPY,
} from "@/lib/defillama";
import { simulateStrategy } from "@/lib/strategy";

export async function POST(request: Request) {
  try {
    const { startDate, endDate, initialCapital } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    if (!process.env.ETHERSCAN_API_KEY) {
      throw new Error("Etherscan API key is not configured");
    }

    console.log("Fetching historical data...");
    // Fetch all required data in parallel
    const [prices, gasPrices, aaveTVL, compoundTVL, stakingAPY] =
      await Promise.all([
        fetchHistoricalPrices(new Date(startDate), new Date(endDate)),
        fetchHistoricalGasPrices(new Date(startDate), new Date(endDate)),
        fetchProtocolTVL("aave-v3"),
        fetchProtocolTVL("compound-v3"),
        fetchStakingAPY(),
      ]);

    console.log("Historical data fetched successfully");
    console.log("Gas price sample:", gasPrices.slice(0, 3));
    console.log("Simulating strategy...");

    // Simulate strategy with all the data
    const steps = await simulateStrategy({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
      historicalData: {
        ethPrices: prices.ethereum || [],
        wstethPrices: prices.wsteth || [],
        gasPrices,
      },
    });

    console.log("Strategy simulation completed successfully");

    return NextResponse.json({
      steps,
      marketData: {
        aaveTVL,
        compoundTVL,
        stakingAPY,
        gasPrices: {
          average: calculateAverageGasPrice(gasPrices),
          min: Math.min(...gasPrices.map(p => p.price)),
          max: Math.max(...gasPrices.map(p => p.price)),
        },
      },
    });
  } catch (error) {
    console.error("Strategy simulation failed:", error);

    // Return a more detailed error response
    return NextResponse.json(
      {
        error: "Failed to simulate strategy",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function calculateAverageGasPrice(gasPrices: { timestamp: number; price: number }[]): number {
  if (gasPrices.length === 0) return 0;
  const sum = gasPrices.reduce((acc, curr) => acc + curr.price, 0);
  return Math.round(sum / gasPrices.length);
}
