// Shared by the rendered site, static HTML generation, and sitemap.
// Section fields render in this order: paragraphs, example, after, ladder, list (ordered when
// `ordered` is true), closing. All named people in examples are fictional.
const guides = [
  {
    slug: "mba-application-checklist-india",
    title: "An application checklist for Indian MBA programmes",
    description:
      "A practical system for tracking CAT-route, GMAT-route and executive MBA applications, official deadlines, documents and next actions.",
    updated: "2026-10-08",
    readingTime: "6 min",
    summary:
      "Keep one record per programme and intake. Track exam registration separately from each school’s application, and verify every deadline against the programme’s official admissions page.",
    sections: [
      {
        id: "choose-route",
        title: "Start with the programme and the route",
        paragraphs: [
          "For a two-year MBA or PGP through the CAT route, record the exam cycle, the programmes you are targeting, and the separate application or selection steps each institution asks you to complete. Do not assume one exam registration completes every school application.",
          "For a programme accepting GMAT, GRE, an executive assessment or another route, record the accepted test, score validity rules, work-experience requirements and application round from that specific programme. One-year full-time MBAs, executive formats and part-time programmes have different requirements; the label “executive MBA” is not enough to identify them.",
          "Keep two shortlists if you are exploring both routes. Compare the exact qualification, format, duration, schedule and eligibility before comparing schools. This checklist is a planning method, not a current admissions bulletin.",
        ],
      },
      {
        id: "tracker-fields",
        title: "Give every application one source of truth",
        list: [
          "School, exact programme name, intake year and application round.",
          "Admission route and the official page used to check eligibility.",
          "School application deadline, including year, closing time and timezone in your notes.",
          "Required documents and who is responsible for each one.",
          "Essay or statement prompts, word limits and the latest draft.",
          "Recommendation requests and their separate submission deadlines, if required.",
          "Interview date, format and instructions once you receive them.",
          "One next action you can finish this week.",
        ],
        paragraphs: [
          "Download the blank checklist below if you want to organise your information before creating an account. It contains no assumed school deadlines. In the workspace, start with the school, programme and official application date; add the other details as you verify them.",
        ],
      },
      {
        id: "documents",
        title: "Prepare documents without creating a second filing mess",
        paragraphs: [
          "Make a folder for each intake and a subfolder for each programme. Keep a master CV and create a school-specific copy only when required. Record a document’s readiness in the tracker while keeping the actual file in your own storage.",
          "Use clear filenames such as Programme_Intake_CV_v2. Keep an unchanged copy of anything you submit, plus the submission confirmation. Avoid replacing the submitted version with a later edit.",
          "If a recommender is involved, agree the deadline and provide relevant context early. A “requested” item is different from a “submitted” item. Check the school portal for the actual submission status.",
        ],
      },
      {
        id: "weekly-review",
        title: "Run a short weekly review",
        list: [
          "Recheck the official pages for programmes due soon and note the date you checked.",
          "Choose the next three actions across your shortlist, rather than opening every application.",
          "Review missing documents, essay drafts and recommendation requests.",
          "Check the application portal before marking a submission complete.",
          "Export your tracked deadlines to your calendar and set the reminders you need there.",
        ],
        paragraphs: [
          "The calendar export is a snapshot, not a live subscription. Export again when your plan changes and remove superseded imported events to avoid duplicates. The current tracker stores one main deadline per application; keep separate exam, scholarship and recommendation milestones in your calendar and application notes.",
        ],
      },
      {
        id: "start-small",
        title: "Your first ten minutes",
        paragraphs: [
          "Choose the programme with the nearest confirmed application deadline. Add it, paste its official source URL into your notes, and identify one missing item. Then save a rough essay paragraph or one interview example. Add the rest of your shortlist after that first useful action.",
          "MockMBA helps organise your work. It does not submit applications, verify your eligibility or guarantee an admission outcome. Always treat the institution’s current admissions instructions as authoritative.",
        ],
      },
    ],
    template: {
      href: "/templates/mba-application-checklist.csv",
      label: "Download the blank application checklist",
    },
    related: [
      ["/guides/mba-interview-story-bank", "Build an MBA interview story bank"],
      ["/mba-interview-practice", "How résumé-based interview practice works"],
    ],
    cta: "Start your application plan",
    next: "/app/tracker",
  },
  {
    slug: "mba-interview-story-bank",
    title: "Build an MBA interview story bank",
    description:
      "Prepare specific examples for MBA interviews with a reusable story bank, follow-up questions and a self-guided practice routine.",
    updated: "2026-10-08",
    readingTime: "5 min",
    summary:
      "Prepare a small set of truthful examples you can explain and question from different angles. Practise making your role, decisions and learning clear; avoid memorising a script.",
    sections: [
      {
        id: "choose-examples",
        title: "Choose examples from your actual experience",
        paragraphs: [
          "Start with five moments: a difficult decision, a disagreement, a setback, an initiative and a time you helped someone else succeed. The same example may support more than one question, but it should not be your answer to everything.",
          "For an early-career applicant, examples can come from coursework, internships, student groups, sport or volunteering. For an experienced applicant, use workplace decisions and outcomes without disclosing confidential information. The purpose is to understand your choices, not to make every story sound like a major leadership achievement.",
        ],
      },
      {
        id: "story-structure",
        title: "Use a simple story card",
        list: [
          "Context: What was happening, and why did it matter?",
          "Your responsibility: What were you personally accountable for?",
          "Decision: What options did you consider and what did you choose?",
          "Action: What did you actually do?",
          "Outcome: What changed, and what evidence supports that?",
          "Reflection: What would you repeat or change next time?",
        ],
        paragraphs: [
          "Use numbers only when you can defend them. If an outcome was shared, explain the team’s contribution and your own. An honest unresolved result can support a useful reflection.",
        ],
      },
      {
        id: "example",
        title: "Turn a vague claim into a specific explanation",
        paragraphs: [
          "Illustrative example: “I showed leadership during a group project” says little about your decision. A more specific starting point is: “Two teammates disagreed on the scope. I proposed a smaller version, wrote down the trade-offs and asked the group to choose before we divided the work.”",
          "This is a fictional illustration, not a model answer to copy. Add your real outcome and explain why your decision made sense with the information you had. If a panel asked what the other person would say about that moment, your answer should still hold together.",
        ],
      },
      {
        id: "follow-ups",
        title: "Practise the follow-ups",
        list: [
          "What was your contribution compared with the rest of the team?",
          "What alternative did you reject, and why?",
          "Who disagreed with you? What did you learn from them?",
          "How do you know your action helped?",
          "What would you do differently now?",
          "How does this experience connect to what you want to learn in an MBA?",
        ],
      },
      {
        id: "practice",
        title: "Try a short practice routine",
        paragraphs: [
          "Choose one question and answer aloud for about 90 seconds. This is a practice constraint, not a prediction of an interview’s format or time limit. Check whether a listener could identify your situation, choice and learning without extra context.",
          "Repeat once with fewer background details. Then answer two follow-ups without referring to the story card. Write one concrete improvement for the next attempt, such as explaining the alternative you considered.",
          "The Interview Studio offers saved mock sessions and a linked question bank. When AI is connected, choose typed chat or voice: hear a question, record an answer, review the transcript and send it. Without AI, a clearly labelled demo shows the flow. Voice is turn-based, and feedback does not assess accent or predict admission.",
        ],
      },
      {
        id: "programme-fit",
        title: "Prepare for the programme you actually applied to",
        paragraphs: [
          "Use the interview invitation and the programme’s official information to plan your preparation. Check any written exercise, group activity, presentation or document requirement mentioned in your instructions.",
          "For “why MBA now”, connect the experience you already have, a specific capability you want to develop, and the work you hope to do next. Research the programme before claiming it addresses that gap. Neither a practised answer nor an automated score can predict an admission result.",
        ],
      },
    ],
    template: {
      href: "/templates/interview-story-bank.txt",
      label: "Download the blank story card",
    },
    related: [
      [
        "/guides/mba-interview-from-resume",
        "One résumé line, three levels of follow-up",
      ],
      [
        "/guides/mba-interview-for-freshers",
        "Interview preparation for freshers",
      ],
      [
        "/guides/mba-interview-work-experience",
        "Interview preparation for experienced applicants",
      ],
    ],
    cta: "Open interview practice",
    next: "/app/interviews",
  },
  {
    slug: "mba-interview-from-resume",
    title:
      "MBA interview questions from your résumé: one line, three follow-ups",
    description:
      "A worked example showing how one résumé line becomes three levels of MBA interview follow-up questions, how to prepare each line and the traps to avoid.",
    updated: "2026-10-15",
    readingTime: "7 min",
    summary:
      "Treat every line on your résumé as the start of a conversation. Prepare each important line at three depths: what actually happened, why you chose that approach over others, and what you would defend or change today. If you can answer all three in your own words, you are ready for most follow-ups on that line.",
    sections: [
      {
        id: "why-one-line",
        title: "Why one line can carry a whole conversation",
        paragraphs: [
          "A résumé is a short list of claims. In an interview, a panel member may pick one claim and keep asking until they understand your part in it. The first question is usually easy. The second and third questions are where a memorised answer starts to break.",
          "That is not a trick. Follow-ups are how a stranger checks whether a short claim reflects your own thinking. You cannot predict which line will be chosen, but you can prepare every line you would be comfortable discussing for five minutes, and remove or reword any line you would not.",
        ],
      },
      {
        id: "worked-example",
        title: "Worked example: one claim, three levels",
        paragraphs: [
          "The applicant below is fictional. Riya (not a real person) has worked for three years as an operations analyst at a mid-sized lending company. One line on her résumé reads:",
        ],
        example: {
          label: "Fictional résumé line",
          lines: [
            [
              "Résumé",
              "Cut new-customer onboarding time from 9 days to 4 by redesigning the document verification step (team of 3).",
            ],
          ],
        },
        after: [
          "Here is how the questions on that one line can deepen. Each level asks for something different, so a good answer at one level does not answer the next.",
        ],
        ladder: [
          {
            level: "Level 1: What happened?",
            purpose:
              "Checks that you understand the work and can explain it simply.",
            questions: [
              "Walk me through onboarding before and after your change. Which part did you redesign?",
              "What did each of the three people in the team do?",
            ],
          },
          {
            level: "Level 2: Why this approach?",
            purpose:
              "Checks your judgement: the options you saw and the trade-off you accepted.",
            questions: [
              "Why start with document verification and not, say, the credit check?",
              "What did you have to give up or risk to make verification faster?",
            ],
          },
          {
            level: "Level 3: Would it hold up?",
            purpose:
              "Checks evidence, ownership under pressure and what you learned.",
            questions: [
              "How did you measure nine days and four days? What else changed during that period?",
              "If the compliance team had refused your change, what would you have done?",
              "Looking back, what would you do differently?",
            ],
          },
        ],
        closing: [
          "Notice that the third level is where the number gets tested. If Riya says the four-day figure came from a single good month, she should say so plainly. A careful, honest answer at level three says more about her than a perfect-sounding answer at level one.",
        ],
      },
      {
        id: "prepare-each-line",
        title: "How to prepare each résumé line",
        ordered: true,
        list: [
          "Mark the five or six lines a reader is most likely to ask about: recent roles, anything with a number, anything unusual, and your interests.",
          "For each line, write one sentence for each level: what happened, why you chose that approach, and what you would defend or change.",
          "Check every number. Know where it came from, the time period, and what else could explain it.",
          "Separate your work from the team’s work. Be ready to say “I” for your decisions and “we” for shared results.",
          "Say the answers aloud, without notes. Writing them helps you think; speaking them shows whether you can explain them.",
          "Ask a friend to read one line and ask “why?” three times. Notice where you start repeating yourself.",
        ],
        closing: [
          "If a line falls apart under this exercise, rewrite it so it is accurate. A smaller claim you can explain is better than a bigger one you cannot.",
        ],
      },
      {
        id: "common-traps",
        title: "Common traps",
        list: [
          "A number you cannot explain. If you are not sure how a figure was calculated, find out or remove it.",
          "Hiding behind “we”. Panels want to know what you decided and did, while you still give your team fair credit.",
          "Claiming the whole result. If a launch succeeded because of five teams, say which part was yours.",
          "Résumé verbs you would not say aloud, such as “spearheaded” or “synergised”. Use the plain word you would use with a colleague.",
          "Interests you cannot discuss. If you list reading, expect a question about something you read recently.",
          "Becoming defensive at level three. A question about what went wrong is a chance to show reflection, not an accusation.",
          "Sharing confidential details. Describe the situation and your reasoning without client names or private figures you are not allowed to share.",
        ],
      },
      {
        id: "practise-with-your-resume",
        title: "Practise with your own résumé",
        paragraphs: [
          "In MockMBA, you can upload or paste your résumé, edit the extracted text, and then ask for practice questions. When you ask for questions, the reviewed text is sent to our AI provider, which drafts three opening questions, each with a follow-up and a deeper follow-up. Every question shows the exact résumé excerpt it is based on, so you can see why it was asked.",
          "The questions are drafted by AI. They can misread a line or ask about something you would not emphasise. Check each premise before you practise, and use them alongside the ladder method above, not instead of it.",
        ],
      },
    ],
    related: [
      ["/mba-interview-practice", "How résumé-based interview practice works"],
      ["/guides/mba-interview-story-bank", "Build an MBA interview story bank"],
      [
        "/guides/mba-interview-work-experience",
        "Interview preparation for experienced applicants",
      ],
    ],
    cta: "Generate questions from my résumé",
    next: "/app/interviews",
  },
  {
    slug: "mba-interview-for-freshers",
    title: "MBA interview preparation for freshers and early-career applicants",
    description:
      "How freshers and applicants with little work experience can prepare for two-year MBA interviews using coursework, clubs, internships and family responsibilities, with fictional examples.",
    updated: "2026-10-15",
    readingTime: "7 min",
    summary:
      "You do not need a job to have something worth discussing. For a two-year MBA interview, prepare to explain your academic subjects, two or three experiences from college, internships or home, and your reasons for an MBA now. Panels are looking at how you think and explain your choices, not at how impressive your titles sound.",
    sections: [
      {
        id: "what-to-expect",
        title: "What a two-year MBA interview may cover",
        paragraphs: [
          "Interviews for two-year programmes commonly draw on your academic background, your résumé, your reasons for wanting an MBA, and sometimes general awareness. Expect questions from your own degree: an engineering graduate may be asked about a core subject, and a commerce graduate about accounting or economics basics. The point is usually to see how clearly you think, not to catch you out.",
          "Some programmes also include a written exercise or a group discussion alongside the personal interview, often called WAT or GD. Formats differ between institutes and change from year to year, so treat your shortlist or interview letter as the authority. This guide focuses on the personal interview.",
        ],
      },
      {
        id: "coursework",
        title: "Use your coursework and final-year project",
        paragraphs: [
          "Your degree is the experience you have spent the most time on, so expect to be tested on it. Revise the main subjects from your final two years and be ready to explain one of them to a non-specialist in two minutes.",
          "Fictional example: Aman (not a real person) studied B.Com and did a final-year project on how small shops in his town handled GST filing. A weak answer lists the project title. A stronger answer explains what he expected to find, what surprised him (most shops relied on one local accountant), and what he would study next if he had more time.",
        ],
        list: [
          "Why did you choose this topic, and who else was involved?",
          "What did you find that you did not expect?",
          "Which subject from your degree did you find hardest, and why?",
          "How would you explain your project to someone outside your field?",
        ],
      },
      {
        id: "clubs-and-activities",
        title: "Clubs, fests and sport: talk about a decision, not a title",
        paragraphs: [
          "A title such as “sponsorship head” tells the panel very little. A specific decision tells them a lot. Pick one moment where you had to choose between options, and prepare to explain it.",
          "Fictional example: Sneha (not a real person) ran sponsorships for her college fest. Ten days before the event, the main sponsor withdrew. She had two options: cut the budget for the cultural events or approach several smaller local businesses. She chose the second, split the outreach among four volunteers, and recovered about two-thirds of the amount. She can explain what she would do differently: sign written commitments earlier.",
          "Sport, music, debating and volunteering work the same way. If you were a regular member rather than a leader, talk about something you learned from practice, a setback, or helping a teammate. You do not need to invent a leadership story.",
        ],
      },
      {
        id: "internships",
        title: "Internships, even short ones",
        paragraphs: [
          "A six-week internship is enough to discuss if you can say what the organisation needed, what you were asked to do, and what you noticed. Do not stretch it into a bigger role than it was.",
          "Fictional example: Kabir (not a real person) spent eight weeks at a small online clothing brand cleaning sales data. The work was routine, but he noticed that returns were much higher for one size range and raised it with his manager. That observation, and what happened after, makes a better answer than a list of spreadsheet tools.",
        ],
        list: [
          "What was the business trying to solve when it hired you?",
          "Which task taught you the most, and why?",
          "What did you notice that others had not, and what did you do about it?",
          "Would you work in that industry? Why or why not?",
        ],
      },
      {
        id: "family-responsibility",
        title: "Family responsibilities count too",
        paragraphs: [
          "Many applicants have carried real responsibility at home: running part of a family business, managing household finances, or caring for a relative while studying. These are valid experiences to discuss if you choose to, and they often show judgement and patience better than a college title.",
          "Fictional example: Farah (not a real person) handled the accounts of her father’s hardware shop for a year while he recovered from surgery, alongside her final-year exams. She can talk about how she learned to track credit given to regular customers, a mistake she made with one supplier payment, and how she organised her week. She does not need to share private medical details to make the point.",
          "You decide how much personal information to share. Keep the focus on what you did and learned. If a question feels too personal, it is fine to answer briefly and steer back to the experience.",
        ],
      },
      {
        id: "why-mba-now",
        title: "Why an MBA now, without work experience",
        paragraphs: [
          "Expect to be asked why you want an MBA before working. There is no single correct answer, and a borrowed one is easy to spot. Work through these questions in your own words, and be honest about what you do not yet know.",
        ],
        list: [
          "What have you seen, in study, internships or at home, that made you interested in management?",
          "What do you hope to learn in the programme that you could not easily learn in a first job?",
          "What kind of work do you want to try first after the MBA, even if you might change your mind?",
          "What would you do if you did not get an admit this year?",
        ],
      },
    ],
    related: [
      ["/mba-interview-practice", "How résumé-based interview practice works"],
      [
        "/guides/mba-interview-from-resume",
        "One résumé line, three levels of follow-up",
      ],
      ["/guides/mba-interview-story-bank", "Build an MBA interview story bank"],
    ],
    cta: "Practise a two-year MBA interview",
    next: "/app/interviews",
  },
  {
    slug: "mba-interview-work-experience",
    title: "MBA interview preparation for experienced applicants",
    description:
      "How applicants with several years of work experience can explain ownership, rejected alternatives, outcomes and why an MBA now, with fictional examples for one-year and executive MBA interviews.",
    updated: "2026-10-15",
    readingTime: "7 min",
    summary:
      "With more experience, a list of responsibilities is not enough. Be ready to say what you personally owned, which alternatives you considered and rejected, what actually changed because of your work, and why a one-year or executive programme makes sense at this point in your career.",
    sections: [
      {
        id: "ownership",
        title: "Ownership: separate your decisions from your team’s work",
        paragraphs: [
          "After several years at work, most of your achievements involve other people. That is normal. The question a panel is trying to answer is which decisions were yours. Before the interview, go through each role and write down the two or three decisions you made, not the projects you were part of.",
          "Fictional example: Vikram (not a real person) is an engineering manager at a payments company. “We migrated our payment system to a new provider” describes a project. “I decided to move low-value transactions first, so that any failure would affect the fewest customers, and I agreed the rollback rule with the operations head” describes his ownership.",
        ],
        list: [
          "Which decision in this project would not have happened without you?",
          "Who disagreed with you, and how did you handle it?",
          "What did you delegate, and what did you keep?",
        ],
      },
      {
        id: "alternatives",
        title: "Alternatives: show the options you rejected",
        paragraphs: [
          "Experienced applicants are often asked to defend a decision. The strongest answers show that you saw more than one option and chose with a reason, accepting a cost.",
          "Fictional example: Meera (not a real person) is a regional sales manager for a consumer goods company. When sales in two districts fell, her team proposed a deeper discount. She considered it, along with changing distributors and retraining the existing ones. She chose retraining for one quarter because a discount would be hard to withdraw and a distributor change would disrupt retailers. She can also say what she would have done if the numbers had not improved by the end of that quarter.",
        ],
        list: [
          "What were the realistic options at the time?",
          "What did your choice cost, in money, time or relationships?",
          "What would have made you change course?",
        ],
      },
      {
        id: "outcomes",
        title:
          "Outcomes: numbers you can defend, and results that did not work",
        paragraphs: [
          "Use numbers when you know how they were measured and over what period. If you cannot share exact figures because of confidentiality, describe the direction and scale honestly: “reduced failed transactions by roughly a third over two quarters” is fine if it is true.",
          "Prepare at least one example that did not go well. Fictional example: Arjun (not a real person) led a new pricing plan for a software product that was withdrawn after three months because existing customers found it confusing. His answer covers what he assumed, which signal he missed early, and what he now checks before any pricing change. A clear failure story is often more convincing than another success.",
        ],
      },
      {
        id: "why-now",
        title: "Why an MBA now, and why this format",
        paragraphs: [
          "For a one-year or executive programme, “why now” matters as much as “why MBA”. Your answer should connect where your career is today, a specific gap you want to close, and the work you want to do next. Programme formats differ: a one-year full-time MBA and an executive programme taken alongside work are not the same thing, so explain why the format you applied to suits you.",
          "Avoid canned answers. Work through these questions in your own words:",
        ],
        list: [
          "What has changed in your work in the last two years that makes this the right time?",
          "Which skill or perspective do you lack today, and how have you tried to build it so far?",
          "What will you contribute to classmates who have similar or more experience?",
          "Why not wait two more years, or learn this on the job?",
        ],
      },
      {
        id: "non-linear-careers",
        title: "Career breaks, switches and family business",
        paragraphs: [
          "Not every career is a straight line. If you took a break, changed fields or joined a family business, explain it briefly and factually, then move to what you did and learned. You do not owe the panel private details, and you should not apologise for a sensible choice.",
          "Fictional example: Nikhil (not a real person) left a consulting role after four years to run his family’s textile trading business for two years. He prepares to explain one decision he made there, such as moving a large customer to shorter credit terms, and why he now wants a broader management education rather than continuing as before.",
        ],
      },
    ],
    related: [
      ["/mba-interview-practice", "How résumé-based interview practice works"],
      [
        "/guides/mba-interview-from-resume",
        "One résumé line, three levels of follow-up",
      ],
      ["/guides/mba-interview-story-bank", "Build an MBA interview story bank"],
    ],
    cta: "Practise an experienced-applicant interview",
    next: "/app/interviews",
  },
];

