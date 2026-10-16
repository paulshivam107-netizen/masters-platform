import json
import unittest
from unittest.mock import Mock, patch
from services import interview_provider as provider
from services.interview_plan import make_plan, next_step


class InterviewPlanTest(unittest.TestCase):
    def test_programme_criteria_and_depth_are_independent_of_exam_or_employer(self):
        self.assertIn("education", make_plan("cat", "balanced")["priority_topics"])
        self.assertIn("experience", make_plan("experienced", "balanced")["priority_topics"])
        self.assertEqual(make_plan("cat", "behavioural")["priority_topics"], ["behaviour"])
        turns = [{"role": "assistant", "id": "q1", "text": "An opening"}]
        for index in range(2):
            turns.extend([{"role": "user", "id": f"a{index+1}", "text": "I compared two approaches."},
                          {"role": "assistant", "id": f"q{index+2}", "text": "A follow-up", "kind": "follow_up", "topic": "projects"}])
        self.assertTrue(next_step({"route": "cat"}, turns)["move_on"])
        self.assertFalse(next_step({"route": "cat", "practice_focus": "resume"}, turns)["move_on"])

    def test_follow_up_must_anchor_to_latest_answer_and_cannot_repeat(self):
        turns = [{"role": "assistant", "id": "q1", "text": "What did you decide?"},
                 {"role": "user", "id": "a1", "text": "I compared two approaches."}]
        answer = {"question": "Why did you compare those two approaches?", "kind": "follow_up", "topic": "projects",
                  "anchor_turn_id": "a1", "anchor_quote": "compared two approaches"}
        with patch.object(provider, "_structured", return_value=(answer, {})) as call:
            self.assertEqual(provider.next_question({"route": "cat"}, turns)[0], {**answer, "conflict": ""})
            self.assertEqual(call.call_args.args[1]["next_step"]["branch_depth"], 0)
        for change in [{"anchor_quote": "Managed a large team"}, {"anchor_turn_id": "a2"}, {"question": "What did you decide?"}]:
            with patch.object(provider, "_structured", return_value=({**answer, **change}, {})), self.assertRaises(provider.ProviderFailure):
                provider.next_question({"route": "cat"}, turns)

    def test_exhausted_branch_requires_a_new_topic(self):
        turns = [{"role": "assistant", "id": "q1", "text": "Opening"}]
        for index in range(1, 4):
            turns.append({"role": "user", "id": f"a{index}", "text": "I reviewed the evidence."})
            if index < 3: turns.append({"role": "assistant", "id": f"q{index+1}", "text": f"Follow-up {index}", "kind": "follow_up", "topic": "projects"})
        answer = {"question": "What other evidence did you review?", "kind": "follow_up", "topic": "projects", "anchor_turn_id": "a3", "anchor_quote": "reviewed the evidence"}
        with patch.object(provider, "_structured", return_value=(answer, {})), self.assertRaises(provider.ProviderFailure):
            provider.next_question({"route": "experienced"}, turns)
        answer.update(kind="new_topic", topic="motivation", anchor_turn_id="", anchor_quote="", question="What do you hope to learn in the MBA?")
        with patch.object(provider, "_structured", return_value=(answer, {})):
            self.assertEqual(provider.next_question({"route": "experienced"}, turns)[0]["kind"], "new_topic")

    def test_end_requested_and_new_topic_anchors_are_blanked_not_rejected(self):
        turns = [{"role": "assistant", "id": "q1", "text": "Opening"},
                 {"role": "user", "id": "a1", "text": "I'd like to stop the session now, could I see the feedback?"}]
        for kind in ("end_requested", "new_topic"):
            answer = {"question": "Of course, we will stop here. Thank you.", "kind": kind, "topic": "projects",
                      "anchor_turn_id": "a1", "anchor_quote": "stop the session"}
            with patch.object(provider, "_structured", return_value=(answer, {})):
                result = provider.next_question({"route": "cat"}, turns)[0]
            self.assertEqual((result["kind"], result["anchor_turn_id"], result["anchor_quote"]), (kind, "", ""))
        # The repeat check still applies.
        answer["question"] = "Opening question"
        turns[0]["text"] = "Opening question"
        with patch.object(provider, "_structured", return_value=(answer, {})), self.assertRaises(provider.ProviderFailure):
            provider.next_question({"route": "cat"}, turns)


def exhausted_turns(follow_ups=2):
    turns = [{"role": "assistant", "id": "q1", "text": "Opening"}]
    for index in range(1, follow_ups + 2):
        turns.append({"role": "user", "id": f"a{index}", "text": "I reviewed the evidence."})
        if index <= follow_ups:
            turns.append({"role": "assistant", "id": f"q{index+1}", "text": f"Follow-up {index}", "kind": "follow_up", "topic": "projects"})
    return turns


