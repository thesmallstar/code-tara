import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../lib/api'

// Group flat thread list into {root, replies[]} structures
function groupThreads(threads) {
  const byGithubId = {}
  for (const t of threads) {
    byGithubId[t.github_id] = t
  }
  const roots = []
  const replyMap = {}
  for (const t of threads) {
    if (t.in_reply_to_id) {
      ;(replyMap[t.in_reply_to_id] = replyMap[t.in_reply_to_id] || []).push(t)
    } else {
      roots.push(t)
    }
  }
  return roots.map((r) => ({ root: r, replies: replyMap[r.github_id] || [] }))
}

function parseUtc(s) {
  if (!s) return null
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z')
}

function fmtDate(s) {
  const d = parseUtc(s)
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
}

function DiffHunk({ hunk }) {
  if (!hunk) return null
  return (
    <div className="border-b border-gray-100 overflow-x-auto max-h-28 text-xs mono">
      {hunk.split('\n').map((line, i) => {
        let cls = 'px-3 py-0 text-gray-600 bg-white'
        if (line.startsWith('@@')) cls = 'px-3 py-0 text-blue-500 bg-blue-50'
        else if (line.startsWith('+')) cls = 'px-3 py-0 text-green-800 bg-green-50'
        else if (line.startsWith('-')) cls = 'px-3 py-0 text-red-800 bg-red-50'
        return <div key={i} className={cls}>{line || ' '}</div>
      })}
    </div>
  )
}

