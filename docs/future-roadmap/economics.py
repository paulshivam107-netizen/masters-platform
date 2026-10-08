"""Planning scenarios, not sales forecasts. Standard library only; no network or app access."""
from dataclasses import dataclass, asdict, replace
from math import ceil
import json


@dataclass(frozen=True)
class Assumptions:
    price_inr: float = 599
    sales_tax_rate: float = 0.18  # Scenario only; accountant determines applicability.
    refund_rate: float = 0.03
    gateway_rate: float = 0.0236  # Standard domestic fee assumption including GST on fee.
    sessions_per_pack: int = 5
    reserved_cost_per_session_inr: float = 25
    support_provision_per_pack_inr: float = 20
    acquisition_cost_per_pack_inr: float = 100
    fixed_monthly_inr: float = 4000
    free_trial_budget_monthly_inr: float = 1000
    founder_hours_monthly: float = 20
    founder_hour_value_inr: float = 750


def evaluate(a=Assumptions(), buyers=100, desired_income=25000):
    for key, val in asdict(a).items():
        if not isinstance(val, (int, float)) or val < 0:
            raise ValueError(f"{key} must be nonnegative")
    if not 0 <= a.refund_rate <= 1 or not 0 <= a.gateway_rate <= 1:
        raise ValueError("Refund and gateway rates must be between zero and one")
    if buyers < 0 or int(buyers) != buyers or desired_income < 0:
        raise ValueError("Buyers must be a nonnegative integer; target must be nonnegative")
    net_sales = a.price_inr * (1 - a.refund_rate) / (1 + a.sales_tax_rate)
    gateway = a.price_inr * a.gateway_rate
    allowance = a.sessions_per_pack * a.reserved_cost_per_session_inr
    before_acquisition = net_sales - gateway - allowance - a.support_provision_per_pack_inr
    contribution = before_acquisition - a.acquisition_cost_per_pack_inr
    overhead = a.fixed_monthly_inr + a.free_trial_budget_monthly_inr
    cash = buyers * contribution - overhead
    time_value = a.founder_hours_monthly * a.founder_hour_value_inr
    return {
        "buyers": buyers,
        "gross_collections_inr": buyers * a.price_inr,
        "net_sales_per_pack_inr": net_sales,
        "gateway_per_pack_inr": gateway,
        "full_allowance_reserve_per_pack_inr": allowance,
        "contribution_before_acquisition_inr": before_acquisition,
        "contribution_per_pack_inr": contribution,
        "monthly_overhead_and_free_trial_budget_inr": overhead,
        "planning_surplus_before_founder_time_inr": cash,
        "planning_surplus_after_founder_time_inr": cash - time_value,
        "break_even_buyers": ceil(overhead / contribution) if contribution > 0 else None,
        "buyers_for_target_income": ceil((overhead + desired_income) / contribution) if contribution > 0 else None,
    }


def validate():
    # Independent simple case: 100 revenue - 10 fee - 20 fulfilment - 5 support - 15 CAC = 50.
    simple = Assumptions(100, 0, 0, .1, 2, 10, 5, 15, 100, 0, 0, 0)
    assert evaluate(simple, 2)["planning_surplus_before_founder_time_inr"] == 0
    assert evaluate(simple, 2)["break_even_buyers"] == 2
    assert evaluate(Assumptions(), 0)["planning_surplus_before_founder_time_inr"] == -5000
    assert evaluate(replace(Assumptions(), acquisition_cost_per_pack_inr=1000))["break_even_buyers"] is None
    assert evaluate(replace(Assumptions(), refund_rate=1))["contribution_per_pack_inr"] < 0
    for n in (10, 25, 50, 100, 250):
        x = evaluate(buyers=n)
        assert abs(x["gross_collections_inr"] - 599*n) < 1e-9
    return "Five boundary/reconciliation checks passed"


if __name__ == "__main__":
    print(validate())
    print(json.dumps({"assumptions": asdict(Assumptions()),
                     "scenarios": [evaluate(buyers=n) for n in (10, 25, 50, 100, 250)],
                     "cac_sensitivity": [{"cac": c, **evaluate(replace(Assumptions(), acquisition_cost_per_pack_inr=c))}
                                         for c in (0, 100, 250, 400)]}, indent=2))
