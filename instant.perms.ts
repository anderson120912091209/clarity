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
  
  // Files entity - users can only access files they own
  files: {
    allow: {
      view: "isOwner",
      create: "isOwner",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isOwner", "auth.id != null && auth.id == data.user_id"],
  },
  
  // Projects entity - users can only access projects they own
  projects: {
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
