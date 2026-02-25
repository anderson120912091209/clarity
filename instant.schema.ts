// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react'

const _schema = i.schema({
  // We inferred 55 attributes!
  // Take a look at this schema, and if everything looks good,
  // run `push schema` again to enforce the types.
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    ai_messages: i.entity({
      content: i.string().optional(),
      created_at: i.string().optional(),
      error: i.string().optional(),
      projectId: i.string().optional(),
      role: i.string().optional(),
      seq: i.number().optional(),
      sourceMessageId: i.string().optional(),
      status: i.string().optional(),
      threadId: i.string().optional(),
      tokenEstimate: i.number().optional(),
      updated_at: i.string().optional(),
      user_id: i.string().optional(),
    }),
    ai_runs: i.entity({
      created_at: i.string().optional(),
      ended_at: i.string().optional(),
      failureReason: i.string().optional(),
      messageId: i.string().optional(),
      model: i.string().optional(),
      requestId: i.string().optional(),
      started_at: i.string().optional(),
      status: i.string().optional(),
      threadId: i.string().optional(),
      updated_at: i.string().optional(),
      user_id: i.string().optional(),
    }),
    ai_threads: i.entity({
      created_at: i.string().optional(),
      lastMessageAt: i.string().optional(),
      lastMessagePreview: i.string().optional(),
      projectId: i.string().optional(),
      status: i.string().optional(),
      summary: i.string().optional(),
      summaryVersion: i.number().optional(),
      title: i.string().optional(),
      updated_at: i.string().optional(),
      user_id: i.string().optional(),
    }),
    account_plan_events: i.entity({
      actor_user_id: i.string().optional(),
      changed_at: i.string().optional(),
      from_plan: i.string().optional(),
      note: i.string().optional(),
      source: i.string().optional(),
      to_plan: i.string().optional(),
      user_id: i.string().optional(),
    }),
    account_plans: i.entity({
      created_at: i.string().optional(),
      source: i.string().optional(),
      status: i.string().optional(),
      updated_at: i.string().optional(),
      user_id: i.string().unique().indexed().optional(),
      plan: i.string().optional(),
    }),
    ai_token_usage: i.entity({
      /** The user this usage belongs to */
      user_id: i.string().unique().indexed(),
      /** "YYYY-MM" bucket so usage resets each calendar month */
      period: i.string().indexed(),
      /** Cumulative input tokens consumed this period */
      input_tokens: i.number(),
      /** Cumulative output tokens consumed this period */
      output_tokens: i.number(),
      /** input_tokens + output_tokens (denormalised for fast reads) */
      total_tokens: i.number(),
      updated_at: i.string(),
    }),
    files: i.entity({
      content: i.string().optional(),
      created_at: i.string().optional(),
      isExpanded: i.boolean().optional(),
      isOpen: i.boolean().optional(),
      main_file: i.boolean().optional(),
      name: i.string().optional(),
      parent_id: i.string().optional(),
      pathname: i.string().optional(),
      projectId: i.string().optional(),
      storagePath: i.string().optional(),
      type: i.string().optional(),
      url: i.string().optional(),
      user_id: i.string().optional(),
    }),
    project_share_links: i.entity({
      comment_token: i.string().optional(),
      created_at: i.string().optional(),
      created_by_user_id: i.string().optional(),
      edit_token: i.string().optional(),
      expires_at_ms: i.number().optional(),
      fileId: i.string().optional(),
      projectId: i.string().optional(),
      role: i.string().optional(),
      token: i.string().optional(),
    }),
    mcp_api_keys: i.entity({
      user_id: i.string().indexed(),
      key_hash: i.string().unique().indexed(),
      label: i.string().optional(),
      active: i.boolean(),
      created_at: i.string(),
      last_used_at: i.string().optional(),
    }),
    folders: i.entity({
      user_id: i.string(),
      name: i.string(),
      color: i.string().optional(),
      created_at: i.string(),
      updated_at: i.string().optional(),
    }),
    projects: i.entity({
      activeChatThreadId: i.string().optional(),
      activeFileId: i.string().optional(),
      cachedPdfExpiresAt: i.number().optional(),
      cachedPdfUrl: i.string().optional(),
      cachedPreviewExpiresAt: i.number().optional(),
      cachedPreviewUrl: i.string().optional(),
      created_at: i.string().optional(),
      document_class: i.string().optional(),
      folder_id: i.string().optional(),
      isAutoFetching: i.boolean().optional(),
      isPdfCaretNavigationEnabled: i.boolean().optional(),
      last_compiled: i.string().optional(),
      page_count: i.number().optional(),
      pdfBackgroundTheme: i.string().optional(),
      project_content: i.string().optional(),
      projectScale: i.number().optional(),
      template: i.string().optional(),
      title: i.string().optional(),
      trashed_at: i.string().optional(),
      type: i.string().optional(),
      user_id: i.string().optional(),
      word_count: i.number().optional(),
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
    $streams$files: {
      forward: {
        on: '$streams',
        has: 'many',
        label: '$files',
      },
      reverse: {
        on: '$files',
        has: 'one',
        label: '$stream',
        onDelete: 'cascade',
      },
    },
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
    project_share_linksFile: {
      forward: {
        on: 'project_share_links',
        has: 'many',
        label: 'file',
      },
      reverse: {
        on: 'files',
        has: 'many',
        label: 'project_share_links',
      },
    },
    project_share_linksProject: {
      forward: {
        on: 'project_share_links',
        has: 'many',
        label: 'project',
      },
      reverse: {
        on: 'projects',
        has: 'many',
        label: 'project_share_links',
      },
    },
  },
  rooms: {},
})

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
