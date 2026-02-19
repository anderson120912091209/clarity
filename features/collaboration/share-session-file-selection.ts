interface ResolveShareSessionActiveFileOptions {
  availableFileIds: Set<string>
  fallbackFileId: string | null
  hasInitializedSharedTarget: boolean
  isShareSession: boolean
  previousActiveFileId: string | null
  sharedTargetFileId: string | null
}

interface ResolveShareSessionActiveFileResult {
  hasInitializedSharedTarget: boolean
  nextActiveFileId: string | null
}

export function resolveShareSessionActiveFile({
  availableFileIds,
  fallbackFileId,
  hasInitializedSharedTarget,
  isShareSession,
  previousActiveFileId,
  sharedTargetFileId,
}: ResolveShareSessionActiveFileOptions): ResolveShareSessionActiveFileResult {
  const hasPreviousActiveFile =
    typeof previousActiveFileId === 'string' && availableFileIds.has(previousActiveFileId)
  const hasSharedTarget =
    typeof sharedTargetFileId === 'string' && availableFileIds.has(sharedTargetFileId)

  if (isShareSession && hasSharedTarget && !hasInitializedSharedTarget) {
    return {
      nextActiveFileId: sharedTargetFileId,
      hasInitializedSharedTarget: true,
    }
  }

  if (hasPreviousActiveFile) {
    return {
      nextActiveFileId: previousActiveFileId,
      hasInitializedSharedTarget,
    }
  }

  if (hasSharedTarget) {
    return {
      nextActiveFileId: sharedTargetFileId,
      hasInitializedSharedTarget,
    }
  }

  return {
    nextActiveFileId: fallbackFileId,
    hasInitializedSharedTarget,
  }
}
