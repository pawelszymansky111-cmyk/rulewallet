# RuleWallet AWS KMS signer

This isolated service is the only supported autonomous mainnet signer implementation in this repository. AWS KMS creates a non-exportable `ECC_SECG_P256K1` key. The service never receives, exports, displays, or logs a private key.

Before signing, it independently enforces:

- Robinhood Chain mainnet only (`4663`);
- an explicit allowlist of deployed RuleWallet accounts;
- only `executeSignedStrategy` calldata;
- zero transaction value;
- native ETH or canonical Robinhood Chain USDG only;
- exact pending-nonce agreement across two HTTPS RPC hosts;
- strict gas and fee ceilings;
- durable DynamoDB idempotency;
- recovery of every KMS signature to the configured public address.

If an RPC broadcast acknowledgement is ambiguous, the signer queries both RPCs for
the exact signed hash. If neither can confirm it, the service preserves an
`ambiguous` DynamoDB lock for operator reconciliation and will not blindly sign a
replacement transaction.

## Deploy

Install the AWS CLI and SAM CLI, authenticate to an AWS account, then run from this directory:

```bash
sam build
sam deploy --guided
```

Supply the deployed security-beta RuleWallet account address, two managed RPC URLs from different hosts, a random 32+ character bearer token, and explicit fee ceilings. The CloudFormation outputs include the signer endpoint and KMS key ID.

Call `GET <SignerEndpoint>` with `Authorization: Bearer <token>`. Record the returned `signerAddress`, `keyId`, and `attestationSha256`. Grant that exact signer address `AGENT_ROLE` when deploying a personal RuleWallet account. Add these values to Vercel without pasting them into source control:

```text
MAINNET_SIGNER_MODE=external-kms
MAINNET_AGENT_ADDRESS=<signerAddress>
MAINNET_SIGNER_ENDPOINT=<SignerEndpoint>
MAINNET_SIGNER_ALLOWED_HOST=<exact endpoint hostname>
MAINNET_SIGNER_KEY_ID=<keyId>
MAINNET_SIGNER_ATTESTATION_SHA256=<attestationSha256>
MAINNET_SIGNER_AUTH_TOKEN=<same 32+ character token>
```

The signer account needs only enough Robinhood Chain ETH for gas. Never grant it `OWNER_ROLE`, `APPROVER_ROLE`, `GUARDIAN_ROLE`, or default admin.

The Lambda Function URL uses an application bearer credential and should additionally be protected with AWS WAF or a private API Gateway for a serious production deployment. Rotating the token, KMS key, hostname, account allowlist, or attestation intentionally disables RuleWallet until the Vercel configuration is updated and the identity handshake passes again.
