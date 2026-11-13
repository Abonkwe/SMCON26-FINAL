# ALICE — Engineering Analysis & Step-by-Step Build Guide

This guide breaks down **ALICE SRS v1.2** into an actionable engineering blueprint. It highlights architectural nuances, resolves minor spec inconsistencies before you write a line of code, identifies the hardest technical traps, and provides an **8-phase step-by-step build sequence** tailored for a hackathon MVP and controlled pilot in **Buea, Cameroon**.

---

## 1. Executive Architectural & Product Analysis

### 1.1 What Makes ALICE Unique (Your Core Differentiators)
1. **Two-Tier, Two-Sided Trust (`FR-VER-001` – `008`):** Unlike generic classifieds, ALICE separates **Phone Verification** $\neq$ **Identity Verification** $\neq$ **Professional Competence Verification**, and applies ID verification to *both* Customers and Providers. Every public badge reflects the exact evidence reviewed—never a vague "verified" claim.
2. **Hyper-Local Buea Infrastructure Fit (`FR-RENT-001` – `009`):** Beyond standard home repairs and cleaning, ALICE directly solves Buea's power and water interruptions by pairing **Potable vs. Non-Potable Water Delivery** with **Third-Party Portable Power Station Rentals**—explicitly distinguishing battery energy capacity ($\text{Wh}$) from inverter continuous/surge output ($\text{W}$).
3. **Bilingual WhatsApp AI Channel (`Appendix D & G`):** Instead of forcing low-bandwidth or non-technical users through multi-step mobile forms, customers can message ALICE in English or French on WhatsApp. **Google Gemini** acts strictly as a natural-language planner over **FastAPI-owned, permission-checked tools**, never touching the database directly.

### 1.2 Spec Audit: Inconsistencies Resolved Before Building
During review of the 39-page SRS, four minor spec drifts/typos were identified and resolved so your team has zero ambiguity:

| Area | SRS Finding | Engineering Resolution |
| :--- | :--- | :--- |
| **Backend & DB Stack (Fig. 2 vs. Sec 10 & App. E)** | Figure 2's diagram still shows `Node.js + Express` and `MySQL` from an early draft, while Sections 10, 10.1, and Appendix E mandate **Python + FastAPI + `uv` + Supabase PostgreSQL**. | **Follow Appendix E strictly.** Use Python + FastAPI managed with `uv`, and Supabase PostgreSQL as the sole database. |
| **Design Palette Typos (Sec 11.6 & 11.7)** | Cloud Gray had a typo (`#FOF1F5` with letter `O`), Mint Green had `#340399` (deep purple), and Primary Lavender had `#8979E9` vs `#8980EA`. | Standardize Tailwind theme on: Cloud Gray `#F0F1F5`, Mint Green `#34C399`, Primary Lavender `#8979E9` (and `#8980EA` for the 135° header gradient). |
| **Open Product Decisions (Sec 15.4)** | 10 policy items were marked as "Open decisions" for PO approval. | Lock these MVP defaults immediately: **(1)** Single-provider request initially; **(2)** 24-hour default quote expiry; **(3)** Simulated `XAF` payment ledger (clearly labelled `DEMO / SIMULATED`); **(4)** Exclude childcare/eldercare; **(5)** Reveal provider/customer phone only after booking moves to `CONFIRMED`. |
| **Figure 2 vs. Figure 3 Scope** | Reference UI (Qwash) is laundry-only with saved credit cards. | Adopt only the lavender/midnight-navy visual language and card hierarchy. Replace credit cards with `XAF` / Mobile Money simulated method labels and ALICE's 5-tab navigation. |

