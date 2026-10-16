"""python -m evals.r07 {validate,run} ... (run from backend/)."""
import argparse
import sys

from evals.r07 import profiles, runner


def main(argv=None):
    parser = argparse.ArgumentParser(prog="python -m evals.r07")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("validate", help="validate the synthetic profiles")
    run = sub.add_parser("run", help="run profiles through the interview provider")
    run.add_argument("--provider", choices=("fake", "openai"), default="fake")
    run.add_argument("--model", default=runner.DEFAULT_MODEL)
    run.add_argument("--split", choices=("dev", "heldout", "all"), default="dev")
    run.add_argument("--ids", nargs="*", help="profile ids (default: the whole split)")
    args = parser.parse_args(argv)

    if args.command == "validate":
        errors, stats = profiles.validate_all()
        print(stats)
        print("\n".join(errors) or "OK")
        return 1 if errors else 0
    selected = profiles.load(args.split, args.ids)
    if not selected:
        print("No profiles selected.", file=sys.stderr)
        return 2
    out_dir = runner.run_suite(selected, provider=args.provider, model=args.model)
    print(out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
