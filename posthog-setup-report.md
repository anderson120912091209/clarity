# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your Next.js App Router project. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` using the modern Next.js 15.3+ approach
- **Server-side PostHog client** in `lib/posthog-server.ts` for API route tracking
- **Reverse proxy configuration** in `next.config.js` to avoid ad blockers
- **User identification** on login with automatic property sync
- **Event tracking** across key user flows including signups, project lifecycle, checkout, and AI chat usage

## Events Implemented

| Event Name | Description | File |
|------------|-------------|------|
| `user_signed_up` | User completed signup/login flow and their account was bootstrapped | `app/login/page.tsx` |
| `project_created` | User created a new document project (template page or quick dialog) | `app/new/page.tsx`, `components/features/projects/new-project-dialog.tsx` |
| `checkout_started` | User initiated Stripe checkout from the pricing section | `components/landing/pricing.tsx` |
| `checkout_session_created` | Server-side: Stripe checkout session was successfully created | `app/api/stripe/checkout-session/route.ts` |
| `ai_chat_message_sent` | User sent a message to the AI chat assistant | `app/api/agent/chat/route.ts` |
| `project_trashed` | User moved a project to trash | `lib/utils/project-trash.ts` |
| `project_restored` | User restored a project from trash | `lib/utils/project-trash.ts` |
| `project_deleted_permanently` | User permanently deleted a project from trash | `lib/utils/project-trash.ts` |

## Files Created/Modified

### New Files
- `instrumentation-client.ts` - Client-side PostHog initialization
- `lib/posthog-server.ts` - Server-side PostHog client singleton

### Modified Files
- `next.config.js` - Added PostHog reverse proxy rewrites
- `app/login/page.tsx` - Added user identification and signup tracking
- `app/new/page.tsx` - Added project creation tracking
- `components/features/projects/new-project-dialog.tsx` - Added quick project creation tracking
- `components/landing/pricing.tsx` - Added checkout started tracking
- `app/api/stripe/checkout-session/route.ts` - Added server-side checkout session tracking
- `app/api/agent/chat/route.ts` - Added AI chat message tracking
- `lib/utils/project-trash.ts` - Added trash lifecycle tracking

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/234831/dashboard/1280613) - Key metrics dashboard for tracking user engagement, project lifecycle, and conversion events

### Insights
- [User Signups Over Time](https://us.posthog.com/project/234831/insights/gMcfI9xx) - Daily count of new user signups
- [Projects Created](https://us.posthog.com/project/234831/insights/568Lc5Hh) - Daily count of projects created by users
- [Checkout Conversion Funnel](https://us.posthog.com/project/234831/insights/IXjN3Fu6) - Conversion funnel from checkout started to checkout session created
- [AI Chat Usage](https://us.posthog.com/project/234831/insights/RCMI2qmx) - Daily count of AI chat messages sent
- [Project Churn Events](https://us.posthog.com/project/234831/insights/kwAVxXkv) - Tracks project deletion behavior - trashed vs restored vs permanently deleted

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

## Environment Variables

The following environment variables have been configured in `.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_MqSLhKJyAA9JUcoM2Z9OCWwqKa2KtCoAJ0xgwOSYIZw
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

These are referenced in the code instead of being hardcoded.
