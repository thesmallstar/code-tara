import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

function PromptCard({ prompt, onSave, onReset }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(prompt.text)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { setText(prompt.text) }, [prompt.text])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(prompt.key, text)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const defaultText = await onReset(prompt.key)
      setText(defaultText)
      setEditing(false)
    } finally {
      setResetting(false)
    }
  }

  const handleCancel = () => {
    setText(prompt.text)
    setEditing(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{prompt.label}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{prompt.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {prompt.is_custom && (
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">customized</span>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="w-full text-sm mono px-3 py-2 border border-gray-300 rounded-lg resize-y
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || text === prompt.text}
                className="text-xs px-4 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="text-xs px-4 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {prompt.is_custom && (
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs px-4 py-1.5 border border-red-200 text-red-500 rounded-md hover:bg-red-50 ml-auto
                    disabled:opacity-40"
                >
                  {resetting ? 'Resetting…' : 'Reset to default'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <pre className="text-xs mono text-gray-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {prompt.text}
          </pre>
        )}
      </div>
    </div>
  )
}

export default function Prompts() {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getPrompts()
      .then(setPrompts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (key, text) => {
    await api.updatePrompt(key, text)
    setPrompts((prev) =>
      prev.map((p) => p.key === key ? { ...p, text, is_custom: true } : p)
    )
  }

  const handleReset = async (key) => {
    const result = await api.resetPrompt(key)
    setPrompts((prev) =>
      prev.map((p) => p.key === key ? { ...p, text: result.text, is_custom: false } : p)
    )
    return result.text
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-600 mono"
          >
            ← code-tara
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Prompts</h1>
        </div>
        <p className="text-xs text-gray-400">
          Customize what tara says to the AI. JSON schemas and output formats are locked.
        </p>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading && (
          <p className="text-sm text-gray-400 animate-pulse text-center py-10">Loading prompts…</p>
        )}
        {error && (
          <p className="text-sm text-red-500 text-center py-10">{error}</p>
        )}
        {prompts.map((p) => (
          <PromptCard key={p.key} prompt={p} onSave={handleSave} onReset={handleReset} />
        ))}
      </div>
    </div>
  )
}
