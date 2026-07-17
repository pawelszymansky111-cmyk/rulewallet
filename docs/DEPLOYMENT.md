# Deployment and rollback

## Web preview

1. Run `npm run verify`.
2. Authenticate the Vercel CLI through its browser device flow.
3. Link the repository to an explicit project and account scope.
4. Configure environment variables for preview.
5. Deploy a preview with `vercel deploy`.
6. Verify `/`, `/app`, `/playground`, `/api/health`, wallet connection, mobile layout, headers, and console errors.

## Production promotion

Promote the exact verified preview artifact. Do not rebuild a different commit between approval and production promotion.

Production remains testnet-only. A production web deployment is not permission to deploy contracts to mainnet or use real funds.

## Rollback

1. Stop automated agents if transaction display or signing may be affected.
2. Use Vercel deployment history to identify the last verified commit.
3. Run `vercel rollback <deployment-url-or-id>` or promote the last verified deployment.
4. Recheck `/api/health`, CSP/security headers, and wallet simulation.
5. If a signed transaction may have differed from its preview, invoke the contract incident runbook and guardian pause.
