import os
import sys
from pathlib import Path

script_dir = Path(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(script_dir.as_posix())