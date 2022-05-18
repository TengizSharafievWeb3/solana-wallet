import typing
from anchorpy.error import ProgramError


class AmountMustBeMoreZero(ProgramError):
    def __init__(self) -> None:
        super().__init__(6000, None)

    code = 6000
    name = "AmountMustBeMoreZero"
    msg = None


CustomError = typing.Union[AmountMustBeMoreZero]
CUSTOM_ERROR_MAP: dict[int, CustomError] = {
    6000: AmountMustBeMoreZero(),
}


def from_code(code: int) -> typing.Optional[CustomError]:
    maybe_err = CUSTOM_ERROR_MAP.get(code)
    if maybe_err is None:
        return None
    return maybe_err
