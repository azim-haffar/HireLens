import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consumeSSE, responseError } from '../src/lib/sse.js'

test('handles split UTF-8 and multiline frames', async () => {
  const bytes = new TextEncoder().encode('data: café\r\ndata: line two\r\n\r\ndata: [DONE]\r\n\r\n')
  const stream = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close() } })
  const chunks = []
  let completed = 0
  await consumeSSE(new Response(stream, { headers: { 'content-type': 'text/event-stream' } }), (chunk) => chunks.push(chunk), () => completed++)
  assert.deepEqual(chunks, ['café\nline two'])
  assert.equal(completed, 1)
})

test('HTTP errors and validation arrays remain readable', async () => {
  const res = new Response(JSON.stringify({ detail: [{ msg: 'Missing CV' }, { msg: 'Missing job' }] }), { status: 422 })
  assert.equal(await responseError(res), 'Missing CV; Missing job')
  await assert.rejects(consumeSSE(new Response(JSON.stringify({ detail: 'Sign in again' }), { status: 401 }), () => {}), /Sign in again/)
})

test('interruption and error frames never report success', async () => {
  for (const body of ['data: partial\n\n', 'event: error\ndata: Synthetic failure\n\n']) {
    let completed = false
    await assert.rejects(consumeSSE(new Response(body, { headers: { 'content-type': 'text/event-stream' } }), () => {}, () => { completed = true }))
    assert.equal(completed, false)
  }
})
