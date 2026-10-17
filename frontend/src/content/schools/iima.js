const admissions = "https://www.iima.ac.in/academics/mba/admissions";
const policy =
  "https://www.iima.ac.in/sites/default/files/2026-09/AdmissionProcedure_PGP_1109_2026.pdf";
const report =
  "https://www01.iima.ac.in/iprs/gallery/2025/PGP_Audit_Report_Finals_2025.pdf";
const release2026 =
  "https://www.iima.ac.in/inmediapgp-final-placements-2025-26";

const iima = {
  slug: "iima",
  name: "Indian Institute of Management Ahmedabad",
  shortName: "IIM Ahmedabad",
  country: "India",
  city: "Ahmedabad",
  programmes: [
    {
      name: "PGP",
      format:
        "Two-year full-time residential Post Graduate Programme in Management",
      duration: "2 years",
      experience:
        "Classes have a mix of fresh graduates and people with work experience",
      source: admissions,
    },
  ],
  interview: {
    points: [
      "Shortlisted candidates take an analytical writing test (AWT) and a personal interview (PI). Domestic applicants are shortlisted through CAT.",
      "In the 2027-29 domestic admission policy, the final composite score weights the personal interview at 50%, the analytical writing test at 10% and the earlier composite score at 40%.",
      "IIMA says it does not disclose candidates' AWT and PI performance details, and exercises its own discretion in disclosing the weights of the attributes assessed in the interview.",
      "IIMA says it forms interview panels with objective assessment criteria and allocates candidates to panels at random.",
      "The policy does not state the interview's length or question format.",
    ],
    sources: [policy, admissions],
  },
  careers: {
    report: "the IIMA PGP final placement report (audited)",
    year: "Class of 2025",
    sectors: [
      "Consulting accounted for 156 of 395 accepted offers",
      "Banking, financial services and insurance (BFSI) accounted for 99",
      "Consumer goods (FMCG) 31, information technology 30 and conglomerates 22 followed",
    ],
    note: "A media release for the Class of 2026 (27 March 2026) is out, but its audited report had not been published when we checked.",
    source: report,
  },
  sources: [
    { label: "IIMA: MBA (PGP) admissions", url: admissions },
    {
      label: "IIMA: Admission policy for PGP 2027-29 batch, domestic (PDF)",
      url: policy,
    },
    {
      label: "IIMA: PGP final placement report 2025, audited (PDF)",
      url: report,
    },
    {
      label: "IIMA: PGP final placements 2025-26 media release",
      url: release2026,
    },
  ],
  checked: "2026-10-17",
};
export default iima;
