import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../lib/api'
import { COMMENT_LABELS, labelClasses } from '../lib/labels'

function parsePatch(patch) {
  if (!patch) return []
  const lines = []
  let oldLine = 0
  let newLine = 0

  for (const raw of patch.split('\n')) {
    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/)
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10)
      newLine = parseInt(hunkMatch[2], 10)
      lines.push({ type: 'hunk', content: raw, oldLine: null, newLine: null })
      continue
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      lines.push({ type: 'addition', content: raw.slice(1), oldLine: null, newLine: newLine++ })
    } else if (raw.startsWith('-') && !raw.startsWith('---')) {
      lines.push({ type: 'deletion', content: raw.slice(1), oldLine: oldLine++, newLine: null })
    } else {
      const content = raw.startsWith(' ') ? raw.slice(1) : raw
      lines.push({ type: 'context', content, oldLine: oldLine++, newLine: newLine++ })
    }
  }
  return lines
}

function InlineDraftPopover({ draft, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(draft.body_md || '')
  const [label, setLabel] = useState(draft.label || null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateDraft(draft.id, { body_md: body, label })
      onUpdate()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    setSaving(true)
    try {
      await api.sendDraft(draft.id)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.deleteDraft(draft.id)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <div className="mx-12 my-1 border border-blue-200 rounded-lg bg-blue-50/50 shadow-sm">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-blue-700">tara's draft</span>
              {draft.label && !editing && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${labelClasses(draft.label)}`}>
                  {draft.label}
                </span>
              )}
              {draft.status === 'SENT' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">sent</span>
              )}
              <span className="text-xs mono text-gray-400 ml-auto">:{draft.line}</span>
            </div>

            {editing ? (
              <div className="space-y-2 mt-1">
                <div className="flex items-center gap-1 flex-wrap">
                  {COMMENT_LABELS.map(({ value }) => (
                    <button
                      key={value}
                      onClick={() => setLabel(label === value ? null : value)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors
                        ${label === value
                          ? `${labelClasses(value)} border-transparent ring-1 ring-offset-1 ring-gray-400`
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full text-xs mono px-2 py-1.5 border border-gray-300 rounded resize-y
                    focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="text-xs px-3 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => { setBody(draft.body_md || ''); setLabel(draft.label || null); setEditing(false) }}
                    className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="prose prose-sm text-xs text-gray-700">
                  <ReactMarkdown>{draft.body_md}</ReactMarkdown>
                </div>
                {draft.status === 'DRAFT' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSend} disabled={saving}
                      className="text-xs px-2.5 py-1 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50">
                      Send to GitHub
                    </button>
                    <button onClick={() => setEditing(true)}
                      className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={handleDelete} disabled={saving}
                      className="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

function DiffLineRow({ line, commentableLine, onCommentClick, draftsForLine, expandedLines, onToggleDraft, onDraftUpdate, isHighlighted, filePath }) {
  const isCommentable = commentableLine && line.newLine !== null
  const hasDraft = draftsForLine && draftsForLine.length > 0
  const isExpanded = hasDraft && expandedLines?.has(line.newLine)
  const lineId = line.newLine !== null ? `diff-${filePath}-${line.newLine}` : undefined

  return (
    <>
      <tr
        id={lineId}
        className={`group ${
          line.type === 'addition' ? 'diff-addition' :
          line.type === 'deletion' ? 'diff-deletion' :
          line.type === 'hunk'     ? 'diff-hunk' :
          'diff-context'
        } ${isHighlighted ? 'diff-highlight' : ''}`}
      >
        <td className="select-none px-3 text-right w-12 border-r border-gray-200 text-gray-400 text-xs mono">
          {line.oldLine ?? ''}
        </td>
        <td className="select-none px-3 text-right w-12 border-r border-gray-200 text-gray-400 text-xs mono">
          {line.newLine ?? ''}
        </td>
        <td className="px-1 w-5 select-none text-center">
          {hasDraft ? (
            <button
              onClick={() => onToggleDraft(line.newLine)}
              title={`${draftsForLine.length} draft comment${draftsForLine.length > 1 ? 's' : ''} — click to ${isExpanded ? 'collapse' : 'expand'}`}
              className={`text-sm leading-none transition-colors ${isExpanded ? 'text-blue-600' : 'text-blue-400 hover:text-blue-600'}`}
            >
              💬
            </button>
          ) : (
            line.type === 'addition' ? '+' : line.type === 'deletion' ? '−' : ''
          )}
        </td>
        <td className={`px-3 py-0.5 text-xs mono whitespace-pre w-full ${hasDraft ? 'bg-blue-50/30' : ''}`}>
          {line.content}
        </td>
        {onCommentClick && isCommentable && (
          <td className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCommentClick(line)}
              title="Add comment on this line"
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              +
            </button>
          </td>
        )}
      </tr>
      {isExpanded && draftsForLine.map((draft) => (
        <InlineDraftPopover key={draft.id} draft={draft} onUpdate={onDraftUpdate} />
      ))}
    </>
  )
}

function FileDiff({ path, patch, lineMap, onAddComment, drafts, onDraftUpdate, highlightedLine }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedLines, setExpandedLines] = useState(new Set())
  const lines = parsePatch(patch)
  const commentableSet = new Set(lineMap || [])

  const draftsByLine = {}
  for (const d of drafts) {
    ;(draftsByLine[d.line] = draftsByLine[d.line] || []).push(d)
  }

  const draftCount = drafts.length

  const toggleDraft = (lineNum) => {
    setExpandedLines((prev) => {
      const next = new Set(prev)
      if (next.has(lineNum)) next.delete(lineNum)
      else next.add(lineNum)
      return next
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm mono text-gray-700 font-medium">{path}</span>
          {draftCount > 0 && (
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              💬 {draftCount}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {lines.map((line, i) => (
                <DiffLineRow
                  key={i}
                  line={line}
                  commentableLine={commentableSet.has(line.newLine)}
                  onCommentClick={onAddComment ? (l) => onAddComment(path, l) : null}
                  draftsForLine={line.newLine !== null ? draftsByLine[line.newLine] : null}
                  expandedLines={expandedLines}
                  onToggleDraft={toggleDraft}
                  onDraftUpdate={onDraftUpdate}
                  filePath={path}
                  isHighlighted={highlightedLine && highlightedLine.path === path && highlightedLine.line === line.newLine}
                />
              ))}
            </tbody>
          </table>
          {lines.length === 0 && (
            <p className="text-xs text-gray-400 px-4 py-3 italic">No diff available for this file.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiffView({ diffContent, lineMap, onAddComment, drafts, onDraftUpdate, highlightedLine }) {
  const entries = Object.entries(diffContent || {})
  if (!entries.length) {
    return <p className="text-sm text-gray-400 italic">No diff content available.</p>
  }

  const draftsByPath = {}
  for (const d of (drafts || [])) {
    ;(draftsByPath[d.path] = draftsByPath[d.path] || []).push(d)
  }

  return (
    <div>
      {entries.map(([path, patch]) => (
        <FileDiff
          key={path}
          path={path}
          patch={patch}
          lineMap={lineMap?.[path]}
          onAddComment={onAddComment}
          drafts={draftsByPath[path] || []}
          onDraftUpdate={onDraftUpdate}
          highlightedLine={highlightedLine}
        />
      ))}
    </div>
  )
}
