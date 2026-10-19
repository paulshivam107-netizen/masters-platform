// Content for /mba-interview-practice. The example is fictional. No prices, results or
// school-specific facts belong here; keep claims to what the pilot product does today.
const practice = {
  path: "/mba-interview-practice",
  title: "MBA interview practice that follows your résumé",
  description:
    "Practise MBA interviews where the follow-up questions come from your own résumé and what you say. See how it works, the limits of AI practice and what is stored.",
  updated: "2026-10-15",
  answer:
    "MockMBA turns the lines on your résumé into interview questions, each with a follow-up and a deeper follow-up, so you can rehearse the part of the interview that is hardest to fake: explaining your own work. It is a practice tool in pilot. It does not predict admission and it does not replace feedback from a person who has sat on or faced a real panel.",
  how: {
    title: "How résumé-based follow-ups work",
    steps: [
      "Choose your route: two-year MBA or experienced / one-year MBA.",
      "Upload your résumé or paste the text. Edit the extracted text and remove anything you do not want sent, such as a phone number or address.",
      "Confirm that you agree to send the reviewed text to our AI provider for drafting questions.",
      "Get three opening questions. Each has a follow-up and a deeper follow-up, and each shows the exact résumé excerpt it is based on.",
      "Practise out loud or in writing, and notice which line stops you.",
    ],
    note: "The excerpt shown with every question is there so you can check why it was asked. If a question rests on a misreading of your résumé, you can see that straight away.",
  },
  example: {
    label: "Fictional example",
    intro:
      "Priya Nair is not a real person. This is the shape of a chain, not a transcript of any session or any school’s interview.",
    lines: [
      [
        "Résumé excerpt",
        "Reduced warehouse picking errors by redesigning shelf labels.",
      ],
      [
        "Opening",
        "What did you change about the labels, and why those changes?",
      ],
      [
        "Follow-up",
        "How did you know the errors fell because of the labels and not because of the new staff?",
      ],
      [
        "Deeper",
        "If the supervisors had rejected the change, what would you have tried next?",
      ],
    ],
    note: "The practice is in your answers. Rehearse the three levels in your own words and notice which one you have not thought about yet.",
  },
  routes: {
    title: "Two routes, two kinds of evidence",
    items: [
      [
        "Two-year MBA",
        "Built for applicants who may have little or no work experience. Questions can draw on coursework, projects, internships, clubs, sport, volunteering and family responsibilities. Nothing assumes a job.",
        "/guides/mba-interview-for-freshers",
        "Read the guide for freshers",
      ],
      [
        "Experienced / one-year MBA",
        "Built for applicants with several years of work, including those applying to executive and one-year programmes. Questions lean on ownership, alternatives you rejected, outcomes and why now.",
        "/guides/mba-interview-work-experience",
        "Read the guide for experienced applicants",
      ],
    ],
    note: "Programmes differ in format and eligibility, and MockMBA does not claim to reproduce any school’s interview. Check each school’s own material for how its process works.",
  },
  limits: {
    title: "What to expect, honestly",
    items: [
      "This is a pilot. Features change, and some things will be rough.",
      "It does not predict whether you will be admitted. No readiness score or chance estimate is given.",
      "AI can be wrong. It may misread a line or ask about something you would not stress. Check each question’s excerpt before you rely on it.",
      "Mentors still matter. A person who knows you and the process can notice things software cannot. Use this to rehearse between conversations, not to replace them.",
      "Practice does not fix a weak claim. If a line on your résumé is not something you can explain, the fix is to change the line.",
    ],
  },
  privacy: {
    title: "What happens to your résumé",
    items: [
      "Your résumé text is sent to the AI provider only after you review it.",
      "The original file and the reviewed résumé text are not saved in our database.",
      "What is saved is the practice set: the questions and the short résumé excerpts they are based on, so you can see them again.",
    ],
    note: "This summarises the current behaviour of the pilot. It is not a full privacy policy.",
  },
  cta: "Practise with my résumé",
  next: "/app/interviews",
  related: [
    [
      "/guides/mba-interview-from-resume",
      "One résumé line, three levels of follow-up",
    ],
    ["/guides/mba-interview-story-bank", "Build an MBA interview story bank"],
    ["/guides", "All guides"],
  ],
};
export { practice };