### 1.3 The 4 Hardest Engineering Problems (And How to Solve Them Cleanly)
1. **Preventing Double-Booked Power Stations (`AC-07`, `FR-RENT-005`):**
   - *Trap:* Checking `SELECT * FROM rental_bookings WHERE ...` in Python before inserting leaves a race condition window if two customers book the same 2 kWh EcoFlow/Bluetti unit simultaneously.
   - *Solution:* Use PostgreSQL's native `btree_gist` extension with a `tstzrange` `EXCLUDE` constraint on `rental_bookings` for `CONFIRMED` / `ACTIVE` statuses. The database guarantees zero overlapping bookings atomically.
2. **Twilio Webhook Timeouts & Idempotency (`FR-WA-002`, `FR-WA-014`, `E.9`):**
   - *Trap:* Twilio expects an HTTP response within ~10–15 seconds. If FastAPI waits synchronously for Supabase queries + Gemini tool-calling + response generation, Twilio will time out and retry the webhook, causing duplicate messages or bookings.
   - *Solution:* In `POST /api/v1/integrations/twilio/whatsapp/inbound`, validate `X-Twilio-Signature`, insert `MessageSid` into `messages` (ignoring duplicates via `UNIQUE` constraint), enqueue a FastAPI `BackgroundTasks` worker, and immediately return `200 OK` (empty TwiML `<Response/>`). The worker processes Gemini and sends the reply asynchronously via the Twilio REST API.
3. **AI Hallucination & Unconfirmed Consequential Actions (`NFR-AI-001`, `NFR-AI-003`, `FR-GEM-005`):**
   - *Trap:* Letting Gemini execute `create_service_request` or `create_rental_request` immediately when a user says *"Book that plumber"*.
   - *Solution:* Implement a two-step draft pattern in `whatsapp_agent`. Tools like `draft_service_request` store a pending draft JSON in `conversations.state` and return a structured summary. Only when the user replies affirmatively in the next turn does the orchestrator unlock and execute `confirm_service_request(draft_id)` using an idempotency key.
4. **Private ID Document Security (`AC-12`, `NFR-SEC-005`):**
   - *Trap:* Uploading National ID cards or passports into a public Supabase Storage bucket.
   - *Solution:* Create two buckets: `public-media` (avatars, service portfolio photos, equipment photos) and `private-verification` (ID docs, competence certificates, dispute evidence). Backend generates short-lived signed URLs (e.g., 5-minute TTL) only after verifying the caller is the document owner or an authorized `VERIFICATION_REVIEWER` / `ADMIN`, and writes an entry to `audit_logs`.

---

## 2. Recommended Workspace Structure

Keep the backend and frontend cleanly separated in a single repository so both teams can iterate independently while sharing OpenAPI types:

```text
alice-platform/
├── backend/                        # Python + FastAPI + uv (Appendix E.3)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── .python-version             # e.g., 3.12
│   ├── .env.example
│   ├── migrations/                 # Numbered SQL migrations for Supabase PostgreSQL
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory, CORS, correlation-ID middleware
│   │   ├── core/
│   │   │   ├── config.py           # pydantic-settings env validation
│   │   │   ├── security.py         # Supabase JWT verification & role/ownership dependencies
│   │   │   ├── exceptions.py       # Standardized JSON error envelopes
│   │   │   └── logging.py          # Redacted structured logging
│   │   ├── api/v1/
│   │   │   ├── router.py           # Aggregates all domain routers under /api/v1
│   │   │   └── health.py           # /health and /ready checks
│   │   ├── modules/
│   │   │   ├── auth/               # E.164 +237 normalization, OTP hooks, role assignment
│   │   │   ├── users/              # Profiles & Buea neighbourhood addresses
│   │   │   ├── verification/       # ID & competence submissions, admin review queue
│   │   │   ├── catalogue/          # Categories, services, Buea service_areas
│   │   │   ├── providers/          # Provider profiles, services, coverage areas, discovery search
│   │   │   ├── bookings/           # Requests, line-item quotations, job PIN, state machine
│   │   │   ├── rentals/            # Power station listings, Wh/W calculator, overlap checks
│   │   │   ├── reviews/            # Post-completion ratings & moderation
│   │   │   ├── disputes/           # Safety reports, complaints, account restrictions
│   │   │   ├── notifications/      # In-app notifications & channel dispatch
│   │   │   ├── admin/              # Metrics dashboard & immutable audit_logs
│   │   │   └── whatsapp_agent/     # Orchestrator, account linking, allowlisted Gemini tools
│   │   └── integrations/
│   │       ├── supabase/           # DB & Storage client wrappers
│   │       ├── twilio/             # Signature validator, REST sender, 24h window guard
│   │       └── gemini/             # google-genai SDK adapter, token limits, retries
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── api/
│       └── security/
└── frontend/                       # React + Vite + TypeScript + Tailwind PWA
    ├── index.html
    ├── manifest.webmanifest        # PWA installability metadata
    ├── tailwind.config.ts          # ALICE lavender/navy/mint design tokens
    └── src/
        ├── lib/                    # API client (injects Supabase JWT + Idempotency-Key), i18n (EN/FR)
        ├── components/             # BottomNav, VerificationBadge, StatusPill, PowerEstimator
        └── pages/
            ├── customer/           # Home, Explore, Bookings, Rentals, Profile
            ├── provider/           # ProviderOnboarding, RequestsAndQuotes, MyListings
            └── admin/              # VerificationQueue, Disputes, CatalogueManager, AuditLogs
```

