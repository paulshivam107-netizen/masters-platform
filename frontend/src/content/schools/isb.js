const eligibility =
  "https://www.isb.edu/programmes/post-graduate-programmes/pgp-in-management/eligibility-and-requirements";
const faqs =
  "https://www.isb.edu/programmes/post-graduate-programmes/pgp-in-management/faqs";
const overview =
  "https://www.isb.edu/programmes/post-graduate-programmes/pgp-in-management";
const yl = "https://www.isb.edu/programmes/post-graduate-programmes/pgp-yl";
const ylEligibility =
  "https://www.isb.edu/programmes/post-graduate-programmes/pgp-yl/eligibility-and-requirements";
const report =
  "https://placements.isb.edu/ssms/api/files/45e1daa4-a5c8-4a05-81d1-b8d9b4f7e8fb_Placement%20Report%20Co2025.pdf";

const isb = {
  slug: "isb",
  name: "Indian School of Business",
  shortName: "ISB",
  country: "India",
  region: "India",
  city: "Hyderabad and Mohali",
  programmes: [
    {
      name: "PGP",
      format:
        "One-year full-time residential Post Graduate Programme in Management",
      duration: "12 months",
      experience: "A minimum of 24 months of full-time work experience",
      source: overview,
    },
    {
      name: "PGP YL",
      format:
        "Full-time, on-campus residential programme at the Hyderabad campus (Young Leaders)",
      duration: "20 months",
      experience: "Up to 24 months of work experience",
      source: yl,
    },
  ],
  interview: {
    points: [
      "Interviews last approximately 30 minutes.",
      "They are conducted by a panel comprising ISB faculty, alumni and senior staff.",
      "Shortlisted candidates can choose a virtual interview on Zoom or an in-person interview at available tier-1 city locations; the admissions team makes the final assignment.",
      "Candidates complete two on-spot essays as part of the evaluation.",
      "All shortlisted applicants are interviewed, and there is no group discussion.",
    ],
    note: "The PGP YL page describes the same panel and length.",
    sources: [eligibility, faqs, ylEligibility],
  },
  careers: {
    report: "the ISB placement report",
    year: "Class of 2025",
    sectors: [
      "Consulting, technology, finance and FMCG/retail were the top four industries by offers",
      "Consulting, technology and BFSI together accounted for over 75% of offers",
    ],
    functions: [
      "Business and strategy consulting roles accounted for 34% of overall placements",
    ],
    source: report,
  },
  sources: [
    { label: "ISB: PGP in Management overview", url: overview },
    { label: "ISB: PGP eligibility and requirements", url: eligibility },
    { label: "ISB: PGP FAQs", url: faqs },
    { label: "ISB: PGP YL overview", url: yl },
    { label: "ISB: PGP YL eligibility and requirements", url: ylEligibility },
    { label: "ISB: placement report, Class of 2025 (PDF)", url: report },
  ],
  checked: "2026-10-17",
};
export default isb;
