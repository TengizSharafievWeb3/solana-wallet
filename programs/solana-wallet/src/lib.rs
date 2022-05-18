use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("HtzrgxvmkSi3YL6mZ5Csv79TYxW8mqZ5h7k7MZF6fG1v");

pub const SEED_SIGNER: [u8; 6] = *b"signer";

#[program]
pub mod solana_wallet {
    use super::*;
    use anchor_spl::token::{transfer, Transfer};

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let wallet = &mut ctx.accounts.wallet;
        wallet.authority = ctx.accounts.authority.key();
        wallet.signer_bump = *ctx.bumps.get("wallet_signer").unwrap();
        wallet.vault_bump = *ctx.bumps.get("vault").unwrap();
        wallet.vault = ctx.accounts.vault.key();
        wallet.withdrawn = 0;

        Ok(())
    }

    pub fn update_authority(ctx: Context<UpdateAuthority>) -> Result<()> {
        ctx.accounts.wallet.authority = ctx.accounts.new_authority.key();
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, WalletError::AmountMustBeMoreZero);

        let cpi_account = Transfer {
            from: ctx.accounts.source.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_account),
            amount,
        )
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let key = ctx.accounts.wallet.key();
        let bump = ctx.accounts.wallet.signer_bump;
        let seeds = [SEED_SIGNER.as_ref(), key.as_ref(), &[bump]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.wallet_signer.to_account_info(),
        };

        let amount = ctx.accounts.vault.amount;

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[&seeds],
            ),
            amount,
        )?;

        ctx.accounts.wallet.withdrawn = ctx.accounts.wallet.withdrawn.saturating_add(amount);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        space = Wallet::SPACE,
        payer = payer,
    )]
    pub wallet: Account<'info, Wallet>,

    /// CHECK: only for key()
    pub authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            SEED_SIGNER.as_ref(),
            wallet.key().as_ref()
        ], bump
    )]
    /// CHECK: only for bump calc
    pub wallet_signer: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [
            b"vault".as_ref(),
            wallet.key().as_ref()
        ],
        bump,
        token::mint = mint,
        token::authority = wallet_signer,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub wallet: Account<'info, Wallet>,

    pub authority: Signer<'info>,

    /// CHECK: only for key()
    pub new_authority: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        has_one = vault,
    )]
    pub wallet: Account<'info, Wallet>,

    // from TokenAccount authority
    pub authority: Signer<'info>,

    #[account(mut)]
    pub source: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"vault".as_ref(),
            wallet.key().as_ref()
        ],
        bump = wallet.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = authority,
        has_one = vault,
    )]
    pub wallet: Account<'info, Wallet>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"vault".as_ref(),
            wallet.key().as_ref()
        ],
        bump = wallet.vault_bump,
        constraint = vault.amount > 0 @ WalletError::AmountMustBeMoreZero
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            SEED_SIGNER.as_ref(),
            wallet.key().as_ref()
        ], bump = wallet.signer_bump
    )]
    /// CHECK: only for bump calc
    pub wallet_signer: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Wallet {
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub withdrawn: u64,
    pub signer_bump: u8,
    pub vault_bump: u8,
}

impl Wallet {
    pub const SPACE: usize = 8 + std::mem::size_of::<Wallet>();
}

#[error_code]
pub enum WalletError {
    AmountMustBeMoreZero,
}
