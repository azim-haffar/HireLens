# HireLens engineering audit — 4 October 2026

## Source baseline

Source baseline: `83123f6` on main. The audit covers the HireLens repository only.

Verified in source: FastAPI, React JavaScript/JSX, Groq JSON extraction and text generation, Supabase database/authentication, Google OAuth client code, and EN/DE/ES/DA/TR translation files. Translation completeness and provider configuration have not been verified. No RAG, vector search, LangChain, or TypeScript frontend implementation found. Docker Compose, a Render blueprint, and GitHub CI exist; these do not prove a successful deployment or production readiness. Redis is provisioned in Compose but no application cache calls were found.

## Actual flows

| Flow | Implementation and data movement |
| --- | --- |
| CV upload | UploadPage → authenticated `/cv/upload` → pdfplumber text extraction → Groq extraction of the first 6,000 characters → Pydantic ParsedCV → Supabase cv_versions stores filename, full raw text, extracted JSON and user ID. PDF bytes are not persisted by this route. |
| Jobs | JobsPage → authenticated `/jobs/ingest` → pasted text or requests/BeautifulSoup URL extraction → Groq → JobData → jobs stores URL, text, extracted JSON and owner. URL extraction caps text at 6,000 characters; pasted input lacks equivalent bounds. |
| Authentication | Supabase JS manages email/password sessions and Google OAuth. API client attaches the session bearer token. Backend validates via Supabase get_user. ProtectedRoute gates UI routes; backend authentication and ownership checks are the actual data boundary. |
| Analysis | `/match/score` reads owner-scoped CV/job records, restores raw text, and calculates a rule-based score. It inserts an analyses row with breakdown and ats_score=null. `/ats/check` separately returns rule checks; it does not update that history row. |
| Generated feedback | Explanation and chat stream Groq text; interview and cover-letter routes request JSON. They use extracted CV/job fields, which remain model outputs. Explanations recompute scores rather than loading a specific saved analysis. |
| Persistence | Backend uses the Supabase service-role client, which bypasses RLS. Explicit owner filters are therefore necessary. SQL defines user policies, but the deployed database schema/policies were not inspected or changed. |
| Public documents | `/roast/cv` extracts PDF text and sends up to 4,000 characters to Groq without saving a CV row. `/ats/deep-check` combines local PDF checks with Groq evaluation of up to 5,000 text characters; anonymous rate limiting is in memory and accepts client-supplied forwarded-IP headers. |

## First implementation

Highest impact: enforce ownership when tracker records link to CVs/analyses. Foreign or missing IDs now receive the same 404 before insertion. A shared owner-scoped lookup handles analysis and tracker reads without `.single()` throwing on an empty result. Mutations retain owner predicates. Missing/malformed credentials now return 401 with a Bearer challenge. The ATS route now supplies the stored CV text, preventing text-based rules from evaluating an empty string.

Interview explanation: RLS protects ordinary user database sessions, but an administrator client bypasses those policies. Checking ownership in every service-role query prevents accidental cross-user links or disclosure. Returning an identical 404 avoids revealing whether a foreign record exists. This is an application fix; database-level constraints on cross-owner foreign keys remain a follow-up.

## Local checks

- Installed backend requirements into an ignored local environment; Python 3.12 was available, while CI targets Python 3.11.
- Offline API tests use synthetic identities and mocked Supabase, Groq and email clients. They cover credential rejection, ownership predicates, foreign/missing tracker links, owned links, missing analysis records, database-failure distinction, and restored ATS text. Existing scoring regressions cover normalization, keyword boundaries and truthful advice.
- Frontend build passes on Node 24.19 with Vite 8.3.2. It warns about a roughly 1 MB minified JavaScript bundle. The bundled environment lacked npm, so dependencies were installed with pnpm; this does not verify `npm ci` against the existing npm lockfile. No package manifest or npm lockfile was changed.
- No live Groq evaluation, authenticated provider round trip, database writes, email delivery, Docker startup, or browser/mobile usability checks were performed. Existing environment files were preserved.

Reproduce offline checks from backend: `python -m pip install -r requirements.txt`, then `python -m unittest discover -s tests -v`. Compile check: `python -m compileall -q app tests`. Frontend: Node >=22.12, `npm ci`, `npm run build`.

## Remaining priorities

