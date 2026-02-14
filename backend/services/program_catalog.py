import json
import re
from pathlib import Path


PROGRAM_CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "program_catalog_seed.json"


def load_program_catalog() -> list[dict]:
    if not PROGRAM_CATALOG_PATH.exists():
        return []
    with PROGRAM_CATALOG_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def save_program_catalog(items: list[dict]) -> None:
    with PROGRAM_CATALOG_PATH.open("w", encoding="utf-8") as fh:
        json.dump(items, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def build_program_id(school_name: str, program_name: str, degree: str) -> str:
    raw = f"{school_name}-{program_name}-{degree}".strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return slug or "program"