class NextQuestionRequestTest(unittest.TestCase):
    """The request itself must make an exhausted branch impossible to continue."""

    def sent(self, turns, output):
        response = Mock()
        response.json.return_value = {"status": "completed", "usage": {"input_tokens": 10, "output_tokens": 5},
                                      "output": [{"type": "message", "content": [{"type": "output_text", "text": json.dumps(output)}]}]}
        with patch.object(provider, "_post", return_value=response) as post:
            result = provider.next_question({"route": "cat"}, turns)
        return post.call_args.kwargs["json"], result

    def test_exhausted_branch_schema_only_allows_new_topic(self):
        output = {"question": "What do you hope to learn in the MBA?", "kind": "new_topic", "topic": "motivation",
                  "anchor_turn_id": "", "anchor_quote": ""}
        body, (result, _) = self.sent(exhausted_turns(), output)
        schema = body["text"]["format"]["schema"]
        self.assertTrue(body["text"]["format"]["strict"])
        # A follow-up is impossible; a clarification may only target the latest answer (a3).
        self.assertEqual(schema["properties"]["kind"]["enum"], ["new_topic", "clarification"])
        self.assertEqual(schema["properties"]["anchor_turn_id"]["enum"], ["", "a3"])
        self.assertEqual(list(schema["properties"])[0], "conflict")
        self.assertEqual(schema["required"], list(schema["properties"]))
        self.assertIn("move_on is TRUE", body["instructions"])
        self.assertEqual(result["kind"], "new_topic")

    def test_open_branch_schema_allows_follow_ups(self):
        turns = exhausted_turns(follow_ups=1)
        output = {"question": "What evidence did you weigh most?", "kind": "follow_up", "topic": "projects",
                  "anchor_turn_id": "a2", "anchor_quote": "reviewed the evidence"}
        body, (result, _) = self.sent(turns, output)
        self.assertEqual(set(body["text"]["format"]["schema"]["properties"]["kind"]["enum"]),
                         {"follow_up", "clarification", "new_topic"})
        self.assertNotIn("move_on is TRUE", body["instructions"])
        self.assertEqual(result["kind"], "follow_up")

    def test_schema_variant_does_not_mutate_the_shared_schema(self):
        self.sent(exhausted_turns(), {"question": "What do you hope to learn in the MBA?", "kind": "new_topic",
                                      "topic": "motivation", "anchor_turn_id": "", "anchor_quote": ""})
        from interview_schemas import NextQuestion
        self.assertEqual(len(NextQuestion.model_json_schema()["properties"]["kind"]["enum"]), 4)


def answered(*answers):
    turns = [{"role": "assistant", "id": "q1", "text": "Opening"}]
    for index, text in enumerate(answers, 1):
        turns.append({"role": "user", "id": f"a{index}", "text": text})
        if index < len(answers):
            turns.append({"role": "assistant", "id": f"q{index+1}", "text": f"Question {index}", "kind": "new_topic", "topic": "projects"})
    return turns


class AnchorRulesTest(unittest.TestCase):
    """v6: a clarification probes the latest answer; a follow-up may return to any earlier answer."""
    TURNS = answered("I led the vendor migration across three plants.", "I can't share the volumes; they're confidential.")

    def check(self, **change):
        result = {"question": "How did you sequence the migration across the plants?", "kind": "follow_up",
                  "topic": "projects", "anchor_turn_id": "a1", "anchor_quote": "led the vendor migration", **change}
        return provider._check_next_question(result, {"next_step": next_step({"route": "cat"}, self.TURNS)}, self.TURNS)

    def test_follow_up_may_anchor_to_an_earlier_answer(self):
        self.assertEqual(self.check()["anchor_turn_id"], "a1")
        self.assertEqual(self.check(anchor_quote="LED the vendor migration.")["anchor_quote"], "led the vendor migration")

    def test_clarification_must_anchor_to_the_latest_answer(self):
        with self.assertRaises(provider.ProviderFailure):
            self.check(kind="clarification")
        self.assertEqual(self.check(kind="clarification", anchor_turn_id="a2", anchor_quote="can't share the volumes")["kind"],
                         "clarification")

    def test_quote_must_come_from_the_named_answer(self):
        for change in ({"anchor_quote": "can't share the volumes"}, {"anchor_turn_id": "a3"}, {"anchor_quote": "led the supplier migration"}):
            with self.assertRaises(provider.ProviderFailure):
                self.check(**change)

    def test_schema_lists_only_existing_answers(self):
        response = Mock()
        response.json.return_value = {"status": "completed", "usage": {}, "output": [{"type": "message", "content": [
            {"type": "output_text", "text": json.dumps({"question": "How did you sequence the migration?", "kind": "follow_up",
                                                        "topic": "projects", "anchor_turn_id": "a1",
                                                        "anchor_quote": "led the vendor migration"})}]}]}
        with patch.object(provider, "_post", return_value=response) as post:
            provider.next_question({"route": "cat"}, self.TURNS)
        body = post.call_args.kwargs["json"]
        self.assertEqual(body["text"]["format"]["schema"]["properties"]["anchor_turn_id"]["enum"], ["", "a1", "a2"])
        self.assertIn("clarification MUST anchor to the latest answer", body["instructions"])

    def test_returning_to_an_earlier_answer_starts_a_new_branch(self):
        turns = answered("I compared two vendors.", "We chose the cheaper one.", "It saved time.")
        turns[2].update(kind="follow_up", anchor_turn_id="a1")   # q2 follows up a1
        turns[4].update(kind="follow_up", anchor_turn_id="a2")   # q3 follows up a2: depth 2, exhausted
        self.assertTrue(next_step({"route": "cat"}, turns)["move_on"])
        turns[4].update(anchor_turn_id="a1")                     # q3 jumps back past a2: a new branch
        self.assertEqual(next_step({"route": "cat"}, turns)["branch_depth"], 1)
        self.assertFalse(next_step({"route": "cat"}, turns)["move_on"])


