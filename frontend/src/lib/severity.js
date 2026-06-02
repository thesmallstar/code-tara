export const SEVERITY_LEVELS = [
  { value: 'critical', rank: 4, bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
  { value: 'high',     rank: 3, bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { value: 'medium',   rank: 2, bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  { value: 'low',      rank: 1, bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200'   },
]

export function severityClasses(value) {
  const found = SEVERITY_LEVELS.find((s) => s.value === value)
  return found ? `${found.bg} ${found.text}` : 'bg-gray-100 text-gray-600'
}

export function severityRank(value) {
  const found = SEVERITY_LEVELS.find((s) => s.value === value)
  return found ? found.rank : 0
}

export function sortBySeverity(drafts) {
  return [...drafts].sort((a, b) => {
    const diff = severityRank(b.severity) - severityRank(a.severity)
    if (diff !== 0) return diff
    if (a.path !== b.path) return (a.path || '').localeCompare(b.path || '')
    return (a.line ?? 0) - (b.line ?? 0)
  })
}
