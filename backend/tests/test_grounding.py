"""Tolerant quote grounding: cosmetic slips pass, changed words never do."""
import unittest
from unittest.mock import patch

from services import interview_provider as provider
from services import resume_questions
from services.grounding import find_quote
from services.readiness import DIMENSIONS

UNASSESSED = [{"dimension": d, "turn_id": "", "quote": "", "level": "not_assessed"} for d in DIMENSIONS]

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


ANSWER = ("I'm applying now because the decisions I find most interesting, such as what to build and for which "
          "merchants, are made one level above me, and I want the business training to make them well.")


class EllipsisTest(unittest.TestCase):
    """Live gpt-4.1-mini debriefs elided quotes; an elision is accepted only as the full original passage."""

    def test_leading_ellipsis(self):
        self.assertEqual(find_quote("...I want the business training to make them well.", ANSWER),
                         "I want the business training to make them well")
        self.assertEqual(find_quote("… are made one level above me", ANSWER), "are made one level above me")

    def test_mid_quote_elision_returns_the_whole_passage(self):
        span = find_quote("the decisions I find most interesting... are made one level above me", ANSWER)
        self.assertEqual(span, "the decisions I find most interesting, such as what to build and for which merchants, "
                               "are made one level above me")
        self.assertIn(span, ANSWER)
        self.assertEqual(find_quote("Well, not formally… there were three of us", "Well, not formally. There were three of us."),
                         "Well, not formally. There were three of us")

    def test_elision_pieces_must_match_in_order_and_unchanged(self):
        self.assertIsNone(find_quote("are made one level above me... the decisions I find", ANSWER))
        self.assertIsNone(find_quote("the decisions I find most exciting... one level above me", ANSWER))
        self.assertIsNone(find_quote("the decisions... ab", ANSWER))  # a piece under three characters
        self.assertIsNone(find_quote("...", ANSWER))

    def test_max_length_limits_the_returned_passage(self):
        quote = "I'm applying now... make them well"
        self.assertEqual(find_quote(quote, ANSWER), ANSWER[:-1])
        self.assertIsNone(find_quote(quote, ANSWER, max_length=60))
        self.assertIsNone(find_quote("x" * 10, "x" * 10, max_length=5))


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
                  "next_exercise": "Retry.", "dimensions": UNASSESSED}
        checked = provider.validate_feedback(result, transcript)
        for item in checked["strengths"] + checked["improvements"]:
            self.assertEqual(item["quote"], "client’s\nrollout end to end")
            self.assertIn(item["quote"], transcript[1]["text"])
        result["strengths"][0]["quote"] = "I owned the… end to end"
        self.assertEqual(provider.validate_feedback(result, transcript)["strengths"][0]["quote"],
                         "I owned the client’s\nrollout end to end")
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
        partial = resume_questions._build_graph(draft, text, {"route": "experienced"})
        self.assertEqual(partial["roots"], ["resume-1-1", "resume-2-1"])
        self.assertEqual(len(partial["nodes"]), 6)


RESUME = "Led a 5-person team on the ERP rollout.\nAnalyst at Acme Corp, 2019-2022.\nMBA aspirant."
ROUTE = {"route": "experienced"}


def _q(label, quote="Analyst at Acme Corp"):
    return {"question": f"Tell me more about {label} please?", "evidence_quote": quote}


def _branch(n, bad=()):
    keys = ("opening", "follow_up", "deeper_follow_up")
    return {k: _q(f"{n}{k}", "Never written" if k in bad else "Analyst at Acme Corp") for k in keys}


def _fact(quote="Analyst at Acme Corp"):
    return {"category": "experience", "evidence_quote": quote}


