export interface AgentWorkspaceFileContext {
  fileId: string
  path: string
  content: string
}

export interface AgentCompileContext {
  logs?: string | null
  error?: string | null
}

export interface AgentChatSettingsContext {
  includeCurrentDocument?: boolean
  webEnabled?: boolean
  libraryEnabled?: boolean
}

export interface AgentChatContext {
  activeFileId?: string | null
  activeFileName?: string | null
  activeFilePath?: string | null
  activeFileContent?: string
  workspaceFiles?: AgentWorkspaceFileContext[]
  compile?: AgentCompileContext
  settings?: AgentChatSettingsContext
}
