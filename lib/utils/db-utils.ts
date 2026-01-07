'use client'
import { db } from '@/lib/constants'
import { createPreview } from '@/lib/utils/pdf-utils'
import { pdfjs } from 'react-pdf'
import { tx } from '@instantdb/react'

// Set the worker source - use CDN version that matches the installed pdfjs-dist version
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

export async function savePdfToStorage(blob: Blob, pathname: string, projectId: string): Promise<void> {
  try {
  const pdfFile = new File([blob], 'main.pdf', { type: blob.type })
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  await db.storage.upload(pathname, pdfFile)
  const downloadURL = await db.storage.getDownloadUrl(pathname)
  db.transact([
    tx.projects[projectId].update({
      cachedPdfUrl: downloadURL,
      cachedPdfExpiresAt: expiresAt,
      last_compiled: new Date().toISOString()
    })
  ])
  } catch (error: any) {
    // Check for InstantDB permission errors (handle different error formats)
    const errorBody = error?.body || error
    const isPermissionError = 
      (errorBody?.type === 'permission-denied' || error?.status === 400) &&
      (errorBody?.message?.includes('storage-permission') || 
       errorBody?.message?.includes('Permission denied'))
    
    if (isPermissionError) {
      throw new Error(
        'Storage permission denied.\n\n' +
        'Please configure storage permissions in your InstantDB dashboard:\n' +
        '1. Go to https://instantdb.com/dash and select your app\n' +
        '2. Navigate to Schema > Storage (or Rules)\n' +
        '3. Enable storage permissions for authenticated users\n' +
        '4. Add a rule that allows storage operations (e.g., "has-storage-permission?")\n\n' +
        `Error details: ${errorBody?.message || error?.message || 'Permission denied'}`
      )
    }
    throw error
  }
}

export async function savePreviewToStorage(blob: Blob, pathname: string, projectId: string): Promise<void> {
  try {
  const pdfDocument = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise
  const { previewFile } = await createPreview(pdfDocument, pathname)
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  await db.storage.upload(pathname, previewFile)
  const downloadURL = await db.storage.getDownloadUrl(pathname)
  db.transact([
    tx.projects[projectId].update({
      cachedPreviewUrl: downloadURL,
      cachedPreviewExpiresAt: expiresAt
    })
  ])
  } catch (error: any) {
    // Check for InstantDB permission errors (handle different error formats)
    const errorBody = error?.body || error
    const isPermissionError = 
      (errorBody?.type === 'permission-denied' || error?.status === 400) &&
      (errorBody?.message?.includes('storage-permission') || 
       errorBody?.message?.includes('Permission denied'))
    
    if (isPermissionError) {
      throw new Error(
        'Storage permission denied.\n\n' +
        'Please configure storage permissions in your InstantDB dashboard:\n' +
        '1. Go to https://instantdb.com/dash and select your app\n' +
        '2. Navigate to Schema > Storage (or Rules)\n' +
        '3. Enable storage permissions for authenticated users\n' +
        '4. Add a rule that allows storage operations (e.g., "has-storage-permission?")\n\n' +
        `Error details: ${errorBody?.message || error?.message || 'Permission denied'}`
      )
    }
    throw error
  }
}

export async function deleteFileFromStorage(pathname: string): Promise<void> {
  await db.storage.delete(pathname)
}
