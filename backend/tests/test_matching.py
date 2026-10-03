import unittest
from app.models.cv import ParsedCV, Experience
from app.models.job import JobData
from app.services.match_scorer import _skill_fit, _keyword_coverage, compute_match_score
from app.services.ats_checker import run_ats_check


class MatchingTests(unittest.TestCase):
    def test_skill_normalization_and_stable_order(self):
        cv = ParsedCV(name="Synthetic applicant", skills=[" Python ", "JAVA", ""])
        job = JobData(title="Backend", company="Example", required_skills=["python", "java", " SQL ", ""], nice_to_have=["JAVA"])
        score, matched, missing = _skill_fit(cv, job)
        self.assertAlmostEqual(score, 2 / 3)
        self.assertEqual(matched, ["java", "python"])
        self.assertEqual(missing, ["sql"])

    def test_java_does_not_match_javascript(self):
        cv = ParsedCV(name="Synthetic applicant", raw_text="Built a JavaScript application")
        job = JobData(title="Backend", company="Example", required_skills=["Java"])
        self.assertEqual(_keyword_coverage(cv, job), 0)

    def test_case_duplicates_do_not_change_keyword_weight(self):
        cv = ParsedCV(name="Synthetic applicant", raw_text="Python and C++")
        job = JobData(title="Backend", company="Example", required_skills=["PYTHON", "python", "C++", "Java"])
        self.assertAlmostEqual(_keyword_coverage(cv, job), 2 / 3)

    def test_empty_requirements_and_score_bounds(self):
        cv = ParsedCV(name="Synthetic applicant")
        job = JobData(title="Intern", company="Example")
        result = compute_match_score(cv, job)
        self.assertGreaterEqual(result.score, 0)
        self.assertLessEqual(result.score, 100)
        self.assertEqual(result.missing_skills, [])

    def test_advice_preserves_truthful_career_claims(self):
        cv = ParsedCV(name="Synthetic applicant", experience=[Experience(title="Intern", company="Example", duration="3 months")])
        job = JobData(title="Software Engineer", company="Example", required_skills=["Python"])
        rules = {r.rule: r for r in run_ats_check(cv, job).rules}
        self.assertIn("demonstrate", rules["Keyword Match"].suggestion)
        self.assertIn("do not invent", rules["Quantified Achievements"].suggestion)
        self.assertIn("actual job titles", rules["Job Title Alignment"].suggestion)
        self.assertIn("Experience Entries", rules)


if __name__ == "__main__":
    unittest.main()
