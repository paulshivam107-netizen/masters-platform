"""Synthetic R07 evaluation profiles: loading and validation. No real applicants."""
import json
from collections import Counter
from pathlib import Path

EVAL_VERSION = "r07-eval-v1"
PROFILE_DIR = Path(__file__).with_name("profiles")
SPLITS = ("dev", "heldout")
TAGS = ("specific", "vague", "contradiction", "unknown", "disagree", "confidential", "stop", "irrelevant", "injection")
# Injection answers must contain this token; it must never appear in any model output.
CANARY = "BANANA-7"
FOCUSES = ("balanced", "resume", "behavioural", "motivation", "academics", "work")


def load(split="dev", ids=None):
    splits = SPLITS if split == "all" else (split,)
    profiles = []
    for name in splits:
        for path in sorted((PROFILE_DIR / name).glob("*.json")):
            profile = json.loads(path.read_text(encoding="utf-8"))
            profile["_path"] = str(path)
            profiles.append(profile)
    if ids:
        profiles = [p for p in profiles if p["id"] in ids]
    return profiles


def validate_profile(profile, split):
    errors = []
    pid = profile.get("id", "?")
    path = Path(profile.get("_path", ""))

    def need(condition, message):
        if not condition:
            errors.append(f"{pid}: {message}")

    need(path.stem == pid, "file name must equal id")
    need(profile.get("split") == split, f"split must be {split!r}")
    need(profile.get("route") in ("auto", "cat", "experienced"), "route must be auto|cat|experienced")
    need(profile.get("practice_focus", "balanced") in FOCUSES, "unknown practice_focus")
    need(len(profile.get("programme_name", "")) <= 160, "programme_name too long")
    need(80 <= len(profile.get("resume_text", "")) <= 20000, "resume_text must be 80-20000 chars")
    need(len(profile.get("background", "")) <= 2000, "background over 2000 chars")
    need(len(profile.get("goal", "")) <= 1000, "goal over 1000 chars")
    persona = profile.get("persona") or {}
    for key in ("background_type", "employment", "managed_people", "work_years"):
        need(key in persona, f"persona.{key} missing")
    if profile.get("route") == "cat":
        need(persona.get("work_years", 0) <= 3, "CAT-route persona should have <= 3 work years")
    answers = profile.get("answers") or []
    need(len(answers) in (3, 5, 8), "answers must have 3, 5 or 8 entries (the question_limit)")
    for index, answer in enumerate(answers, 1):
        need(answer.get("tag") in TAGS, f"answer {index}: unknown tag {answer.get('tag')!r}")
        need(1 <= len(answer.get("text", "").strip()) <= 3000, f"answer {index}: text must be 1-3000 chars")
        if answer.get("tag") == "injection":
            need(CANARY in answer.get("text", ""), f"answer {index}: injection must contain {CANARY}")
        elif CANARY in answer.get("text", ""):
            errors.append(f"{pid}: answer {index}: canary only belongs in injection answers")
    need(answers and answers[0].get("tag") == "specific", "the first answer must be tag 'specific'")
    need(sum(a.get("tag") != "specific" for a in answers) >= 2, "needs at least two non-'specific' answers")
    return errors


def validate_all():
    errors, profiles = [], []
    for split in SPLITS:
        for profile in load(split):
            errors += validate_profile(profile, split)
            profiles.append(profile)
    ids = Counter(p.get("id") for p in profiles)
    errors += [f"duplicate id {pid}" for pid, n in ids.items() if n > 1]
    routes = Counter(p.get("route") for p in profiles)
    tags = Counter(a.get("tag") for p in profiles for a in p.get("answers", []))
    heldout = sum(p.get("split") == "heldout" for p in profiles)
    if len(profiles) < 30:
        errors.append(f"need at least 30 profiles, found {len(profiles)}")
    if min(routes.get("cat", 0), routes.get("experienced", 0)) < 13:
        errors.append(f"routes unbalanced: {dict(routes)}")
    if heldout < 6:
        errors.append(f"need at least 6 held-out profiles, found {heldout}")
    errors += [f"tag {tag!r} used {tags.get(tag, 0)} times; need >= 3" for tag in TAGS if tags.get(tag, 0) < 3]
    return errors, {"profiles": len(profiles), "routes": dict(routes), "heldout": heldout, "tags": dict(tags)}


if __name__ == "__main__":
    problems, stats = validate_all()
    print(json.dumps(stats, indent=2))
    print("\n".join(problems) or "OK")
    raise SystemExit(1 if problems else 0)
