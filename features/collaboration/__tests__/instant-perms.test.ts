import { describe, expect, it } from 'vitest'
import rules from '../../../instant.perms'

describe('instant collaboration permissions', () => {
  it('requires token-backed grants for shared file access', () => {
    const binds = rules.files.bind

    const sharedViewRule = binds.find((rule) =>
      rule.includes('ruleParams.shareToken') && rule.includes("data.ref('project_share_links.token')")
    )
    const sharedEditRule = binds.find((rule) =>
      rule.includes('ruleParams.shareToken') &&
      rule.includes("data.ref('project_share_links.edit_token')")
    )

    expect(sharedViewRule).toBeDefined()
    expect(sharedEditRule).toBeDefined()
    expect(binds.some((rule) => rule.includes('ruleParams.role'))).toBe(false)
  })

  it('requires token-backed project view access', () => {
    const binds = rules.projects.bind
    const sharedProjectViewRule = binds.find(
      (rule) =>
        rule.includes('ruleParams.shareToken') &&
        rule.includes("data.ref('project_share_links.token')")
    )

    expect(sharedProjectViewRule).toBeDefined()
  })

  it('keeps share-link grants owner-managed except membership marker rows', () => {
    const allow = rules.project_share_links.allow
    const binds = rules.project_share_links.bind

    expect(allow.create).toBe('isProjectOwner || isMembershipMarkerOwner')
    expect(allow.update).toBe('isProjectOwner || isMembershipMarkerOwner')
    expect(allow.delete).toBe('isProjectOwner || isMembershipMarkerOwner')

    const membershipMarkerRule = binds.find(
      (rule) =>
        rule.includes('isMembershipMarkerOwner') ||
        (rule.includes("data.fileId == '__shared_membership__'") &&
          rule.includes('data.created_by_user_id'))
    )
    const tokenAccessRule = binds.find(
      (rule) =>
        rule.includes('ruleParams.shareToken') &&
        rule.includes('data.token') &&
        rule.includes("data.fileId != '__shared_membership__'")
    )

    expect(membershipMarkerRule).toBeDefined()
    expect(tokenAccessRule).toBeDefined()
  })
})
