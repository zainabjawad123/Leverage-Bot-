# DeFi Strategy Simulator Dashboard

A modern web application for simulating and visualizing DeFi strategies, specifically focused on ETH staking and leverage strategies.

## Features

- Interactive date range selection for strategy simulation
- Real-time historical data visualization using free APIs
- Step-by-step strategy simulation with detailed metrics
- Visual representation of ETH, wstETH, and gas prices
- Profit/Loss tracking and analysis
- Risk metrics monitoring (liquidation ratio, health factor)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:

   ```
   OPENAI_API_KEY=your_openai_api_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

   Note: You can get a free Etherscan API key at https://etherscan.io/apis

4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technology Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Free APIs:
  - DeFiLlama for price data
  - Etherscan for gas prices
  - Lido for staking rates
  - Aave and Compound public APIs for lending rates
- OpenAI API for strategy simulation

## Project Structure

```
src/
  ├── app/              # Next.js app directory
  ├── components/       # React components
  ├── lib/             # Utility functions and API clients
  └── types/           # TypeScript type definitions
```

## API Integration

The dashboard integrates with the following free APIs:

- DeFiLlama API for historical price data
- Etherscan API for gas prices
- Lido API for staking rates
- Aave and Compound public APIs for lending rates
- OpenAI API for strategy simulation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
