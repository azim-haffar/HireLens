export async function responseError(res) {
  const data = await res.json().catch(() => null)
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg || 'Invalid input').join('; ')
  return `Request failed (${res.status}). Please try again.`
}

export async function consumeSSE(res, onChunk, onDone) {
  if (!res.ok) throw new Error(await responseError(res))
  if (!res.body || !res.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('The analysis service did not return a text stream. Please try again.')
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const lines = frame.split('\n')
        const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim()
        const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
        if (event === 'error') throw new Error(data || 'The analysis stream failed. Please try again.')
        if (data === '[DONE]') { onDone?.(); return }
        if (data) onChunk(data)
      }
      if (done) throw new Error('The analysis stream was interrupted. Please try again.')
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
