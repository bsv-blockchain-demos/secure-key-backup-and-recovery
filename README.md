# Secure Key Backup and Recovery

This is a React application built with Vite that demonstrates secure backup and recovery of BSV (Bitcoin SV) private keys using Shamir's Secret Sharing Scheme. It allows users to generate a random private key, split it into multiple shares for secure storage, and later recover the key by recombining a threshold number of shares. The app also supports transferring funds to the generated address and importing recovered funds into a local wallet.

## Features

- **Key Generation and Splitting**: Generate a random private key and split it into customizable shares (with threshold and total shares configurable).
- **Backup**: Save shares as a PDF with QR codes for printing and secure distribution.
- **Recovery**: Scan or paste shares to recover the original private key, view balance, and import funds.
- **Wallet Integration**: Uses `@bsv/sdk` for wallet operations, including creating transactions and interacting with the BSV network.
- **Explainer**: Provides an overview of how the secret sharing works.

The app has three main routes:
- `/`: Explainer page.
- `/backup`: Backup key and shares.
- `/recover`: Recover key from shares.

## Prerequisites

- Node.js (version 20 or higher recommended).
- npm (comes with Node.js).

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/bsv-blockchain-demos/secure-key-backup-and-recovery.git
   cd secure-key-backup-and-recovery
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Running Locally for Development

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal).

The app will run with hot module replacement (HMR) enabled for fast development.

## Building for Production

To create a production build:
```
npm run build
```

The built files will be in the `dist` directory. You can serve them with any static server.

## Dependencies

- React
- Vite
- `@bsv/sdk` for BSV key management and transactions
- `qrcode.react` for generating QR codes
- `jspdf` for PDF export
- `recharts` for pie chart visualization
- `html5-qrcode` for QR code scanning
- `react-router-dom` for routing

## Notes

- This app uses the browser's crypto module for random key generation.
- For recovery, ensure you have the required threshold number of shares.
- Wallet operations interact with the BSV network; use with caution on mainnet.
- The app is designed for demonstration purposes. Always handle private keys securely.

For more details, explore the source code in `src/components/` for the main logic.
