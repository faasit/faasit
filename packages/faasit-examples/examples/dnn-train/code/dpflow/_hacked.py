from pathlib import Path
import sys

script_dir = Path(__file__).parent
project_dir = script_dir.parent.resolve()
debug_path_dir = project_dir / "target" / "python-paths"

sys.path.append(script_dir.as_posix())
sys.path.append(debug_path_dir.as_posix())
