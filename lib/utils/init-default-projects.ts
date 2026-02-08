import { db } from '@/lib/constants'
import { tx } from '@instantdb/react'
import { typstWelcomeContent, latexWelcomeContent } from '@/lib/constants/welcome-templates'

// 1 means “starter pack v1 has been applied”.
// Later you can introduce 2 for a new onboarding pack without adding another field.
export const WELCOME_SEED_VERSION = 1

const sanitizeIdPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_')

function getWelcomeEntityIds(userId: string) {
  const stableUserPart = sanitizeIdPart(userId)

  return {
    typstProjectId: `welcome_${stableUserPart}_typst_v${WELCOME_SEED_VERSION}`,
    latexProjectId: `welcome_${stableUserPart}_latex_v${WELCOME_SEED_VERSION}`,
    typstFileId: `welcome_${stableUserPart}_typst_main_v${WELCOME_SEED_VERSION}`,
    latexFileId: `welcome_${stableUserPart}_latex_main_v${WELCOME_SEED_VERSION}`,
  }
}

/**
 * Initialize default welcome projects for a new user
 * Creates two projects: one Typst and one LaTeX
 * 1 means “starter pack v1 has been applied”.
 * Later you can introduce 2 for a new onboarding pack without adding another field.
 */
export function buildWelcomeProjectTransactions(userId: string, timestampISO: string = new Date().toISOString()) {
  const { typstProjectId, latexProjectId, typstFileId, latexFileId } = getWelcomeEntityIds(userId)

  // Create transactions for both projects
  const transactions = [
    // Typst Project
    tx.projects[typstProjectId].update({
      user_id: userId,
      title: 'Welcome to Clarity - Typst Edition',
      project_content: typstWelcomeContent,
      template: 'blank',
      last_compiled: timestampISO,
      word_count: 0,
      page_count: 0,
      document_class: 'typst',
      created_at: timestampISO,
    }),
    tx.files[typstFileId].update({
      user_id: userId,
      projectId: typstProjectId,
      name: 'main.typ',
      type: 'file',
      parent_id: null,
      content: typstWelcomeContent,
      created_at: timestampISO,
      pathname: 'main.typ',
      isExpanded: null,
      isOpen: true,
      main_file: true,
    }),

    // LaTeX Project
    tx.projects[latexProjectId].update({
      user_id: userId,
      title: 'Welcome to Clarity - LaTeX Edition',
      project_content: latexWelcomeContent,
      template: 'blank',
      last_compiled: timestampISO,
      word_count: 0,
      page_count: 0,
      document_class: 'article',
      created_at: timestampISO,
    }),
    tx.files[latexFileId].update({
      user_id: userId,
      projectId: latexProjectId,
      name: 'main.tex',
      type: 'file',
      parent_id: null,
      content: latexWelcomeContent,
      created_at: timestampISO,
      pathname: 'main.tex',
      isExpanded: null,
      isOpen: true,
      main_file: true,
    }),
  ]

  return {
    ids: {
      typstProjectId,
      latexProjectId,
      typstFileId,
      latexFileId,
    },
    transactions,
  }
}

export async function initializeDefaultProjects(userId: string, timestampISO?: string) {
  const { ids, transactions } = buildWelcomeProjectTransactions(userId, timestampISO)

  // Execute all transactions
  await db.transact(transactions)

  return ids
}
