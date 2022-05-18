from __future__ import annotations
import typing
from solana.publickey import PublicKey
from solana.transaction import TransactionInstruction, AccountMeta
from ..program_id import PROGRAM_ID


class UpdateAuthorityAccounts(typing.TypedDict):
    wallet: PublicKey
    authority: PublicKey
    new_authority: PublicKey


def update_authority(accounts: UpdateAuthorityAccounts) -> TransactionInstruction:
    keys: list[AccountMeta] = [
        AccountMeta(pubkey=accounts["wallet"], is_signer=False, is_writable=True),
        AccountMeta(pubkey=accounts["authority"], is_signer=True, is_writable=False),
        AccountMeta(
            pubkey=accounts["new_authority"], is_signer=False, is_writable=False
        ),
    ]
    identifier = b" .@\x1c\x95K\xf3X"
    encoded_args = b""
    data = identifier + encoded_args
    return TransactionInstruction(keys, PROGRAM_ID, data)