function Comment({ comment, isReply }) {
  const date = fmtDate(comment.created_at)
  return (
    <div className={`${isReply ? 'ml-6 border-l-2 border-gray-100 pl-3' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-700">{comment.author || 'unknown'}</span>
        <span className="text-xs text-gray-400">{date}</span>
      </div>
      <div className="prose prose-sm text-sm text-gray-800">
        <ReactMarkdown>{comment.body || ''}</ReactMarkdown>
      </div>
    </div>
  )
}

function TaraMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs
        ${isUser ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadCard({ group, onPostReply }) {
  const { root, replies } = group
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [postingSending, setPostingSending] = useState(false)
  const [resolved, setResolved] = useState(root.is_resolved || false)
  const [resolving, setResolving] = useState(false)

  // Tara discussion state (ephemeral — lives in component memory)
  const [taraOpen, setTaraOpen] = useState(false)
  const [taraHistory, setTaraHistory] = useState([])
  const [taraInput, setTaraInput] = useState('')
  const [taraLoading, setTaraLoading] = useState(false)
  const [taraError, setTaraError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [taraHistory, taraLoading])

  const isInline = root.type === 'REVIEW_COMMENT'

  const askTara = async () => {
    if (!taraInput.trim() || taraLoading) return
    const msg = taraInput.trim()
    setTaraInput('')
    setTaraLoading(true)
    setTaraError(null)
    const newHistory = [...taraHistory, { role: 'user', content: msg }]
    setTaraHistory(newHistory)
    try {
      const { reply } = await api.discussThread(root.id, msg, taraHistory)
      setTaraHistory([...newHistory, { role: 'assistant', content: reply }])
    } catch (e) {
      setTaraError(e.message)
    } finally {
      setTaraLoading(false)
    }
  }

  const handleTaraKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askTara() }
  }

  const toggleResolve = async () => {
    setResolving(true)
    try {
      const { is_resolved } = await api.resolveThread(root.id)
      setResolved(is_resolved)
    } finally {
      setResolving(false)
    }
  }

  const postReply = async () => {
    if (!replyText.trim()) return
    setPostingSending(true)
    try {
      await onPostReply(root.id, replyText.trim())
      setReplyText('')
      setReplyOpen(false)
    } finally {
      setPostingSending(false)
    }
  }

  const isOutdated = isInline && root.position === null

  return (
    <div className={`border rounded-xl mb-3 overflow-hidden ${resolved ? 'border-green-200 bg-green-50/30 opacity-70' : 'border-gray-200 bg-white'}`}>
      {/* File + line header */}
      {isInline && root.path && (
        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs mono text-gray-500 truncate">
            {root.path}{root.line ? `:${root.line}` : ''}
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-wide shrink-0">inline</span>
          {isOutdated && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full shrink-0">outdated</span>
          )}
          {resolved && (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0 ml-auto">✓ resolved</span>
          )}
        </div>
      )}

      {/* Colored diff hunk */}
      <DiffHunk hunk={root.diff_hunk} />

      {/* Root comment + replies */}
      <div className="px-3 py-3 space-y-3">
        <Comment comment={root} isReply={false} />
        {replies.map((r) => (
          <Comment key={r.id} comment={r} isReply />
        ))}
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setTaraOpen(!taraOpen); if (!taraOpen && taraHistory.length === 0) setTaraHistory([]) }}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors
            ${taraOpen ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'}`}
        >
          {taraOpen ? 'close tara' : 'ask tara'}
        </button>
        <button
          onClick={() => setReplyOpen(!replyOpen)}
          className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          reply on GitHub
        </button>
        <button
          onClick={toggleResolve}
          disabled={resolving}
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ml-auto disabled:opacity-50
            ${resolved
              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-white'
              : 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700'}`}
        >
          {resolved ? '✓ resolved' : 'resolve'}
        </button>
      </div>

      {/* Reply on GitHub */}
      {replyOpen && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply to post on GitHub…"
            rows={3}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg resize-y
              focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={postReply}
              disabled={postingSending || !replyText.trim()}
              className="text-xs px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {postingSending ? 'posting…' : 'post reply'}
            </button>
            <button
              onClick={() => { setReplyOpen(false); setReplyText('') }}
              className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* Tara discussion */}
      {taraOpen && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="px-3 pt-2 pb-1">
            <p className="text-xs text-gray-400 italic">
              tara has full context of this thread — ask anything.
            </p>
          </div>
          <div className="px-3 py-2 max-h-64 overflow-y-auto">
            {taraHistory.length === 0 && !taraLoading && (
              <p className="text-xs text-gray-400 text-center italic py-2">
                e.g. "is this concern valid?", "how should i address this?", "what does line 703 actually do?"
              </p>
            )}
            {taraHistory.map((m, i) => <TaraMessage key={i} msg={m} />)}
            {taraLoading && (
              <div className="flex justify-start mb-2">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400 animate-pulse">tara is thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {taraError && (
            <p className="px-3 pb-1 text-xs text-red-500">{taraError}</p>
          )}
          <div className="px-3 pb-3 pt-1">
            <textarea
              value={taraInput}
              onChange={(e) => setTaraInput(e.target.value)}
              onKeyDown={handleTaraKey}
              placeholder="ask tara about this thread… (Enter to send)"
              rows={2}
              className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg resize-none
                focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              onClick={askTara}
              disabled={taraLoading || !taraInput.trim()}
              className="mt-1 w-full py-1 bg-gray-900 text-white text-xs rounded-lg
                hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ThreadsPanel({ threads, onReply, onRefresh }) {
  const [error, setError] = useState(null)

  const handleReply = async (threadId, body) => {
    setError(null)
    try {
      await onReply(threadId, body)
    } catch (err) {
      setError(err.message)
    }
  }

  const grouped = groupThreads(threads || [])
  const reviewGroups = grouped.filter((g) => g.root.type === 'REVIEW_COMMENT')
  const issueGroups = grouped.filter((g) => g.root.type === 'ISSUE_COMMENT')

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-sm font-semibold text-gray-900">
          Threads ({grouped.length})
        </h2>
        <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600 underline">
          refresh
        </button>
      </div>

      {error && <p className="mx-4 mt-3 text-xs text-red-500">{error}</p>}

      <div className="p-4">
        {grouped.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-8">no comments on this PR yet.</p>
        )}

        {issueGroups.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">PR comments</p>
            {issueGroups.map((g) => (
              <ThreadCard key={g.root.id} group={g} onPostReply={handleReply} />
            ))}
          </div>
        )}

        {reviewGroups.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">inline review comments</p>
            {reviewGroups.map((g) => (
              <ThreadCard key={g.root.id} group={g} onPostReply={handleReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
