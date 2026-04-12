# Subscription & Billing System — Design Spec

> **Date:** 2026-04-12
> **Status:** Approved
> **Author:** Artur + Claude

---

## 1. Context & Goals

Bens Seguros is a multi-tenant SaaS ERP for small Brazilian insurance brokerages (1-5 people). The product is feature-complete but has no subscription or billing system. AI usage (chat bot) is unmetered, creating invisible variable costs.

### Goals

1. Implement a 3-tier subscription model (Free / Starter / Pro) with flat pricing per organization
2. Track AI bot usage per tenant with included limits + overage billing
3. Implement a trial-to-free-to-paid conversion funnel
4. Integrate Stripe as the payment gateway
5. Enforce plan limits across the entire application (API + frontend)

### Non-Goals

- Multi-currency support (BRL only)
- Enterprise/custom plans (future, not in scope)
- Multicálculo integration (separate feature, not subscription-related)
- Self-hosted / on-premise pricing

---

## 2. Market Context

### Competitive Landscape

| Competitor            | Price                      | Model           | Chat/AI                     |
| --------------------- | -------------------------- | --------------- | --------------------------- |
| Segfy                 | R$ 60-150/user/month       | Per-seat        | No (Foxfy AI is quote-only) |
| Quiver (Dimensa)      | R$ 99/user/month           | Per-seat        | No                          |
| Agger                 | ~R$ 50+/user/month         | Per-seat        | No                          |
| Beeia (chat-only)     | ~R$ 189/month + R$ 30/user | Flat + per-seat | Yes (generic)               |
| SleekFlow (chat-only) | R$ 469-1,759/month         | Flat            | Yes (generic)               |

**Key insight:** No competitor offers ERP + Chat/AI integrated. A broker paying for both separately spends R$ 288-619+/month minimum. Bens Seguros undercuts this with an integrated offering starting at R$ 149/month.

### Positioning

- **Starter (R$ 149/month):** Cheaper than Segfy alone, includes chat + AI bot
- **Pro (R$ 299/month):** Cheaper than ERP + chat platform combined, premium AI (Claude Sonnet)

---

## 3. Plan Structure

### 3.1 Tiers

|                     | **Free** | **Starter**                            | **Pro**                                |
| ------------------- | -------- | -------------------------------------- | -------------------------------------- |
| **Monthly price**   | R$ 0     | R$ 149/month                           | R$ 299/month                           |
| **Annual price**    | R$ 0     | R$ 127/month (R$ 1,524/year — 15% off) | R$ 254/month (R$ 3,048/year — 15% off) |
| **Users included**  | 1        | 5                                      | 5                                      |
| **Additional user** | —        | R$ 29/month                            | R$ 29/month                            |
| **Client limit**    | 50       | 500                                    | Unlimited                              |
| **Proposal limit**  | 20       | Unlimited                              | Unlimited                              |

### 3.2 Tier Rationale

- **Free**: Entry hook. Broker registers clients, sees the system working, data stays. Enough for an individual MEI starting out, but limited enough to feel the gap.
- **Starter (R$ 149)**: The "90% of customers" plan. Full ERP + 1 WhatsApp channel + AI bot. Positioned as "everything Segfy and Quiver offer + chat with AI, for less than one of them alone."
- **Pro (R$ 299)**: For volume users. More channels, more AI, advanced reports. Better margin because the price absorbs AI costs.

---

## 4. Feature Matrix

### 4.1 ERP Core

| Feature                         | Free             | Starter   | Pro              |
| ------------------------------- | ---------------- | --------- | ---------------- |
| Clients (LEAD + ACTIVE)         | 50               | 500       | Unlimited        |
| Proposals                       | 20               | Unlimited | Unlimited        |
| Policies                        | View-only        | Unlimited | Unlimited        |
| Claims                          | —                | Unlimited | Unlimited        |
| Endorsements / Assistances      | —                | Unlimited | Unlimited        |
| Insurers                        | 3                | Unlimited | Unlimited        |
| Documents (upload)              | 100 MB           | 5 GB      | 20 GB            |
| Commissions                     | —                | Full      | Full             |
| Reports / Dashboard             | Basic (counters) | Full      | Full + export    |
| Notifications (expiry, renewal) | —                | Email     | Email + WhatsApp |
| Audit Log                       | —                | 30 days   | 90 days          |

