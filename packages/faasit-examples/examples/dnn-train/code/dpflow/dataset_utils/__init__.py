import math
import random
from typing import List
from dpflow.dataset import DataLoadFlowRead


def random_split(
    flows: List[DataLoadFlowRead], lengths: List[float]
) -> List[DataLoadFlowRead]:
    """
    >>> train_flow, val_flow = random_split([train_flow, val_flow], [0.9, 0.1])
    """

    # asume all flow have the same dataset

    assert len(flows) == len(lengths)
    assert len(flows) > 1

    dataset_length = flows[0].get_dataset_meta().length

    total = sum(lengths)
    lengths = [math.floor((le / total) * dataset_length) for le in lengths]

    assert sum(lengths) <= dataset_length

    indices = list(range(dataset_length))
    random.shuffle(indices)

    new_flows = []
    offset = 0
    for i, length in enumerate(lengths):
        split_indices = indices[offset : offset + length]
        new_flows.append(flows[i].subset(split_indices))
        offset += length

    return new_flows
