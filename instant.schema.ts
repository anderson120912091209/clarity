// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/core'

const _schema = i.schema({
  // We inferred 24 attributes!
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
