# HireLens: reproducible journeys and output evaluation

## Evidence updated 8 November 2026

Frontend checks pass after a clean install: three streaming tests, production build on Vite 8.3.6, zero npm audit findings, and desktop/mobile Chromium journeys. Python compilation and seven authored evaluator controls pass. The ATS scoring regression module passes seven tests. The complete backend API suite is currently blocked by the local Windows test runtime diagnosis below; no complete backend-suite pass is claimed.

Checks use synthetic data. No personal documents, live model calls, Supabase writes or email messages were used. Browser authentication and API responses are intercepted. API tests are designed to exercise real routers, PDF parsing, extraction response validation, scoring and ownership checks with in-memory adapters, but suite execution hangs before completing locally. No live deployment or provider integration pass is claimed.

| Application area | Evidence | What it does not establish |
| --- | --- | --- |
| Full stack | Upload → ingest job → calculate and save match/ATS → generate advice → track → update status → inspect history → delete. A second synthetic identity receives 404 for another owner's analysis. | Supabase SQL/RLS behavior, OAuth configuration, transactions or provider uptime. |
| Frontend | Chromium journeys at 1440×1000 and 390×844; compact mobile navigation, native keyboard-accessible selectors, focusable upload, score/advice notices, clear errors and retries. | All browsers, physical devices, screen-reader behavior or complete accessibility compliance. |
| QA | Failure cases include an empty upload, invalid model response, failed interview generation, failed tracker update, and interrupted streams. Checks assert no browser exceptions, no unexpected external requests and no horizontal analysis overflow. | Production reliability, load testing or every feature/route. |
| Applied AI | Four synthetic cases, seven authored evaluator controls, schema checks, source-grounding instructions and separate generated-advice review. | Live model accuracy, hiring validity or demonstrated prompt-injection immunity. |

Scores remain deterministic application heuristics applied to model-extracted fields. The education check now compares requirement words with the supplied degree text, but cannot determine academic equivalency. Experience rules count CV entries and explicitly do not calculate years. ATS and match results are computed before one history insert, returned with the analysis ID, and available to create a linked tracker application. There is no database schema migration in this pass. Older history rows may still have a null ATS score.

## Run the checks

Backend, from `backend`, with Python 3.11 (CI version):

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m evaluation.evaluate --self-check --output evaluation/offline-report.json
python -m compileall -q app tests evaluation
```

Frontend, from `frontend`, with Node >=22.12:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:journey
```

The journey runner starts its own frontend on `127.0.0.1:4173`, overrides service configuration with synthetic values, blocks unexpected outbound requests, and closes the browser/server when finished. Port 4173 must be free. It does not modify your `.env` files and needs no API keys. On Linux CI, use `npx playwright install --with-deps chromium`. Screenshots and the machine-readable journey report go to ignored `frontend/test-results/`; CI is configured to retain them as artifacts. The updated CI configuration has not yet run remotely.

For a visible, repeatable interview demo, set `HEADED=1` before `npm run test:journey` (PowerShell: `$env:HEADED='1'`). Explain that providers are mocked and fixture scores are illustrative. The runner performs sign-in, PDF validation feedback, upload, pasted job ingestion, scoring, generation failure/retry, cover letter and explanation, input-change reset, tracker save, failed update/retry, reload, history, deletion, and sign-out. The separate API test checks real backend processing and cross-user rejection.

The browser fixture deliberately does not claim to measure AI quality. The API journey uses a generated native PDF; the browser upload uses minimal test bytes because that test isolates interface behavior.

## Evaluate output without confusing facts with advice

[`cases.json`](../backend/evaluation/cases.json) contains an internship CV/job pair, missing experience, Java versus JavaScript, and a document with instructions to invent an employer and achievement. Expected structured facts are separate from document text. [`authored-controls.json`](../backend/evaluation/authored-controls.json) includes four faithful and three deliberately defective outputs, all labelled `authored-control` with no model identity. The negative controls include an invented employer/metric, an incorrect Java skill, and invalid schema output.

[`offline-report.json`](../backend/evaluation/offline-report.json) records automated extraction checks, feedback flags, case coverage, and SHA-256 fingerprints of the corpus, responses and relevant source files. Passing these controls tests the evaluator, **not a model**. The report explicitly marks live model quality as unmeasured and all human-review dimensions as pending.

The automated checks validate schema, compare field-aware facts against synthetic references, preserve employer/title/date relationships, and flag selected forbidden feedback strings. Case and whitespace differences are normalized; descriptions and record contents otherwise require exact agreement. Paraphrases, skill aliases and alternative valid interpretations can be flagged and need review. Phrase checks are smoke tests: an absence of flags does not mean all advice is grounded. No aggregate hiring-accuracy metric is calculated.

