import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../lib/api'
import StatusBadge from './StatusBadge'
import { COMMENT_LABELS, labelClasses } from '../lib/labels'
import { SEVERITY_LEVELS, severityClasses, sortBySeverity } from '../lib/severity'

function LabelPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {COMMENT_LABELS.map(({ value: v }) => (
        <button
          key={v}
          onClick={() => onChange(value === v ? null : v)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors
            ${value === v
              ? `${labelClasses(v)} border-transparent ring-1 ring-offset-1 ring-gray-400`
              : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

function SeverityPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {SEVERITY_LEVELS.map(({ value: v }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors
            ${value === v
              ? `${severityClasses(v)} border-transparent ring-1 ring-offset-1 ring-gray-400`
              : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function DraftRow({ draft, onSend, onDelete, onEdit, onLocate, isSending }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(draft.body_md || '')
  const [label, setLabel] = useState(draft.label || null)
  const [severity, setSeverity] = useState(draft.severity || 'high')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.updateDraft(draft.id, { body_md: body, label, severity })
      onEdit({ ...draft, body_md: body, label, severity })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setEditing(false)
    setBody(draft.body_md || '')
    setLabel(draft.label || null)
    setSeverity(draft.severity || 'high')
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-2 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0 space-y-1">
          <button
            onClick={() => onLocate && onLocate(draft.path, draft.line)}
            className="text-xs mono text-blue-500 hover:text-blue-700 hover:underline block text-left"
          >
            <span className="break-all">{draft.path}</span>
            <span>:{draft.line}</span>
          </button>
          {!editing && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {draft.severity && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${severityClasses(draft.severity)}`}>
                  {draft.severity}
                </span>
              )}
              {draft.label && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${labelClasses(draft.label)}`}>
                  {draft.label}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={draft.status} />
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <SeverityPicker value={severity} onChange={setSeverity} />
          <LabelPicker value={label} onChange={setLabel} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded mono resize-y
              focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={cancel}
              className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm text-xs text-gray-700 mb-3 overflow-hidden break-words">
          <ReactMarkdown>{draft.body_md}</ReactMarkdown>
        </div>
      )}

      {draft.status === 'DRAFT' && !editing && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onSend(draft.id)}
            disabled={isSending}
            className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isSending && <Spinner />}
            {isSending ? 'Sending…' : 'Send to GitHub'}
          </button>
          <button
            onClick={() => setEditing(true)}
            disabled={isSending}
            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(draft.id)}
            disabled={isSending}
            className="text-xs px-3 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function DraftComments({ chunkId, trigger, onLocate }) {
  const [drafts, setDrafts] = useState([])
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(null)

  const load = () => {
    if (!chunkId) return
    api.getDrafts(chunkId).then((d) => setDrafts(sortBySeverity(d))).catch(() => {})
  }

  useEffect(load, [chunkId, trigger])

  const handleSend = async (draftId) => {
    setSending(draftId)
    setError(null)
    try {
      const updated = await api.sendDraft(draftId)
      setDrafts((prev) => sortBySeverity(prev.map((d) => (d.id === draftId ? updated : d))))
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (draftId) => {
    try {
      await api.deleteDraft(draftId)
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (updated) => {
    setDrafts((prev) => sortBySeverity(prev.map((d) => (d.id === updated.id ? updated : d))))
  }

  if (!chunkId) return null

  return (
    <div>
      <div className="px-3 py-2 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          tara's drafts ({drafts.length})
        </h3>
      </div>
      <div className="p-3">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        {drafts.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            tara hasn't drafted anything yet — comments will appear here after review.
          </p>
        ) : (
          drafts.map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              onSend={handleSend}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onLocate={onLocate}
              isSending={sending === d.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
