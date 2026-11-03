import { daysUntil } from "./MockGoal";
import { pickFollowUp } from "./ShareFollowUp";

test("counts calendar days to the interview", () => {
  const now = new Date(2026, 9, 29, 23, 30);
  expect(daysUntil("2026-10-30", now)).toBe(1);
  expect(daysUntil("2026-10-29", now)).toBe(0);
  expect(daysUntil("2026-11-08", now)).toBe(10);
  expect(daysUntil("2026-10-01", now)).toBe(-28);
});

test("shares the last follow-up, never an answer", () => {
  const transcript = [
    { role: "assistant", text: "Opening?" },
    { role: "user", text: "My private answer" },
    { role: "assistant", text: "Why that metric?", kind: "follow_up" },
    { role: "assistant", text: "New topic?", kind: "new_topic" },
  ];
  expect(pickFollowUp(transcript)).toBe("Why that metric?");
  expect(pickFollowUp(transcript.slice(0, 2))).toBe("");
});
