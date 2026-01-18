'use client';

import { useMemo } from 'react';
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
 * Get language from file path extension
 */
function getLanguageFromPath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    css: 'css', scss: 'css', html: 'html', json: 'json', md: 'markdown',
    sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml', sql: 'sql',
  };
  return langMap[ext];
}

/**
 * Post-process highlighted TypeScript/JavaScript code
 * to add colors for patterns that highlight.js doesn't catch
 */
function enhanceTypeScriptHighlighting(html: string, language?: string): string {
  if (!language || !['typescript', 'ts', 'tsx', 'javascript', 'js', 'jsx'].includes(language)) {
    return html;
  }

  let result = html;

  // Type annotations - match PascalCase after : that are not already wrapped
  result = result.replace(
    /(:(?:\s*)(?:<[^>]*>)?(?:\s*))([A-Z][a-zA-Z0-9_]*(?:\[\])?)/g,
    (match, prefix, typeName) => {
      if (prefix.includes('hljs-')) return match;
      return `${prefix}<span class="hljs-type">${typeName}</span>`;
    }
  );

  // Generic type parameters: <TypeName, AnotherType>
  result = result.replace(
    /(&lt;)([A-Z][a-zA-Z0-9_,\s]*?)(&gt;)/g,
    (match, open, types, close) => {
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
  result = result.replace(
    /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\??:)/gm,
    (match, indent, propName, colon) => {
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
    return escapeHtml(code);
  }

  try {
    const result = hljs.highlight(code, { language, ignoreIllegals: true });
    return enhanceTypeScriptHighlighting(result.value, language);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

interface DiffViewProps {
  oldText: string;
  newText: string;
  filePath?: string;
  className?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

// Simple diff algorithm for showing changes
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Find longest common subsequence to identify unchanged lines
  const lcs = findLCS(oldLines, newLines);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      // Context line (unchanged)
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        result.push({
          type: 'context',
          content: oldLines[oldIdx],
          oldLineNum: oldIdx + 1,
          newLineNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else {
        // New line added before this context
        result.push({
          type: 'added',
          content: newLines[newIdx],
          newLineNum: newIdx + 1,
        });
        newIdx++;
      }
    } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
      // Line removed
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        oldLineNum: oldIdx + 1,
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // Line added
      result.push({
        type: 'added',
        content: newLines[newIdx],
        newLineNum: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

// Find longest common subsequence
function findLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function DiffView({ oldText, newText, filePath, className }: DiffViewProps) {
  const diffLines = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);
  const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);

  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    return { added, removed };
  }, [diffLines]);

  return (
    <div className={cn('rounded-md border border-border overflow-hidden text-xs font-mono w-full max-w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border w-full">
        <span className="text-muted-foreground truncate min-w-0 flex-1">{filePath || 'changes'}</span>
        <div className="flex items-center gap-2 text-[11px] shrink-0">
          {stats.added > 0 && (
            <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
          )}
          {stats.removed > 0 && (
            <span className="text-red-600 dark:text-red-400">-{stats.removed}</span>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="overflow-x-auto max-h-64 w-full max-w-full">
        <table className="w-full border-collapse">
          <tbody>
            {diffLines.map((line, idx) => {
              const highlightedContent = language && line.content
                ? highlightCode(line.content, language)
                : escapeHtml(line.content || '');

              return (
                <tr
                  key={idx}
                  className={cn(
                    line.type === 'added' && 'diff-row-added',
                    line.type === 'removed' && 'diff-row-removed'
                  )}
                >
                  {/* Line number - single column */}
                  <td className="select-none text-right px-2 py-0 text-muted-foreground/50 border-r border-border/30 w-8 align-top">
                    {line.newLineNum || line.oldLineNum || ''}
                  </td>

                  {/* Change indicator */}
                  <td className={cn(
                    'select-none px-1 py-0 w-4 text-center align-top',
                    line.type === 'added' && 'text-green-600 dark:text-green-400',
                    line.type === 'removed' && 'text-red-600 dark:text-red-400'
                  )}>
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </td>

                  {/* Content with syntax highlighting */}
                  <td className={cn(
                    'px-2 py-0 whitespace-pre-wrap break-all',
                    line.type === 'added' && 'diff-added',
                    line.type === 'removed' && 'diff-removed'
                  )}>
                    {line.content ? (
                      <span dangerouslySetInnerHTML={{ __html: highlightedContent }} />
                    ) : (
                      '\u00A0'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
