import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || ''

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request(path, options = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed with status ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// CV
export const cvApi = {
  upload: async (file) => {
    const headers = await getAuthHeaders()
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_URL}/api/v1/cv/upload`, {
      method: 'POST',
      headers,
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },
  list: () => request('/api/v1/cv/'),
  get: (id) => request(`/api/v1/cv/${id}`),
  delete: (id) => request(`/api/v1/cv/${id}`, { method: 'DELETE' }),
}

// Job
export const jobApi = {
  create: (body) => request('/api/v1/job/', { method: 'POST', body: JSON.stringify(body) }),
  list: () => request('/api/v1/job/'),
  get: (id) => request(`/api/v1/job/${id}`),
  delete: (id) => request(`/api/v1/job/${id}`, { method: 'DELETE' }),
}

// Analysis
export const analysisApi = {
  run: (body) => request('/api/v1/analysis/', { method: 'POST', body: JSON.stringify(body) }),
  compare: (body) => request('/api/v1/analysis/compare', { method: 'POST', body: JSON.stringify(body) }),
  list: () => request('/api/v1/analysis/'),
  get: (id) => request(`/api/v1/analysis/${id}`),
}

// Applications
export const appApi = {
  create: (body) => request('/api/v1/applications/', { method: 'POST', body: JSON.stringify(body) }),
  list: () => request('/api/v1/applications/'),
  update: (id, body) => request(`/api/v1/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/api/v1/applications/${id}`, { method: 'DELETE' }),
}

// Cover Letter
export const coverLetterApi = {
  generate: (analysis_id) =>
    request('/api/v1/cover-letter/', { method: 'POST', body: JSON.stringify({ analysis_id }) }),
}

// Chat
export const chatApi = {
  stream: async (analysisId, messages, onChunk) => {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ analysis_id: analysisId, messages }),
    })
    if (!res.ok) throw new Error('Chat request failed')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const { content, error } = JSON.parse(data)
          if (error) throw new Error(error)
          if (content) onChunk(content)
        } catch {}
      }
    }
  },
}
