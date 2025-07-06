import { getCurrentPrices, fetchHistoricalPrices } from "./defillama";

async function testPrices() {
  try {
    // Test current prices
    console.log("\nFetching current prices...");
    const prices = await getCurrentPrices();
    console.log("Current prices:", prices);

    // Test historical prices for Jan-Jun 2023
    console.log("\nFetching historical prices for Jan-Jun 2023...");
    const startDate = new Date("2023-01-01T00:00:00Z");
    const endDate = new Date("2023-06-30T23:59:59Z");
    const historicalPrices = await fetchHistoricalPrices(startDate, endDate);

    console.log("\nHistorical prices summary:");
    Object.entries(historicalPrices).forEach(([token, prices]) => {
      console.log(`\n${token}:`);
      console.log("First day:", {
        date: new Date(prices[0].timestamp * 1000).toISOString(),
        price: prices[0].price,
      });
      console.log("Last day:", {
        date: new Date(
          prices[prices.length - 1].timestamp * 1000
        ).toISOString(),
        price: prices[prices.length - 1].price,
      });
      console.log("Total days:", prices.length);

      // Sample some dates throughout the period
      const sampleDates = [
        "2023-01-15",
        "2023-02-15",
        "2023-03-15",
        "2023-04-15",
        "2023-05-15",
        "2023-06-15",
      ];

      console.log("\nSample prices throughout the period:");
      sampleDates.forEach((date) => {
        const timestamp = Math.floor(new Date(date).getTime() / 1000);
        const price = prices.find((p) => p.timestamp === timestamp);
        if (price) {
          console.log(`${date}: $${price.price.toFixed(2)}`);
        }
      });
    });
  } catch (error) {
    console.error("Error testing prices:", error);
  }
}

testPrices();
