import { chat, generate } from '@/app/actions'
import { readStreamableValue } from 'ai/rsc'

export const chatService = {
  chat: async (messages: any[], fileContent: string) => {
    return chat(messages, fileContent)
  },
  
  generate: async (prompt: string) => {
    return generate(prompt)
  },

  readStream: (stream: any) => {
    return readStreamableValue(stream)
  }
}
