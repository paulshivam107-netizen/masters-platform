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
            self.assertEqual(provider.next_question({"route": "cat"}, turns)[0], answer)
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
        self.assertEqual(schema["properties"]["kind"]["enum"], ["new_topic"])
        self.assertEqual(schema["properties"]["anchor_turn_id"]["enum"], [""])
        self.assertEqual(schema["properties"]["anchor_quote"]["enum"], [""])
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
        self.assertEqual(len(NextQuestion.model_json_schema()["properties"]["kind"]["enum"]), 3)