### 4.2 Chat & AI

| Feature                                       | Free | Starter     | Pro                     |
| --------------------------------------------- | ---- | ----------- | ----------------------- |
| WhatsApp channels                             | —    | 1           | 3                       |
| Web widget (site chat)                        | —    | 1           | Unlimited               |
| Concurrent conversations                      | —    | Unlimited   | Unlimited               |
| AI bot (messages/month)                       | —    | 1,000       | 2,000                   |
| AI overage                                    | —    | R$ 0.15/msg | R$ 0.10/msg             |
| Custom AI agents                              | —    | 1           | 5                       |
| Bot tools (lead capture, policy search, etc.) | —    | All         | All                     |
| AI provider                                   | —    | GPT-4o-mini | Claude Sonnet (default) |
| Provider choice                               | —    | —           | Yes (Claude or OpenAI)  |
| Conversation history                          | —    | 6 months    | Unlimited               |

### 4.3 Management & Admin

| Feature           | Free       | Starter     | Pro              |
| ----------------- | ---------- | ----------- | ---------------- |
| Users             | 1          | 5           | 5 (+R$ 29/extra) |
| Roles (RBAC)      | OWNER only | All 5 roles | All 5 roles      |
| Email invitations | —          | Yes         | Yes              |
| API access        | —          | —           | Yes (future)     |

---

## 5. AI Billing Model

### 5.1 Cost Per Message (estimated)

| Scenario                    | Input tokens | Output tokens | Steps | Cost (Claude Sonnet) | Cost (GPT-4o-mini) |
| --------------------------- | ------------ | ------------- | ----- | -------------------- | ------------------ |
| Simple response (FAQ)       | ~2,000       | ~300          | 1     | ~R$ 0.04             | ~R$ 0.005          |
| 1 tool call (client search) | ~4,000       | ~500          | 2-3   | ~R$ 0.08             | ~R$ 0.01           |
| Complex (multi-tool, claim) | ~8,000       | ~800          | 5-10  | ~R$ 0.15             | ~R$ 0.03           |
| **Weighted average**        |              |               |       | **~R$ 0.07**         | **~R$ 0.01**       |

### 5.2 Provider Strategy Per Plan

| Plan        | Default provider | Rationale                                                                                              |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Starter** | GPT-4o-mini      | Cost ~R$ 10 for 1,000 msgs. Excellent margin (R$ 139 of R$ 149). Good quality for FAQ and simple tools |
| **Pro**     | Claude Sonnet    | Premium quality. Cost ~R$ 140 for 2,000 msgs. Margin of ~53% (R$ 159 of R$ 299)                        |

### 5.3 Margin Analysis

|                         | Starter (GPT-4o-mini, 1,000 msgs) | Pro (Claude Sonnet, 2,000 msgs) |
| ----------------------- | --------------------------------- | ------------------------------- |
| AI cost (if fully used) | ~R$ 10                            | ~R$ 140                         |
| Plan revenue            | R$ 149                            | R$ 299                          |
| **Gross margin**        | **R$ 139 (93%)**                  | **R$ 159 (53%)**                |

### 5.4 Overage Rules

- **Pre-check before generation:** Before calling the AI, verify the tenant still has available messages. If not, escalate to human.
- **Overage billing:** Accumulated during the billing period, charged at end of cycle via Stripe usage-based billing.
- **Hard cap:** At 200% of included messages (2,000 for Starter, 4,000 for Pro), disable the bot and notify the OWNER. Prevents runaway costs.
- **Monthly reset:** Counters reset at the start of each billing period.

---

## 6. Trial & Free Tier

### 6.1 Trial Rules

- **Duration:** 14 calendar days
- **Plan during trial:** Pro (all features, 5 users, chat, AI)
- **AI limit during trial:** 200 messages (enough to test, not to sustain)
- **No credit card required** — zero friction at signup
- **Reminder emails:** Day 7 ("halfway"), Day 12 ("2 days left"), Day 14 ("trial ended")
- **In-app notification:** Persistent banner in the last 3 days

