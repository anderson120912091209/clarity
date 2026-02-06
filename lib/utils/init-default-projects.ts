import { db } from '@/lib/constants'
import { tx, id } from '@instantdb/react'
import { typstWelcomeContent, latexWelcomeContent } from '@/lib/constants/welcome-templates'

/**
 * Initialize default welcome projects for a new user
 * Creates two projects: one Typst and one LaTeX
 */
export async function initializeDefaultProjects(userId: string) {
  const typstProjectId = id()
  const latexProjectId = id()

  const now = new Date()

  // Create transactions for both projects
  const transactions = [
    // Typst Project
    tx.projects[typstProjectId].update({
      user_id: userId,
      title: 'Welcome to Clarity - Typst Edition',
      project_content: typstWelcomeContent,
      template: 'blank',
      last_compiled: now,
      word_count: 0,
      page_count: 0,
      document_class: 'typst',
      created_at: now,
    }),
    tx.files[id()].update({
      user_id: userId,
      projectId: typstProjectId,
      name: 'main.typ',
      type: 'file',
      parent_id: null,
      content: typstWelcomeContent,
      created_at: now,
      pathname: 'main.typ',
      isExpanded: null,
    }),

    // LaTeX Project
    tx.projects[latexProjectId].update({
      user_id: userId,
      title: 'Welcome to Clarity - LaTeX Edition',
      project_content: latexWelcomeContent,
      template: 'blank',
      last_compiled: now,
      word_count: 0,
      page_count: 0,
      document_class: 'article',
      created_at: now,
    }),
    tx.files[id()].update({
      user_id: userId,
      projectId: latexProjectId,
      name: 'main.tex',
      type: 'file',
      parent_id: null,
      content: latexWelcomeContent,
      created_at: now,
      pathname: 'main.tex',
      isExpanded: null,
    }),
  ]

  // Execute all transactions
  await db.transact(transactions)

  return {
    typstProjectId,
    latexProjectId,
  }
}
