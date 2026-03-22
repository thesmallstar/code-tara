import ReactMarkdown from 'react-markdown'
import Mermaid from './Mermaid'

function CodeBlock({ node, className, children, ...props }) {
  const isInline = !className && node?.position?.start?.line === node?.position?.end?.line

  if (isInline) {
    return <code {...props}>{children}</code>
  }

  const lang = className?.replace('language-', '')
  const code = String(children).replace(/\n$/, '')

  if (lang === 'mermaid') {
    return <Mermaid chart={code} />
  }

  return (
    <pre className={className}>
      <code>{children}</code>
    </pre>
  )
}

export default function MarkdownWithMermaid({ children }) {
  return (
    <ReactMarkdown components={{ code: CodeBlock }}>
      {children}
    </ReactMarkdown>
  )
}
