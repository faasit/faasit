from io import BytesIO
import torchvision.transforms as transforms
from PIL import Image
from training.dataset_utils.image import ImagePilDecode
from dpflow.dataset import DataLoadFlow


def get_imagenet_classify_transforms():
    return transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def _transform_label(label):
    return label["cat"]


def _get_transform_normalize():
    return transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])


def get_cls_imagenet_train_flow(dataset="core/mini-imagenet", variant="train"):
    flow = DataLoadFlow("exp/cls_imagenet_train", 1)
    flow.dataset(dataset, variant)
    flow.map_target("transform_label", _transform_label)
    flow.map_data("image_decode", ImagePilDecode())
    flow.map_data("random_resized_crop", transforms.RandomResizedCrop(224))
    flow.map_data("random_hflip", transforms.RandomHorizontalFlip())
    flow.map_data("to_tensor", transforms.ToTensor())
    flow.map_data(
        "normalize",
        _get_transform_normalize(),
        cache_control="can-cache",
    )

    return flow


def get_cls_imagenet_val_flow(dataset="core/mini-imagenet", variant="val"):
    flow = DataLoadFlow("exp/cls_imagenet_val", 1)
    flow.dataset(dataset, variant)
    flow.map_target("transform_label", _transform_label)
    flow.map_data("image_decode", ImagePilDecode())
    flow.map_data("center_crop", transforms.CenterCrop(224))
    flow.map_data("to_tensor", transforms.ToTensor())
    flow.map_data(
        "normalize",
        _get_transform_normalize(),
        cache_control="can-cache",
    )

    return flow
