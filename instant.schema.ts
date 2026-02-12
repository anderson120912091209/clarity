// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/core'

const _schema = i.schema({
  // Schema includes project files plus AI chat/thread persistence entities.
  // Take a look at this schema, and if everything looks good,
  // run `push schema` again to enforce the types.
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    files: i.entity({
      content: i.string().optional(),
      created_at: i.string().optional(),
      isExpanded: i.any().optional(),
      isOpen: i.boolean().optional(),
      main_file: i.boolean().optional(),
      name: i.string().optional(),
      parent_id: i.any().optional(),
      pathname: i.string().optional(),
      projectId: i.string().optional(),
      type: i.string().optional(),
      url: i.string().optional(),
      user_id: i.string().optional(),
    }),
    projects: i.entity({
      created_at: i.string().optional(),
      document_class: i.string().optional(),
      last_compiled: i.string().optional(),
      page_count: i.number().optional(),
      pdfBackgroundTheme: i.string().optional(),
      project_content: i.string().optional(),
      template: i.string().optional(),
      title: i.string().optional(),
      user_id: i.string().optional(),
      word_count: i.number().optional(),
      activeFileId: i.string().optional(),
      activeChatThreadId: i.string().optional(),
    }),
    ai_threads: i.entity({
      projectId: i.string().indexed().optional(),
      user_id: i.string().indexed().optional(),
      title: i.string().optional(),
      status: i.string().indexed().optional(), // active | archived
      lastMessagePreview: i.string().optional(),
      lastMessageAt: i.string().indexed().optional(),
      summary: i.string().optional(),
      summaryVersion: i.number().optional(),
      created_at: i.string().indexed().optional(),
      updated_at: i.string().indexed().optional(),
    }),
    ai_messages: i.entity({
      threadId: i.string().indexed().optional(),
      projectId: i.string().indexed().optional(),
      user_id: i.string().indexed().optional(),
      role: i.string().indexed().optional(), // system | user | assistant | tool
      content: i.string().optional(),
      seq: i.number().indexed().optional(),
      status: i.string().indexed().optional(), // completed | error | interrupted | streaming
      error: i.string().optional(),
      sourceMessageId: i.string().optional(),
      tokenEstimate: i.number().optional(),
      created_at: i.string().indexed().optional(),
      updated_at: i.string().indexed().optional(),
    }),
    ai_runs: i.entity({
      threadId: i.string().indexed().optional(),
      messageId: i.string().indexed().optional(),
      user_id: i.string().indexed().optional(),
      requestId: i.string().indexed().optional(),
      status: i.string().indexed().optional(), // streaming | completed | failed | aborted
      model: i.string().optional(),
      started_at: i.string().indexed().optional(),
      ended_at: i.string().optional(),
      failureReason: i.string().optional(),
      created_at: i.string().indexed().optional(),
      updated_at: i.string().indexed().optional(),
    }),
    ai_memory_items: i.entity({
      user_id: i.string().indexed().optional(),
      projectId: i.string().indexed().optional(),
      threadId: i.string().indexed().optional(),
      scope: i.string().indexed().optional(), // user | project | thread
      kind: i.string().indexed().optional(), // preference | fact | constraint | summary
      content: i.string().optional(),
      sourceMessageId: i.string().optional(),
      salience: i.number().optional(), // 0-1
      lastUsedAt: i.string().optional(),
      created_at: i.string().indexed().optional(),
      updated_at: i.string().indexed().optional(),
    }),
    ai_thread_checkpoints: i.entity({
      threadId: i.string().indexed().optional(),
      user_id: i.string().indexed().optional(),
      messageSeq: i.number().indexed().optional(),
      label: i.string().optional(),
      payload: i.any().optional(),
      created_at: i.string().indexed().optional(),
    }),
    users: i.entity({
      app_id: i.string().optional(),
      created_at: i.string().optional(),
      email: i.string().optional(),
      isGuest: i.boolean().optional(),
      refresh_token: i.string().optional(),
      type: i.string().optional(),
      welcome_seed_version: i.number().optional(),
      welcome_seeded_at: i.string().optional(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: '$users',
        has: 'one',
        label: 'linkedPrimaryUser',
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'linkedGuestUsers',
      },
    },
  },
  rooms: {},
})

// This helps Typescript display nicer intellisense
type AppSchema = typeof _schema
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
