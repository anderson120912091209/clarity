// Docs: https://www.instantdb.com/docs/permissions

const rules = {
  // Storage permissions - allow authenticated users to manage their own files
  // Users can only access files in paths that start with their user ID
  $files: {
    allow: {
      view: "hasStoragePermission",
      create: "hasStoragePermission",
      update: "hasStoragePermission",
      delete: "hasStoragePermission",
    },
    bind: [
      "hasStoragePermission",
      "auth.id != null && (data.path.startsWith(auth.id + '/') || data.path == auth.id)"
    ],
  },
  
  // Files entity - owner access plus token-scoped shared access.
  files: {
    allow: {
      view: "isOwner || hasSharedViewAccess",
      create: "isOwner || hasSharedEditAccess",
      update: "isOwner || hasSharedEditAccess",
      delete: "isOwner || hasSharedEditAccess",
    },
    bind: [
      "isOwner",
      "auth.id != null && auth.id == data.user_id",
      "hasSharedViewAccess",
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.projectId",
      "hasSharedEditAccess",
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.projectId && ruleParams.role == 'editor'",
    ],
  },
  
  // Projects entity - owner access plus token-scoped shared view access.
  projects: {
    allow: {
      view: "isOwner || hasSharedViewAccess",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id != null && auth.id == data.user_id",
      "hasSharedViewAccess",
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.id",
    ],
  },

  // Token-bearing share links are owner-managed grant records.
  project_share_links: {
    allow: {
      view: "isCreatorOrProjectOwner || hasTokenAccess",
      create: "isCreator",
      update: "isCreatorOrProjectOwner",
      delete: "isCreatorOrProjectOwner",
    },
    bind: [
      "isCreator",
      "auth.id != null && auth.id == data.created_by_user_id",
      "isCreatorOrProjectOwner",
      "auth.id != null && (auth.id == data.created_by_user_id || auth.id in data.ref('project.user_id'))",
      "hasTokenAccess",
      "ruleParams.shareToken != null && ruleParams.shareToken == data.token",
    ],
  },

  // Persisted memberships for users who have accepted/opened shared projects.
  shared_project_memberships: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // Subscription rows are user-owned and determine entitlement limits.
  account_plans: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // Plan change history is user-owned for auditing/debugging.
  account_plan_events: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // AI threads are user-owned and project-scoped.
  ai_threads: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // AI messages are user-owned and belong to a thread.
  ai_messages: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // AI runs are user-owned execution records.
  ai_runs: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // Extracted memory items are also user-owned.
  ai_memory_items: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },

  // Optional checkpoints for thread restores.
  ai_thread_checkpoints: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },
  
  // Users entity - users can view and update their own user record
  users: {
    allow: {
      view: "isOwner",
      create: "auth.id != null",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.id"],
  },
  
  // $users entity - system users, allow authenticated access
  // Note: $users doesn't support create/delete operations, must be set to "false"
  $users: {
    allow: {
      view: "auth.id != null",
      create: "false",
      update: "auth.id != null",
      delete: "false",
    },
  },
} as const

export default rules
