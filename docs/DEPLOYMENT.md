# Deployment and rollback

## Web preview

1. Run `npm run verify`.
2. Authenticate the Vercel CLI through its browser device flow.
3. Link the repository to an explicit project and account scope.
4. Configure environment variables for preview.
5. Deploy a preview with `vercel deploy`.
6. Verify `/`, `/app`, `/playground`, `/api/health`, wallet connection, mobile layout, headers, and console errors.

## Browser-signed testnet contract

1. Open `/app/deploy` in the browser that owns the MetaMask extension.
2. Confirm Robinhood Chain Testnet and chain ID `46630` in both the page and wallet.
3. Review the connected address and single-wallet role warning.
4. Sign the deployment, then verify the receipt and contract address in the explorer.
5. Apply the conservative demo limits and funding as separate transactions.
6. Set `NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS` only after verifying the deployed bytecode and constructor roles.

The browser never receives or stores a private key. The committed browser artifact is checked against the Foundry build in CI. Do not use the single-wallet role layout for meaningful value.

## Production promotion

Promote the exact verified preview artifact. Do not rebuild a different commit between approval and production promotion.

Production remains testnet-only. A production web deployment is not permission to deploy contracts to mainnet or use real funds.

## Rollback

1. Stop automated agents if transaction display or signing may be affected.
2. Use Vercel deployment history to identify the last verified commit.
3. Run `vercel rollback <deployment-url-or-id>` or promote the last verified deployment.
4. Recheck `/api/health`, CSP/security headers, and wallet simulation.
5. If a signed transaction may have differed from its preview, invoke the contract incident runbook and guardian pause.
