"""Interview readiness: fixed arithmetic over the debrief's quote-backed evidence levels.

The AI only picks a level per dimension, each backed by a verbatim quote; it never sees or sets the number.
"""
DIMENSIONS = ("motivation", "work_experience", "academics", "projects", "communication")
POINTS = {"missing": 0, "partial": 1, "strong": 2}
# Fewer assessed dimensions than this (e.g. a 3-question taster) gives a "partial" label and no number,
# so thin interviews are never compared with full ones.
MIN_ASSESSED = 3


def readiness(feedback):
    """Return None when the debrief has no levels (demo or pre-v12 sessions)."""
    levels = {d["dimension"]: d["level"] for d in (feedback or {}).get("dimensions") or []}
    assessed = [POINTS[level] for level in levels.values() if level in POINTS]
    if not assessed:
        return None
    result = {"assessed": len(assessed), "levels": levels}
    if len(assessed) < MIN_ASSESSED:
        return {**result, "status": "partial", "score": None}
    # Integer round-half-up of 100 * points / max points.
    return {**result, "status": "full", "score": (100 * sum(assessed) + len(assessed)) // (2 * len(assessed))}
