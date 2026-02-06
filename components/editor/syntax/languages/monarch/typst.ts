import type { languages } from 'monaco-editor'

export const typstMonarchLanguage: languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      [/#(let|set|show|if|else|for|in|while|import|include|as|where|return|break|continue)\b/, 'keyword'],
      [/#([A-Za-z_][\w-]*)/, 'keyword'],

      [/\b(true|false|none|auto)\b/, 'constant.language'],
      [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, 'number'],

      [/"/, 'string', '@string'],

      [/[{}[\]()]/, '@brackets'],
      [/[,.;]/, 'delimiter'],
      [/[+\-*/%=!<>:&|?]+/, 'operator'],

      [/[A-Za-z_][\w-]*/, 'identifier'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
}
