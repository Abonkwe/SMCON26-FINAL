-- ============================================================================
-- ALICE MARKETPLACE PLATFORM
-- Migration: 001_initial_schema.sql
-- Description: Core Schema (Section 9 & Appendix D.8), State Transitions,
--              PostgreSQL EXCLUDE Anti-Overlap Constraint, RLS Policies,
--              and Initial Buea Seed Data (Neighbourhoods & Launch Categories).
-- Target: Supabase PostgreSQL (Postgres 15+)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. CORE ENUMS & LOOKUPS (CHECK CONSTRAINTS)
-- ----------------------------------------------------------------------------

-- Helper function to check roles in RLS policies efficiently
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role_code = required_role
  );
$$;

-- Helper function to check if current user is admin or verification reviewer
CREATE OR REPLACE FUNCTION public.is_admin_or_reviewer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role_code IN ('ADMIN', 'VERIFICATION_REVIEWER')
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. SECTION 9: CORE TABLES
-- ----------------------------------------------------------------------------

-- 3.1 USERS
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_e164 VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    auth_subject VARCHAR(255) UNIQUE,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    legal_name TEXT,
    display_name TEXT NOT NULL,
    avatar_ref TEXT,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en'
        CHECK (preferred_language IN ('en', 'fr')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    role_code VARCHAR(30) NOT NULL
        CHECK (role_code IN ('CUSTOMER', 'PROVIDER', 'VERIFICATION_REVIEWER', 'ADMIN')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_code)
);

-- 3.4 SERVICE AREAS (Buea Neighbourhoods)
CREATE TABLE IF NOT EXISTS public.service_areas (
    area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Buea',
    parent_area_id UUID REFERENCES public.service_areas(area_id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, city)
);

-- 3.5 USER ADDRESSES
CREATE TABLE IF NOT EXISTS public.user_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL DEFAULT 'Home',
    area_id UUID NOT NULL REFERENCES public.service_areas(area_id) ON DELETE RESTRICT,
    landmark TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    delivery_notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 IDENTITY VERIFICATIONS (Two-Tier Trust: Level 1)
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL
        CHECK (document_type IN ('NATIONAL_ID', 'PASSPORT', 'STUDENT_ID', 'VOTER_CARD', 'RESIDENCE_PERMIT')),
    private_file_ref TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED')),
    reviewer_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    decision_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 PROVIDER PROFILES
CREATE TABLE IF NOT EXISTS public.provider_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    provider_type VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL'
        CHECK (provider_type IN ('INDIVIDUAL', 'BUSINESS')),
    public_name TEXT NOT NULL,
    bio TEXT,
    base_area_id UUID REFERENCES public.service_areas(area_id) ON DELETE SET NULL,
    coverage_radius_km NUMERIC(5, 2) DEFAULT 10.0,
    identity_status VARCHAR(40) NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (identity_status IN ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
    competence_summary TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    rating_average NUMERIC(3, 2) NOT NULL DEFAULT 0.00
        CHECK (rating_average >= 0.00 AND rating_average <= 5.00),
    review_count INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS public.service_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL UNIQUE,
    name_fr VARCHAR(100) NOT NULL UNIQUE,
    icon_key VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 SERVICES
CREATE TABLE IF NOT EXISTS public.services (
    service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.service_categories(category_id) ON DELETE RESTRICT,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW'
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    requires_competence_verification BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, name_en)
);

