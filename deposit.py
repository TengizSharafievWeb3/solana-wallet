import asyncio
from pathlib import Path

from solana.transaction import Transaction
from spl.token.instructions import get_associated_token_address
from spl.token.constants import TOKEN_PROGRAM_ID
from solana.publickey import PublicKey
from anchorpy import Provider
from anchorpy import Wallet

import client.program_id
from client.instructions import deposit

async def main():
    provider = Provider.local()
    local_wallet = Wallet.local()
    mint = PublicKey("4wtFxtvYUDPbz94xT1ose56YZoYia8xG3REbWhmYkzgN")

    wallet = PublicKey("BV2RQwJmJ6uGG5CPG639bvaPHjpXsJDVzUk2L4Zur5WU")
    authority = local_wallet.public_key
    source = get_associated_token_address(authority, mint)
    vault, nonce = PublicKey.find_program_address(
        seeds = [b"vault", bytes(wallet)],
        program_id = client.program_id.PROGRAM_ID
    )

    ix = deposit(
        {"amount": 1000},
        {
            "wallet": wallet,
            "authority": authority,
            "source": source,
            "vault": vault,
            "token_program": TOKEN_PROGRAM_ID
        })
    tx = Transaction().add(ix)
    txsign = await provider.send(tx, [local_wallet.payer])
    print(txsign)

    await provider.connection.close()


asyncio.run(main())