class PartialGraphTest(unittest.TestCase):
    def build(self, facts, branches):
        branches = list(branches)
        while len(branches) < 3:  # the draft schema requires exactly 3 branches
            branches.append(_branch(len(branches) + 7))
        return resume_questions._build_graph({"profile": facts, "branches": branches}, RESUME, ROUTE)

    def test_bad_fact_dropped_and_renumbered(self):
        graph = self.build([_fact("Not in resume"), _fact(), _fact("MBA aspirant")], [_branch(1)])
        self.assertEqual([f["id"] for f in graph["profile"]], ["fact-1", "fact-2"])
        self.assertEqual(graph["profile"][1]["evidence_quote"], "MBA aspirant")
        self.assertEqual(graph["dropped"], {"facts": 1, "questions": 0})

    def test_bad_follow_up_truncates_branch(self):
        graph = self.build([_fact()], [_branch(1, bad=("follow_up",)), _branch(2), _branch(3)])
        self.assertEqual([n["id"] for n in graph["nodes"]],
                         ["resume-1-1"] + [f"resume-{b}-{d}" for b in (2, 3) for d in (1, 2, 3)])
        self.assertEqual(len(graph["edges"]), 4)
        self.assertEqual(graph["dropped"]["questions"], 2)

    def test_bad_deeper_follow_up_keeps_two(self):
        graph = self.build([_fact()], [_branch(1, bad=("deeper_follow_up",))])
        self.assertEqual(len(graph["nodes"]), 2 + 6)
        self.assertEqual(graph["dropped"]["questions"], 1)

    def test_bad_opening_drops_branch_and_renumbers(self):
        graph = self.build([_fact()], [_branch(1, bad=("opening",)), _branch(2)])
        self.assertEqual(graph["roots"], ["resume-1-1", "resume-2-1"])
        self.assertEqual(len(graph["nodes"]), 6)
        self.assertTrue(all(e["parent"] in {n["id"] for n in graph["nodes"]} and
                            e["child"] in {n["id"] for n in graph["nodes"]} for e in graph["edges"]))
        self.assertEqual(graph["dropped"]["questions"], 3)

    def test_duplicate_question_truncates(self):
        branch = _branch(1)
        branch["follow_up"]["question"] = branch["opening"]["question"].upper()
        graph = self.build([_fact()], [branch])
        self.assertEqual(len(graph["nodes"]), 1 + 6)

    def test_all_facts_bad_raises(self):
        with self.assertRaisesRegex(provider.ProviderFailure, "profile could not be matched"):
            self.build([_fact("Not in resume"), _fact("Also absent")], [_branch(1)])

    def test_all_openings_bad_raises(self):
        with self.assertRaisesRegex(provider.ProviderFailure, "could not be grounded"):
            self.build([_fact()], [_branch(n, bad=("opening",)) for n in (1, 2, 3)])

    def test_clean_draft_reports_zero_dropped(self):
        graph = self.build([_fact()], [_branch(1)])
        self.assertEqual(graph["dropped"], {"facts": 0, "questions": 0})


class PartialFeedbackTest(unittest.TestCase):
    TRANSCRIPT = [{"role": "assistant", "id": "q1", "text": "Tell me."},
                  {"role": "user", "id": "a1", "text": "I owned the rollout end to end and cut costs."}]

    def result(self, strengths, improvements):
        point = lambda q: {"turn_id": "a1", "quote": q, "observation": "Obs."}
        return {"summary": "Fine.", "strengths": [point(q) for q in strengths],
                "improvements": [{**point(q), "suggestion": "Add numbers."} for q in improvements],
                "next_exercise": "Retry.", "dimensions": UNASSESSED}

    def test_bad_improvement_dropped_rest_verbatim(self):
        checked = provider.validate_feedback(
            self.result(["owned the rollout"], ["Invented words", "cut costs", "I OWNED the rollout"]), self.TRANSCRIPT)
        self.assertEqual([i["quote"] for i in checked["improvements"]], ["cut costs", "I owned the rollout"])
        self.assertEqual(checked["strengths"][0]["quote"], "owned the rollout")
        self.assertEqual(checked["dropped_points"], 1)

    def test_all_strengths_bad_raises(self):
        with self.assertRaises(provider.ProviderFailure):
            provider.validate_feedback(self.result(["Invented", "Also invented"], ["cut costs"]), self.TRANSCRIPT)

    def test_all_improvements_bad_raises(self):
        with self.assertRaises(provider.ProviderFailure):
            provider.validate_feedback(self.result(["cut costs"], ["Invented"]), self.TRANSCRIPT)

    def test_unknown_turn_id_is_dropped(self):
        result = self.result(["cut costs", "owned the rollout"], ["cut costs"])
        result["strengths"][0]["turn_id"] = "a2"
        checked = provider.validate_feedback(result, self.TRANSCRIPT)
        self.assertEqual(len(checked["strengths"]), 1)
        self.assertEqual(checked["dropped_points"], 1)

    def test_clean_feedback_has_no_dropped_key_and_satisfies_schema(self):
        from interview_schemas import InterviewFeedback
        checked = provider.validate_feedback(self.result(["cut costs"], ["cut costs"]), self.TRANSCRIPT)
        self.assertNotIn("dropped_points", checked)
        InterviewFeedback.model_validate(checked)


if __name__ == "__main__":
    unittest.main()
