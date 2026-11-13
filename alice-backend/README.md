# ALICE Backend (`alice-backend`)

Hyper-Local Home Services & Portable Power Station Rental Platform for Buea, Cameroon.

---

## 1. Approved Stack & Technology Baseline

Per **ALICE SRS v1.2 (Appendix E)** and the **Engineering Step-by-Step Build Guide**:
- **Language:** Python 3.12 (pinned via `.python-version`)
- **Package & Environment Manager:** `uv` (`pyproject.toml`, `uv.lock`)
- **API Framework:** FastAPI + Uvicorn
- **Primary Database:** Supabase PostgreSQL (Postgres 15+)
- **Authentication:** Supabase Auth (Phone OTP + Bearer JWT)
- **Object Storage:** Supabase Storage (`public-media` and `private-verification` buckets)
- **External Integrations:** Twilio WhatsApp Business API, Google Gemini AI (`google-genai`)

---

## 2. Project Architecture (Modular Monolith)

```text
backend/ (and alice-backend/ junction)
├── pyproject.toml              # Dependencies and tool configurations (uv, pytest, ruff)
├── uv.lock                     # Locked dependency tree
├── .python-version             # Pinned Python 3.12
├── .env.example                # Canonical environment template
├── migrations/
│   ├── 001_initial_schema.sql  # Section 9 & Appendix D.8 schema, state triggers, EXCLUDE constraint, RLS, Buea seed
│   └── 002_seed_buea.sql       # Standalone Buea seed data (11 neighbourhoods, 4 categories, 10 launch services)
├── app/
│   ├── main.py                 # FastAPI application factory, Correlation ID & CORS middlewares
│   ├── core/
│   │   ├── config.py           # Pydantic Settings env loader
│   │   ├── security.py         # Supabase JWT decode, AuthenticatedUser, role guards
│   │   ├── exceptions.py       # Standardized JSON error envelopes
│   │   └── logging.py          # Contextual redacting logger with correlation-ID injection
│   ├── api/v1/
│   │   ├── router.py           # Master v1 API router aggregating all domain modules
│   │   └── health.py           # /health (liveness) and /ready (readiness)
│   ├── integrations/
│   │   ├── supabase/           # PostgreSQL and Storage client wrappers
│   │   ├── twilio/             # Twilio WhatsApp client and webhook signature validator
│   │   └── gemini/             # Google Gemini AI client adapter
│   └── modules/
│       ├── auth/               # E.164 Cameroon (+237) phone normalization, OTP hooks, role assignment
│       ├── users/              # Profiles, language preferences, Buea addresses
│       ├── verification/       # Two-tier trust: ID & competence verification, anti-self-review queue
│       ├── catalogue/          # Service categories, services with risk/eligibility flags, Buea neighbourhoods
│       ├── providers/          # Onboarding, provider profiles, eligibility-filtered search (FR-VER-008)
│       ├── bookings/           # Service requests, line-item XAF quotations, job check-in PIN, Section 6.2 state machine
│       ├── rentals/            # Power stations (Wh / W), runtime compatibility calculator, anti-overlap bookings (AC-07)
│       ├── reviews/            # Post-completion ratings (1-5) and moderation (AC-09)
│       ├── disputes/           # Safety reports, ALICE-CASE-XXXX dispute case tracking, admin resolution (AC-10)
│       ├── notifications/      # In-app feed and WhatsApp notification preferences
│       └── whatsapp_agent/     # Account linking, async worker, Twilio webhook (FR-WA-014)
└── tests/
    ├── conftest.py             # Fixtures for AsyncClient and mock JWT tokens
    ├── unit/
    │   ├── test_phone_normalization.py
    │   ├── test_power_estimator.py
    │   └── test_booking_state_machine.py
    └── api/
        ├── test_health.py
        ├── test_auth_api.py
        ├── test_rentals_api.py
        └── test_verification_api.py
```

---

## 3. Quick Start with `uv`

### Install Dependencies
```bash
uv sync
```

### Run Tests & Linting
```bash
# Execute test suite
uv run pytest

# Run Ruff linter and code formatting
uv run ruff check .
uv run ruff format .
```

### Start Development Server
```bash
uv run uvicorn app.main:app --reload --port 8000
```
- Swagger UI Documentation: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/api/v1/health`
- Readiness Probe: `http://localhost:8000/api/v1/ready`

---

## 4. Database Migrations

Apply `migrations/001_initial_schema.sql` directly to your Supabase PostgreSQL instance via the Supabase Dashboard SQL Editor or via the Supabase CLI:

```bash
supabase db push
# or
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

