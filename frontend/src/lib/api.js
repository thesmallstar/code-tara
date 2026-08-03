const BASE = ''

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  health: () => req('GET', '/api/health'),
  getProviders: () => req('GET', '/api/providers'),
  getScanners: () => req('GET', '/api/scanners'),

  // GitHub
  verifyGitHub: () => req('POST', '/api/github/verify'),
  getReviewRequests: (days = 14) => req('GET', `/api/github/review-requests?days=${days}`),
  syncReviewRequests: (days = 14) => req('POST', `/api/github/review-requests/sync?days=${days}`),

  // Reviews
  listReviews: (q = '', page = 1, perPage = 10) =>
    req('GET', `/api/reviews?q=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}`),
  createReview: (prUrl, modelProvider, scanners = []) =>
    req('POST', '/api/reviews', { pr_url: prUrl, model_provider: modelProvider, scanners }),
  getReview: (id) => req('GET', `/api/reviews/${id}`),
  syncReview: (id) => req('POST', `/api/reviews/${id}/sync`),
  resumeReview: (id) => req('POST', `/api/reviews/${id}/resume`),
  submitReview: (id, event, body = '') => req('POST', `/api/reviews/${id}/submit`, { event, body }),
  getThreads: (reviewId) => req('GET', `/api/reviews/${reviewId}/threads`),

  // Chunks
  getChunk: (id) => req('GET', `/api/chunks/${id}`),
  toggleChunkDone: (chunkId) => req('PATCH', `/api/chunks/${chunkId}/done`),
  updateCheckedFiles: (chunkId, checkedFilePaths) =>
    req('PATCH', `/api/chunks/${chunkId}/checked-files`, { checked_file_paths: checkedFilePaths }),
  runAI: (chunkId) => req('POST', `/api/chunks/${chunkId}/run-ai`),
  getChat: (chunkId) => req('GET', `/api/chunks/${chunkId}/chat`),
  sendChat: (chunkId, message) => req('POST', `/api/chunks/${chunkId}/chat`, { message }),
  getDrafts: (chunkId) => req('GET', `/api/chunks/${chunkId}/drafts`),
  createDraft: (chunkId, draft) => req('POST', `/api/chunks/${chunkId}/drafts`, draft),
  updateDraft: (draftId, data) => req('PUT', `/api/chunks/drafts/${draftId}`, data),
  deleteDraft: (draftId) => req('DELETE', `/api/chunks/drafts/${draftId}`),
  sendDraft: (draftId) => req('POST', `/api/chunks/drafts/${draftId}/send`),

  // Threads
  replyToThread: (threadId, bodyMd) =>
    req('POST', `/api/threads/${threadId}/reply`, { body_md: bodyMd }),
  discussThread: (threadId, message, history = []) =>
    req('POST', `/api/threads/${threadId}/discuss`, { message, history }),
  resolveThread: (threadId) => req('PATCH', `/api/threads/${threadId}/resolve`),

  // Re-review
  createReReview: (reviewId) => req('POST', `/api/reviews/${reviewId}/re-review`),
  getReReview: (id) => req('GET', `/api/re-reviews/${id}`),

  // Disk / clones
  getDiskUsage: () => req('GET', '/api/github/disk-usage'),
  deleteAllClones: () => req('DELETE', '/api/github/clones'),

  // Prompts
  getPrompts: () => req('GET', '/api/prompts'),
  updatePrompt: (key, text) => req('PUT', `/api/prompts/${key}`, { text }),
  resetPrompt: (key) => req('DELETE', `/api/prompts/${key}`),
}