---

## 3. Step-by-Step Build Roadmap

### Phase 0: External Services, Accounts & Environment Setup
**Goal:** Provision all infrastructure primitives and secrets before writing application code.

1. **Supabase Setup:**
   - Create a dedicated Supabase project (`alice-mvp-dev`).
   - Enable **Phone Auth** (configure a test OTP provider or Supabase test phone numbers for hackathon demo reliability).
   - Create two Storage buckets:
     - `public-media` (Public: `true`, max 5MB, allowed MIME: `image/jpeg`, `image/png`, `image/webp`).
     - `private-verification` (Public: `false`, max 10MB, allowed MIME: `image/jpeg`, `image/png`, `application/pdf`).
2. **Google Gemini Setup (`Appendix G.2`):**
   - Create a dedicated project in **Google AI Studio** / Google Cloud (`alice-whatsapp-agent`).
   - Generate a `GEMINI_API_KEY` and set a hard spend/rate budget alert.
   - Select your configurable model ID (e.g., `gemini-2.5-flash` or current recommended Flash-class model via `GEMINI_MODEL`).
3. **Twilio WhatsApp Sandbox Setup (`Appendix D.7`):**
   - Create a Twilio account and activate the **Twilio Sandbox for WhatsApp** (`TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`).
   - Install `ngrok` or Cloudflare Tunnel so Twilio can reach your local FastAPI webhook over HTTPS during development (`PUBLIC_BASE_URL`).
4. **Create `.env.example` & `.env`:**
   - Populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `PUBLIC_BASE_URL`. Ensure `.env` is in `.gitignore`.

---

### Phase 1: Backend Foundation with `uv` & FastAPI
**Goal:** Scaffold a clean, strictly typed modular monolith with JWT authentication and standardized error responses.

1. **Initialize Project with `uv` (`Appendix E.4`):**
   ```bash
   mkdir -p backend && cd backend
   uv python pin 3.12
   uv init --name alice-backend
   uv add fastapi "uvicorn[standard]" supabase pydantic-settings httpx twilio google-genai phonenumbers python-multipart
   uv add --dev pytest pytest-asyncio ruff mypy
   ```
2. **Core Configuration & Security (`app/core/`):**
   - Implement `Settings` in `app/core/config.py` using `pydantic-settings`.
   - Implement `get_current_user` dependency in `app/core/security.py`: validates the Bearer JWT issued by Supabase Auth, loads the user's `user_roles` (`CUSTOMER`, `PROVIDER`, `VERIFICATION_REVIEWER`, `ADMIN`) and `account_status` (`ACTIVE` vs `SUSPENDED`), and raises `403` if suspended.
   - Create role guard factories: `require_role("PROVIDER")`, `require_role("VERIFICATION_REVIEWER")`, `require_role("ADMIN")`.
