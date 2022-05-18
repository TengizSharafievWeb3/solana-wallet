import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaWallet } from "../target/types/solana_wallet";

describe("solana-wallet", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaWallet as Program<SolanaWallet>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
