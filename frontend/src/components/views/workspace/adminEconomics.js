export const ECONOMICS_DEFAULTS = {
  price: 599,
  buyers: 100,
  sessions: 5,
  sessionCost: 25,
  cac: 100,
  target: 25000,
  fixed: 4000,
  free: 1000,
  tax: 18,
  refund: 3,
  gateway: 2.36,
  support: 20,
  hours: 20,
  hourValue: 750,
};
export const ECONOMICS_FIELDS = [
  ["price", "Pack price", "₹", 1e7],
  ["buyers", "Monthly buyers", "people", 1e6],
  ["sessions", "Sessions per pack", "sessions", 1000],
  ["sessionCost", "Reserve per session", "₹", 1e7],
  ["cac", "Acquisition per buyer", "₹", 1e7],
  ["target", "Target monthly income", "₹", 1e9],
  ["fixed", "Monthly overhead", "₹", 1e9],
  ["free", "Free-trial budget", "₹", 1e9],
  ["tax", "Included sales tax", "%", 100],
  ["refund", "Refund allowance", "%", 100],
  ["gateway", "Payment fee on gross price", "%", 100],
  ["support", "Support provision per pack", "₹", 1e7],
  ["hours", "Founder hours per month", "hours", 744],
  ["hourValue", "Value of founder time", "₹/hour", 1e7],
];
export function calculateEconomics(raw) {
  const a = Object.fromEntries(
    ECONOMICS_FIELDS.map(([key]) => [key, Number(raw[key])]),
  );
  if (
    ECONOMICS_FIELDS.some(
      ([key, , , max]) =>
        raw[key] === "" ||
        raw[key] == null ||
        !Number.isFinite(a[key]) ||
        a[key] < 0 ||
        a[key] > max,
    ) ||
    !Number.isInteger(a.buyers) ||
    !Number.isInteger(a.sessions)
  )
    return null;
  const net = (a.price * (1 - a.refund / 100)) / (1 + a.tax / 100);
  const fee = (a.price * a.gateway) / 100;
  const reserve = a.sessions * a.sessionCost;
  const contribution = net - fee - reserve - a.support - a.cac;
  const overhead = a.fixed + a.free;
  const surplus = a.buyers * contribution - overhead;
  return {
    assumptions: a,
    contribution,
    surplus,
    afterTime: surplus - a.hours * a.hourValue,
    breakEven: contribution > 0 ? Math.ceil(overhead / contribution) : null,
    targetBuyers:
      contribution > 0 ? Math.ceil((overhead + a.target) / contribution) : null,
    bridge: [
      ["Net sales after tax/refund allowance", net],
      ["Payment fee", -fee],
      ["Full session reserve", -reserve],
      ["Support", -a.support],
      ["Acquisition", -a.cac],
    ],
    volumes: [10, 25, 50, 100, 250].map((buyers) => ({
      buyers,
      surplus: buyers * contribution - overhead,
    })),
  };
}
