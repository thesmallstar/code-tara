import { useState } from 'react'

const CONTEXT_LINES = 3

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

function computeWordDiff(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const m = oldWords.length
  const n = newWords.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const oldMarks = Array(m).fill(false)
  const newMarks = Array(n).fill(false)
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      oldMarks[i - 1] = true
      newMarks[j - 1] = true
      i--; j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return { oldWords, newWords, oldMarks, newMarks }
}

function WordDiffLine({ words, marks, type }) {
  const highlightClass = type === 'deletion'
    ? 'bg-red-200 rounded-sm'
    : 'bg-green-200 rounded-sm'

  return (
    <span>
      {words.map((word, i) => (
        <span key={i} className={marks[i] ? '' : highlightClass}>{word}</span>
      ))}
    </span>
  )
}

function detectModifiedPairs(lines) {
  const pairs = new Map()
  let i = 0
  while (i < lines.length) {
    if (lines[i].type === 'deletion') {
      const delStart = i
      while (i < lines.length && lines[i].type === 'deletion') i++
      const addStart = i
      while (i < lines.length && lines[i].type === 'addition') i++
      const delCount = addStart - delStart
      const addCount = i - addStart
      if (delCount === addCount && delCount > 0) {
        for (let k = 0; k < delCount; k++) {
          pairs.set(delStart + k, addStart + k)
        }
      }
    } else {
      i++
    }
  }
  return pairs
}

function buildCollapsibleGroups(lines) {
  const groups = []
  let contextRun = []
  let contextStart = -1

  const flushContext = () => {
    if (contextRun.length === 0) return
    if (contextRun.length > CONTEXT_LINES * 2) {
      const before = contextRun.slice(0, CONTEXT_LINES)
      const hidden = contextRun.slice(CONTEXT_LINES, contextRun.length - CONTEXT_LINES)
      const after = contextRun.slice(contextRun.length - CONTEXT_LINES)
      before.forEach(idx => groups.push({ type: 'line', index: idx }))
      groups.push({ type: 'collapsed', indices: hidden, startLine: lines[hidden[0]]?.newLine, endLine: lines[hidden[hidden.length - 1]]?.newLine })
      after.forEach(idx => groups.push({ type: 'line', index: idx }))
    } else {
      contextRun.forEach(idx => groups.push({ type: 'line', index: idx }))
    }
    contextRun = []
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type === 'context') {
      contextRun.push(i)
    } else {
      flushContext()
      groups.push({ type: 'line', index: i })
    }
  }
  flushContext()
  return groups
}

function CollapsedBlock({ count, startLine, endLine, onExpand }) {
  return (
    <tr className="bg-gray-50 border-y border-gray-100">
      <td colSpan={5} className="text-center py-1">
        <button
          onClick={onExpand}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ⋯ {count} unchanged lines (lines {startLine}–{endLine}) — click to expand
        </button>
      </td>
    </tr>
  )
}

function DiffLineRow({ line, commentableLine, onCommentClick, wordDiff }) {
  const isCommentable = commentableLine && line.newLine !== null
  return (
    <tr
      className={`group ${
        line.type === 'addition' ? 'diff-addition' :
        line.type === 'deletion' ? 'diff-deletion' :
        line.type === 'hunk'     ? 'diff-hunk' :
        'diff-context'
      }`}
    >
      <td className="select-none px-3 text-right w-12 border-r border-gray-200 text-gray-400 text-xs mono">
        {line.oldLine ?? ''}
      </td>
      <td className="select-none px-3 text-right w-12 border-r border-gray-200 text-gray-400 text-xs mono">
        {line.newLine ?? ''}
      </td>
      <td className="px-1 w-5 select-none text-center">
        {line.type === 'addition' ? '+' : line.type === 'deletion' ? '−' : ''}
      </td>
      <td className="px-3 py-0.5 text-xs mono whitespace-pre w-full">
        {wordDiff ? (
          <WordDiffLine words={wordDiff.words} marks={wordDiff.marks} type={line.type} />
        ) : (
          line.content
        )}
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
  )
}

function FileDiff({ path, patch, lineMap, onAddComment }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedBlocks, setExpandedBlocks] = useState(new Set())
  const lines = parsePatch(patch)
  const commentableSet = new Set(lineMap || [])
  const modifiedPairs = detectModifiedPairs(lines)
  const groups = buildCollapsibleGroups(lines)

  const wordDiffs = new Map()
  for (const [delIdx, addIdx] of modifiedPairs) {
    const diff = computeWordDiff(lines[delIdx].content, lines[addIdx].content)
    wordDiffs.set(delIdx, { words: diff.oldWords, marks: diff.oldMarks })
    wordDiffs.set(addIdx, { words: diff.newWords, marks: diff.newMarks })
  }

  const expandBlock = (blockKey) => {
    setExpandedBlocks(prev => new Set([...prev, blockKey]))
  }

  let blockCounter = 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-sm mono text-gray-700 font-medium">{path}</span>
        <span className="text-xs text-gray-400">{collapsed ? '▶' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {groups.map((group, gi) => {
                if (group.type === 'collapsed') {
                  const key = blockCounter++
                  if (expandedBlocks.has(key)) {
                    return group.indices.map(idx => (
                      <DiffLineRow
                        key={`exp-${idx}`}
                        line={lines[idx]}
                        commentableLine={commentableSet.has(lines[idx].newLine)}
                        onCommentClick={onAddComment ? (l) => onAddComment(path, l) : null}
                      />
                    ))
                  }
                  return (
                    <CollapsedBlock
                      key={`col-${gi}`}
                      count={group.indices.length}
                      startLine={group.startLine}
                      endLine={group.endLine}
                      onExpand={() => expandBlock(key)}
                    />
                  )
                }
                const line = lines[group.index]
                return (
                  <DiffLineRow
                    key={gi}
                    line={line}
                    commentableLine={commentableSet.has(line.newLine)}
                    onCommentClick={onAddComment ? (l) => onAddComment(path, l) : null}
                    wordDiff={wordDiffs.get(group.index)}
                  />
                )
              })}
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

export default function DiffView({ diffContent, lineMap, onAddComment }) {
  const entries = Object.entries(diffContent || {})
  if (!entries.length) {
    return <p className="text-sm text-gray-400 italic">No diff content available.</p>
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
        />
      ))}
    </div>
  )
}
