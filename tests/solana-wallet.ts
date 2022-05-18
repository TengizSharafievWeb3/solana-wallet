import * as anchor from "@project-serum/anchor";
import { PublicKey, Keypair } from '@solana/web3.js';
import { Program, web3, BN } from "@project-serum/anchor";
import {createAssociatedTokenAccountInstruction, getMinimumBalanceForRentExemptAccount} from "@solana/spl-token";

import { SolanaWallet } from "../target/types/solana_wallet";

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe("solana-wallet", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const program = anchor.workspace.SolanaWallet as Program<SolanaWallet>;
  const tokenProgram = anchor.Spl.token();

  const wallet = Keypair.generate();
  const authority = Keypair.generate();

  const mint = Keypair.generate();
  const token1 = Keypair.generate();

  async function creatMintIfRequired(
    tokenProgram: Program<anchor.SplToken>,
    mint: Keypair,
    mint_authority: PublicKey) {
    const mintAccount = await tokenProgram.account.mint.fetchNullable(mint.publicKey);
    if (mintAccount === null) {
      await tokenProgram.methods
        .initializeMint(6, mint_authority, null)
        .accounts({
          mint: mint.publicKey,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mint])
        .preInstructions([await tokenProgram.account.mint.createInstruction(mint)])
        .rpc();
    }
  }

  async function createToken(
    tokenProgram: Program<anchor.SplToken>,
    token: Keypair,
    mint: PublicKey,
    authority: PublicKey
  ) {
    await tokenProgram.methods.initializeAccount()
      .accounts({
        account: token.publicKey,
        mint,
        authority,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([token])
      .preInstructions([await tokenProgram.account.token.createInstruction(token)])
      .rpc();
  }

  async function mintTo(
    tokenProgram: Program<anchor.SplToken>,
    amount: number,
    mint: PublicKey,
    to: PublicKey,
    authority: PublicKey,
  ) {
    await tokenProgram.methods.mintTo(new BN(amount))
      .accounts({
        mint,
        to,
        authority,
      })
      .rpc();
  }

  async function getATA(owner: PublicKey, mint: PublicKey) {
    const [ata, _nonce] = await PublicKey.findProgramAddress(
      [owner.toBuffer(), anchor.utils.token.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      anchor.utils.token.ASSOCIATED_PROGRAM_ID
    );
    return ata;
  }

  async function createATA(
    tokenProgram: Program<anchor.SplToken>,
    owner: PublicKey,
    mint: PublicKey,
  ) {
    const ata = await getATA(owner, mint);

    await provider.sendAndConfirm(new web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        ata,
        owner,
        mint)
    ))
  }

  async function tokenBalance(tokenProgram: Program<anchor.SplToken>, token: PublicKey) {
    const tokenAccount = await tokenProgram.account.token.fetch(token);
    return tokenAccount.amount.toNumber();
  }

  before(async() => {
    await creatMintIfRequired(tokenProgram, mint, provider.wallet.publicKey);
    await createToken(tokenProgram, token1, mint.publicKey, provider.wallet.publicKey);
    await mintTo(tokenProgram, 1000_000_000, mint.publicKey, token1.publicKey, provider.wallet.publicKey);
    await createATA(tokenProgram, provider.wallet.publicKey, mint.publicKey);
  });

  it("Should initialize wallet", async () => {
    await program.methods.initialize()
      .accounts({
        wallet: wallet.publicKey,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        mint: mint.publicKey,
      }).signers([wallet]).rpc();

    const walletAccount = await program.account.wallet.fetch(wallet.publicKey);
    expect(walletAccount.authority).to.be.deep.equal(provider.wallet.publicKey);
    expect(walletAccount.withdrawn.toNumber()).to.be.equal(0);
  });

  it("Should update authority", async() => {
    await program.methods.updateAuthority()
      .accounts({
        wallet: wallet.publicKey,
        authority: provider.wallet.publicKey,
        newAuthority: authority.publicKey,
      }).rpc();
    const walletAccount = await program.account.wallet.fetch(wallet.publicKey);
    expect(walletAccount.authority).to.be.deep.equal(authority.publicKey);
  });

  it("Should NOT update authority with invalid authority", async() => {
    await expect(
      program.methods.updateAuthority()
        .accounts({
          wallet: wallet.publicKey,
          authority: provider.wallet.publicKey,
          newAuthority: authority.publicKey,
        }).rpc()
    ).to.be.rejected;
  });

  it("Should deposit tokens to wallet", async() => {
    const balanceBefore = await tokenBalance(tokenProgram, token1.publicKey);

    await program.methods.deposit(new BN(1000))
      .accounts({
        wallet: wallet.publicKey,
        authority: provider.wallet.publicKey,
        from: token1.publicKey,
      }).rpc();

    const balanceAfter = await tokenBalance(tokenProgram, token1.publicKey);
    expect(balanceBefore - balanceAfter).to.be.equal(1000);

    // We can calculate vault address by hand, or load from anchor
    const [vault, _nonce] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("vault"),
        wallet.publicKey.toBytes()
      ], program.programId);

    expect(await tokenBalance(tokenProgram, vault)).to.be.equal(1000);
  });

  it("Should transfer tokens directly to vault", async() => {
    const [vault, _nonce] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("vault"),
        wallet.publicKey.toBytes()
      ], program.programId);

    const vaultBalanceBefore = await tokenBalance(tokenProgram, vault);

    await tokenProgram.methods.transfer(new BN(2000))
      .accounts({
        source: token1.publicKey,
        destination: vault,
        authority: provider.wallet.publicKey,
      }).rpc();

    const vaultBalanceAfter = await tokenBalance(tokenProgram, vault);

    expect( vaultBalanceAfter - vaultBalanceBefore).to.be.equal(2000);
  });

  it("Should NOT deposit with different mint", async() => {
    const mint1 = Keypair.generate();
    await creatMintIfRequired(tokenProgram, mint1, provider.wallet.publicKey);

    const token2 = Keypair.generate();
    await createToken(tokenProgram, token2, mint1.publicKey, provider.wallet.publicKey);

    await mintTo(tokenProgram, 1000, mint1.publicKey, token2.publicKey, provider.wallet.publicKey);

    await expect(
      program.methods.deposit(new BN(1000))
      .accounts({
        wallet: wallet.publicKey,
        authority: provider.wallet.publicKey,
        from: token2.publicKey,
      }).rpc()
    ).to.be.rejected;
  });

  it("Should NOT deposit with zero amount", async() => {
    await expect(
      program.methods.deposit(new BN(0))
        .accounts({
          wallet: wallet.publicKey,
          authority: provider.wallet.publicKey,
          from: token1.publicKey,
        }).rpc()
    ).to.be.rejectedWith(/AmountMustBeMoreZero/);
  });

  it("Should NOT deposit with invalid authority", async() => {
    await expect(
      program.methods.deposit(new BN(1000))
      .accounts({
        wallet: wallet.publicKey,
        authority: authority.publicKey,
        from: token1.publicKey,
      }).signers([authority]).rpc()
    ).to.be.rejected;
  });

  it("Should withdraw tokens", async() => {
    const [vault, _nonce] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("vault"),
        wallet.publicKey.toBytes()
      ], program.programId);

    const vaultBalance = await tokenBalance(tokenProgram, vault);
    const ata = await getATA(provider.wallet.publicKey, mint.publicKey);

    await program.methods.withdraw()
      .accounts({
        wallet: wallet.publicKey,
        authority: authority.publicKey,
        destination: ata,
      }).signers([authority])
      .rpc();

    expect(await tokenBalance(tokenProgram, vault)).to.be.equal(0);
    expect(await tokenBalance(tokenProgram, ata)).to.be.equal(vaultBalance);
  });

  it("Should NOT withdraw tokens if vault is empty", async () => {
    const [vault, _nonce] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode("vault"),
        wallet.publicKey.toBytes()
      ], program.programId);
    expect(await tokenBalance(tokenProgram, vault)).to.be.equal(0);

    await expect(
      program.methods.withdraw()
      .accounts({
        wallet: wallet.publicKey,
        authority: authority.publicKey,
        destination: token1.publicKey,
      }).signers([authority])
      .rpc()
    ).to.be.rejectedWith(/AmountMustBeMoreZero/);
  });

  it("Should NOT withdraw with invalid authority", async() => {
    await program.methods.deposit(new BN(1000))
      .accounts({
        wallet: wallet.publicKey,
        authority: provider.wallet.publicKey,
        from: token1.publicKey,
      }).rpc();

    await expect(
      program.methods.withdraw()
        .accounts({
          wallet: wallet.publicKey,
          authority: provider.wallet.publicKey,
          destination: token1.publicKey,
        }).signers([authority])
        .rpc()
    ).to.be.rejected;
  });

  it("Should NOT withdraw with different mint", async() => {
    const mint1 = Keypair.generate();
    await creatMintIfRequired(tokenProgram, mint1, provider.wallet.publicKey);

    const token2 = Keypair.generate();
    await createToken(tokenProgram, token2, mint1.publicKey, provider.wallet.publicKey);

    await mintTo(tokenProgram, 1000, mint1.publicKey, token2.publicKey, provider.wallet.publicKey);

    await expect(
      program.methods.withdraw()
        .accounts({
          wallet: wallet.publicKey,
          authority: authority.publicKey,
          destination: token2.publicKey,
        }).signers([authority])
        .rpc()
    ).to.be.rejected;
  });
});
