'use server'

import { chat as chatImpl, generate as generateImpl } from '@/features/agent/services/chat-api'
import type { ChatMessage } from '@/features/agent/types/chat.types'

// Wrapper functions for backward compatibility
export async function chat(messages: ChatMessage[], context: string) {
  return chatImpl(messages, context)
}

export async function generate(input: string) {
  return generateImpl(input)
}