3. **Middleware & Health Endpoints (`app/main.py`):**
   - Add `X-Correlation-ID` middleware (attaches a UUID to every request and structured log line).
   - Expose `GET /api/v1/health` (liveness) and `GET /api/v1/ready` (checks Supabase connectivity without leaking secrets).

---

### Phase 2: Database Schema, Migrations, Constraints & Buea Seed Data
**Goal:** Establish PostgreSQL as the rock-solid source of truth with RLS and realistic Buea seed data.

1. **Write SQL Migrations (`migrations/001_initial_schema.sql`):**
   - Enable extensions: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` and `CREATE EXTENSION IF NOT EXISTS "btree_gist";`.
   - Create core tables from **Section 9.2** and **Appendix D.8**:
     - `users`, `user_profiles`, `user_roles`, `user_addresses`
     - `identity_verifications`, `provider_profiles`, `provider_credentials`
     - `service_categories`, `services`, `provider_services`, `service_areas`, `provider_service_areas`
     - `bookings`, `booking_attachments`, `quotations`, `booking_status_history`
     - `rental_listings`, `rental_bookings`, `rental_inspections`
     - `reviews`, `complaints`, `disputes`, `notifications`, `transactions`, `audit_logs`
     - `channel_identities`, `conversations`, `messages`, `agent_runs`, `agent_tool_calls`, `notification_preferences`, `support_handoffs`
2. **Enforce Critical DB Constraints (`NFR-REL-001`, `FR-RENT-005`):**
   - Store all money fields (`indicative_price`, `total`, `price`, `deposit`, `gross_amount`, `commission`) as `BIGINT` in `XAF` (no floats!).
   - Add unique idempotency key columns (`idempotency_key TEXT UNIQUE`) on `bookings`, `rental_bookings`, and `quotations`.
   - Add the rental anti-overlap constraint on `rental_bookings`:
     ```sql
     ALTER TABLE rental_bookings
     ADD CONSTRAINT no_overlapping_confirmed_rentals
     EXCLUDE USING gist (
       listing_id WITH =,
       tstzrange(start_at, end_at, '[)') WITH &&
     )
     WHERE (status IN ('CONFIRMED', 'READY_FOR_HANDOVER', 'ACTIVE', 'RETURN_DUE'));
     ```
3. **Configure Row Level Security (`Appendix E.5`):**
   - Enable RLS on all tables.
   - Allow public `SELECT` only on active `service_categories`, `services`, `service_areas`, `rental_listings`, and verified `provider_profiles`.
   - Restrict `identity_verifications`, `provider_credentials`, `audit_logs`, and `messages` so anonymous/browser clients have zero direct access; FastAPI mediates access with strict ownership and audit checks.
4. **Create Buea Seed Script (`migrations/002_seed_buea.sql`):**
   - **Neighbourhoods (`service_areas`):** `Molyko`, `Mile 16 (Bolifamba)`, `Bonduma`, `Great Soppo`, `Bokwango`, `Muea`, `Sandpit`, `CheckPoint`, `Clerks Quarters`, `Federal Quarters`, `Buea Town`.
   - **Launch Categories (`Section 13.2`):**
     1. *Repairs & Maintenance* (Plumbing, Electrical Repairs, Water-Pump Repair)
     2. *Household & Domestic* (Home Cleaning, Laundry & Ironing)
     3. *Essential Supplies* (Drinking Water Delivery, Household Water Delivery, Authorised Cooking Gas Refill)
     4. *Equipment Rentals* (Portable Power Stations, Backup Generators)

---

### Phase 3: Auth, Dual Verification, Catalogue & Discovery APIs
**Goal:** Build the onboarding, trust-verification, and location-aware search foundation (`AC-01` to `AC-04`).

1. **Phone Normalization & Account Onboarding (`FR-AUTH-001` – `006`):**
   - Use `phonenumbers` to parse and validate Cameroon numbers (`CM`) into strict E.164 format (`+2376XXXXXXXX`).
   - Implement `GET /api/v1/users/me`, `PATCH /api/v1/users/me`, and `/api/v1/users/me/addresses`.
   - Allow a `CUSTOMER` to initialize a `PROVIDER` profile (`POST /api/v1/providers/onboard`) under the same `user_id` (`FR-AUTH-004`).
2. **Two-Tier Verification & Admin Review Queue (`FR-VER-001` – `008`):**
   - `POST /api/v1/verifications/identity`: Uploads ID image to `private-verification` bucket, records `document_type` (e.g., Cameroon CNI, Passport, Student ID) and sets status to `PENDING_REVIEW`.
   - `POST /api/v1/verifications/competence`: Allows providers to upload per-service evidence (certificates, trade references, portfolio photos) linked to `service_id`.
   - `GET /api/v1/admin/verifications` & `PATCH /api/v1/admin/verifications/{id}`:
     - Enforce rule: `if submission.user_id == current_user.id: raise HTTPException(403, "Cannot review own submission")`.
     - Generate a 5-minute signed URL for the reviewer to inspect the document.
     - On `VERIFIED`, `REJECTED`, or `ADDITIONAL_INFORMATION_REQUIRED`, update status, require a `decision_reason`, and insert an immutable row into `audit_logs`.
3. **Catalogue & Eligibility-Filtered Discovery (`FR-SRCH-001` – `006`):**
   - `GET /api/v1/providers`: Filter by `service_id`, `area_id` (Buea neighbourhood), `keyword`, `verified_only`, and pagination (`limit`, `offset`).
   - **Hard Eligibility Gate (`FR-VER-008`):** If a service has `requires_competence_verification = true` (e.g., Electrical Work, Gas Delivery), exclude providers whose `competence_status != 'VERIFIED'` for that specific `service_id`, and exclude any `SUSPENDED` or paused providers.
   - Return explicit, non-fabricated badge descriptors (e.g., `["Identity Checked", "Electrical Skill Assessed"]`).

---

### Phase 4: Core Marketplace Engine — Bookings, Quotations & Rentals
**Goal:** Implement the transactional state machines for services and third-party equipment rentals (`AC-05` to `AC-10`).

1. **Service Request & Quotation Workflow (`Section 6.2`, `FR-BOOK-001` – `012`):**
   - `POST /api/v1/bookings`: Validates `Idempotency-Key`, checks customer verification status if service requires it, verifies provider eligibility and area coverage, creates booking in `REQUESTED` state, and logs to `booking_status_history`.
   - `POST /api/v1/bookings/{id}/quotations`: Provider submits structured JSON `line_items` (`labour`, `materials`, `delivery`, `fees`), server computes `total = sum(items)` in integer `XAF`, sets `expires_at = now() + 24h`, and transitions booking to `QUOTATION_RECEIVED`.
   - `POST /api/v1/quotations/{id}/accept`: Verifies ownership, ensures quote is unexpired, atomically transitions booking to `CONFIRMED`, generates a 4-digit one-time `checkin_pin`, and creates a simulated `transactions` record (`status = 'SIMULATED_PENDING'`).
   - `PATCH /api/v1/bookings/{id}/status`: Enforces the state transition table in **Section 6.2**:
     - `CONFIRMED` $\rightarrow$ `IN_PROGRESS` (validates `checkin_pin` when provided).
     - `IN_PROGRESS` $\rightarrow$ `COMPLETED_PENDING_CONFIRMATION` (provider marks done).
     - `COMPLETED_PENDING_CONFIRMATION` $\rightarrow$ `COMPLETED` (customer confirms completion).
2. **Third-Party Equipment Rental Engine (`Section 6.3`, `FR-RENT-001` – `009`):**
   - `POST /api/v1/rental-listings`: Requires mandatory technical specs: `capacity_wh` (e.g., `2048`), `continuous_output_w` (e.g., `2200`), `peak_output_w` (e.g., `4400`), `connectors`, `condition`, `daily_rate_xaf`, `deposit_xaf`, and `owner_attestation = true`.
   - **Compatibility Estimator Helper (`FR-RENT-008`):** Given a list of appliances `[(name, watts, hours)]`, compute total energy required:
     $$E_{\text{needed}} = \sum_{i} (P_i \times t_i) \quad [\text{Wh}]$$
     and peak continuous power:
     $$P_{\text{peak}} = \max \text{ or } \sum_{\text{concurrent}} P_i \quad [\text{W}]$$
     Compare against $0.85 \times \text{capacity\_wh}$ (accounting for inverter efficiency losses) and `continuous_output_w`, returning clear warnings if appliances exceed inverter limits.
   - `POST /api/v1/rental-bookings`: Relies on the PostgreSQL `EXCLUDE` constraint to reject overlapping confirmed dates with a clean `409 Conflict` message.
   - `POST /api/v1/rental-bookings/{id}/inspections`: Records `HANDOVER` and `RETURN` condition notes, accessories checklist, serial number, and photos.
3. **Reviews & Safety Reports (`FR-REV-001`, `FR-SAFE-001` – `002`):**
   - `POST /api/v1/reviews`: Rejects with `400` unless `booking.status == 'COMPLETED'` and caller is a booking participant who hasn't reviewed yet (`AC-09`).
   - `POST /api/v1/complaints` & `POST /api/v1/reports`: Creates a case reference (`ALICE-CASE-XXXX`) visible only to `ADMIN` / support reviewers.

---

### Phase 5: WhatsApp AI Agent (Twilio + Google Gemini)
**Goal:** Build the bilingual conversational channel with strict security, tool allowlisting, and confirmation gates (`Appendix D & G`).

1. **Account Linking Flow (`Appendix D.6`, `E.7`):**
   - `POST /api/v1/whatsapp/link/start`: Authenticated PWA user requests a 6-digit linking code (stored hashed with a 10-minute TTL).
   - When the user sends `LINK 123456` on WhatsApp, FastAPI verifies the code, links `whatsapp:+237...` to `user_id` in `channel_identities`, and records `consent_at`.
   - Unlinked users can still browse public categories, search providers, and view rental listings (`Stage D1`), while private booking/rental creation and status checks require linking (`Stages D2–D3`).
2. **Twilio Webhook & Async Worker (`Appendix E.6`):**
   - `POST /api/v1/integrations/twilio/whatsapp/inbound`:
     1. Reconstruct full external URL (`PUBLIC_BASE_URL + request.url.path`) and validate `X-Twilio-Signature` using `twilio.request_validator.RequestValidator`. Reject invalid signatures with `403`.
     2. Update `conversations.last_inbound_at` and `service_window_expires_at = now() + 24h`.
     3. Insert inbound `MessageSid` into `messages`; if duplicate, return `200 OK` immediately (`FR-WA-014`).
     4. Dispatch `process_whatsapp_turn(conversation_id, message_id)` via `BackgroundTasks` and return `200 OK`.
3. **Gemini Adapter & Allowlisted Tool Declarations (`Appendix G.3 & G.4`):**
   - Build `app/integrations/gemini/client.py` wrapping `google-genai` (`genai.Client(api_key=settings.GEMINI_API_KEY)`).
   - Configure system instructions enforcing:
     - Bilingual English/French responses matching user language (`FR-WA-005`).
     - Asking only **one missing question at a time** (`FR-WA-007`).
     - Never inventing provider names, prices, ratings, or verification badges (`FR-WA-008`).
     - Explaining $\text{Wh}$ capacity vs. $\text{W}$ inverter output when discussing power rentals (`D.3.2`).
     - Prompt-injection resilience: treat all user text and provider bios as untrusted data (`NFR-AI-004`).
   - Expose **only** the 10 allowlisted tools from **Appendix D.5** (`search_services`, `get_provider_public_profile`, `draft_service_request`, `confirm_service_request`, `list_my_bookings`, `get_my_booking`, `list_my_quotations`, `search_rental_listings`, `draft_rental_request`, `confirm_rental_request`, `create_support_case`, `request_human_handoff`).
   - **Server-Side Confirmation Gate (`FR-GEM-005`):** `confirm_service_request` and `confirm_rental_request` inspect `conversation.state["pending_draft"]` and verify that the user's latest message explicitly confirmed the read-back summary before calling the FastAPI domain service.
   - Log every tool execution in `agent_runs` and `agent_tool_calls` (redacting PII/secrets) and fall back to a numbered quick-reply menu + human handoff if Gemini times out (`G.7`).

---

### Phase 6: Mobile-First PWA Frontend (React + Vite + TypeScript + Tailwind)
**Goal:** Deliver an installable, low-bandwidth-friendly mobile interface matching ALICE's visual tokens (`Section 11`, `AC-11`).

1. **Scaffold & Configure Design Tokens (`Section 11.6 & 11.7`):**
   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend && npm install tailwindcss @tailwindcss/vite lucide-react @supabase/supabase-js
   ```
   - Configure custom theme tokens in CSS/Tailwind:
     - `bg-alice-canvas`: `#F0F1F5`
     - `bg-alice-card`: `#FDFDFE`
     - `bg-alice-navy`: `#181B2A`
     - `bg-alice-indigo`: `#585FB7` (primary CTA buttons, 5.53:1 contrast with white)
     - `text-alice-slate`: `#343752`
     - `text-alice-mint`: `#34C399`
     - `bg-alice-gradient`: `linear-gradient(135deg, #8980EA 0%, #AAADF2 50%, #9A73F5 100%)`
