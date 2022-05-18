// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import {Keypair, PublicKey} from "@solana/web3.js";
import { SolanaWallet } from "../target/types/solana_wallet";
import { Program } from "@project-serum/anchor";


const anchor = require("@project-serum/anchor");

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const program = anchor.workspace.SolanaWallet as Program<SolanaWallet>;

  // devnet/authority.json
  const authority = new PublicKey("9BxSrya1LfE16h3yvcxZopAYGCyYL82TRLnNde5BDnfX");

  // devnet/mint.json
  const mint = new PublicKey("4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN")

  const wallet = Keypair.generate();

  const keys = await program.methods.initialize()
    .accounts({
      wallet: wallet.publicKey,
      authority: authority,
      payer: provider.wallet.publicKey,
      mint: mint,
    }).pubkeys();

  const tx = await program.methods.initialize()
    .accounts({
      wallet: wallet.publicKey,
      authority: authority,
      payer: provider.wallet.publicKey,
      mint: mint,
    }).signers([wallet]).rpc();

  console.log("ProgramId: ", program.programId.toString());
  console.log("Wallet: ", wallet.publicKey.toString());
  console.log("Authority: ", authority.toString());
  console.log("Mint: ", mint.toString());
  console.log("Vault: ", keys['vault'].toString())
};
