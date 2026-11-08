"""Offline scoring of captured extraction output; never calls an LLM."""
import argparse
import json
import hashlib
from pathlib import Path

from pydantic import ValidationError
from app.models.cv import ParsedCV
from app.models.job import JobData

ROOT = Path(__file__).parent
RUBRIC = ["factual_grounding", "specific_actionability", "evidence_references",
          "uncertainty", "instruction_resistance"]


def facts(value, path=""):
    """Field-aware facts; ordering of extracted lists is not a quality metric."""
    result = set()
    if isinstance(value, dict):
        for key, item in value.items():
            if key != "raw_text": result |= facts(item, f"{path}.{key}" if path else key)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                # Preserve employer/title/date relationships within each record.
                record = {key: " ".join(val.casefold().split()) if isinstance(val, str) else val
                          for key, val in item.items()}
                result.add((path + "[]", json.dumps(record, sort_keys=True)))
            else: result |= facts(item, path + "[]")
    elif isinstance(value, str) and value.strip():
        result.add((path, " ".join(value.casefold().split())))
    return result


def evaluate(case, response):
    result = {"case_id": case["id"], "provenance": response.get("provenance", "unspecified"),
              "model": response.get("model"), "schema_valid": False,
              "unsupported_facts": [], "missing_facts": [], "feedback_flags": [],
              "human_review": {key: "pending" for key in RUBRIC}}
    try:
        if set(response["parsed_cv"]) - set(ParsedCV.model_fields) or set(response["parsed_job"]) - set(JobData.model_fields):
            raise ValueError("Unexpected extracted fields")
        cv = ParsedCV.model_validate(response["parsed_cv"])
        job = JobData.model_validate(response["parsed_job"])
        expected = facts(case["expected_cv"], "cv") | facts(case["expected_job"], "job")
        observed = facts(cv.model_dump(), "cv") | facts(job.model_dump(), "job")
        result["schema_valid"] = True
        result["unsupported_facts"] = sorted(observed - expected)
        result["missing_facts"] = sorted(expected - observed)
    except (ValidationError, KeyError, TypeError, ValueError):
        result["schema_error"] = "Output did not match CV/job schemas."
    feedback = response.get("feedback", "")
    if not isinstance(feedback, str): feedback = ""
    result["feedback_flags"] = [claim for claim in case["forbidden_feedback_claims"] if claim.casefold() in feedback.casefold()]
    result["extraction_pass"] = result["schema_valid"] and not result["unsupported_facts"] and not result["missing_facts"]
    # String checks cannot establish truthfulness or usefulness of open-ended advice.
    result["feedback_verdict"] = "flagged" if result["feedback_flags"] else "requires_human_review"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--responses", type=Path, default=ROOT / "authored-controls.json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--self-check", action="store_true", help="Check evaluator against authored positive/negative controls")
    args = parser.parse_args()
    cases = {case["id"]: case for case in json.loads((ROOT / "cases.json").read_text())}
    responses = json.loads(args.responses.read_text())
    if not responses: parser.error("Responses must not be empty.")
    results = []
    for response in responses:
        if response.get("case_id") not in cases: parser.error("Unknown case_id.")
        if response.get("provenance") not in ("authored-control", "captured-model"):
            parser.error("Specify authored-control or captured-model provenance.")
        if response["provenance"] == "captured-model" and not response.get("model"):
            parser.error("Captured outputs require model metadata.")
        results.append(evaluate(cases[response["case_id"]], response))
    source_files = ["core/llm_output.py", "services/cv_parser.py", "services/job_scraper.py",
                    "routers/cover_letter.py", "routers/interview.py"]
    report = {"corpus": "synthetic-v1", "live_model_quality_evaluated": False,
              "corpus_sha256": hashlib.sha256((ROOT / "cases.json").read_bytes()).hexdigest(),
              "responses_sha256": hashlib.sha256(args.responses.read_bytes()).hexdigest(),
              "source_sha256": {name: hashlib.sha256((ROOT.parent / "app" / name).read_bytes()).hexdigest() for name in source_files},
              "note": "Authored controls validate the evaluator only. Captured output still needs human review; no hiring accuracy is measured.",
              "case_coverage": sorted({r["case_id"] for r in results}), "results": results}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2)+"\n")
    else: print(json.dumps(report, indent=2))
    if args.self_check:
        if any(r["provenance"] != "authored-control" for r in results): parser.error("Self-check accepts authored controls only.")
        if any(r["extraction_pass"] != response.get("expected_extraction_pass") for r, response in zip(results, responses)):
            raise SystemExit("Evaluator control check failed.")
        print(f"Evaluator self-check passed for {len(results)} authored controls; model quality remains unmeasured.")


if __name__ == "__main__": main()
