/**
 * Coloration syntaxique bash — sans dépendance externe.
 * Utilise un tokenizer par règles regex pour reconnaître les constructions
 * bash courantes (mots-clés, builtins, variables, chaînes, commentaires...).
 */
type Token = { type: string; value: string }

const TOKEN_COLORS: Record<string, string> = {
  comment:  '#6a9955',
  string:   '#ce9178',
  keyword:  '#c586c0',
  builtin:  '#4ec9b0',
  variable: '#9cdcfe',
  number:   '#b5cea8',
  operator: '#d4d4d4',
  text:     '#d4d4d4',
}

const TOKEN_RULES: Array<{ type: string; regex: RegExp }> = [
  { type: 'comment',  regex: /^#.*/ },
  { type: 'string',   regex: /^"(?:[^"\\]|\\.)*"|^'[^']*'/ },
  { type: 'keyword',  regex: /^(?:if|then|else|elif|fi|for|while|do|done|in|case|esac|function|return|exit|local|export|readonly|declare|unset|shift|break|continue|source|\.)(?=\s|$|;|\|)/ },
  { type: 'builtin',  regex: /^(?:echo|printf|read|cd|pwd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|find|chmod|chown|test|true|false|set|unset|env|exec|eval|trap|wait|jobs|kill|bg|fg|type|which|alias|unalias|getopts)(?=\s|$|;|\(|\|)/ },
  { type: 'variable', regex: /^\$(?:\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9#@*?$!-])/ },
  { type: 'number',   regex: /^-?\b[0-9]+\b/ },
  { type: 'operator', regex: /^(?:&&|\|\||>>|<<|[|;&><!()[\]{}])/ },
  { type: 'text',     regex: /^[^\n#"'$|;&><!()[\]{}0-9\\\s][^\n#"'$|;&><!()[\]{}\\\s]*|^\s+|^\\.|^./ },
]

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let remaining = line
  while (remaining.length > 0) {
    let matched = false
    for (const rule of TOKEN_RULES) {
      const m = remaining.match(rule.regex)
      if (m) {
        tokens.push({ type: rule.type, value: m[0] })
        remaining = remaining.slice(m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] })
      remaining = remaining.slice(1)
    }
  }
  return tokens
}

/**
 * Colore syntaxiquement une seule ligne de code bash.
 *
 * @param line - Ligne de code brute.
 * @returns Tableau de nœuds React `<span>` colorés par type de token.
 */
export function highlightBashLine(line: string): React.ReactNode[] {
  return tokenizeLine(line).map((tok, i) => (
    <span key={i} style={{ color: TOKEN_COLORS[tok.type] ?? '#d4d4d4' }}>{tok.value}</span>
  ))
}

/**
 * Colore syntaxiquement un bloc de code bash multi-lignes avec numéros de ligne.
 *
 * @param code - Code bash complet (peut contenir des `\n`).
 * @returns Nœud React affichant chaque ligne numérotée et colorée.
 */
export function highlightBashWithLines(code: string): React.ReactNode {
  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length
  return lines.map((line, i) => (
    <div key={i} style={{ display: 'flex', minHeight: '1.6em' }}>
      <span style={{
        display: 'inline-block',
        minWidth: `${Math.max(lineNumberWidth, 2)}ch`,
        paddingRight: '16px',
        textAlign: 'right',
        color: '#4a5568',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {i + 1}
      </span>
      <span style={{ flex: 1 }}>
        {highlightBashLine(line).length > 0 ? highlightBashLine(line) : '\u00A0'}
      </span>
    </div>
  ))
}