2. **Build Persistent 5-Destination Bottom Navigation (`Section 11.2`):**
   - `Home` | `Explore` | **Central Circular Action (`+ Request`)** | `Bookings` | `Rentals` | `Profile` (ensure touch targets $\ge 44\text{px}$ and zero horizontal overflow at `360px` width).
3. **Implement Core Views:**
   - **Home:** Lavender gradient header, greeting, *"What service do you need?"* search bar, quick category tiles (Repairs, Cleaning, Water, Gas, Laundry, Power Rental), active booking progress card, and safety/help shortcut.
   - **Explore:** Buea neighbourhood selector (no forced GPS), keyword search, verification/price filters, and provider cards displaying exact verification badges (e.g., *ID Checked*, *Plumbing Skill Assessed*).
   - **Booking Detail & Quotation Flow:** Form to submit request $\rightarrow$ view itemized provider quotation (`XAF`) $\rightarrow$ accept quote $\rightarrow$ view 4-digit job check-in PIN $\rightarrow$ confirm completion $\rightarrow$ leave rating & review.
   - **Power Station Rentals:** Dedicated spec cards showing **Capacity ($\text{Wh}$)**, **Continuous Output ($\text{W}$)**, **Peak Output ($\text{W}$)**, deposit terms, interactive appliance runtime estimator, and date-range booking picker.
   - **Profile & WhatsApp Linking:** Separate status pills for *Identity Verification* and *Provider Competence*, saved Buea addresses, language toggle (`EN` / `FR`), and a *"Link WhatsApp Assistant"* button that generates the 6-digit linking code.
   - **Role Switcher (Provider & Admin Tabs):**
     - *Provider view:* Manage services/areas, respond to requests with itemized quotations, manage power station listings, and log handover/return inspections.
     - *Admin view:* Verification review queue (with signed image preview + mandatory rejection/approval reason), complaint/dispute triage, catalogue manager, and audit log viewer.

