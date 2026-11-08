import json
import unittest
from fastapi import HTTPException
from evaluation.evaluate import ROOT, evaluate
from app.core.llm_output import validated_json
from app.models.cv import ParsedCV
from app.core.sse import stream_events


class EvaluationTests(unittest.TestCase):
    def test_authored_positive_and_negative_controls(self):
        cases = {c["id"]: c for c in json.loads((ROOT / "cases.json").read_text())}
        for response in json.loads((ROOT / "authored-controls.json").read_text()):
            result = evaluate(cases[response["case_id"]], response)
            self.assertEqual(result["extraction_pass"], response["expected_extraction_pass"])
            self.assertNotEqual(result["feedback_verdict"], "validated")
            self.assertTrue(all(value == "pending" for value in result["human_review"].values()))

    def test_invalid_model_json_returns_502(self):
        for content in ["not JSON", "[]", '{"skills": "Python"}', '{"name":"Synthetic","invented_award":"Winner"}']:
            with self.assertRaises(HTTPException) as error:
                validated_json(content, ParsedCV)
            self.assertEqual(error.exception.status_code, 502)

    def test_raw_text_is_owned_by_application_not_model(self):
        result = validated_json('{"name":"Synthetic","raw_text":"invented"}', ParsedCV, raw_text="source")
        self.assertEqual(result.raw_text, "source")

    def test_swapped_employers_are_not_grounded(self):
        import copy
        case = json.loads((ROOT / "cases.json").read_text())[0]
        case["expected_cv"]["experience"].append({"title":"Student", "company":"Example University", "duration":"1 year", "description":"Studied SQL."})
        cv = copy.deepcopy(case["expected_cv"])
        cv["experience"][0]["company"], cv["experience"][1]["company"] = cv["experience"][1]["company"], cv["experience"][0]["company"]
        result = evaluate(case, {"parsed_cv":cv, "parsed_job":case["expected_job"]})
        self.assertFalse(result["extraction_pass"])
        self.assertTrue(result["unsupported_facts"])

    def test_stream_frames_preserve_multiline_output_and_errors(self):
        self.assertEqual(list(stream_events(["line one\nline two"])),
                         ["data: line one\ndata: line two\n\n", "data: [DONE]\n\n"])
        def broken():
            yield "partial"
            raise RuntimeError("private details")
        frames = list(stream_events(broken()))
        self.assertIn("event: error", frames[-1])
        self.assertNotIn("private details", frames[-1])
        self.assertFalse(any("[DONE]" in frame for frame in frames))