### 6.2 Downgrade Behavior (Trial/Canceled → Free)

| Aspect                              | Behavior                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Data (clients, proposals, policies) | **Kept in full**, but only the first 50 clients remain accessible. Rest is "frozen" (visible in count, not editable) |
| Chat conversations                  | **History kept** (read-only). Channels deactivated                                                                   |
| AI bot                              | Deactivated. Active conversations escalate to human                                                                  |
| Extra users                         | Deactivated. Only OWNER retains access                                                                               |
| Documents                           | Read-only. Cannot upload                                                                                             |
| Commissions / Reports               | Deactivated                                                                                                          |

### 6.3 Conversion Funnel Rationale

- **Trial on Pro** (not Starter): broker must experience the best. If trial is Starter, they never know what Pro offers.
- **200 AI msgs in trial**: ~14 msgs/day. Enough to see the bot work for a few days, insufficient to sustain real service for 14 days. Creates desire.
- **Frozen data on Free**: broker invested hours registering. "I have 80 clients, 50 accessible, to unlock the rest is just R$ 149/month" — natural conversion.
- **No credit card on trial**: small Brazilian brokerages resist credit card upfront. Removing this barrier maximizes signups.

---

## 7. Technical Architecture

### 7.1 Payment Gateway: Stripe

**Rationale:**

- Native Billing API (subscriptions, invoices, proration, trials)
- Robust webhooks for subscription lifecycle
- Customer Portal for self-service (change plan, card, cancel)
- Pix integrated in checkout
- Superior developer experience (SDK, docs, TypeScript types)
- International scalability if needed

**Stripe features used:**

- `Subscriptions` — recurring billing with trial period
- `Usage Records` — metered billing for AI overage
- `Customer Portal` — self-service plan management
- `Webhooks` — subscription lifecycle events
- `Checkout Sessions` — initial payment + plan selection

### 7.2 Database Models (Prisma additions)

#### Subscription (1:1 with Organization)

```prisma
model Subscription {
  id                    String             @id @default(cuid())
  organizationId        String             @unique
  plan                  PlanType           @default(FREE)
  status                SubscriptionStatus @default(TRIALING)
  billingCycle          BillingCycle?
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique
  stripePriceId         String?
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  trialEndsAt           DateTime?
  cancelAtPeriodEnd     Boolean            @default(false)
  canceledAt            DateTime?
  metadata              Json?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  aiUsages     AiUsage[]

  @@index([organizationId])
  @@index([status])
  @@index([stripeCustomerId])
}

enum PlanType {
  FREE
  STARTER
  PRO
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  FREE
}

enum BillingCycle {
  MONTHLY
  ANNUAL
}
```

#### AiUsage (monthly tracking)

```prisma
model AiUsage {
  id                String   @id @default(cuid())
  subscriptionId    String
  organizationId    String
  periodStart       DateTime
  periodEnd         DateTime
  messagesUsed      Int      @default(0)
  messagesIncluded  Int
  overageMessages   Int      @default(0)
  overageCostInCents Int     @default(0)
  provider          String   @default("openai")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([organizationId, periodStart])
  @@index([organizationId])
  @@index([subscriptionId])
}
```

#### Plan configuration (constants, not a table)

Plan limits are defined as constants in `packages/core` (not a database table), since they change infrequently and should be version-controlled:

