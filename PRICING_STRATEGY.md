# RentDesk — South African Pricing Strategy

> Internal reference document · March 2026

---

## 1. What You're Selling

RentDesk is a purpose-built **Rental Management System** for South African property managers. The closest local alternatives are:

| Competitor | Price | Notes |
|---|---|---|
| PayProp | ~R300–R700/month | Trust accounting focused, expensive, complex |
| TPN | R200–R500/month | Credit checks + basic management |
| Buildium / AppFolio | USD $55–$200/month | US-centric, overkill, foreign currency |
| Generic spreadsheets | Free | What most small landlords currently use |

**Your positioning:** Simpler than PayProp, built for South African boarding houses and multi-room residential properties, affordable for small-to-medium operators.

---

## 2. Firebase Cost Reality Check

Firebase pricing is usage-based. Here's what a typical client costs you at scale:

### Firestore (Database)
| Tier | Free | Paid |
|---|---|---|
| Reads | 50,000/day | $0.06 per 100,000 |
| Writes | 20,000/day | $0.18 per 100,000 |
| Deletes | 20,000/day | $0.02 per 100,000 |
| Storage | 1 GB | $0.18/GB/month |

**Realistic Firestore cost per client per month:**
A property manager with 30 rooms, 2 staff members doing daily work:
- ~5,000–15,000 reads/day (well within free tier per project)
- ~500–2,000 writes/day (within free tier)

**If you use a single Firebase project for all clients:** The free tier covers roughly 3–5 active clients before you hit paid territory. After that, costs are minimal — a 20-client operation likely costs **R30–R80/month total** in Firestore fees.

### Firebase Storage (File uploads — receipts, lease docs, photos)
- Free: 5 GB total, 1 GB/day download
- Paid: $0.026/GB/month storage, $0.12/GB download

A client uploading 50 receipts and 20 lease docs/month ≈ 200–500 MB/year. At that rate, you can support **10+ clients within the free 5 GB tier** before paying anything for storage.

### Firebase Authentication
- **Free forever** for up to 10,000 monthly active users per project.
- No cost concern here for SA property management scale.

### Firebase Functions (Scheduled tasks)
- Free: 2 million invocations/month, 400,000 GB-seconds compute
- Your two scheduled functions (lease reminders + auto-lock) run once daily each = **730 invocations/month** — comfortably within free tier.

### Hosting
- Free: 10 GB storage, 360 MB/day transfer
- Sufficient for the app bundle (typically <5 MB). Free tier covers hundreds of concurrent users.

### Realistic Total Firebase Cost
| Client Count | Estimated Monthly Firebase Cost |
|---|---|
| 1–5 clients | R0 (free tier) |
| 5–15 clients | R50–R150/month |
| 15–50 clients | R150–R500/month |
| 50–100 clients | R500–R1,200/month |

> These are rough estimates. Firebase costs scale gracefully — your margins stay healthy unless you have very high-volume clients (500+ rooms, many staff).

---

## 3. Once-Off vs. Subscription — The Decision

### Once-Off License Model

**How it works:** Client pays once, owns the software.

| Pros | Cons |
|---|---|
| Big upfront cash | No recurring revenue |
| No ongoing commitment | You still pay Firebase costs forever |
| Easier sell for budget-conscious clients | No incentive for you to update or support |
| Clients feel they "own" something | Clients expect free lifetime updates |

**Verdict:** Works for selling a white-label product to a developer or larger company. **Not recommended** for direct-to-client sales — you carry ongoing Firebase costs with no income after the sale, and support requests never stop.

---

### Subscription Model (SaaS)

**How it works:** Monthly or annual fee for continued access, hosting, and support.

| Pros | Cons |
|---|---|
| Predictable recurring revenue | Harder initial sell ("why pay monthly?") |
| Covers your Firebase costs automatically | Churn risk if client is unhappy |
| Incentivises you to keep improving the product | Need to provide ongoing support |
| Business valuation is much higher | Requires proper invoicing/billing system |
| Annual prepay option improves cash flow | |

**Verdict:** This is the right model. Every serious SaaS company in this space is subscription-based. Clients understand "software as a service" in 2026, and the value is clear when they see time saved vs. spreadsheets.

---

## 4. Recommended Pricing Tiers

