import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
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

function DiffLineRow({ line, highlightedContent, commentableLine, onCommentClick, draftsForLine, expandedLines, onToggleDraft, onDraftUpdate, isHighlighted, filePath }) {
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
        {highlightedContent ? (
          <td
            className={`px-3 py-0.5 text-xs mono whitespace-pre w-full hljs ${hasDraft ? 'bg-blue-50/30' : ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        ) : (
          <td className={`px-3 py-0.5 text-xs mono whitespace-pre w-full ${hasDraft ? 'bg-blue-50/30' : ''}`}>
            {line.content}
          </td>
        )}
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

const EXT_TO_LANG = {
  py: 'python', ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  go: 'go', rs: 'rust', rb: 'ruby', java: 'java', kt: 'kotlin', swift: 'swift',
  css: 'css', scss: 'scss', html: 'xml', json: 'json', yaml: 'yaml', yml: 'yaml',
  md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash', zsh: 'bash',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp', php: 'php',
  dockerfile: 'dockerfile', toml: 'ini', tf: 'hcl',
}

function inferFileStatus(lines) {
  const hasAddition = lines.some((l) => l.type === 'addition')
  const hasDeletion = lines.some((l) => l.type === 'deletion')
  const hasContext = lines.some((l) => l.type === 'context')
  if (hasAddition && !hasDeletion && !hasContext) return 'added'
  if (hasDeletion && !hasAddition && !hasContext) return 'deleted'
  return 'modified'
}

const FILE_STATUS = {
  added:    { label: 'NEW',     bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  deleted:  { label: 'DELETED', bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-300' },
  modified: { label: 'MODIFIED', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
}

function detectLanguage(filePath) {
  const name = filePath.split('/').pop().toLowerCase()
  if (name === 'dockerfile') return 'dockerfile'
  const ext = name.split('.').pop()
  return EXT_TO_LANG[ext] || null
}

function highlightLines(lines, filePath) {
  const lang = detectLanguage(filePath)
  if (!lang) return null
  const code = lines.map((l) => l.content).join('\n')
  try {
    const result = hljs.highlight(code, { language: lang, ignoreIllegals: true })
    return result.value.split('\n')
  } catch {
    return null
  }
}

function FileDiff({ path, patch, lineMap, onAddComment, drafts, onDraftUpdate, highlightedLine, checked, onToggleChecked, prInfo }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedLines, setExpandedLines] = useState(new Set())
  const lines = parsePatch(patch)
  const highlightedHtml = useMemo(() => highlightLines(lines, path), [patch, path])
  const fileStatus = useMemo(() => inferFileStatus(lines), [lines])
  const status = FILE_STATUS[fileStatus]
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
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100:bg-gray-750"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              e.stopPropagation()
              onToggleChecked(path)
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
          />
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${status.bg} ${status.text} ${status.border}`}>
            {status.label}
          </span>
          <span className={`text-sm mono font-medium ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{path}</span>
          <button
            className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
            title="Copy file name"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(path)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          </button>
          {prInfo?.owner && prInfo?.repo && prInfo?.head_sha && (
            <a
              href={`https://github.com/${prInfo.owner}/${prInfo.repo}/blob/${prInfo.head_sha}/${path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-200 transition-colors"
              title="Open in GitHub"
              onClick={(e) => e.stopPropagation()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
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
                  highlightedContent={highlightedHtml?.[i]}
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

export default function DiffView({ diffContent, lineMap, onAddComment, drafts, onDraftUpdate, highlightedLine, checkedFiles, onToggleChecked, prInfo }) {
  const entries = Object.entries(diffContent || {})
  const checkedSet = new Set(checkedFiles || [])

  if (!entries.length) {
    return <p className="text-sm text-gray-400 italic">No diff content available.</p>
  }

  const draftsByPath = {}
  for (const d of (drafts || [])) {
    ;(draftsByPath[d.path] = draftsByPath[d.path] || []).push(d)
  }

  const checkedCount = checkedSet.size
  const totalCount = entries.length

  return (
    <div>
      {totalCount > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            {checkedCount}/{totalCount} reviewed
          </span>
        </div>
      )}
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
          checked={checkedSet.has(path)}
          onToggleChecked={onToggleChecked}
          prInfo={prInfo}
        />
      ))}
    </div>
  )
}
