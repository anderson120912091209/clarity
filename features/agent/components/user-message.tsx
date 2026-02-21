'use client'

interface UserMessageProps {
  content: string
  timestamp?: number
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[92%] rounded-2xl bg-[#40414f] px-4 py-3 text-[15px] leading-7 text-zinc-100">
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
