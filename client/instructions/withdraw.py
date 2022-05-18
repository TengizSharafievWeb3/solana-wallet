from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class WithdrawAccounts(typing.TypedDict):
    wallet: PublicKey
    authority: PublicKey
    vault: PublicKey
    destination: PublicKey
    wallet_signer: PublicKey
    token_program: PublicKey


def withdraw(accounts: WithdrawAccounts) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["wallet"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["authority"], is_signer=True, is_writable=False),
        AccountMeta(pubkey=accounts["vault"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["destination"], is_signer=False, is_writable=True),
        AccountMeta(
            pubkey=accounts["wallet_signer"], is_signer=False, is_writable=False
        ),
        AccountMeta(
            pubkey=accounts["token_program"], is_signer=False, is_writable=False
        ),
    ]
    identifier = b'\xb7\x12F\x9c\x94m\xa1"'
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, PROGRAM_ID, data)
