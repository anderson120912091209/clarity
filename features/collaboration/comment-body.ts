import type { CommentBody } from '@liveblocks/client'

const MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g

export function createPlainTextCommentBody(text: string): CommentBody {
  return {
    version: 1,
    content: [
      {
        type: 'paragraph',
        children: [
          {
            text,
          },
        ],
      },
    ],
  }
}

export function extractMentionHandles(text: string): string[] {
  const handles = new Set<string>()
  let match: RegExpExecArray | null = null

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const handle = match[1]?.trim()
    if (!handle) continue
    handles.add(handle.toLowerCase())
  }

  return Array.from(handles)
}

