from ignite.engine import Engine, Events
from ignite.metrics import Metric
from ignite.handlers import Timer


class DataloadTime(Metric):
    def __init__(self):
        self.timer = Timer(average=True)

    def reset(self) -> None:
        self.timer.reset()

    def update(self, output) -> None:
        pass

    def compute(self) -> float:
        return self.timer.value()

    def completed(self, engine: Engine, name: str) -> None:
        engine.state.metrics["data_load_total_s"] = self.timer.total
        engine.state.metrics["data_load_avg_s"] = self.timer.value

    def attach(self, engine: Engine, name: str, usage) -> None:
        self.timer.attach(
            engine,
            start=Events.EPOCH_STARTED,
            pause=Events.GET_BATCH_COMPLETED,
            resume=Events.GET_BATCH_STARTED,
            step=Events.GET_BATCH_COMPLETED,
        )
        engine.add_event_handler(Events.ITERATION_COMPLETED, self.completed, name)