-- 3.10 PROVIDER CREDENTIALS (Two-Tier Trust: Level 2 Professional Competence)
CREATE TABLE IF NOT EXISTS public.provider_credentials (
    credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(service_id) ON DELETE RESTRICT,
    evidence_type VARCHAR(50) NOT NULL
        CHECK (evidence_type IN ('DIPLOMA_CERTIFICATE', 'TRADE_REFERENCE', 'PORTFOLIO_PHOTO', 'GOVERNMENT_PERMIT')),
    private_file_ref TEXT NOT NULL,
    issuer TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED')),
    reviewer_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    decision_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.11 PROVIDER SERVICES
CREATE TABLE IF NOT EXISTS public.provider_services (
    provider_service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(service_id) ON DELETE RESTRICT,
    pricing_model VARCHAR(30) NOT NULL DEFAULT 'QUOTE_REQUIRED'
        CHECK (pricing_model IN ('FIXED', 'HOURLY', 'QUOTE_REQUIRED', 'PER_UNIT')),
    indicative_price BIGINT NOT NULL DEFAULT 0 CHECK (indicative_price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
    duration_estimate_minutes INT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider_id, service_id)
);

-- 3.12 PROVIDER SERVICE AREAS (Advertised Coverage)
CREATE TABLE IF NOT EXISTS public.provider_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(service_id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.service_areas(area_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider_id, service_id, area_id)
);

-- 3.13 BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(service_id) ON DELETE RESTRICT,
    area_id UUID NOT NULL REFERENCES public.service_areas(area_id) ON DELETE RESTRICT,
    address_snapshot JSONB NOT NULL,
    description TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ,
    price_basis VARCHAR(50) NOT NULL DEFAULT 'QUOTE_REQUIRED',
    checkin_pin VARCHAR(6),
    status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN (
            'REQUESTED',
            'QUOTATION_PENDING',
            'QUOTATION_RECEIVED',
            'ACCEPTED',
            'CONFIRMED',
            'IN_PROGRESS',
            'COMPLETED_PENDING_CONFIRMATION',
            'COMPLETED',
            'CANCELLED',
            'DISPUTED'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.14 BOOKING ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.booking_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
    file_ref TEXT NOT NULL,
    file_type VARCHAR(50),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.15 QUOTATIONS
CREATE TABLE IF NOT EXISTS public.quotations (
    quotation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE,
    booking_id UUID NOT NULL REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    version INT NOT NULL DEFAULT 1,
    line_items JSONB NOT NULL,
    total BIGINT NOT NULL CHECK (total >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
    valid_until TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.16 BOOKING STATUS HISTORY (State Transition Audit)
CREATE TABLE IF NOT EXISTS public.booking_status_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(booking_id) ON DELETE CASCADE,
    old_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    actor_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.17 RENTAL LISTINGS (Portable Power Stations & Backup Generators)
CREATE TABLE IF NOT EXISTS public.rental_listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    capacity_wh INT NOT NULL CHECK (capacity_wh > 0),
    continuous_output_w INT NOT NULL CHECK (continuous_output_w > 0),
    peak_output_w INT NOT NULL CHECK (peak_output_w >= continuous_output_w),
    condition VARCHAR(30) NOT NULL DEFAULT 'GOOD'
        CHECK (condition IN ('NEW', 'EXCELLENT', 'GOOD', 'FAIR')),
    daily_rate_xaf BIGINT NOT NULL CHECK (daily_rate_xaf > 0),
    deposit_xaf BIGINT NOT NULL DEFAULT 0 CHECK (deposit_xaf >= 0),
    accessories_included JSONB NOT NULL DEFAULT '[]'::jsonb,
    owner_attestation BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.18 RENTAL AVAILABILITY
CREATE TABLE IF NOT EXISTS public.rental_availability (
    availability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.rental_listings(listing_id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (availability_status IN ('AVAILABLE', 'MAINTENANCE', 'BLOCKED')),
    CHECK (end_at > start_at)
);

-- 3.19 RENTAL BOOKINGS (with native PostgreSQL EXCLUDE constraint)
CREATE TABLE IF NOT EXISTS public.rental_bookings (
    rental_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE,
    listing_id UUID NOT NULL REFERENCES public.rental_listings(listing_id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    total_price BIGINT NOT NULL CHECK (total_price >= 0),
    deposit_amount BIGINT NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    deposit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (deposit_status IN ('PENDING', 'HELD_SIMULATED', 'REFUNDED', 'FORFEITED_PARTIAL', 'FORFEITED_FULL')),
    status VARCHAR(40) NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN (
            'REQUESTED',
            'PENDING_PROVIDER',
            'CONFIRMED',
            'READY_FOR_HANDOVER',
            'ACTIVE',
            'RETURN_DUE',
            'RETURNED',
            'COMPLETED',
            'CANCELLED',
            'DISPUTED'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at),
    -- Anti-overlap exclusion constraint preventing concurrent double-bookings
    CONSTRAINT no_overlapping_confirmed_rentals
    EXCLUDE USING gist (
        listing_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status IN ('CONFIRMED', 'READY_FOR_HANDOVER', 'ACTIVE', 'RETURN_DUE'))
);

-- 3.20 RENTAL INSPECTIONS
CREATE TABLE IF NOT EXISTS public.rental_inspections (
    inspection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rental_bookings(rental_id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL
        CHECK (stage IN ('HANDOVER', 'RETURN')),
    photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    accessories_present JSONB NOT NULL DEFAULT '[]'::jsonb,
    serial_number_verified TEXT,
    condition_notes TEXT,
    actor_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.21 REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(booking_id) ON DELETE RESTRICT,
    rental_id UUID REFERENCES public.rental_bookings(rental_id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    subratings JSONB,
    comment TEXT,
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (moderation_status IN ('PUBLISHED', 'FLAGGED', 'HIDDEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (booking_id IS NOT NULL OR rental_id IS NOT NULL),
    UNIQUE (booking_id, reviewer_id)
);

-- 3.22 COMPLAINTS
CREATE TABLE IF NOT EXISTS public.complaints (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(booking_id) ON DELETE SET NULL,
    rental_id UUID REFERENCES public.rental_bookings(rental_id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    subject_id UUID REFERENCES public.users(user_id) ON DELETE RESTRICT,
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.23 DISPUTES
CREATE TABLE IF NOT EXISTS public.disputes (
    dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_ref VARCHAR(30) NOT NULL UNIQUE,
    complaint_id UUID NOT NULL REFERENCES public.complaints(complaint_id) ON DELETE RESTRICT,
    assigned_admin_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    outcome VARCHAR(40) NOT NULL DEFAULT 'PENDING'
        CHECK (outcome IN ('PENDING', 'UPHELD_CUSTOMER', 'UPHELD_PROVIDER', 'MUTUAL_RESOLUTION', 'DISMISSED')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3.24 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP'
        CHECK (channel IN ('IN_APP', 'WHATSAPP', 'SMS')),
    event_type VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.25 TRANSACTIONS (Simulated XAF Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(booking_id) ON DELETE SET NULL,
    rental_id UUID REFERENCES public.rental_bookings(rental_id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    payee_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    gross_amount BIGINT NOT NULL CHECK (gross_amount >= 0),
    commission BIGINT NOT NULL DEFAULT 0 CHECK (commission >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'SIMULATED_MOBILE_MONEY',
    status VARCHAR(30) NOT NULL DEFAULT 'SIMULATED_PENDING'
        CHECK (status IN ('SIMULATED_PENDING', 'SIMULATED_SUCCESS', 'SIMULATED_FAILED')),
    external_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.26 AUDIT LOGS (Immutable Operations History)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    reason TEXT,
    safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. APPENDIX D.8: WHATSAPP AI AGENT TABLES
-- ----------------------------------------------------------------------------

-- 4.1 CHANNEL IDENTITIES
CREATE TABLE IF NOT EXISTS public.channel_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    external_address_hash VARCHAR(64) NOT NULL UNIQUE,
    external_address_encrypted TEXT,
    linked_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'UNLINKED'
        CHECK (status IN ('UNLINKED', 'LINKED', 'SUSPENDED')),
    consent_at TIMESTAMPTZ,
    unlinked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    channel_identity_id UUID NOT NULL REFERENCES public.channel_identities(id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL DEFAULT 'en'
        CHECK (language IN ('en', 'fr')),
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    service_window_expires_at TIMESTAMPTZ,
    assigned_agent VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash',
    handoff_status VARCHAR(30) NOT NULL DEFAULT 'BOT'
        CHECK (handoff_status IN ('BOT', 'HUMAN_REQUESTED', 'HUMAN_ASSIGNED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    provider_message_id VARCHAR(100) UNIQUE,
    direction VARCHAR(20) NOT NULL
        CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT'
        CHECK (message_type IN ('TEXT', 'INTERACTIVE', 'MEDIA', 'LOCATION')),
    redacted_content TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
        CHECK (status IN ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.4 AGENT RUNS
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    intent VARCHAR(100),
    model_provider VARCHAR(50) NOT NULL DEFAULT 'google-gemini',
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS'
        CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'FALLBACK')),
    latency_ms INT,
    token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    tool_trace_reference TEXT,
    safety_outcome VARCHAR(30) NOT NULL DEFAULT 'SAFE'
        CHECK (safety_outcome IN ('SAFE', 'FLAGGED', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 AGENT TOOL CALLS
CREATE TABLE IF NOT EXISTS public.agent_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    arguments_redacted JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_reference TEXT,
    authorization_outcome VARCHAR(30) NOT NULL DEFAULT 'ALLOWED'
        CHECK (authorization_outcome IN ('ALLOWED', 'DENIED', 'CONFIRMATION_REQUIRED')),
    confirmed_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.6 NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    language VARCHAR(5) NOT NULL DEFAULT 'en'
        CHECK (language IN ('en', 'fr')),
    transactional_updates BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.7 SUPPORT HANDOFFS
CREATE TABLE IF NOT EXISTS public.support_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ASSIGNED', 'RESOLVED')),
    assigned_to UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 5. STATE MACHINE TRANSITION ENFORCEMENT & HISTORY TRIGGERS
-- ----------------------------------------------------------------------------

-- 5.1 Booking State Transition Validator Function
CREATE OR REPLACE FUNCTION public.check_booking_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    is_valid BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    CASE OLD.status
        WHEN 'REQUESTED' THEN
            is_valid := NEW.status IN ('QUOTATION_PENDING', 'ACCEPTED', 'CANCELLED');
        WHEN 'QUOTATION_PENDING' THEN
            is_valid := NEW.status IN ('QUOTATION_RECEIVED', 'CANCELLED');
        WHEN 'QUOTATION_RECEIVED' THEN
            is_valid := NEW.status IN ('ACCEPTED', 'CANCELLED');
        WHEN 'ACCEPTED' THEN
            is_valid := NEW.status IN ('CONFIRMED', 'CANCELLED');
        WHEN 'CONFIRMED' THEN
            is_valid := NEW.status IN ('IN_PROGRESS', 'CANCELLED', 'DISPUTED');
        WHEN 'IN_PROGRESS' THEN
            is_valid := NEW.status IN ('COMPLETED_PENDING_CONFIRMATION', 'DISPUTED');
        WHEN 'COMPLETED_PENDING_CONFIRMATION' THEN
            is_valid := NEW.status IN ('COMPLETED', 'DISPUTED');
        WHEN 'COMPLETED' THEN
            is_valid := FALSE; -- Terminal state
        WHEN 'CANCELLED' THEN
            is_valid := FALSE; -- Terminal state
        WHEN 'DISPUTED' THEN
            is_valid := NEW.status IN ('COMPLETED', 'CANCELLED');
        ELSE
            is_valid := FALSE;
    END CASE;

    IF NOT is_valid THEN
        RAISE EXCEPTION 'Illegal booking status transition from % to % for booking %',
            OLD.status, NEW.status, OLD.booking_id;
    END IF;

    -- Record status transition history automatically
    INSERT INTO public.booking_status_history (
        booking_id,
        old_status,
        new_status,
        actor_id,
        reason,
        timestamp
    ) VALUES (
        NEW.booking_id,
        OLD.status,
        NEW.status,
        (SELECT auth.uid()),
        'Transition via status update',
        now()
    );

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_state_transition ON public.bookings;
CREATE TRIGGER trg_booking_state_transition
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_booking_state_transition();

-- 5.2 Rental State Transition Validator Function
CREATE OR REPLACE FUNCTION public.check_rental_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    is_valid BOOLEAN := FALSE;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    CASE OLD.status
        WHEN 'REQUESTED' THEN
            is_valid := NEW.status IN ('PENDING_PROVIDER', 'CANCELLED');
        WHEN 'PENDING_PROVIDER' THEN
            is_valid := NEW.status IN ('CONFIRMED', 'CANCELLED');
        WHEN 'CONFIRMED' THEN
            is_valid := NEW.status IN ('READY_FOR_HANDOVER', 'CANCELLED', 'DISPUTED');
        WHEN 'READY_FOR_HANDOVER' THEN
            is_valid := NEW.status IN ('ACTIVE', 'CANCELLED', 'DISPUTED');
        WHEN 'ACTIVE' THEN
            is_valid := NEW.status IN ('RETURN_DUE', 'DISPUTED');
        WHEN 'RETURN_DUE' THEN
            is_valid := NEW.status IN ('RETURNED', 'DISPUTED');
        WHEN 'RETURNED' THEN
            is_valid := NEW.status IN ('COMPLETED', 'DISPUTED');
        WHEN 'COMPLETED' THEN
            is_valid := FALSE; -- Terminal
        WHEN 'CANCELLED' THEN
            is_valid := FALSE; -- Terminal
        WHEN 'DISPUTED' THEN
            is_valid := NEW.status IN ('COMPLETED', 'CANCELLED');
        ELSE
            is_valid := FALSE;
    END CASE;

    IF NOT is_valid THEN
        RAISE EXCEPTION 'Illegal rental status transition from % to % for rental %',
            OLD.status, NEW.status, OLD.rental_id;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rental_state_transition ON public.rental_bookings;
CREATE TRIGGER trg_rental_state_transition
    BEFORE UPDATE OF status ON public.rental_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_rental_state_transition();

-- ----------------------------------------------------------------------------
-- 6. INDEXES FOR PERFORMANCE AND RLS OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id ON public.identity_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status ON public.identity_verifications (status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_base_area ON public.provider_profiles (base_area_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_identity_status ON public.provider_profiles (identity_status);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services (category_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider_id ON public.provider_credentials (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_service_id ON public.provider_credentials (service_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_status ON public.provider_credentials (status);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON public.provider_services (service_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider ON public.provider_service_areas (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_area ON public.provider_service_areas (area_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings (provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_quotations_booking_id ON public.quotations (booking_id);
CREATE INDEX IF NOT EXISTS idx_quotations_provider_id ON public.quotations (provider_id);
CREATE INDEX IF NOT EXISTS idx_rental_listings_owner ON public.rental_listings (owner_provider_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_customer ON public.rental_bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_provider ON public.rental_bookings (provider_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_listing ON public.rental_bookings (listing_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON public.rental_bookings (status);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews (booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews (reviewee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter_id ON public.complaints (reporter_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON public.transactions (payer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payee ON public.transactions (payee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_channel_identities_user_id ON public.channel_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_identity ON public.conversations (channel_identity_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation ON public.agent_runs (conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_run ON public.agent_tool_calls (agent_run_id);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on every table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_handoffs ENABLE ROW LEVEL SECURITY;

-- 7.1 Public Catalogs (Read-only for all, write for Admin)
CREATE POLICY "Public read active service_categories"
    ON public.service_categories FOR SELECT
    USING (active = true OR public.has_role('ADMIN'));

CREATE POLICY "Public read active services"
    ON public.services FOR SELECT
    USING (active = true OR public.has_role('ADMIN'));

CREATE POLICY "Public read active service_areas"
    ON public.service_areas FOR SELECT
    USING (active = true OR public.has_role('ADMIN'));

CREATE POLICY "Public read active rental_listings"
    ON public.rental_listings FOR SELECT
    USING (active = true OR (owner_provider_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Public read active provider_profiles"
    ON public.provider_profiles FOR SELECT
    USING (is_available = true OR (user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Public read published reviews"
    ON public.reviews FOR SELECT
    USING (moderation_status = 'PUBLISHED' OR (reviewer_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

-- 7.2 Users & Profiles (Self or Admin)
CREATE POLICY "Users read self or admin"
    ON public.users FOR SELECT
    USING ((user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Users update self or admin"
    ON public.users FOR UPDATE
    USING ((user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Profiles read all authenticated"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Profiles update self"
    ON public.user_profiles FOR UPDATE
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "User roles read self or admin"
    ON public.user_roles FOR SELECT
    USING ((user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "User addresses manage self"
    ON public.user_addresses FOR ALL
    USING (user_id = (SELECT auth.uid()));

-- 7.3 Verifications & Credentials (Self submission, Reviewer/Admin inspection)
CREATE POLICY "Identity verifications select self or reviewer"
    ON public.identity_verifications FOR SELECT
    USING ((user_id = (SELECT auth.uid())) OR public.is_admin_or_reviewer());

CREATE POLICY "Identity verifications insert self"
    ON public.identity_verifications FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Identity verifications update reviewer"
    ON public.identity_verifications FOR UPDATE
    USING (public.is_admin_or_reviewer());

CREATE POLICY "Provider credentials select self or reviewer"
    ON public.provider_credentials FOR SELECT
    USING ((provider_id = (SELECT auth.uid())) OR public.is_admin_or_reviewer());

CREATE POLICY "Provider credentials insert self"
    ON public.provider_credentials FOR INSERT
    WITH CHECK (provider_id = (SELECT auth.uid()));

CREATE POLICY "Provider credentials update reviewer"
    ON public.provider_credentials FOR UPDATE
    USING (public.is_admin_or_reviewer());

-- 7.4 Provider Offerings
CREATE POLICY "Provider profiles manage self"
    ON public.provider_profiles FOR ALL
    USING ((user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Provider services read all"
    ON public.provider_services FOR SELECT
    USING (active = true OR (provider_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Provider services manage self"
    ON public.provider_services FOR ALL
    USING (provider_id = (SELECT auth.uid()));

CREATE POLICY "Provider service areas read all"
    ON public.provider_service_areas FOR SELECT
    USING (true);

CREATE POLICY "Provider service areas manage self"
    ON public.provider_service_areas FOR ALL
    USING (provider_id = (SELECT auth.uid()));

-- 7.5 Bookings & Quotations (Customer, Provider, or Admin)
CREATE POLICY "Bookings view participants"
    ON public.bookings FOR SELECT
    USING (
        (customer_id = (SELECT auth.uid())) OR
        (provider_id = (SELECT auth.uid())) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Bookings insert customer"
    ON public.bookings FOR INSERT
    WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY "Bookings update participants"
    ON public.bookings FOR UPDATE
    USING (
        (customer_id = (SELECT auth.uid())) OR
        (provider_id = (SELECT auth.uid())) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Quotations view participants"
    ON public.quotations FOR SELECT
    USING (
        (provider_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.booking_id = quotations.booking_id
              AND b.customer_id = (SELECT auth.uid())
        ) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Quotations manage provider"
    ON public.quotations FOR ALL
    USING (provider_id = (SELECT auth.uid()));

CREATE POLICY "Booking status history view participants"
    ON public.booking_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.booking_id = booking_status_history.booking_id
              AND (b.customer_id = (SELECT auth.uid()) OR b.provider_id = (SELECT auth.uid()))
        ) OR
        public.has_role('ADMIN')
    );

-- 7.6 Rentals (Customer, Provider, or Admin)
CREATE POLICY "Rental listings manage owner"
    ON public.rental_listings FOR ALL
    USING ((owner_provider_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Rental bookings view participants"
    ON public.rental_bookings FOR SELECT
    USING (
        (customer_id = (SELECT auth.uid())) OR
        (provider_id = (SELECT auth.uid())) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Rental bookings insert customer"
    ON public.rental_bookings FOR INSERT
    WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY "Rental bookings update participants"
    ON public.rental_bookings FOR UPDATE
    USING (
        (customer_id = (SELECT auth.uid())) OR
        (provider_id = (SELECT auth.uid())) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Rental inspections view participants"
    ON public.rental_inspections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rental_bookings rb
            WHERE rb.rental_id = rental_inspections.rental_id
              AND (rb.customer_id = (SELECT auth.uid()) OR rb.provider_id = (SELECT auth.uid()))
        ) OR
        public.has_role('ADMIN')
    );

-- 7.7 Reviews, Complaints & Disputes
CREATE POLICY "Reviews create participant"
    ON public.reviews FOR INSERT
    WITH CHECK (reviewer_id = (SELECT auth.uid()));

CREATE POLICY "Complaints create reporter"
    ON public.complaints FOR INSERT
    WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "Complaints view reporter or admin"
    ON public.complaints FOR SELECT
    USING ((reporter_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Disputes view admin or assigned"
    ON public.disputes FOR ALL
    USING (public.has_role('ADMIN') OR (assigned_admin_id = (SELECT auth.uid())));

-- 7.8 Notifications & Preferences
CREATE POLICY "Notifications view recipient"
    ON public.notifications FOR SELECT
    USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Notification preferences manage self"
    ON public.notification_preferences FOR ALL
    USING (user_id = (SELECT auth.uid()));

-- 7.9 Transactions & Audit Logs
CREATE POLICY "Transactions view participants"
    ON public.transactions FOR SELECT
    USING (
        (payer_id = (SELECT auth.uid())) OR
        (payee_id = (SELECT auth.uid())) OR
        public.has_role('ADMIN')
    );

CREATE POLICY "Audit logs admin only"
    ON public.audit_logs FOR SELECT
    USING (public.has_role('ADMIN'));

-- 7.10 WhatsApp Channel & Conversation Data (Admin/System/Owner only)
CREATE POLICY "Channel identities manage owner or admin"
    ON public.channel_identities FOR ALL
    USING ((user_id = (SELECT auth.uid())) OR public.has_role('ADMIN'));

CREATE POLICY "Conversations manage admin"
    ON public.conversations FOR ALL
    USING (public.has_role('ADMIN'));

CREATE POLICY "Messages manage admin"
    ON public.messages FOR ALL
    USING (public.has_role('ADMIN'));

CREATE POLICY "Agent runs manage admin"
    ON public.agent_runs FOR ALL
    USING (public.has_role('ADMIN'));

CREATE POLICY "Agent tool calls manage admin"
    ON public.agent_tool_calls FOR ALL
    USING (public.has_role('ADMIN'));

CREATE POLICY "Support handoffs manage admin"
    ON public.support_handoffs FOR ALL
    USING (public.has_role('ADMIN'));

-- ----------------------------------------------------------------------------
-- 8. INITIAL BUEA SEED DATA (Neighbourhoods & Launch Categories)
-- ----------------------------------------------------------------------------

-- 8.1 Buea Service Areas (11 Core Neighbourhoods)
INSERT INTO public.service_areas (area_id, name, city, active) VALUES
    ('00000000-0000-0000-0001-000000000001', 'Molyko', 'Buea', true),
    ('00000000-0000-0000-0001-000000000002', 'Mile 16 (Bolifamba)', 'Buea', true),
    ('00000000-0000-0000-0001-000000000003', 'Bonduma', 'Buea', true),
    ('00000000-0000-0000-0001-000000000004', 'Great Soppo', 'Buea', true),
    ('00000000-0000-0000-0001-000000000005', 'Bokwango', 'Buea', true),
    ('00000000-0000-0000-0001-000000000006', 'Muea', 'Buea', true),
    ('00000000-0000-0000-0001-000000000007', 'Sandpit', 'Buea', true),
    ('00000000-0000-0000-0001-000000000008', 'CheckPoint', 'Buea', true),
    ('00000000-0000-0000-0001-000000000009', 'Clerks Quarters', 'Buea', true),
    ('00000000-0000-0000-0001-000000000010', 'Federal Quarters', 'Buea', true),
    ('00000000-0000-0000-0001-000000000011', 'Buea Town', 'Buea', true)
ON CONFLICT (name, city) DO UPDATE SET active = EXCLUDED.active;

-- 8.2 Launch Categories (Section 13.2)
INSERT INTO public.service_categories (category_id, name_en, name_fr, icon_key, display_order, active) VALUES
    ('00000000-0000-0000-0002-000000000001', 'Repairs & Maintenance', 'Réparations & Entretien', 'wrench', 1, true),
    ('00000000-0000-0000-0002-000000000002', 'Household & Domestic', 'Ménage & Domestique', 'sparkles', 2, true),
    ('00000000-0000-0000-0002-000000000003', 'Essential Supplies', 'Approvisionnements Essentiels', 'droplet', 3, true),
    ('00000000-0000-0000-0002-000000000004', 'Equipment Rentals', 'Location d''Équipements', 'battery-charging', 4, true)
ON CONFLICT (name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    icon_key = EXCLUDED.icon_key,
    display_order = EXCLUDED.display_order;

-- 8.3 Launch Services with Eligibility & Risk Flags (Section 13.2)
-- Category 1: Repairs & Maintenance
INSERT INTO public.services (service_id, category_id, name_en, name_fr, description, risk_level, requires_competence_verification, active) VALUES
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'Plumbing Repairs', 'Réparations de Plomberie', 'Leak fixing, pipe repair, toilet and tap installations', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000001', 'Electrical Repairs', 'Réparations Électriques', 'Wiring, breakers, power points, safety checks (requires competence verification)', 'HIGH', true, true),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000001', 'Water-Pump Repair', 'Réparation de Pompe à Eau', 'Submersible and surface water pump troubleshooting and servicing', 'HIGH', true, true)
ON CONFLICT (category_id, name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    risk_level = EXCLUDED.risk_level,
    requires_competence_verification = EXCLUDED.requires_competence_verification;

-- Category 2: Household & Domestic
INSERT INTO public.services (service_id, category_id, name_en, name_fr, description, risk_level, requires_competence_verification, active) VALUES
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000002', 'Home Cleaning', 'Nettoyage à Domicile', 'General home, kitchen, and deep compound cleaning', 'LOW', false, true),
    ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000002', 'Laundry & Ironing', 'Lessive & Repassage', 'Wash, fold, and iron clothes and bedding with local pickup', 'LOW', false, true)
ON CONFLICT (category_id, name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    risk_level = EXCLUDED.risk_level,
    requires_competence_verification = EXCLUDED.requires_competence_verification;

-- Category 3: Essential Supplies
INSERT INTO public.services (service_id, category_id, name_en, name_fr, description, risk_level, requires_competence_verification, active) VALUES
    ('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0002-000000000003', 'Drinking Water Delivery', 'Livraison d''Eau Potable', 'Treated spring / mineral drinking water delivery to doorstep', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000007', '00000000-0000-0000-0002-000000000003', 'Household Water Delivery', 'Livraison d''Eau Domestique', 'Bulk non-potable water tanker / drums for domestic cleaning and storage', 'LOW', false, true),
    ('00000000-0000-0000-0003-000000000008', '00000000-0000-0000-0002-000000000003', 'Authorised Cooking Gas Refill', 'Recharge de Bouteille de Gaz Agréée', 'Certified 12.5kg / 6kg domestic butane gas bottle replacement & safety leak test', 'HIGH', true, true)
ON CONFLICT (category_id, name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    risk_level = EXCLUDED.risk_level,
    requires_competence_verification = EXCLUDED.requires_competence_verification;

-- Category 4: Equipment Rentals
INSERT INTO public.services (service_id, category_id, name_en, name_fr, description, risk_level, requires_competence_verification, active) VALUES
    ('00000000-0000-0000-0003-000000000009', '00000000-0000-0000-0002-000000000004', 'Portable Power Stations', 'Stations Électriques Portables', '1kWh - 3kWh silent lithium battery power stations for blackout resilience', 'MEDIUM', false, true),
    ('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0002-000000000004', 'Backup Generators', 'Groupes Électrogènes de Secours', 'Fuel-powered backup electricity generators with technical safety handover', 'HIGH', true, true)
ON CONFLICT (category_id, name_en) DO UPDATE SET
    name_fr = EXCLUDED.name_fr,
    risk_level = EXCLUDED.risk_level,
    requires_competence_verification = EXCLUDED.requires_competence_verification;

-- ============================================================================
-- End of Migration 001_initial_schema.sql
-- ============================================================================

