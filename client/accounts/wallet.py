import typing
from dataclasses import dataclass
from base64 import b64decode
from solana.publickey import PublicKey
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Commitment
import borsh_construct as borsh
from anchorpy.coder.accounts import ACCOUNT_DISCRIMINATOR_SIZE
from anchorpy.error import AccountInvalidDiscriminator
from anchorpy.utils.rpc import get_multiple_accounts
from anchorpy.borsh_extension import BorshPubkey
from ..program_id import PROGRAM_ID


class WalletJSON(typing.TypedDict):
    authority: str
    vault: str
    withdrawn: int
    signer_bump: int
    vault_bump: int


@dataclass
class Wallet:
    discriminator: typing.ClassVar = b"\x18Y;\x8bQ\x9a\xe8_"
    layout: typing.ClassVar = borsh.CStruct(
        "authority" / BorshPubkey,
        "vault" / BorshPubkey,
        "withdrawn" / borsh.U64,
        "signer_bump" / borsh.U8,
        "vault_bump" / borsh.U8,
    )
    authority: PublicKey
    vault: PublicKey
    withdrawn: int
    signer_bump: int
    vault_bump: int

    @classmethod
    async def fetch(
        cls,
        conn: AsyncClient,
        address: PublicKey,
        commitment: typing.Optional[Commitment] = None,
    ) -> typing.Optional["Wallet"]:
        resp = await conn.get_account_info(address, commitment=commitment)
        info = resp["result"]["value"]
        if info is None:
            return None
        if info["owner"] != str(PROGRAM_ID):
            raise ValueError("Account does not belong to this program")
        bytes_data = b64decode(info["data"][0])
        return cls.decode(bytes_data)

    @classmethod
    async def fetch_multiple(
        cls,
        conn: AsyncClient,
        addresses: list[PublicKey],
        commitment: typing.Optional[Commitment] = None,
    ) -> typing.List[typing.Optional["Wallet"]]:
        infos = await get_multiple_accounts(conn, addresses, commitment=commitment)
        res: typing.List[typing.Optional["Wallet"]] = []
        for info in infos:
            if info is None:
                res.append(None)
                continue
            if info.account.owner != PROGRAM_ID:
                raise ValueError("Account does not belong to this program")
            res.append(cls.decode(info.account.data))
        return res

    @classmethod
    def decode(cls, data: bytes) -> "Wallet":
        if data[:ACCOUNT_DISCRIMINATOR_SIZE] != cls.discriminator:
            raise AccountInvalidDiscriminator(
                "The discriminator for this account is invalid"
            )
        dec = Wallet.layout.parse(data[ACCOUNT_DISCRIMINATOR_SIZE:])
        return cls(
            authority=dec.authority,
            vault=dec.vault,
            withdrawn=dec.withdrawn,
            signer_bump=dec.signer_bump,
            vault_bump=dec.vault_bump,
        )

    def to_json(self) -> WalletJSON:
        return {
            "authority": str(self.authority),
            "vault": str(self.vault),
            "withdrawn": self.withdrawn,
            "signer_bump": self.signer_bump,
            "vault_bump": self.vault_bump,
        }

    @classmethod
    def from_json(cls, obj: WalletJSON) -> "Wallet":
        return cls(
            authority=PublicKey(obj["authority"]),
            vault=PublicKey(obj["vault"]),
            withdrawn=obj["withdrawn"],
            signer_bump=obj["signer_bump"],
            vault_bump=obj["vault_bump"],
        )
