import { init } from '@instantdb/admin'

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID as string
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN as string

if (!APP_ID) {
  console.error('[instant-admin] NEXT_PUBLIC_INSTANT_APP_ID is not set')
}

export const adminDb = init({ appId: APP_ID || '', adminToken: ADMIN_TOKEN || '' })
