"""Versioned, question-only content. No personal answers or private source URLs."""
import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def question_bank():
    bank = json.loads((Path(__file__).resolve().parents[1] / "content" / "interview_questions.json").read_text())
    nodes = {node["id"]: node for node in bank["nodes"]}
    if len(nodes) != len(bank["nodes"]):
        raise ValueError("Duplicate question IDs")
    children = {key: [] for key in nodes}
    for edge in bank["edges"]:
        if edge["parent"] not in nodes or edge["child"] not in nodes:
            raise ValueError("A question connection has a missing endpoint")
        children[edge["parent"]].append(edge["child"])
    reached = set()
    def visit(key, path):
        if key in path:
            raise ValueError("Question graph contains a cycle")
        reached.add(key)
        for child in children[key]:
            visit(child, path | {key})
    for root in bank["roots"]:
        visit(root, set())
    if reached != set(nodes):
        raise ValueError("Question graph contains an unreachable question")
    return bank


def starting_question(question_id, route):
    bank = question_bank()
    return next((node for node in bank["nodes"]
                 if node["id"] == question_id and node["id"] in bank["roots"] and route in node["routes"]), None)


def follow_up_questions(root_id, route, limit=16):
    bank = question_bank()
    nodes = {node["id"]: node for node in bank["nodes"]}
    pending = [root_id]
    visited = {root_id}
    result = []
    while pending and len(result) < limit:
        parent = pending.pop(0)
        for edge in bank["edges"]:
            child = edge["child"]
            if edge["parent"] != parent or child in visited or route not in nodes[child]["routes"]:
                continue
            visited.add(child)
            pending.append(child)
            result.append(nodes[child]["text"])
    return result[:limit]
