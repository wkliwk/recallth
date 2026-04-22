function renderInline(text, baseKey = 0) {
  const parts = []
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g
  let last = 0
  let k = baseKey
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const m = match[0]
    if (m.startsWith('**')) parts.push(<strong key={k++}>{m.slice(2, -2)}</strong>)
    else if (m.startsWith('*')) parts.push(<em key={k++}>{m.slice(1, -1)}</em>)
    else if (m.startsWith('`')) parts.push(<code key={k++} className="bg-ink1/10 px-[3px] rounded text-[11.5px] font-mono">{m.slice(1, -1)}</code>)
    last = match.index + m.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const nodes = []
  let listItems = [] // { depth, ordered, text }
  let k = 0

  function isListLine(line) {
    return /^\s*[-*] /.test(line) || /^\s*\d+\. /.test(line)
  }

  function parseListItem(line) {
    const indent = line.match(/^(\s*)/)[1].length
    const ordered = /^\s*\d+\. /.test(line)
    const text = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')
    return { depth: indent, ordered, text }
  }

  function buildList(items) {
    if (!items.length) return null
    const root = []
    const stack = [{ depth: -1, children: root }]

    for (const item of items) {
      const node = { text: item.text, ordered: item.ordered, children: [] }
      while (stack.length > 1 && stack[stack.length - 1].depth >= item.depth) {
        stack.pop()
      }
      stack[stack.length - 1].children.push(node)
      stack.push({ depth: item.depth, children: node.children })
    }

    function toReact(children, parentOrdered) {
      if (!children.length) return null
      const Tag = parentOrdered ? 'ol' : 'ul'
      const cls = parentOrdered
        ? 'list-decimal pl-5 my-0.5 space-y-0.5'
        : 'list-disc pl-5 my-0.5 space-y-0.5'
      return (
        <Tag key={k++} className={cls}>
          {children.map((n, i) => (
            <li key={i}>
              {renderInline(n.text, i * 100)}
              {n.children.length > 0 && toReact(n.children, n.children[0].ordered)}
            </li>
          ))}
        </Tag>
      )
    }

    return toReact(root, root[0]?.ordered)
  }

  function flushList() {
    if (!listItems.length) return
    const node = buildList(listItems)
    if (node) nodes.push(node)
    listItems = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '' || trimmed === '---' || trimmed === '___') {
      flushList()
      continue
    }
    if (trimmed.startsWith('### ')) {
      flushList()
      nodes.push(<p key={k++} className="font-semibold text-[13px] mt-2 mb-0.5 leading-snug">{renderInline(trimmed.slice(4), k * 100)}</p>)
    } else if (trimmed.startsWith('## ')) {
      flushList()
      nodes.push(<p key={k++} className="font-semibold text-[13.5px] mt-2 mb-0.5 leading-snug">{renderInline(trimmed.slice(3), k * 100)}</p>)
    } else if (trimmed.startsWith('# ')) {
      flushList()
      nodes.push(<p key={k++} className="font-bold text-[14px] mt-2 mb-0.5 leading-snug">{renderInline(trimmed.slice(2), k * 100)}</p>)
    } else if (isListLine(line)) {
      listItems.push(parseListItem(line))
    } else {
      flushList()
      nodes.push(<p key={k++} className="leading-[1.55]">{renderInline(trimmed, k * 100)}</p>)
    }
  }
  flushList()
  return <div className="flex flex-col gap-[3px]">{nodes}</div>
}
