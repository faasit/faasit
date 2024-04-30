from io import BytesIO
from typing import Any


class ImagePilDecode:
    def __init__(self) -> None:
        from PIL import Image

        self._img_cls = Image

    def __call__(self, x: bytes) -> Any:
        img = self._img_cls.open(BytesIO(x))
        img = img.convert("RGB")
        img.load()
        return img