```typescript
const PLAN_LIMITS = {
  FREE: {
    maxUsers: 1,
    maxClients: 50,
    maxProposals: 20,
    maxInsurers: 3,
    maxChannels: 0,
    maxWidgets: 0,
    maxAiAgents: 0,
    aiMessagesIncluded: 0,
    aiOveragePriceInCents: 0,
    storageQuotaMb: 100,
    auditLogDays: 0,
    features: ['erp_basic', 'dashboard_basic'],
  },
  STARTER: {
    maxUsers: 5,
    maxClients: 500,
    maxProposals: -1, // unlimited
    maxInsurers: -1,
    maxChannels: 1,
    maxWidgets: 1,
    maxAiAgents: 1,
    aiMessagesIncluded: 1000,
    aiOveragePriceInCents: 15,
    aiDefaultProvider: 'openai',
    storageQuotaMb: 5120,
    auditLogDays: 30,
    features: [
      'erp_full',
      'chat',
      'ai_bot',
      'commissions',
      'reports',
      'dashboard_full',
      'notifications_email',
    ],
  },
  PRO: {
    maxUsers: 5,
    maxClients: -1,
    maxProposals: -1,
    maxInsurers: -1,
    maxChannels: 3,
    maxWidgets: -1,
    maxAiAgents: 5,
    aiMessagesIncluded: 2000,
    aiOveragePriceInCents: 10,
    aiDefaultProvider: 'claude',
    storageQuotaMb: 20480,
    auditLogDays: 90,
    features: [
      'erp_full',
      'chat',
      'ai_bot',
      'commissions',
      'reports',
      'reports_export',
      'dashboard_full',
      'notifications_email',
      'notifications_whatsapp',
      'provider_choice',
      'api_access',
    ],
  },
} as const
```

### 7.3 AI Usage Tracking

Current state: zero tracking in `ai-bot-processor.ts`. Required changes:

```
[chat-worker] ai-bot-processor.ts
        │
        │  BEFORE calling generateWithTools():
        │  1. Load tenant's AiUsage for current period
        │  2. Check: messagesUsed < messagesIncluded + hardCapBuffer?
        │  3. If over hard cap (200%): escalate to human, skip AI
        │
        │  AFTER successful AI response:
        │  4. Atomic increment: UPDATE AiUsage SET messagesUsed = messagesUsed + 1
        │  5. If messagesUsed > messagesIncluded: increment overageMessages
        │  6. Calculate overageCost based on plan's overage price
        │  7. If approaching limit (80%): publish notification to OWNER
        │
        ▼
[worker] Monthly reset job
        │  At billing period start: create new AiUsage record
        │  Report overage to Stripe via Usage Records API
```

**Atomic counter:** `messagesUsed` incremented via `UPDATE ... SET "messagesUsed" = "messagesUsed" + 1 WHERE ...` to avoid race conditions from concurrent bot conversations.

### 7.4 Enforcement Layer

New middleware in the chain:

```
Request → authMiddleware → tenantMiddleware → subscriptionGuard → requireAbility → handler
```

**`subscriptionGuard` middleware:**

- Reads `Subscription` for the current tenant (cached in Redis, 60s TTL)
- Checks if the current route/action is allowed by the plan
- Returns `402 Subscription Required` if the plan doesn't include the feature
- Returns `403 Plan Limit Exceeded` if a quantity limit is reached (e.g., 50 clients on Free)
- **Read-only grace:** When a plan is downgraded, read operations continue working. Only create/update operations are blocked.

**Feature check approach:**

- Each route declares its required feature via schema metadata: `{ planFeature: 'chat' }`
- The guard checks if `PLAN_LIMITS[currentPlan].features.includes(requiredFeature)`
- Quantity limits checked at creation time: before creating a client, count existing and compare to `maxClients`

### 7.5 Subscription Lifecycle (State Machine)

```
TRIALING ──[payment received]──→ ACTIVE ──[payment failed]──→ PAST_DUE ──[3 retries failed]──→ CANCELED
    │                              │                                                              │
    │[trial expired               │[user canceled]                                               │
    │ without paying]             │                                                              │
    ▼                             ▼                                                              ▼
   FREE                     CANCELED → FREE                                                    FREE
```

**All transitions driven by Stripe webhooks:**

- `customer.subscription.trial_will_end` → send reminder email
- `invoice.paid` → set status ACTIVE
- `invoice.payment_failed` → set status PAST_DUE, show banner
- `customer.subscription.updated` → handle plan changes, proration
- `customer.subscription.deleted` → set status CANCELED, downgrade to FREE

**PAST_DUE behavior:**

- Stripe retries 3 times over 7 days
- System maintains full access but shows persistent warning banner
- After final failure: auto-cancel, downgrade to FREE

### 7.6 Frontend Changes

**New pages/components:**