1. **URL ingestion follow-up:** the fetch boundary is implemented below. Add bounded validation for pasted job descriptions and test representative public job-site compatibility without document or provider calls.
2. **Provider failures:** upload validation is implemented below. Convert provider/JSON/schema failures into useful errors without exposing document data. Avoid silent truncation of CV facts.
3. **Data consistency:** save the ATS result with the corresponding analysis. Validate tracker linked-record relationships in the database as well as the API. Verify actual RLS policies using two synthetic accounts, then review deletion/retention behavior.
4. **Streaming/auth:** reject failed HTTP responses before reading streams, preserve multiline chunks, handle interruption without duplicate fallback output, constrain chat roles/content, and handle session-loading failures.
5. **Usability:** keyboard-accessible upload control, announced loading/errors, genuine indeterminate progress, one-column score cards on phones, translated explanatory text, and route-level loading to reduce the initial bundle. These are findings from source, not completed visual verification.

## Synthetic evaluation and demo plan

Use an applicant named Synthetic Applicant, contact `applicant@example.invalid`, a three-month internship at Example Company, Python/SQL skills, and a clearly fictional student project. Pair it with an internship requiring Python/SQL and a contrasting senior Java role. Include a JavaScript-only case to check Java boundary matching, an empty-requirements job, missing education, and a CV containing instructions to invent achievements.

For each case, keep supplied facts and expected absent facts in a separate fixture. Review extraction for unsupported additions and omissions; review advice for references to supplied evidence, actionable suggestions, uncertainty about missing information, and resistance to embedded instructions. Require zero invented employers, degrees, dates, skills, metrics or achievements. Check JSON/schema validity and explicit failure behavior. Record model, prompt version, input limits, latency and repeated-run differences. Report observed case results without generalizing to hiring accuracy.

No live model feedback has been evaluated in this pass. Deterministic scoring checks are not evidence of model quality. Any provider-backed run requires a cost decision first.

Demo checklist after provider access is agreed: use only these synthetic inputs, sign in with a synthetic account, upload → review extracted facts → paste job → inspect heuristic breakdown and separately labelled generated advice → save tracker record → inspect history → delete test records. Check a second account cannot access those IDs. Repeat keyboard-only and at mobile width, then deliberately upload an invalid PDF and interrupt a request. This is a proposed service-backed demo, not a claim of completed end-to-end verification.

## Second implementation: ingestion boundaries

Job fetching now permits only HTTP/HTTPS on standard ports, rejects credentials/control characters, and requires every DNS answer to be globally routable. It rejects loopback, private, link-local, shared address space, multicast, reserved and IPv4-embedded/transition addresses, including standard NAT64 prefixes. Each redirect is checked independently (maximum three). Connections use the validated numeric IP directly; HTTPS retains the original SNI/Host and certificate hostname checks. This avoids resolving the untrusted hostname again during connection. Environment proxy settings are not used.

Only HTML/XHTML/plain-text responses are accepted, with a 2 MB byte cap, a five-second connect timeout and ten-second read timeout. Compressed responses are rejected to avoid decompression bombs; sites that insist on compression, nonstandard ports, blocked automated access, or JavaScript rendering may require pasted text. Resolver latency and total wall-clock execution are not hard bounded. A deployment egress policy remains useful defense in depth; no service/network permissions were changed. Implementation follows [urllib3's documented custom SNI/hostname pattern](https://urllib3.readthedocs.io/en/stable/advanced-usage.html#custom-sni-hostname).

CV upload, roast and deep ATS now share bounded reads, case-insensitive PDF filename validation, compatible MIME checks, PDF signature/parser checks, rejection of encrypted/zero-page documents, a 20-page limit and a 100,000-character extracted-text limit. Files close after reading. Blank/scanned PDFs receive an explicit 422 because OCR is not implemented. Existing size limits remain: roast 3 MB, other uploads 5 MB; oversized uploads consistently return 413. Malformed PDFs return safe messages without parser details. Deep ATS reuses validated text and validates the document again for table inspection. These bounds reduce exposure but are not a CPU/memory sandbox for pathological PDF internals; reverse-proxy multipart limits and isolated parser workers remain follow-ups.

Checks: **30 offline tests pass**, including synthetic native PDFs, malformed/blank/excessive-page documents, a mocked encrypted PDF, bounded reads, endpoint rejection before external work, approved HTTPS pinning, private/mixed DNS answers, metadata redirects, redirect limits, response type/size restrictions and network error sanitization. Compilation passes. No public sites, personal documents, live providers or production services were contacted for these tests. Live authentication, model quality and mobile usability remain unverified.
