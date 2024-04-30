from ignite.engine import Engine, Events
from typing import List, Union, Sequence
from ignite.handlers.timing import Timer
import torch
from pydantic import BaseModel

# similar to ignite.handlers.time_profilers

# Profile dataflow and processing times


class TimeStats(BaseModel):
    total: float = 0.0
    min: float = 0.0
    max: float = 0.0
    min_index: int = 0
    max_index: int = 0
    mean: float = 0.0
    std: float = 0.0


class TimeProfileResult(BaseModel):
    Dataflow: TimeStats
    Process: TimeStats


class MyTimeProfiler:
    def __init__(self, reset_event=Events.EPOCH_STARTED):
        self._dataflow_timer = Timer()
        self._processing_timer = Timer()
        self._reset_event = reset_event

        self.dataflow_times: List[float] = []
        self.processing_times: List[float] = []

    def _timeit_processing(self):
        t = self._processing_timer.value()
        self.processing_times.append(t)

    def _timeit_dataflow(self):
        t = self._dataflow_timer.value()
        self.dataflow_times.append(t)

    def _reset(self):
        self._dataflow_timer.reset()
        self._processing_timer.reset()
        self.dataflow_times = []
        self.processing_times = []

    def _as_first_started(self, engine: Engine):
        self._reset()

        # reset event
        engine.add_event_handler(self._reset_event, self._reset)

        # processing timer
        engine.add_event_handler(Events.ITERATION_STARTED, self._processing_timer.reset)
        engine._event_handlers[Events.ITERATION_COMPLETED].insert(
            0, (self._timeit_processing, (), {})
        )

        # dataflow timer
        engine.add_event_handler(Events.GET_BATCH_STARTED, self._dataflow_timer.reset)
        engine._event_handlers[Events.GET_BATCH_COMPLETED].insert(
            0, (self._timeit_dataflow, (), {})
        )

    def attach(self, engine) -> None:
        """Attach TimeProfiler to the given engine.

        Args:
            engine: the instance of Engine to attach
        """
        if not isinstance(engine, Engine):
            raise TypeError(
                f"Argument engine should be ignite.engine.Engine, but given {type(engine)}"
            )

        if not engine.has_event_handler(self._as_first_started):
            engine._event_handlers[Events.STARTED].insert(
                0, (self._as_first_started, (engine,), {})
            )

    def get_results(self) -> TimeProfileResult:
        """
        .. code-block:: python

            results == {'processing_stats': {'mean': 0.0}}
        """

        def compute_time_stats(times: Union[Sequence, torch.Tensor]) -> TimeStats:
            stats = TimeStats()
            data = torch.as_tensor(times, dtype=torch.float32)
            # compute on non-zero data:
            data = data[data > 0]

            if len(data) == 0:
                return stats

            stats.total = round(torch.sum(data).item(), 5)
            stats.min = round(torch.min(data).item(), 5)
            stats.min_index = int(torch.argmin(data).item())
            stats.max = round(torch.max(data).item(), 5)
            stats.max_index = int(torch.argmax(data).item())
            stats.mean = round(torch.mean(data).item(), 5)
            if len(data) > 1:
                stats.std = round(torch.std(data).item(), 5)

            return stats

        result = TimeProfileResult(
            Process=compute_time_stats(self.processing_times),
            Dataflow=compute_time_stats(self.dataflow_times),
        )

        return result

    @staticmethod
    def format_results(results: TimeProfileResult) -> str:
        """

        .. code-block:: python

            profiler.format_results(results)

        Examples:
            .. code-block:: text

                 ----------------------------------------------------
                | Time profiling stats (in seconds):                 |
                 ----------------------------------------------------
                total  |  min/index  |  max/index  |  mean  |  std

                Processing function:
                157.46292 | 0.01452/1501 | 0.26905/0 | 0.07730 | 0.01258

                Dataflow:
                6.11384 | 0.00008/1935 | 0.28461/1551 | 0.00300 | 0.02693
        """

        def format_stat(stat: TimeStats):
            return f"{stat.total} | {stat.min}/{stat.min_index} | {stat.max}/{stat.max_index} | {stat.mean} | {stat.std}"

        output_message = """
 ----------------------------------------------------
| Time profiling stats (in seconds):                 |
 ----------------------------------------------------
total  |  min/index  |  max/index  |  mean  |  std

Processing function:
{processing_stats}

Dataflow:
{dataflow_stats}
"""
        output_message = output_message.format(
            processing_stats=format_stat(results.Process),
            dataflow_stats=format_stat(results.Dataflow),
        )

        return output_message