---

### Phase 7: Automated Testing & Hackathon Demo Script
**Goal:** Verify all 12 acceptance criteria (`Section 13.4`) and prepare a bulletproof live demo.

1. **Automated Pytest Suite (`Appendix E.4`, `Section 14.1`):**
   - Run `uv run pytest` covering:
     - **Unit tests:** Quotation line-item summation, valid/invalid booking state transitions, power station $\text{Wh}$/$\text{W}$ compatibility warnings.
     - **Integration tests:** Rental overlap `EXCLUDE` constraint rejection (`AC-07`), verification audit logging (`AC-02`).
     - **Security tests:** Customer A cannot read Customer B's booking (`FR-AUTH-005`); provider cannot self-approve verification (`Section 3.1`); unauthenticated request to private ID file fails (`AC-12`); invalid Twilio signature returns `403` (`FR-WA-002`).
     - **AI Agent tests:** Mocked Gemini tool-calling verifies confirmation gate (`FR-GEM-005`) and bilingual EN/FR intent handling (`FR-GEM-010`).
2. **Live Demo Walkthrough Sequence (5 Minutes):**
   - **Act 1 (Trust & Verification):** Show a provider in Molyko who is *ID Verified* but *Competence Pending*—prove they cannot accept restricted electrical work until an Admin approves their competence evidence in the Admin Queue (and show the resulting Audit Log entry).
   - **Act 2 (WhatsApp AI Booking in French/English):** Send a WhatsApp message *"Bonjour, j'ai besoin d'un plombier à Molyko pour un robinet qui fuit"*. Watch Gemini search eligible providers, ask one clarifying question, present a summary, wait for *"Oui, confirme"*, and create a real booking visible immediately in the PWA.
   - **Act 3 (Quote & Completion):** Provider sends an itemized `XAF` quote in the PWA $\rightarrow$ Customer accepts $\rightarrow$ Job PIN check-in $\rightarrow$ Dual completion $\rightarrow$ Review submitted.
   - **Act 4 (Buea Power Station Rental & Concurrency):** Customer inspects a third-party `2048 Wh / 2200 W` power station, runs the appliance compatibility check, books it for 24 hours, and demonstrates that a second customer trying to book the overlapping window is blocked.

