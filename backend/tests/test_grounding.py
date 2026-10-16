"""Tolerant quote grounding: cosmetic slips pass, changed words never do."""
import unittest
from unittest.mock import patch

from services import interview_provider as provider
from services import resume_questions
from services.grounding import find_quote

SOURCE = "I led the team’s migration – it cut costs by 30%.\nWe shipped it  in\tMarch, “ahead of plan”."


class FindQuoteTest(unittest.TestCase):
    def assertFound(self, quote, source=SOURCE, expected=None):
        span = find_quote(quote, source)
        self.assertIsNotNone(span, quote)
        self.assertIn(span, source)
        if expected is not None:
            self.assertEqual(span, expected)

    def test_exact_match_is_returned_verbatim(self):
        self.assertFound("cut costs by 30%", expected="cut costs by 30%")

    def test_curly_versus_straight_quotes_and_apostrophes(self):
        self.assertFound("the team's migration", expected="the team’s migration")
        self.assertFound("\"ahead of plan\"", expected="“ahead of plan”"[1:-1])
        self.assertFound("I led the team’s migration", "I led the team's migration")

    def test_dash_variants(self):
        self.assertFound("migration - it cut costs", expected="migration – it cut costs")
        self.assertFound("migration — it cut costs", expected="migration – it cut costs")
        self.assertFound("well-known plan", "a well–known plan")

    def test_whitespace_and_newlines(self):
        self.assertFound("costs by 30%. We shipped it in March", expected="costs by 30%.\nWe shipped it  in\tMarch")
        self.assertFound("shipped   it in\nMarch", expected="shipped it  in\tMarch")

    def test_case(self):
        self.assertFound("I LED THE TEAM", expected="I led the team")

    def test_trailing_punctuation_and_ellipsis(self):
        self.assertFound("cut costs by 30%.")
        self.assertFound("cut costs by", expected="cut costs by")
        self.assertFound("we shipped it in march...", expected="We shipped it  in\tMarch")
        self.assertFound("we shipped it in march…", expected="We shipped it  in\tMarch")
        self.assertFound("led the team,", expected="led the team")

    def test_quoted_quote(self):
        self.assertFound("“led the team”", expected="led the team")
        self.assertFound("'led the team'", expected="led the team")

    def test_negative_cases(self):
        for quote in ["I led the group", "cut costs by 40%", "The team was led by me", "migration reduced spending",
                      "", "   \n", "ab", "..", "\"a\""]:
            self.assertIsNone(find_quote(quote, SOURCE), quote)
        self.assertIsNone(find_quote("anything", ""))

    def test_no_fuzzy_matching(self):
        self.assertIsNone(find_quote("led the teams migration", "led the team migration"))
        self.assertIsNone(find_quote("led the tem", "led the team"))


class CallSiteTest(unittest.TestCase):
    def test_follow_up_anchor_is_stored_verbatim(self):
        turns = [{"role": "assistant", "id": "q1", "text": "What did you decide?"},
                 {"role": "user", "id": "a1", "text": "I compared two approaches – and chose the cheaper one."}]
        answer = {"question": "Why did you choose the cheaper one?", "kind": "follow_up", "topic": "projects",
                  "anchor_turn_id": "a1", "anchor_quote": "\"I Compared two approaches - and chose the cheaper one.\""}
        with patch.object(provider, "_structured", return_value=(answer, {})):
            result = provider.next_question({"route": "cat"}, turns)[0]
        self.assertEqual(result["anchor_quote"], "I compared two approaches – and chose the cheaper one")
        self.assertIn(result["anchor_quote"], turns[1]["text"])

    def test_feedback_quote_is_stored_verbatim(self):
        transcript = [{"role": "assistant", "id": "q1", "text": "Tell me about it."},
                      {"role": "user", "id": "a1", "text": "I owned the client’s\nrollout end to end."}]
        point = {"turn_id": "a1", "quote": "client's rollout end to end.", "observation": "Ownership."}
        result = {"summary": "Fine.", "strengths": [dict(point)], "improvements": [{**point, "suggestion": "Add numbers."}],
                  "next_exercise": "Retry."}
        checked = provider.validate_feedback(result, transcript)
        for item in checked["strengths"] + checked["improvements"]:
            self.assertEqual(item["quote"], "client’s\nrollout end to end")
            self.assertIn(item["quote"], transcript[1]["text"])
        result["strengths"][0]["quote"] = "client managed rollout"
        with self.assertRaises(provider.ProviderFailure):
            provider.validate_feedback(result, transcript)

    def test_resume_graph_stores_verbatim_evidence(self):
        text = "Led a 5-person team — delivered the ERP rollout.\nAnalyst at Acme Corp, 2019–2022."
        def question(label, quote):
            return {"question": f"Tell me more about {label} please?", "evidence_quote": quote}
        branch = lambda n: {"opening": question(f"a{n}", "led a 5-person team - delivered the ERP rollout."),
                            "follow_up": question(f"b{n}", "“Analyst at Acme Corp”"),
                            "deeper_follow_up": question(f"c{n}", "analyst  at acme corp, 2019-2022")}
        draft = {"profile": [{"category": "experience", "evidence_quote": "ANALYST AT ACME CORP,"}],
                 "branches": [branch(1), branch(2), branch(3)]}
        # Distinct question text per branch node is required; make each unique.
        for i, b in enumerate(draft["branches"]):
            for j, key in enumerate(("opening", "follow_up", "deeper_follow_up")):
                b[key]["question"] = f"Question number {i}{j} about this resume item?"
        graph = resume_questions._build_graph(draft, text, {"route": "experienced"})
        self.assertEqual(graph["profile"][0]["evidence_quote"], "Analyst at Acme Corp")
        self.assertEqual(len(graph["nodes"]), 9)
        self.assertTrue(all(n["evidence_quote"] in text for n in graph["nodes"]))
        draft["branches"][0]["opening"]["evidence_quote"] = "Invented promotion"
        with self.assertRaises(provider.ProviderFailure):
            resume_questions._build_graph(draft, text, {"route": "experienced"})


if __name__ == "__main__":
    unittest.main()