Position around **number of rooms** — that's what clients understand and what drives your costs.

### Tier 1 — Starter
**R299/month** *(or R2,990/year — save 2 months)*

- Up to **20 rooms**
- Up to **2 staff users**
- All core features (rooms, renters, leases, payments, inspections)
- Email support
- Training Center included

**Target:** Small boarding house operators, single-property landlords with staff.

---

### Tier 2 — Professional
**R599/month** *(or R5,990/year)*

- Up to **60 rooms**
- Up to **5 staff users**
- All features including Reports, Complaints, Penalties
- Priority email support (48h response)
- Onboarding assistance (1 video call setup session)
- Training Center included

**Target:** Medium residential properties, guest houses, student accommodation operators.

---

### Tier 3 — Business
**R1,199/month** *(or R11,990/year)*

- Up to **150 rooms**
- Up to **15 staff users**
- All features
- Priority support (24h response)
- Monthly check-in call (optional)
- Data export on request
- Training Center + custom onboarding

**Target:** Multi-property operators, property management companies.

---

### Enterprise / Custom
**Quoted individually**

- 150+ rooms or 15+ users
- Custom feature requests
- Dedicated Firebase project (data isolation)
- SLA agreement
- White-label option available

---

## 5. What the Market Will Bear

### South African Context
- Informal property managers (running boarding houses): price-sensitive. **R199–R399/month** is the ceiling without a strong value demo.
- Established property management companies: used to software costs. **R500–R1,500/month** is normal.
- Estate agents managing rentals: usually have their own systems. Harder sell unless you offer integrations.

### Value Justification Script
When a client asks "why pay R599/month?":

> *"One missed rent payment on a 3-room property is R2,500–R6,000 lost. RentDesk's auto-tracking and overdue alerts typically recover that within the first month. The staff time saved on manual record-keeping alone is worth more than the subscription."*

---

## 6. One-Time Setup Fee

Consider charging a **once-off onboarding fee** separate from the subscription:

| Package | Fee | Includes |
|---|---|---|
| Self-service | R0 | Access to training, no assistance |
| Assisted Setup | R1,500 | 2-hour video call, data import help, config |
| Full Onboarding | R3,500 | Setup call + staff training session + 30-day check-in |

This front-loads revenue and filters out unserious clients.

---

## 7. Your Margin Analysis

### Example: 10 Tier 2 clients (Professional @ R599/month)

| Item | Monthly |
|---|---|
| Revenue | R5,990 |
| Firebase costs (est.) | ~R120 |
| Your time (support, ~4h) | At your rate |
| **Gross margin** | **~R5,870** |

### Example: 20 mixed clients (avg R450/month)

| Item | Monthly |
|---|---|
| Revenue | R9,000 |
| Firebase costs (est.) | ~R250 |
| Gross margin | **~R8,750** |

At 50 clients averaging R450/month, you're at **~R22,000/month gross** with Firebase costs of ~R600–800/month. That's a very healthy SaaS margin.

---

## 8. Billing & Invoicing Recommendations

- Use **Peach Payments**, **Yoco**, or **PayFast** for ZAR recurring billing
- Issue proper **tax invoices** (VAT registered once you exceed R1M/year turnover)
- Offer **annual prepay at 2 months free** — improves cash flow and locks in clients
- Send invoices on the **1st of the month**, auto-suspend on the **7th** if unpaid
- Keep clients on a **30-day notice** cancellation clause — protects you

---

## 9. Summary Recommendation

**Sell as a subscription.** Price by room count. Start with a once-off setup fee to filter serious clients.

| What to do | Detail |
|---|---|
| Model | Monthly SaaS subscription |
| Entry price | R299/month (up to 20 rooms) |
| Sweet spot | R599/month (up to 60 rooms) — this is your target client |
| Setup fee | R1,500–R3,500 once-off depending on complexity |
| Annual discount | 2 months free for annual prepay |
| Firebase risk | Minimal — costs stay under R200/month until you have 15+ active clients |
| Break-even | 3 paying clients at Tier 2 covers meaningful recurring income |

---

*Review pricing annually. Firebase pricing changes, and the market evolves. Once you have 20+ clients, consider moving each to their own Firebase project for better data isolation — cost increases but enterprise clients expect it.*
