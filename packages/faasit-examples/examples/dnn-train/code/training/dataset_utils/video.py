import pytorchvideo.transforms as VT
import torchvision.transforms as IT
from .base import with_dict_transform


@with_dict_transform(key="video")
class DataUniformTemporalSubsample(VT.UniformTemporalSubsample):
    pass

@with_dict_transform(key="video")
class DataLambda(IT.Lambda):
    pass

@with_dict_transform(key="video")
class DataNormalize(IT.Lambda):
    pass

@with_dict_transform(key="video")
class DataRandomHorizontalFlip(IT.RandomHorizontalFlip):
    pass

@with_dict_transform(key="video")
class DataRandomShortSideScale(VT.RandomShortSideScale):
    pass

@with_dict_transform(key="video")
class RandomCrop(IT.RandomCrop):
    pass