class ConflictTest(unittest.TestCase):
    """v8: a stated conflict forces a clarification of the latest answer; the model cannot end a session."""
    TURNS = answered("I interned at a lab for six weeks.", "I also had four interns reporting to me there.")

    def check(self, turns=None, **change):
        turns = turns or self.TURNS
        result = {"conflict": "", "question": "How did you split the work with the other interns?", "kind": "follow_up",
                  "topic": "experience", "anchor_turn_id": "a1", "anchor_quote": "interned at a lab", **change}
        return provider._check_next_question(result, {"next_step": next_step({"route": "cat"}, turns)}, turns)

    def test_conflict_requires_a_clarification_of_the_latest_answer(self):
        note = "Résumé shows a six-week internship; the answer claims four reports."
        with self.assertRaises(provider.ProviderFailure):
            self.check(conflict=note)
        with self.assertRaises(provider.ProviderFailure):  # a clarification of an older answer
            self.check(conflict=note, kind="clarification")
        ok = self.check(conflict=note, kind="clarification", anchor_turn_id="a2", anchor_quote="four interns reporting to me",
                        question="Your résumé lists an internship; could you explain the four interns reporting to you?")
        self.assertEqual(ok["kind"], "clarification")

    def test_branch_limit_allows_one_clarification_then_only_conflicts(self):
        latest = {"anchor_turn_id": "a3", "anchor_quote": "reviewed the evidence", "kind": "clarification",
                  "question": "Could you give a concrete example of that?"}
        self.assertEqual(self.check(exhausted_turns(), **latest)["kind"], "clarification")  # at the limit
        with self.assertRaises(provider.ProviderFailure):  # follow-ups stay impossible at the limit
            self.check(exhausted_turns(), **{**latest, "kind": "follow_up"})
        beyond = exhausted_turns(follow_ups=3)  # one clarification already used up
        latest.update(anchor_turn_id="a4")
        with self.assertRaises(provider.ProviderFailure):
            self.check(beyond, **latest)
        self.assertEqual(self.check(beyond, conflict="Differs from a1.", **latest)["kind"], "clarification")

    def test_model_cannot_end_the_session(self):
        body, _ = NextQuestionRequestTest.sent(self, exhausted_turns(follow_ups=1), {
            "conflict": "", "question": "What evidence did you weigh most?", "kind": "follow_up", "topic": "projects",
            "anchor_turn_id": "a2", "anchor_quote": "reviewed the evidence"})
        self.assertNotIn("end_requested", body["text"]["format"]["schema"]["properties"]["kind"]["enum"])
        self.assertNotIn("end_requested", body["instructions"])


class BeyondLimitSchemaTest(unittest.TestCase):
    def test_schema_allows_only_new_topic_once_the_extra_clarification_is_used(self):
        body, _ = NextQuestionRequestTest.sent(self, exhausted_turns(follow_ups=3), {
            "conflict": "", "question": "What do you hope to learn in the MBA?", "kind": "new_topic",
            "topic": "motivation", "anchor_turn_id": "", "anchor_quote": ""})
        properties = body["text"]["format"]["schema"]["properties"]
        self.assertEqual(properties["kind"]["enum"], ["new_topic"])
        self.assertEqual((properties["anchor_turn_id"]["enum"], properties["anchor_quote"]["enum"]), ([""], [""]))
        at_limit, _ = NextQuestionRequestTest.sent(self, exhausted_turns(), {
            "conflict": "", "question": "What do you hope to learn in the MBA?", "kind": "new_topic",
            "topic": "motivation", "anchor_turn_id": "", "anchor_quote": ""})
        self.assertEqual(at_limit["text"]["format"]["schema"]["properties"]["kind"]["enum"], ["new_topic", "clarification"])
