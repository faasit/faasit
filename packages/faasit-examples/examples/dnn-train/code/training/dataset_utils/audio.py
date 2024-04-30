import torch
import torchaudio.transforms as T
from .base import with_tuple_transform


@with_tuple_transform()
class TargetMFCC(T.MFCC):
    pass


@with_tuple_transform()
class TargetNormalize:
    def __call__(self, x):
        x -= x.mean()
        x /= torch.std(x)
        return x
