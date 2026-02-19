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
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.projectId && ruleParams.shareToken in data.ref('project_share_links.token')",
      "hasSharedEditAccess",
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.projectId && ruleParams.shareToken in data.ref('project_share_links.edit_token')",
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
      "ruleParams.shareToken != null && ruleParams.projectId != null && ruleParams.projectId == data.id && ruleParams.shareToken in data.ref('project_share_links.token')",
    ],
  },

  // Token-bearing share links are owner-managed grant records.
  // Exception: shared-membership marker rows are user-owned.
  project_share_links: {
    allow: {
      view: "isProjectOwner || isCreator || hasTokenAccess",
      create: "isProjectOwner || isMembershipMarkerOwner",
      update: "isProjectOwner || isMembershipMarkerOwner",
      delete: "isProjectOwner || isMembershipMarkerOwner",
    },
    bind: [
      "isCreator",
      "auth.id != null && auth.id == data.created_by_user_id",
      "isProjectOwner",
      "auth.id != null && auth.id in data.ref('project.user_id')",
      "isMembershipMarkerOwner",
      "auth.id != null && auth.id == data.created_by_user_id && data.fileId == '__shared_membership__'",
      "hasTokenAccess",
      "ruleParams.shareToken != null && ruleParams.shareToken == data.token && data.fileId != '__shared_membership__'",
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