---

## 4. MVP Acceptance Criteria Sign-Off Checklist

| Criterion | Description | Target Phase | Status |
| :--- | :--- | :--- | :--- |
| `AC-01` | Customer registers (`+237`), verifies phone, and submits ID doc (`PENDING_REVIEW`). | Phase 3 | [ ] |
| `AC-02` | Admin reviews ID submission and records decision with mandatory reason & audit log. | Phase 3 | [ ] |
| `AC-03` | Provider submits identity and service-specific competence evidence separately. | Phase 3 | [ ] |
| `AC-04` | Only eligible providers appear in discovery results for restricted services. | Phase 3 | [ ] |
| `AC-05` | Customer submits service request and receives itemized provider quotation. | Phase 4 | [ ] |
| `AC-06` | Accepting quotation creates `CONFIRMED` booking with full timestamped history. | Phase 4 | [ ] |
| `AC-07` | System prevents duplicate/overlapping confirmed rentals of the same unit. | Phase 2 & 4 | [ ] |
| `AC-08` | Customer views $2\text{ kWh}$-class power station capacity ($\text{Wh}$) & output ($\text{W}$) and requests rental. | Phase 4 & 6 | [ ] |
| `AC-09` | `COMPLETED` booking enables review; uncompleted/cancelled booking rejects review. | Phase 4 | [ ] |
| `AC-10` | Customer and provider can submit safety/service reports visible to Admin. | Phase 4 & 6 | [ ] |
| `AC-11` | Mobile PWA is responsive at `360px` width and matches ALICE design tokens. | Phase 6 | [ ] |
| `AC-12` | Private identity files are inaccessible to anonymous or unrelated accounts. | Phase 2 & 3 | [ ] |