const faqs = [
  [
    "Who is this for?",
    "Applicants preparing for MBA, executive MBA and Master in Management interviews anywhere, including Indian CAT-route and GMAT-route programmes. Requirements vary by programme; check official admissions instructions.",
  ],
  [
    "Is it free?",
    "The current pilot is free. Paid features and future prices have not been finalised.",
  ],
  [
    "Can it take a live AI interview?",
    "When AI is connected, the Interview Studio conducts mock interviews by typed chat or turn-based voice, with saved transcripts and an answer-based debrief. Without that connection, you can explore the question bank and a clearly labelled demo. This is independent practice, not an actual admissions interview.",
  ],
  [
    "Where is my work saved?",
    "Saved applications, essays and Interview Studio transcripts and debriefs are stored with your account. Studio sessions can be exported or deleted. Separate preparation notes, research notes, document checklists and unfinished drafts stay in this browser, separated by account. Those local items do not sync to another device and can be lost if browser data is cleared.",
  ],
  [
    "Does it submit applications or store my documents?",
    "No. Submit through the official school portal. The Documents area is a readiness checklist; it does not upload or store your document files.",
  ],
  [
    "Are the deadlines and reviews authoritative?",
    "Verify dates and requirements on the school’s official page. Automated essay feedback is guidance, not an admissions decision or probability. A demo or mock review is not an expert assessment.",
  ],
];
export { guides, faqs };
