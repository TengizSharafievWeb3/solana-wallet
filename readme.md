# Simple Solana Wallet

### Prerequisites

- (Rust) [rustup](https://www.rust-lang.org/tools/install)
- (Solana) [solan-cli](https://docs.solana.com/cli/install-solana-cli-tools) 1.9.13
- (Anchor) [anchor](https://book.anchor-lang.com/chapter_2/installation.html) 0.24.2
- (Node) [node](https://github.com/nvm-sh/nvm) 17.4.0
- [AnchorPy](https://kevinheavey.github.io/anchorpy/)

### Setup

```sh
nvm use 17.4.0
avm use 0.24.2
yarn install
mkdir -p target/deploy
cp tests/keys/*.json target/deploy 
```

### Build and run tests

```sh
anchor build
anchor test
```

## Deploy to local
```shell
solana-test-validator -r --quiet &

solana config set --url localhost

# Create token
spl-token create-token -u localhost --mint-authority devnet/authority.json devnet/mint.json 
spl-token create-account -u localhost 4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN
spl-token mint -u localhost 4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN 1000000 --mint-authority devnet/authority.json 

# deploy and init contract
anchor deploy --provider.cluster localnet

# The following command may fail
anchor migrate --provider.cluster localnet && env ANCHOR_WALLET=~/.config/solana/id.json ./node_modules/.bin/ts-node .anchor/deploy.ts
```

## Deploy to devnet

```sh
solana config set --url devnet
solana airdrop 2

# Create token
spl-token create-token -u devnet --mint-authority devnet/authority.json devnet/mint.json 
spl-token create-account -u devnet 4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN
spl-token mint -u devnet 4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN 1000000 --mint-authority devnet/authority.json 

# deploy and init contract
anchor deploy --provider.cluster devnet

# The following command may fail
anchor migrate --provider.cluster devnet

# Run if anchor migrate failed
env ANCHOR_WALLET=~/.config/solana/id.json ./node_modules/.bin/ts-node .anchor/deploy.ts
```

It should be
```md
ProgramId:  HtzrgxvmkSi3YL6mZ5Csv79TYxW8mqZ5h7k7MZF6fG1v
Wallet:  Dt9ScUV21VcwLe4j8hWkE3pM2v3SaV8X57Gngbvps7vA
Authority:  Dt9ScUV21VcwLe4j8hWkE3pM2v3SaV8X57Gngbvps7vA
Mint:  4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN
Vault:  A23TyDHkDkBhBUnGiguv1oyGaNeKoFqsCveHSYHs6giu
```

## Python client

### Generate python client from anchor IDL

```sh
# Generate anchorpy client
anchorpy client-gen target/idl/solana_wallet.json client
```

### Run simple anchorpy example client

```shell
python deposit.py
```