# Simple Solana Wallet

### Prerequisites

- (Rust) [rustup](https://www.rust-lang.org/tools/install)
- (Solana) [solan-cli](https://docs.solana.com/cli/install-solana-cli-tools) 1.9.13
- (Anchor) [anchor](https://book.anchor-lang.com/chapter_2/installation.html) 0.24.2
- (Node) [node](https://github.com/nvm-sh/nvm) 17.4.0

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

## Deploy to devnet

```sh
# Create token
spl-token create-token -u localhost --mint-authority devnet/authority.json devnet/mint.json 

anchor deploy --provider.cluster devnet

# The following command may fail
anchor migrate --provider.cluster devnet

# Run if anchor migrate failed
env ANCHOR_WALLET=~/.config/solana/id.json ./node_modules/.bin/ts-node .anchor/deploy.ts
```