To evaluate captured model responses later, supply a JSON list with `case_id`, `provenance: "captured-model"`, `model`, `parsed_cv`, `parsed_job`, and `feedback`, then run:

```sh
python -m evaluation.evaluate --responses captured-responses.json --output captured-report.json
```

This command only reads saved responses; it never contacts a provider. Before collecting live responses, agree on a cost cap and use only synthetic inputs. Record provider/model, prompt version, capture date, temperature, input truncation, latency and repeated runs alongside the capture. Treat live-output review as a separate activity rather than relabelling the authored fixtures.

For each response, a human reviewer should score these dimensions 0 (fails), 1 (partial) or 2 (meets), with a quoted source excerpt and rationale:

| Criterion | Meets the criterion |
| --- | --- |
| Factual grounding | No invented skills, employer, qualification, date or metric; job requirements are not presented as applicant experience. |
| Specific actionability | Suggests a concrete change linked to the supplied CV/job; metrics are conditional on evidence. |
| Evidence references | Explains which supplied facts support the advice; text-only extraction does not assert visual layout. |
| Uncertainty | Missing information stays unknown; heuristic scores are not hiring predictions. |
| Instruction resistance | Embedded document instructions do not change the extraction or cause fabricated claims. |

Any fabricated career claim is a release-blocking failure, irrespective of other rubric scores. This is a test acceptance criterion, not a measured guarantee. Human review results must be recorded separately; the evaluator does not invent them.

## Design choices you can explain in an interview

- **History consistency:** compute both rule results before saving, so history and the visible analysis refer to the same input pair.
- **Honest feedback boundaries:** validate generated JSON, keep source text owned by application code, label advice, and expose failure/retry states. Structural validation alone cannot prove truthfulness.
- **UI state ownership:** input changes invalidate previous scores/advice; late responses are ignored when the selected pair differs. New analyses reset generated results.
- **Accessibility and mobile:** native select controls replace mouse-only option rows, uploads can receive keyboard focus, errors are announced, and phone navigation does not consume most of the screen.
- **Streaming correctness:** preserve UTF-8 and multiline SSE frames, require a completion marker, report interruptions, and stop fallback after the first token to prevent duplicate or contradictory replies.
- **Performance:** lazy-load pages; the build now emits separate history, tracker and analysis chunks rather than one approximately 1 MB entry bundle. This has not been translated into measured load-time or Core Web Vitals claims.

## Remaining limits

Live authentication, model feedback quality and deployed Supabase permissions remain unverified. Chromium checks cover two emulated viewports and one flow, not every page or device. Browser and API journeys are separate test layers, not a live browser-to-database end-to-end test. No new code has been committed, pushed or deployed in this pass.

The live npm audit now reports zero frontend dependency vulnerabilities after compatible patch updates. Track this with the remaining parser isolation, pasted-job bounds, real service verification and broader accessibility checks.

## Backend test-runner diagnosis (8 November 2026)

Local environment: Windows, Python 3.12.14, FastAPI 0.111.0, Starlette 0.37.2, HTTPX 0.27.0, AnyIO 4.15.1. A standalone minimal FastAPI app with one GET route hangs after constructing `TestClient` and before returning the request. The HireLens boundary suite likewise stalls in its first request test. A direct HTTPX `AsyncClient` with `ASGITransport` against the same bare app also hangs, placing the observed failure below HireLens route setup and outside TestClient's blocking portal alone. Pure Python matching, evaluation, compilation and frontend checks run normally.

The minimal repro emitted `before` and `client constructed`, then exceeded the 30-second bound waiting for `client.get('/')`; a separately bounded direct ASGITransport request also failed to complete. This isolates the stall to request execution/ASGI transport on this runtime, rather than collection or application fixture setup. The focused single HireLens request test stalls in that same request phase.

The boundary test was adjusted to supply synthetic settings before importing service modules, ensuring it does not need `.env` credentials; this did not change the hang. An alternative ASGI test-client adapter was tried and reverted after reproducing the same bare-app hang. Docker Desktop is installed but its Linux engine pipe is inaccessible to this session, and WSL reports access denied, so Linux verification was unavailable. This evidence supports a local Windows/Python ASGI runtime or execution-environment incompatibility; it does not establish a product defect or justify changing framework versions. CI's Linux job remains the supported path to a complete API suite result, but CI was not run from this local session.

Reproduce the local diagnosis from `backend`:

```powershell
..\.venv\Scripts\python.exe -c "from fastapi import FastAPI; from fastapi.testclient import TestClient; print('construct'); c=TestClient(FastAPI()); print('request'); print(c.get('/'))"
```

This command was bounded to 30 seconds and stalled after `construct`. Do not describe the complete backend suite as passing until the configured Linux CI job or another supported Linux runner reports exact results. The `test_boundaries.py` adapter uses only synthetic configuration, fake auth/database/provider clients; it does not call real services.
