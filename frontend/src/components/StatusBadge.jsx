const STATUS_CONFIG = {
  PENDING:     { label: 'tara is waking up…',    color: 'bg-gray-100 text-gray-500', pulse: true },
  SYNCING:     { label: 'tara is reading the PR…', color: 'bg-blue-50 text-blue-700', pulse: true },
  SUMMARIZING: { label: 'tara is summarizing…',  color: 'bg-blue-50 text-blue-700', pulse: true },
  CHUNKING:    { label: 'tara is grouping…',      color: 'bg-blue-50 text-blue-700', pulse: true },
  AI_RUNNING:  { label: 'tara is reviewing…',     color: 'bg-purple-50 text-purple-700', pulse: true },
  READY:       { label: 'Ready',                  color: 'bg-green-50 text-green-700' },
  ERROR:       { label: 'tara ran into trouble',  color: 'bg-red-50 text-red-600' },
  AI_DONE:     { label: 'tara reviewed it',       color: 'bg-green-50 text-green-700' },
  DRAFT:       { label: 'Draft',                  color: 'bg-yellow-50 text-yellow-700' },
  SENT:        { label: 'Sent ✓',                 color: 'bg-green-50 text-green-700' },
}

export default function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${className}`}>
      {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {cfg.label}
    </span>
  )
}
