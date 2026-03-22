import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })

let idCounter = 0

export default function Mermaid({ chart }) {
  const ref = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chart?.trim()) return
    const id = `mermaid-${idCounter++}`
    mermaid.render(id, chart.trim())
      .then(({ svg }) => { setSvg(svg); setError(null) })
      .catch(() => setError(true))
  }, [chart])

  if (error) {
    return (
      <pre className="text-xs mono bg-gray-100 p-3 rounded-lg overflow-x-auto text-gray-600">
        {chart}
      </pre>
    )
  }

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} className="my-2 overflow-x-auto" />
}
