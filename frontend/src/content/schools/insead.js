const admissions =
  "https://www.insead.edu/master-programmes/master-business-administration/admissions";
const faqs =
  "https://www.insead.edu/master-programmes/master-business-administration/faqs";
const stats =
  "https://www.insead.edu/master-programmes/master-business-administration/employment-statistics";

const insead = {
  slug: "insead",
  name: "INSEAD",
  shortName: "INSEAD",
  country: "France and Singapore",
  region: "Europe",
  city: "Fontainebleau and Singapore",
  programmes: [
    {
      name: "MBA",
      format: "One-year full-time MBA",
      duration: "One year (ten consecutive months for August starters)",
      intake: "January and August",
      experience:
        "The current class averages 6 years of work experience, with a range of two to ten years",
      source: faqs,
    },
  ],
  interview: {
    points: [
      "After you submit the application, you complete a video and written assessment on Kira Talent: four video questions with 45 seconds to prepare and 60 seconds to answer each, then a written question with five minutes. It takes about 15 to 20 minutes and must be done within 48 hours of the application deadline.",
      "If pre-selected, you are invited to interview with two INSEAD alumni, typically in your country of residence.",
      "After the alumni feedback, the Admissions Committee reviews your application.",
    ],
    sources: [admissions, faqs],
  },
  careers: {
    report: "INSEAD's MBA graduate employment statistics",
    year: "Class of 2025",
    sectors: [
      "Management consulting, technology, media and telecommunications, corporate sectors and financial services were the main sector groups",
      "Graduates took roles in 57 countries and 257 hiring companies",
    ],
    note: "The page does not break results down by function; it reports that 49% of graduates changed function.",
    source: stats,
  },
  sources: [
    { label: "INSEAD: MBA admissions", url: admissions },
    { label: "INSEAD: MBA FAQs", url: faqs },
    { label: "INSEAD: MBA employment statistics 2025", url: stats },
  ],
  checked: "2026-10-17",
};
export default insead;