- `/settings/billing` — Current plan, usage dashboard, upgrade/downgrade buttons
- `/settings/billing/checkout` — Stripe Checkout redirect for initial subscription
- Plan comparison page (public, pre-auth) — Marketing-oriented feature comparison
- Usage dashboard widget — AI messages used/remaining this period
- Upgrade prompt components — Contextual CTAs when hitting plan limits

**Enforcement in UI:**

- Features gated by plan show a lock icon + "Disponível no plano Starter" tooltip
- When hitting quantity limits, creation forms show a banner with upgrade CTA
- AI usage counter visible in the chat sidebar

---

## 8. Stripe Product Configuration

### Products & Prices

```
Product: Bens Seguros Starter
├── Price: R$ 149/month (recurring, monthly)
├── Price: R$ 1,524/year (recurring, annual — 15% off)
└── Metered Price: R$ 0.15/msg (usage-based, for AI overage)

Product: Bens Seguros Pro
├── Price: R$ 299/month (recurring, monthly)
├── Price: R$ 3,048/year (recurring, annual — 15% off)
└── Metered Price: R$ 0.10/msg (usage-based, for AI overage)

Product: Additional User
└── Price: R$ 29/month (recurring, per-unit)
```

### Webhook Events to Handle

| Event                                  | Action                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| `checkout.session.completed`           | Create/update Subscription record, link stripeCustomerId |
| `invoice.paid`                         | Set status ACTIVE, update period dates                   |
| `invoice.payment_failed`               | Set status PAST_DUE, notify owner                        |
| `customer.subscription.updated`        | Handle plan change, update limits                        |
| `customer.subscription.deleted`        | Set status CANCELED, schedule downgrade to FREE          |
| `customer.subscription.trial_will_end` | Send reminder email (3 days before)                      |

---

## 9. Migration Strategy

### For Existing Tenants

All existing organizations get migrated to a plan based on a decision by the product owner. Options:

1. **Grandfather existing tenants on Starter** for 3 months (grace period), then require payment
2. **Start all existing tenants on Free** and let them upgrade

Recommended: Option 1. Existing tenants already have data and usage patterns. Giving them 3 months of Starter for free respects their early adoption and gives time to convert.

### Database Migration

1. Add `Subscription` and `AiUsage` tables
2. Create `Subscription` record for every existing `Organization` with `status: ACTIVE, plan: STARTER, trialEndsAt: now + 90 days` (grandfather period)
3. Add `subscriptionGuard` middleware (initially in permissive/logging mode)
4. Enable enforcement after 30 days of logging (to catch edge cases)

---

## 10. Success Metrics

| Metric                             | Target (6 months)      |
| ---------------------------------- | ---------------------- |
| Trial → Paid conversion            | > 15%                  |
| Free → Paid conversion             | > 5%                   |
| Monthly churn (paid)               | < 5%                   |
| Average Revenue Per Account (ARPA) | > R$ 160/month         |
| AI overage revenue                 | > 10% of total revenue |
| Trial signup rate (no credit card) | > 200/month            |

---

## 11. Open Questions (for future iterations)

1. **Multicálculo integration** — Will it be a separate product/add-on or included in plans?
2. **Enterprise tier** — Custom pricing for larger brokerages (30+ users)?
3. **Partner/reseller model** — Discount for brokerage networks?
4. **Annual commitment discounts** — Beyond 15% for 2-year contracts?
5. **AI model upgrades** — When newer/cheaper models arrive, how to adjust included limits?

---

## Sources (Market Research)

- [Segfy](https://www.segfy.com/) — R$ 60-149.90/user/month
- [Quiver by Dimensa](https://www.quiver.net.br/) — R$ 99/user/month
- [Agger](https://www.agger.com.br/precos/) — ~R$ 50+/user/month
- [Simples Agenda](https://www.simplesagenda.com.br/site/sistema-para-corretora-de-seguros) — R$ 39.90/month
- [Beeia](https://www.beeia.com.br/) — ~R$ 189/month + R$ 30/user
- [SleekFlow](https://sleekflow.io/en-us/pricing) — R$ 469-1,759/month
