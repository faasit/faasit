from typing import List
from torch import nn, optim
from ignite.engine import Engine, Events
from ignite.metrics import RunningAverage, Accuracy, Loss
from ignite.handlers import LRScheduler

import torch
import torchaudio

from ztracker import Tracker


class ImageClassificationTrainer:
    def get_model(self, name: str):
        from torchvision.models import resnet18

        match name:
            case "resnet18":
                return resnet18()
            case _:
                raise ValueError(f"Unknown model name: {name}")

    def create_trainer(self, model_name: str, device: torch.device):
        model = self.get_model(model_name).to(device)

        optimizer = optim.SGD(
            model.parameters(), lr=0.1, momentum=0.9, weight_decay=1e-4
        )
        lr_scheduler = optim.lr_scheduler.StepLR(
            optimizer=optimizer, step_size=30, gamma=0.1
        )
        criterion = nn.CrossEntropyLoss().to(device)

        def process_data_train(engine, batch):
            model.train()
            optimizer.zero_grad()
            x, y = batch

            x = x.to(device)
            y = y.to(device)

            y_pred = model(x)
            loss = criterion(y_pred, y)
            loss.backward()
            optimizer.step()
            return loss.item()

        trainer = Engine(process_data_train)

        # handlers
        trainer.add_event_handler(Events.EPOCH_COMPLETED, LRScheduler(lr_scheduler))

        # metrics
        RunningAverage(output_transform=lambda x: x).attach(trainer, "loss")

        return trainer, model

    def create_evaluator(self, model: nn.Module, device: torch.device):
        criterion = nn.CrossEntropyLoss().to(device)

        def process_data_eval(engine, batch):
            model.eval()
            with torch.no_grad():
                x, y = batch
                x = x.to(device)
                y = y.to(device)
                y_pred = model(x)

            return y_pred, y

        evaluator = Engine(process_data_eval)

        # metrics
        Accuracy(output_transform=lambda x: x).attach(evaluator, "acc1")
        Loss(criterion, output_transform=lambda x: x).attach(evaluator, "loss")

        return evaluator


class ObjectDetectionTrainer:
    def get_model(self, name: str):
        from torchvision.models.detection import (
            ssd300_vgg16,
            SSD300_VGG16_Weights,
            ssdlite320_mobilenet_v3_large,
            SSDLite320_MobileNet_V3_Large_Weights,
        )

        match name:
            case "ssd300_vgg16":
                # @see https://pytorch.org/vision/main/models/generated/torchvision.models.detection.ssd300_vgg16.html#torchvision.models.detection.ssd300_vgg16
                return ssd300_vgg16(weights=SSD300_VGG16_Weights.DEFAULT)
            case "ssdlite320_mobilenet_v3_large":
                return ssdlite320_mobilenet_v3_large(
                    weights=SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
                )
            case _:
                raise ValueError(f"Unknown model name: {name}")

    def create_trainer(self, model_name: str, device: torch.device):
        model = self.get_model(model_name).to(device)

        optimizer = optim.Adam(model.parameters(), lr=0.0001)

        def process_data_train(engine, batch):
            optimizer.zero_grad()

            images, targets = batch

            images = [img.to(device) for img in images]
            targets = [{k: v.to(device) for k, v in t.items()} for t in targets]

            # how to handle loss dict
            # @see https://github.com/supernotman/Faster-RCNN-with-torchvision/blob/master/engine.py#L13
            loss_dict = model(images, targets)

            losses: torch.Tensor = sum(loss for loss in loss_dict.values())  # type: ignore

            losses.backward()
            optimizer.step()
            return losses.item()

        trainer = Engine(process_data_train)

        trainer.add_event_handler(Events.EPOCH_STARTED, lambda: model.train())

        # metrics
        RunningAverage(output_transform=lambda x: x).attach(trainer, "loss")

        return trainer, model

    def create_evaluator(self, model: nn.Module, device: torch.device):
        criterion = nn.CrossEntropyLoss().to(device)

        # TODO: some bug in the evaluator
        # @see https://github.com/supernotman/Faster-RCNN-with-torchvision/blob/48aad46fb613c9046d25568f8f1141af3a61ecb4/engine.py#L69
        def process_data_eval(engine, batch):
            model.eval()
            with torch.no_grad():
                images, targets = batch

                images = [img.to(device) for img in images]
                targets = [{k: v.to(device) for k, v in t.items()} for t in targets]
                y_pred = model(images)

            return y_pred, targets

        evaluator = Engine(process_data_eval)

        # metrics
        Loss(criterion, output_transform=lambda x: x).attach(evaluator, "loss")

        return evaluator


class ObjectTrackingTrainer:
    def get_model(self, name: str):
        from training.models.siamfc import SiamFC

        match name:
            case "siamfc":
                return SiamFC()
            case _:
                raise ValueError(f"Unknown model name: {name}")

    def create_trainer(self, model_name: str, device: torch.device):
        pass

    def create_evaluator(self, model: nn.Module, device: torch.device):
        pass


class AsrRnntTrainer:
    def get_model(self, name: str):
        # https://github.com/pytorch/audio/blob/main/examples/asr/emformer_rnnt/librispeech/lightning.py
        from torchaudio.models import emformer_rnnt_base, RNNTBeamSearch

        match name:
            case "emformer_rnnt":
                # @see https://pytorch.org/vision/main/models/generated/torchvision.models.detection.ssd300_vgg16.html#torchvision.models.detection.ssd300_vgg16
                return emformer_rnnt_base(num_symbols=4097)
            case _:
                raise ValueError(f"Unknown model name: {name}")

    def create_trainer(
        self,
        model_name: str,
        sp_model_path: str,
        global_stats_path: str,
        device: torch.device,
    ):
        import sentencepiece as spm
        from training.utils.audio import WarmupLR, spectrogram_transform

        model = self.get_model(model_name).to(device)

        optimizer = optim.Adam(
            model.parameters(), lr=5e-4, betas=(0.9, 0.999), eps=1e-8
        )

        loss = torchaudio.transforms.RNNTLoss(reduction="sum", clamp=1.0)

        warmup_lr_scheduler = WarmupLR(optimizer, 10000)
        sp_model = spm.SentencePieceProcessor()
        blank_idx = sp_model.GetPieceSize()

        def process_data_train(engine, batch):
            optimizer.zero_grad()

            images, targets = batch

            images = [img.to(device) for img in images]
            targets = [{k: v.to(device) for k, v in t.items()} for t in targets]

            # how to handle loss dict
            # @see https://github.com/supernotman/Faster-RCNN-with-torchvision/blob/master/engine.py#L13
            loss_dict = model(images, targets)

            losses: torch.Tensor = sum(loss for loss in loss_dict.values())  # type: ignore

            losses.backward()
            optimizer.step()
            return losses.item()

        trainer = Engine(process_data_train)

        trainer.add_event_handler(Events.EPOCH_STARTED, lambda: model.train())

        # metrics
        RunningAverage(output_transform=lambda x: x).attach(trainer, "loss")

        return trainer, model

    def create_evaluator(self, model: nn.Module, device: torch.device):
        pass
