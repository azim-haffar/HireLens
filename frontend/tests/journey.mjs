import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:4173'
const apiOrigin = 'http://127.0.0.1:8999'
const artifacts = 'test-results'
await mkdir(artifacts, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  windowsHide: true, stdio: 'pipe',
  env: { ...process.env, VITE_API_URL: apiOrigin, VITE_SUPABASE_URL: 'https://synthetic.invalid', VITE_SUPABASE_ANON_KEY: 'synthetic-public-key' },
})
let serverLog = ''
server.stdout.on('data', (data) => { serverLog += data })
server.stderr.on('data', (data) => { serverLog += data })
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let activePage
let browser
const results = []
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverLog)
    try { ready = (await fetch(origin)).ok } catch {}
    if (ready) break
    await wait(100)
  }
  assert(ready, 'Local frontend server did not become ready')
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' })
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', serviceWorkers: 'block' })
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))
    const state = { cvs: [], jobs: [], analyses: [], apps: [], interviewFailures: 1, moveFailures: 1 }
    const errors = []
    const unexpected = []
    const page = await context.newPage()
    activePage = page
    page.setDefaultTimeout(10000)
    page.setDefaultNavigationTimeout(10000)
    console.log(`${name}: sign-in`)
    const openNav = async () => { if (name === 'mobile') await page.getByRole('button', { name: 'Navigation', exact: true }).click() }
    page.on('pageerror', (error) => errors.push(error.message))
    const respond = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data),
      headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*' } })
    await context.route('**/*', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.origin === origin) return route.continue()
      if (url.hostname === 'synthetic.invalid') {
        if (url.pathname.endsWith('/token')) {
          const user = { id: 'synthetic-owner', aud: 'authenticated', role: 'authenticated', email: 'applicant@example.invalid', created_at: '2026-10-06T00:00:00Z', app_metadata: {}, user_metadata: {} }
          const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
          const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })}.synthetic`
          return respond(route, { access_token: token, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user })
        }
        if (url.pathname.endsWith('/logout')) return respond(route, {})
        if (url.pathname.endsWith('/user')) return respond(route, { id: 'synthetic-owner', email: 'applicant@example.invalid' })
      }
      if (url.origin !== apiOrigin) { unexpected.push(url.origin); return route.abort() }
      const path = url.pathname
      if (request.method() === 'OPTIONS') return respond(route, {})
      const body = request.postDataJSON ? (() => { try { return request.postDataJSON() || {} } catch { return {} } })() : {}
      if (path === '/cv/upload') {
        state.cvs = [{ id: 'cv-1', filename: 'synthetic.pdf' }, { id: 'cv-2', filename: 'synthetic-revised.pdf' }]
        return respond(route, { cv_id: 'cv-1', parsed: { name: 'Synthetic Applicant', skills: ['Python', 'SQL'], experience: [], education: [] } })
      }
      if (path === '/cv/versions') return respond(route, state.cvs)
      if (path.startsWith('/cv/versions/')) { state.cvs = state.cvs.filter((cv) => cv.id !== path.split('/').pop()); return route.fulfill({ status: 204 }) }
      if (path === '/jobs/ingest') {
        const job = { title: 'Backend Intern', company: 'Example Labs', required_skills: ['Python', 'SQL'], nice_to_have: [] }
        state.jobs = [{ id: 'job-1', parsed_data: job }]
        return respond(route, { job_id: 'job-1', job })
      }
      if (path === '/jobs/list') return respond(route, state.jobs)
      if (path === '/match/score') {
        const ats = { score: 70, rules: [{ rule: 'Keyword Match', passed: true, severity: 'info', suggestion: '' }], summary: 'Synthetic rule result.' }
        const result = { score: 75, analysis_id: 'analysis-1', ats, breakdown: { skill_fit: 100, experience: 50, education: 100, keyword_coverage: 100 }, matched_skills: ['Python', 'SQL'], missing_skills: [] }
        state.analyses = [{ id: result.analysis_id, cv_id: body.cv_id, job_id: body.job_id, match_score: result.score, ats_score: ats.score, created_at: '2026-10-06T00:00:00Z', jobs: state.jobs[0] }]
        return respond(route, result)
      }
      if (path === '/interview/generate') {
        if (state.interviewFailures--) return respond(route, { detail: 'Synthetic provider unavailable. Try again.' }, 502)
        return respond(route, { questions: Array.from({ length: 10 }, (_, i) => ({ question: i === 0 ? 'How would you test your Python project?' : `Synthetic practice question ${i + 1}`, type: i < 4 ? 'technical' : i < 7 ? 'behavioural' : 'situational', framework: i < 4 ? 'Technical' : 'STAR', answer_outline: 'Use only examples from your actual project.' })) })
      }
      if (path === '/cover-letter/generate') return respond(route, { subject: 'Backend Intern application', body: 'Synthetic cover letter: review this draft against supplied facts.' })
      if (path === '/tracker/applications') {
        if (request.method() === 'POST') { const app = { ...body, id: 'application-1', status: 'saved' }; state.apps.push(app); return respond(route, app) }
        return respond(route, state.apps)
      }
      if (path.startsWith('/tracker/applications/')) {
        if (request.method() === 'DELETE') { state.apps = []; return respond(route, { deleted: true }) }
        if (state.moveFailures--) return respond(route, { detail: 'Synthetic update failed. Retry.' }, 503)
        state.apps[0].status = body.status
        return respond(route, { id: 'application-1', status: body.status })
      }
      if (path === '/history/analyses') return respond(route, state.analyses)
      if (path === '/explain/stream') return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: Python is listed in the synthetic CV.\ndata: Verify generated claims before use.\n\ndata: [DONE]\n\n' })
      unexpected.push(`${request.method()} ${path}`)
      return respond(route, { detail: 'Unexpected test endpoint' }, 500)
    })

    await page.goto(origin + '/analysis')
    await page.waitForURL('**/login')
    await page.locator('input[type=email]').fill('applicant@example.invalid')
    await page.locator('input[type=password]').fill('synthetic-password')
    await page.waitForFunction(() => document.querySelector('input[type=email]')?.value === 'applicant@example.invalid' && document.querySelector('input[type=password]')?.value === 'synthetic-password')
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    await page.waitForURL('**/dashboard')
    console.log(`${name}: upload`)
    await page.goto(origin + '/upload')
    const upload = page.locator('input[type=file]')
    await upload.setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) })
    await page.getByRole('alert').filter({ hasText: 'non-empty' }).waitFor()
    const chooser = page.getByRole('button', { name: /click to browse/ })
    await chooser.focus()
    assert.equal(await chooser.evaluate((el) => el === document.activeElement), true)
    await upload.setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 synthetic UI fixture') })
    await page.getByRole('heading', { name: 'CV Parsed Successfully' }).waitFor()
    console.log(`${name}: job`)
    await page.getByRole('button', { name: 'Next: Add Job' }).click()
    await page.getByRole('button', { name: 'Paste Text', exact: true }).click()
    await page.getByRole('textbox', { name: 'Or paste job description' }).fill('Example Labs seeks a Backend Intern with Python and SQL.')
    await page.getByRole('button', { name: 'Add Job', exact: true }).click()
    await page.getByRole('heading', { name: 'Job Added' }).waitFor()
    await page.getByRole('button', { name: 'Run Analysis', exact: true }).click()
    console.log(`${name}: analysis`)
    await page.getByRole('combobox').nth(0).selectOption('cv-1')
    await page.getByRole('combobox').nth(1).selectOption('job-1')
    await page.getByRole('button', { name: 'Run Analysis', exact: true }).click()
    await page.getByText(/Scores are rule-based/).waitFor()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    assert.equal(overflow, false, `${name}: analysis overflows viewport`)
    await page.waitForTimeout(1000) // allow finite entry animations to settle before visual evidence
    await page.screenshot({ path: `${artifacts}/${name}-analysis.png`, fullPage: true })
    console.log(`${name}: interview`)
    await page.getByRole('button', { name: 'Interview Prep', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Synthetic provider unavailable' }).waitFor()
    await page.getByRole('button', { name: 'Interview Prep', exact: true }).click()
    await page.getByText('How would you test your Python project?').waitFor()
    assert.equal(await page.locator('details').count(), 10)
    await page.getByRole('button', { name: 'Cover Letter', exact: true }).click()
    await page.getByRole('button', { name: 'Generate Cover Letter', exact: true }).click()
    await page.getByText('Backend Intern application', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Explain', exact: true }).click()
    await page.getByRole('button', { name: 'Explain My Score' }).click()
    await page.getByText('Verify generated claims before use.', { exact: false }).waitFor()
    await page.getByRole('combobox').nth(0).selectOption('cv-2')
    await page.getByRole('button', { name: 'Scores', exact: true }).waitFor({ state: 'hidden' })
    assert.equal(await page.getByText('How would you test your Python project?').count(), 0)
    await page.getByRole('button', { name: 'Run Analysis', exact: true }).click()
    console.log(`${name}: tracker`)
    await page.getByRole('button', { name: 'Track this application' }).click()
    await page.getByRole('link', { name: 'Open tracker' }).click()
    await page.getByText('Backend Intern', { exact: true }).waitFor()
    await page.getByRole('button', { name: '→ Applied', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Synthetic update failed' }).waitFor()
    assert.equal(state.apps[0].status, 'saved')
    await page.getByRole('button', { name: '→ Applied', exact: true }).click()
    await page.getByRole('button', { name: '→ Applied', exact: true }).waitFor({ state: 'hidden' })
    assert.equal(state.apps[0].status, 'applied')
    await page.reload()
    await page.getByRole('button', { name: '→ Saved', exact: true }).waitFor()
    await openNav()
    await page.getByRole('link', { name: 'History', exact: true }).click()
    await page.getByText('Backend Intern', { exact: true }).waitFor()
    assert.equal(state.analyses[0].ats_score, 70)
    await openNav()
    await page.getByRole('link', { name: 'Tracker', exact: true }).click()
    await page.getByRole('button', { name: 'Delete Example Labs application' }).click()
    await page.getByText('Backend Intern', { exact: true }).waitFor({ state: 'hidden' })
    await openNav()
    await page.getByRole('button', { name: 'Logout', exact: true }).click()
    await page.goto(origin + '/analysis')
    await page.waitForURL('**/login')
    assert.deepEqual(errors, [], `${name}: browser exceptions`)
    assert.deepEqual(unexpected, [], `${name}: unexpected requests`)
    results.push({ viewport: name, journey: 'passed', dependencies: 'mocked auth/API', browserErrors: errors, unexpectedRequests: unexpected, horizontalOverflow: overflow })
    await context.close()
  }
  await writeFile(`${artifacts}/journey-report.json`, JSON.stringify({ liveServicesVerified: false, results }, null, 2))
  console.log('Desktop and mobile journeys passed with synthetic auth/API responses; live services remain unverified.')
} catch (error) {
  await activePage?.screenshot({ path: `${artifacts}/failure.png`, fullPage: true }).catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally {
  await browser?.close()
  server.kill()
}
