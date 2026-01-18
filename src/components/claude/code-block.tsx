'use client';

import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
// Custom syntax highlighting theme in globals.css - no need for github-dark.css

// Register languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

/**
 * Post-process highlighted TypeScript/JavaScript code
 * to add colors for patterns that highlight.js doesn't catch
 */
function enhanceTypeScriptHighlighting(html: string, language?: string): string {
  if (!language || !['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'].includes(language)) {
    return html;
  }

  // Don't process if already wrapped in span (avoid double processing)
  // Pattern: Type names after : or extends or implements (PascalCase identifiers)
  // Match: `: TypeName` or `<TypeName>` or `extends TypeName`
  let result = html;

  // Type annotations - match PascalCase after : that are not already wrapped
  // Example: fetchPlugins: () => Promise<Plugin[]>
  // Match type names like Plugin[], Promise<>, etc.
  result = result.replace(
    /(:(?:\s*)(?:<[^>]*>)?(?:\s*))([A-Z][a-zA-Z0-9_]*(?:\[\])?)/g,
    (match, prefix, typeName) => {
      // Don't re-wrap if already in a span
      if (prefix.includes('hljs-')) return match;
      return `${prefix}<span class="hljs-type">${typeName}</span>`;
    }
  );

  // Generic type parameters: <TypeName, AnotherType>
  result = result.replace(
    /(&lt;)([A-Z][a-zA-Z0-9_,\s]*?)(&gt;)/g,
    (match, open, types, close) => {
      // Split by comma and wrap each type
      const wrappedTypes = types.split(',').map((t: string) => {
        const trimmed = t.trim();
        if (trimmed.match(/^[A-Z][a-zA-Z0-9_]*$/)) {
          return `<span class="hljs-type">${trimmed}</span>`;
        }
        return trimmed;
      }).join(', ');
      return `${open}${wrappedTypes}${close}`;
    }
  );

  // Interface/Type property names (identifier followed by : or ?)
  // But avoid matching things already in spans
  result = result.replace(
    /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\??:)/gm,
    (match, indent, propName, colon) => {
      // Don't wrap keywords
      const keywords = ['if', 'else', 'for', 'while', 'return', 'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'export', 'import', 'from', 'default', 'extends', 'implements'];
      if (keywords.includes(propName)) return match;
      return `${indent}<span class="hljs-property">${propName}</span>${colon}`;
    }
  );

  return result;
}

/**
 * Syntax highlighting using highlight.js
 */
function highlightCode(code: string, language?: string): string {
  if (!language) {
    // Try auto-detection
    try {
      const result = hljs.highlightAuto(code);
      return result.value;
    } catch {
      return escapeHtml(code);
    }
  }

  try {
    const result = hljs.highlight(code, { language, ignoreIllegals: true });
    // Apply TypeScript enhancements
    return enhanceTypeScriptHighlighting(result.value, language);
  } catch {
    // Fallback: try auto-detection
    try {
      const result = hljs.highlightAuto(code);
      return result.value;
    } catch {
      return escapeHtml(code);
    }
  }
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Memoize highlighted code to avoid re-highlighting on every render
  const highlightedCode = useMemo(() => {
    return highlightCode(code, language);
  }, [code, language]);

  return (
    <div className={cn('relative group rounded-md overflow-hidden border border-border w-full max-w-full', className)}>
      {/* Header with language label and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border w-full">
        <span className="text-xs font-mono text-muted-foreground">
          {language || 'text'}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      </div>
      <pre className="p-3 bg-muted/30 text-[13px] leading-relaxed whitespace-pre-wrap break-words font-mono w-full max-w-full overflow-x-auto">
        <code
          className={cn('hljs', language ? `language-${language}` : '')}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}
