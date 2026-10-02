# Key Backup and Recovery Demo

A React application demonstrating threshold backup shares with the BSV SDK. It generates a new private key, splits that key into shares and reconstructs it from a sufficient set of shares. Optional wallet controls fund the generated address and sweep recovered outputs into a connected BRC-100 wallet.

The backup screen creates a **new key**. It does not back up the connected wallet's root key or its entire account.

## Included workflows

| Route | Purpose |
| --- | --- |
| `/` | Explanation of the threshold-sharing workflow. |
| `/backup` | Generate a key and shares, export a PDF and optionally fund the address. |
| `/recover` | Paste or scan shares, reconstruct the key, inspect its balance and import funds. |

The implementation uses `PrivateKey.toBackupShares()` and `PrivateKey.fromBackupShares()` from `@bsv/sdk`. Share parsing and recovery follow that SDK's format.

## Run locally

Use Node.js 22.13 or later in the 22.x release line, and npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, normally `http://localhost:5173`. No environment file or application backend is required.

A compatible BRC-100 wallet is needed for funding and importing funds. Key generation and share reconstruction happen in the browser. Camera scanning requires browser permission and a secure context, such as HTTPS or localhost; pasting share text is also supported.

## Backup and recovery

Choose a threshold and total share count, then generate the key. The PDF export places one share on each page and repeats the public key and address.

**The exported PDF contains every share and is not encrypted by the application.** Possession of the complete file provides enough material to recover the key. Separate the shares if the intended backup arrangement relies on different holders or storage locations.

For recovery, supply distinct shares from the same backup. The interface checks the embedded threshold and integrity identifier before passing the collected shares to the SDK. It displays the recovered private key in WIF format.

The browser holds private key material and shares in application memory. This is a demonstration of a backup workflow, not an audited key-custody product.

## Network operations

Funding creates a real P2PKH payment from the connected wallet. Importing retrieves unspent outputs and BEEF from WhatsOnChain, signs with the recovered key and finalises a sweep through the wallet. Both can incur transaction fees.

Balance queries use the connected wallet's reported network, falling back to mainnet when wallet access fails. Address display uses the SDK's default encoding rather than an explicit network parameter. Confirm network alignment before funding or recovery.

## Build and source guide

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

Vite writes `dist/`. Static hosting needs a fallback to `index.html` for `/backup` and `/recover`. A lint script is available; no automated test script is defined.

- [Backup.jsx](src/components/Backup.jsx): generation, PDF export and funding.
- [Recover.jsx](src/components/Recover.jsx): share input, camera handling and fund import.
- [App.jsx](src/App.jsx): routes and wallet client.

## Licence

**Open BSV Licence v6.** See [LICENSE.md](LICENSE.md) for the full terms.
