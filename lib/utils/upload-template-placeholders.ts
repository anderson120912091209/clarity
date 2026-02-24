import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { templatePlaceholderFiles } from '@/lib/constants/templates'

function createPlaceholderPng(
  fileName: string,
  width = 200,
  height = 150
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'))
      return
    }

    ctx.fillStyle = '#F0F0F0'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#CCCCCC'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(4, 4, width - 8, height - 8)

    ctx.fillStyle = '#999999'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Replace with your image', width / 2, height / 2)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(new File([blob], fileName, { type: 'image/png' }))
        } else {
          reject(new Error('Failed to create placeholder image blob'))
        }
      },
      'image/png'
    )
  })
}

/**
 * Uploads placeholder image files for templates that reference images
 * (e.g. the IEEE template references fig1.png).
 *
 * Call this BEFORE db.transact() and spread the returned ops into the
 * transaction array so that file records are created atomically with the
 * project.
 */
export async function uploadTemplatePlaceholders(
  templateId: string,
  userId: string,
  projectId: string,
) {
  const fileNames = templatePlaceholderFiles[templateId]
  if (!fileNames || fileNames.length === 0) return []

  const ops = []
  for (const fileName of fileNames) {
    const file = await createPlaceholderPng(fileName)
    const storagePath = `${userId}/projects/${projectId}/${Date.now()}-${fileName}`
    await db.storage.upload(storagePath, file)
    const url = await db.storage.getDownloadUrl(storagePath)
    const fileId = id()
    ops.push(
      tx.files[fileId].update({
        name: fileName,
        type: 'file' as const,
        url,
        storagePath,
        projectId,
        user_id: userId,
        parent_id: null,
        created_at: new Date().toISOString(),
      })
    )
  }

  return ops
}
