"""python -m evals.r07 {validate,run} ... (run from backend/)."""
import argparse
import json
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
    run.add_argument("--max-attempts", type=int, default=3, help="attempts per step, like a user retrying")
    run.add_argument("--max-spend-paise", type=int, default=10_000, help="hard worst-case cap for the run (default Rs 100)")
    run.add_argument("--confirm-spend", action="store_true", help="required for --provider openai")
    run.add_argument("--estimate", action="store_true", help="print the worst-case cost and make no calls")
    run.add_argument("--fake-fault-every", type=int, default=0, help="fake provider: inject a fault every N calls")
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
    if args.estimate:
        print(json.dumps(runner.estimate(selected, model=args.model, max_attempts=args.max_attempts), indent=2))
        return 0
    try:
        out_dir = runner.run_suite(selected, provider=args.provider, model=args.model, max_attempts=args.max_attempts,
                                   max_spend_paise=args.max_spend_paise, confirm_spend=args.confirm_spend,
                                   fake_fault_every=args.fake_fault_every)
    except runner.SpendNotConfirmed as exc:
        print(exc, file=sys.stderr)
        return 2
    print(out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
