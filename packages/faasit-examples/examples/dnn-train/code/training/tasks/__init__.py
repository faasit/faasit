from pathlib import Path
import pathlib
import time
from typing import Any, List, Literal
import pydantic

import ztracker
from training import utils
from training import trainers

from training.datasets import get_dataflow_local_reader, CDatasetAddress, CDatasetUse
from training.train_utils.handlers import MyTimeProfiler
from pydantic import BaseModel
import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from ignite.engine import Engine, Events
from ignite.contrib.handlers.tqdm_logger import ProgressBar
from ignite.contrib.metrics.gpu_info import GpuInfo
from ignite import utils as ignite_utils
import logging

from training import conf_utils
from dpflow import dataset_utils

from _hacked import script_dir

import psutil

from dpflow.dataset_readers import profile_dataset

from . import base

store = base.TaskStore()


class BaseTrainConfig(BaseModel):
    profile_data: str


class CDataLoad(BaseModel):
    mode: Literal["pytorch", "dpflow", "huggingface"] = "pytorch"
    train_workers: int = 0
    eval_workers: int = 0
    train_batch_size: int = 0
    eval_batch_size: int = 0

    def validate(self):
        assert self.train_batch_size > 0
        assert self.eval_batch_size > 0
        assert self.train_workers > 0
        assert self.eval_workers > 0


def run_dnn_task(task_name: str, task_config: Any, dry_run: bool):
    task_cls, task_cfg_cls = store.get_task(task_name)
    task = task_cls()

    logger = logging.getLogger(task_name)

    task_cfg = task_cfg_cls.model_validate(task_config)

    logger.info("running task %s, use config", task_name)
    # logger.info(conf_utils.to_yaml(task_cfg, hide_secrets=True))

    if dry_run:
        logger.info("dry run, skip task")
        return

    output = task.run(ctx=base.TaskContext(logger=logger), cfg=task_cfg)

    logger.info("task %s finished", task_name)

    return output



TYPE_DATALOAD_MODE = Literal["pytorch", "dpflow", "huggingface"]


@store.task()
class TrainClsResnetTask:
    class Config(BaseModel):
        run_val: bool
        log_path: str = ""
        log_dry_run: bool = False
        model: str = "resnet18"
        dataset_addr: CDatasetAddress
        dataload: CDataLoad
        seed: int = 42
        max_epoch: int = 100
        profile_data: str = ""

        def validate(self):
            self.dataload.validate()

    def run(self, ctx: base.TaskContext, cfg: Config):
        from training.datasets.imagenet import (
            get_cls_imagenet_train_flow,
            get_cls_imagenet_val_flow,
        )

        cfg.validate()

        utils.enable_fast_cudnn()
        ignite_utils.manual_seed(cfg.seed)

        assert cfg.log_path, "require log_path in config"
        log_path = pathlib.Path(cfg.log_path)

        tracker = ztracker.create(log_path / "train-cls-resnet" / ztracker.str_datetime(), dry_run=cfg.log_dry_run, num_buffers=1)

        tracker.track_config(cfg.model_dump(), "config")

        train_tracker = tracker.with_settings("train")
        val_tracker = tracker.with_settings("val")

        dataset_reader = get_dataflow_local_reader(cfg.dataset_addr)
        train_flow = get_cls_imagenet_train_flow()
        train_flow = train_flow.prepare_read(dataset_reader)

        val_flow = get_cls_imagenet_val_flow()
        val_flow = val_flow.prepare_read(dataset_reader)

        train_dataset = train_flow.to_mapped()
        val_dataset = val_flow.to_mapped()

        ctx.logger.info(f"Using Train Flow: {train_flow}")

        if cfg.profile_data:
            result_dir = Path(cfg.profile_data) / ztracker.str_datetime()
            profile_dataset(train_flow, result_dir, False, sample_ratio=1.0)
            return

        # init dataset loader
        if cfg.dataload.mode == "pytorch":
            train_loader = DataLoader(
                train_dataset,  # type: ignore
                batch_size=cfg.dataload.train_batch_size,
                shuffle=True,
                num_workers=cfg.dataload.train_workers,
                pin_memory=True,
            )
            val_loader = DataLoader(
                val_dataset,  # type: ignore
                batch_size=cfg.dataload.eval_batch_size,
                shuffle=True,
                num_workers=cfg.dataload.eval_workers,
                pin_memory=True,
            )
        else:
            raise ValueError(f"unknown dataload mode={cfg.dataload.mode}")

        tfactory = trainers.ImageClassificationTrainer()

        device = utils.get_torch_device()
        trainer, model = tfactory.create_trainer( cfg.model, device)

        evaluator = tfactory.create_evaluator(model, device)

        time_profiler = MyTimeProfiler()
        time_profiler.attach(trainer)

        is_gpu = utils.is_torch_device_gpu(device.type)
        gpu_metric_names = []

        if is_gpu:
            GpuInfo().attach(trainer)
            GpuInfo().attach(evaluator)
            gpu_metric_names = ["gpu:0 mem(%)", "gpu:0 util(%)"]

        train_pbar = ProgressBar(persist=True)
        train_pbar.attach(trainer, metric_names=["loss", *gpu_metric_names])
        eval_pbar = ProgressBar(persist=False)
        eval_pbar.attach(evaluator, metric_names=["loss", "acc1", *gpu_metric_names])

        # call immediately to reset state
        psutil.cpu_percent()

        @trainer.on(Events.ITERATION_COMPLETED(every=1))
        def log_training_step(engine: Engine):
            time_profile_results = time_profiler.get_results()
            metrics = engine.state.metrics
            train_tracker.with_fields(dict(
                epoch=engine.state.epoch,
                iterations=engine.state.iteration,
                metrics={**metrics},
                time_profile=time_profile_results.model_dump(),
                cpu_metrics=dict(
                    cpu_total=psutil.cpu_percent(),
                    cpu_every=psutil.cpu_percent(percpu=True),
                    vmem=psutil.virtual_memory()._asdict()
                )
            )).track(meta={'t': 'ts'})

        @trainer.on(Events.EPOCH_COMPLETED)
        def log_training(engine: Engine):
            metrics = engine.state.metrics
            msg = time_profiler.format_results(time_profiler.get_results())
            if is_gpu:
                train_pbar.log_message(
                    f"epoch={engine.state.epoch}, bs={cfg.dataload.train_batch_size}, loss={metrics.get('loss')}, gpu:0 util(%)={metrics.get('gpu:0 util(%)')}"
                )
            else:
                train_pbar.log_message(
                    f"epoch={engine.state.epoch}, bs={cfg.dataload.train_batch_size}, loss={metrics.get('loss')}"
                )
            train_pbar.log_message(msg)

        @trainer.on(Events.EPOCH_COMPLETED(every=1))
        def run_val(engine):
            if not cfg.run_val:
                sleep_time = 5
                ctx.logger.info(f"not val, sleep for {sleep_time} secs")
                time.sleep(sleep_time)
                return

            eval_state = evaluator.run(val_loader)
            metrics = eval_state.metrics
            eval_pbar.log_message(
                f"evaluation: epoch={engine.state.epoch}, loss={metrics.get('loss')}, acc1={metrics.get('acc1')}"
            )
            val_tracker.with_fields(dict(
                epoch=engine.state.epoch,
                metrics={**metrics},
            )).track(meta={'t': 'v'}).log(logging.INFO, 'val')

        ctx.logger.info(f"start training model={cfg.model}")
        trainer.run(train_loader, max_epochs=cfg.max_epoch)

