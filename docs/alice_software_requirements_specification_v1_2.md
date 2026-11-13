# ALICE | Software Requirements Specification

**A trusted, location-based marketplace for everyday services and essential resources**

- **Version:** 1.2
- **Date:** 13 November 2026
- **Initial launch market:** Buea, Cameroon
- **Target users:** Students, households and local service providers
- **Business model:** Pure marketplace; third-party-owned equipment rentals
- **Prepared as:** The product and engineering baseline for the ALICE hackathon MVP
- **Technology baseline:** FastAPI + Supabase + `uv` | Twilio + Google Gemini

---

## Document Control

| Item | Description |
| :--- | :--- |
| **Document title** | ALICE Software Requirements Specification (SRS) |
| **Version** | 1.2 |
| **Status** | Draft baseline for team review |
| **Date** | 13 November 2026 |
| **Product** | ALICE |
| **Initial deployment geography** | Buea, South-West Region, Cameroon |
| **Primary client** | Mobile-first Progressive Web App (PWA) |
| **Primary backend** | Python + FastAPI |
| **Database** | Supabase PostgreSQL |
| **Reference design** | User-provided three-screen Qwash mobile UI concept (visual direction only) |
| **Backend package manager** | `uv` (`pyproject.toml` + `uv.lock`) |
| **WhatsApp integration** | Twilio WhatsApp Business Platform API |
| **Conversational AI** | Google Gemini API; FastAPI-orchestrated WhatsApp AI agent using controlled ALICE tools |

### Revision History

| Version | Date | Description |
| :--- | :--- | :--- |
| 0.1 | 12 Nov 2026 | Initial product concept and marketplace scope. |
| 1.0 | 13 Nov 2026 | Formalised requirements, workflows, design system, architecture and MVP acceptance criteria. |
| 1.2 | 13 Nov 2026 | Added WhatsApp AI Agent requirements, FastAPI/Supabase/`uv` backend standards, and Google Gemini AI provider specification. |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Overview and Scope](#2-product-overview-and-scope)
3. [Stakeholders and User Classes](#3-stakeholders-and-user-classes)
4. [Operating Model and User Journeys](#4-operating-model-and-user-journeys)
5. [Functional Requirements](#5-functional-requirements)
6. [Business Rules and Workflow States](#6-business-rules-and-workflow-states)
7. [External Interface Requirements](#7-external-interface-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Data Requirements and Conceptual Model](#9-data-requirements-and-conceptual-model)
10. [Logical System Architecture](#10-logical-system-architecture)
11. [User Interface and Visual Design Requirements](#11-user-interface-and-visual-design-requirements)
12. [Security, Privacy and Safety Requirements](#12-security-privacy-and-safety-requirements)
13. [MVP Scope, Exclusions and Release Criteria](#13-mvp-scope-exclusions-and-release-criteria)
14. [Verification and Validation Plan](#14-verification-and-validation-plan)
15. [Assumptions, Dependencies, Risks and Open Decisions](#15-assumptions-dependencies-risks-and-open-decisions)
- [Appendix A. Initial Service Catalogue](#appendix-a-initial-service-catalogue)
- [Appendix B. Initial API Surface](#appendix-b-initial-api-surface)
- [Appendix C. Glossary](#appendix-c-glossary)
- [Appendix D. WhatsApp AI Agent Requirements](#appendix-d-whatsapp-ai-agent-requirements)
- [Appendix E. Backend Implementation Standards (FastAPI, Supabase and uv)](#appendix-e-backend-implementation-standards-fastapi-supabase-and-uv)
- [Appendix F. Integration and Operational References](#appendix-f-integration-and-operational-references)
- [Appendix G. Google Gemini AI Provider Specification](#appendix-g-google-gemini-ai-provider-specification)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification defines the functional, non-functional, data, interface, security and acceptance requirements for ALICE. It is intended to align product owners, UI/UX designers, frontend developers, backend developers, testers and hackathon judges on one shared understanding of the system.

The document is a working baseline. Requirements marked **Must** are required for the hackathon MVP or its controlled pilot; **Should** and **Could** requirements describe valuable capabilities that may be deferred.

### 1.2 Product Purpose
ALICE is a location-based two-sided marketplace connecting customers in Buea with local service providers and third-party equipment-rental providers. It is designed to reduce the effort, uncertainty and safety concerns involved in discovering, comparing, booking and reviewing everyday services.

### 1.3 Intended Audience
- Product owner and hackathon team leads.
- Frontend, backend and database developers.
- UI/UX designers and content designers.
- Quality assurance and testing personnel.
- Service providers and pilot users participating in validation.

### 1.4 Definitions and Abbreviations

| Term | Definition |
| :--- | :--- |
| **ALICE** | The marketplace product described in this specification. |
| **Customer** | A verified or verification-pending user who requests a service or rental. |
| **Provider** | A person or business offering a service or an asset for rental. |
| **Marketplace** | The digital intermediary that enables discovery, requests, quotations, bookings and reputation. |
| **PWA** | Progressive Web App; a web application designed to be installable and app-like on mobile devices. |
| **OTP** | One-time password used to verify control of a phone number. |
| **ID verification** | Manual review of an identity document and associated account information. |
| **Competence verification** | Review of evidence that a provider can perform the advertised service. |
| **Quotation** | A provider's price proposal for a specific customer request. |
| **Rental listing** | An item of equipment offered for temporary use by a third-party owner. |
| **MVP** | Minimum Viable Product; the smallest release that demonstrates the core value proposition. |
| **XAF** | Central African CFA franc; ALICE's initial display currency. |

---

## 2. Product Overview and Scope

### 2.1 Product Vision
> **Vision:** Make finding and accessing reliable local services as straightforward as placing an order online, while providing the trust, transparency and accountability required when people meet, work in homes or exchange valuable resources.

### 2.2 Problem Statement
In Buea, customers often rely on informal referrals, personal contacts and fragmented social channels to find electricians, plumbers, cleaners, laundry providers, water suppliers, gas distributors and other service providers. This can create uncertainty about identity, competence, availability, pricing and service quality. Providers also face difficulty reaching customers, establishing credibility and managing requests.

Local infrastructure constraints create additional needs. In some buildings dependent on electrically powered water pumps, electricity interruptions can affect water access. Power interruptions also create demand for temporary backup-energy equipment. ALICE will make third-party water suppliers and equipment-rental providers discoverable through the same marketplace.

### 2.3 Product Objectives
1. Centralise discovery of everyday services and essential resources in Buea.
2. Enable customers to compare providers using service, location, indicative price, availability and verification information.
3. Establish two-sided trust by verifying customer and provider identities, and separately assessing provider competence.
4. Support a traceable request-to-quotation-to-booking workflow.
5. Support equipment rentals, initially including portable power stations owned by third parties.
6. Provide reporting, complaints and administrative review mechanisms for safety and service disputes.
7. Create a modular foundation that can be extended to more service categories and locations.

### 2.4 Scope

| In Scope for Product | Out of Scope for Initial MVP |
| :--- | :--- |
| Customer, provider and administrator accounts. | Native Android and iOS apps. |
| Phone OTP and manual identity-verification workflow. | Automated biometric identity verification. |
| Provider profile and manual professional evidence review. | Automated professional certification or background screening. |
| Service categories, search, local provider discovery. | Nationwide or multi-country marketplace. |
| Requests, quotations, booking status and completion confirmation. | Complex dispatch optimisation and live fleet tracking. |
| Third-party equipment rental listings and requests. | ALICE-owned power-station inventory or financing. |
| Reviews, complaints, reports and admin actions. | Automated legal adjudication or guaranteed dispute resolution. |
| Admin dashboard and audit trail. | Full escrow, insurance or lending products. |
| Demo/sandbox transaction recording. | Production payment settlement until provider and settlement rules are approved. |

### 2.5 Product Boundaries
ALICE is an intermediary marketplace. It does not itself perform plumbing, cleaning, delivery, electrical, water-supply or other provider services. Under the selected pure-marketplace model, equipment offered for rental remains owned or lawfully controlled by third-party providers. ALICE displays listings, facilitates requests and records platform activity; provider responsibilities, rental terms, delivery obligations and service warranties must be stated clearly.

> **Important boundary:** ALICE must not imply that a provider is licensed, insured, background-checked or professionally certified unless the relevant evidence has actually been checked and the exact claim is supported. Verification labels must describe what ALICE reviewed.

---

## 3. Stakeholders and User Classes

| Stakeholder / User Class | Goals | Permissions / Constraints |
| :--- | :--- | :--- |
| **Customer** | Find a provider, understand price and availability, book safely, review outcome. | Manage own profile, requests, bookings, rentals, reports and reviews; cannot approve own verification. |
| **Service provider** | Reach customers, receive suitable requests, quote transparently, manage work. | Manage own service profile, service areas, availability, quotations and bookings; cannot self-approve verification. |
| **Equipment-rental provider** | Publish assets, manage availability, handover and return equipment. | Manage own rental listings and rental requests; must provide accurate specifications and terms. |
| **Verification reviewer** | Review identity and professional evidence consistently. | Access assigned verification material, approve, reject or request more information; all decisions audited. |
| **Support/dispute administrator** | Investigate complaints, help users and manage exceptions. | View relevant case data; must not access unrelated sensitive documents without a reason. |
| **Platform administrator** | Configure catalogue, users, policies and platform operations. | Elevated access with MFA or equivalent stronger authentication, least privilege and audit logging. |

### 3.1 Account and Role Model
A single user account may act as a customer and, after completing provider onboarding, as a provider. Role assignment must be explicit and permission-checked on the backend. An account may hold more than one role, but a person cannot approve their own verification or modify administrative audit records.

### 3.2 Target User Context
- **Students:** May need affordable, fast access to laundry, cleaning, repairs, water delivery, groceries and short-duration backup power.
- **Households:** May need recurring domestic services, repairs, supplies, delivery and equipment rental.
- **Independent providers and small businesses:** May need a low-friction way to gain visibility and manage bookings.
- **Rental providers:** May list power stations, generators, pumps and other equipment with defined capacity, availability and rental terms.

---

## 4. Operating Model and User Journeys

### 4.1 Service Booking Journey
1. Customer signs in and completes the required account verification.
2. Customer chooses a category and service, then provides description, neighbourhood, preferred time and optional photographs.
3. The system finds active providers matching the service and service area.
4. Customer reviews provider profiles and sends a request to one provider or a controlled shortlist.
5. Provider accepts or declines the request. If pricing is quotation-based, the provider submits a structured quotation.
6. Customer reviews and accepts the quotation or declines it.
7. Booking is confirmed and both parties receive the booking reference and agreed details.
8. Provider and customer use the agreed check-in method, such as a one-time job PIN, when the service begins.
9. Provider marks the job complete; customer confirms completion or raises a complaint.
10. Eligible parties may submit ratings and reviews after completion.

### 4.2 Water Delivery Journey
Customer selects household water or drinking water, specifies intended use, quantity, delivery location and preferred time. The listing must clearly distinguish potable/drinking water from non-potable household water. Provider details should include source/quality claims only where supported. Customer receives the total quotation, including delivery, before confirming.

### 4.3 Cooking Gas Request Journey
Customer requests a refill or cylinder exchange, chooses cylinder size/type where applicable, enters location and delivery window, and receives an offer from an authorised supplier. ALICE must not present itself as storing, transporting or handling cylinders unless its operating model and required safeguards have been separately approved. The MVP should onboard established suppliers and document their authorisation evidence where available.

### 4.4 Equipment Rental Journey
1. Third-party provider creates a rental listing with photographs, model, capacity, output, condition, price, deposit and availability.
2. Customer selects dates and describes intended use or appliances.
3. ALICE displays a compatibility guidance result based on stored equipment specifications and customer load estimates.
4. Provider confirms availability and the customer accepts rental terms.
5. The parties record equipment condition, accessories and serial number at handover.
6. Rental start, due date and return are recorded.
7. Provider and customer record return condition; any damage or deposit deduction follows a documented process.

### 4.5 Safety Incident Journey
A customer or provider can report an incident from the booking or account screen. The report is assigned a case reference, given a severity/status, and made visible only to authorised reviewers. ALICE may temporarily restrict an account or booking when a credible immediate safety concern exists, subject to review and an appeal path. Emergency reporting inside ALICE is not a substitute for local emergency services.

---

## 5. Functional Requirements

**Priority definitions:**
- **Must** = Essential for MVP
- **Should** = Strongly recommended but may be simplified
- **Could** = Useful future capability

Each requirement is testable through the acceptance criteria listed.

### 5.1 Registration, Authentication and Account Management

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-AUTH-001` | The system shall allow registration using a Cameroon phone number and shall normalise it to international E.164 format. | Must | A valid `+237` number can register; invalid formats are rejected with a clear error. |
| `FR-AUTH-002` | The system shall verify phone-number control using a time-limited OTP. | Must | Correct, unexpired OTP verifies the number; expired or excessive attempts are rejected. |
| `FR-AUTH-003` | The system shall support secure login, logout and account recovery. | Must | A user can authenticate, terminate their session and recover access through a verified channel. |
| `FR-AUTH-004` | The system shall support customer and provider roles under one user identity. | Must | A user can request provider onboarding without creating a second unrelated account. |
| `FR-AUTH-005` | The system shall enforce role and resource ownership checks on the backend. | Must | A customer cannot read another customer's private booking or update another provider's profile. |
| `FR-AUTH-006` | The system shall allow users to view and update permitted profile fields and addresses. | Must | Changes are validated and only the account owner or authorised administrator can update them. |

### 5.2 Identity and Professional Verification

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-VER-001` | The system shall allow customers and providers to submit identity-verification information and document images. | Must | Both roles can submit a supported document type; upload is private and status becomes `PENDING_REVIEW`. |
| `FR-VER-002` | The system shall maintain verification states: `NOT_SUBMITTED`, `PENDING_REVIEW`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`, `ADDITIONAL_INFORMATION_REQUIRED` and `SUSPENDED`. | Must | Only valid state transitions are allowed and each transition is timestamped. |
| `FR-VER-003` | The system shall provide an authorised reviewer queue for manual ID review. | Must | Reviewer can inspect an assigned submission and approve, reject or request more information with a reason. |
| `FR-VER-004` | The system shall maintain identity verification separately from professional competence verification. | Must | A provider may be identity verified while professional verification remains pending. |
| `FR-VER-005` | The system shall allow providers to submit competence evidence such as credentials, apprenticeship history, references, portfolio images or practical assessment results. | Must | Evidence is linked to the provider and relevant service category. |
| `FR-VER-006` | The system shall record the verification method, reviewer, evidence reviewed, decision, reason and review date. | Must | An administrator can retrieve a complete audit history for a verification decision. |
| `FR-VER-007` | The system shall display precise verification labels that describe the verified claim. | Must | Public profile distinguishes identity-checked, skill-assessed and platform work-history statuses. |
| `FR-VER-008` | The system shall prevent ineligible providers from accepting bookings in a restricted category. | Must | A provider without the required status cannot accept a booking for a restricted service. |
| `FR-VER-009` | The system should support re-verification, expiry reminders and suspension. | Should | An expired or withdrawn credential changes the relevant status and triggers an admin task. |

### 5.3 Service Catalogue and Provider Onboarding

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-CAT-001` | The system shall provide administrator-managed categories and services. | Must | Admin can create, edit, deactivate and reorder categories without a code deployment. |
| `FR-CAT-002` | A provider shall be able to select one or more services they offer. | Must | Provider selections are linked to active catalogue services. |
| `FR-CAT-003` | A provider shall be able to configure service areas, availability and pricing model. | Must | Provider can save fixed-price or quotation-based service details. |
| `FR-CAT-004` | The system shall support individual and business provider profiles. | Must | Profile type is stored and appropriate fields are shown. |
| `FR-CAT-005` | The system shall allow providers to pause individual listings or their entire account. | Must | Paused listings are excluded from new search results and requests. |

### 5.4 Search, Discovery and Location

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-SRCH-001` | Customers shall be able to browse services by category and search by keyword. | Must | A search for "plumber" returns relevant active plumbing providers or services. |
| `FR-SRCH-002` | The system shall filter provider results by service area in Buea. | Must | Providers outside configured coverage are excluded unless they explicitly serve the selected area. |
| `FR-SRCH-003` | The system shall support neighbourhood/landmark selection and optional GPS location. | Must | A customer can use a manually selected area without granting GPS permission. |
| `FR-SRCH-004` | The system shall support filters for verification status, indicative price, availability and rating where data exists. | Should | Selecting a filter produces results that satisfy the selected condition. |
| `FR-SRCH-005` | The system shall rank results using explainable criteria such as service match, coverage, eligibility, availability and relevant performance history. | Should | Ranking does not rely on hidden or unsupported claims; unavailable fields are not fabricated. |
| `FR-SRCH-006` | The system shall paginate or progressively load results. | Must | Large result sets do not load every provider in one response. |

### 5.5 Requests, Quotations and Booking

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-BOOK-001` | A customer shall be able to submit a service request with service, description, location, time window and optional attachments. | Must | A valid request is stored with a unique reference and `REQUESTED` state. |
| `FR-BOOK-002` | A customer shall be able to send a request to an eligible provider or a limited set of matching providers. | Must | Only providers matching service and service area can receive the request. |
| `FR-BOOK-003` | A provider shall be able to accept, decline or request clarification on a service request. | Must | The request status and customer notification update after the provider action. |
| `FR-BOOK-004` | A provider shall be able to create a quotation with labour, materials, delivery, fees, total and validity period. | Must | The quotation total equals the sum of its line items and is visible to the customer. |
| `FR-BOOK-005` | A customer shall be able to accept or decline a quotation. | Must | Only an eligible, unexpired quotation can be accepted. |
| `FR-BOOK-006` | The system shall create a confirmed booking only after the required customer and provider confirmations. | Must | A confirmed booking has the agreed provider, scope, date/time and price basis. |
| `FR-BOOK-007` | The system shall maintain booking history and timestamped status transitions. | Must | A user and administrator can view the allowed history for a booking. |
| `FR-BOOK-008` | The system shall support cancellation with reason and policy outcome. | Must | Cancellation is recorded and any fee/refund outcome is shown according to configured rules. |
| `FR-BOOK-009` | The system shall support job-start confirmation using a booking-specific one-time PIN or equivalent check-in. | Should | The PIN can be used only for the relevant booking and cannot be reused after successful check-in. |
| `FR-BOOK-010` | The system shall require provider completion and customer confirmation, or a defined timeout/review path. | Must | A booking does not become `COMPLETED` solely because a provider presses a button. |
| `FR-BOOK-011` | The system shall allow a customer to raise a complaint against a booking. | Must | A complaint is linked to booking and parties, assigned a case ID and status. |
| `FR-BOOK-012` | The system shall prevent reviews before eligible completion. | Must | Review submission is rejected for uncompleted, cancelled or unrelated bookings. |

### 5.6 Equipment Rental

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-RENT-001` | A third-party provider shall be able to create, update, pause and remove rental listings they own or are authorised to offer. | Must | Only the listing owner or administrator can modify the listing. |
| `FR-RENT-002` | A rental listing shall include item description, images, model, condition, price, duration, deposit, availability and fulfilment method. | Must | A listing cannot be published while mandatory fields are missing. |
| `FR-RENT-003` | Power-station listings shall include usable technical data: nominal capacity, continuous output, peak output, connectors and condition. | Must | A customer can inspect capacity and watt-output information before requesting the unit. |
| `FR-RENT-004` | A customer shall be able to request a rental for a defined period. | Must | The request records start, end, delivery/pickup choice and intended usage. |
| `FR-RENT-005` | The system shall check listing availability for overlapping rental periods. | Must | A listing cannot be double-booked for overlapping confirmed periods. |
| `FR-RENT-006` | The system shall support deposit and damage terms as explicit listing/rental fields. | Must | Customer must acknowledge the terms before confirming. |
| `FR-RENT-007` | The system shall record handover and return condition, accessories and optional serial number. | Should | Both parties can view the same timestamped inspection record. |
| `FR-RENT-008` | The system should estimate energy demand from customer-entered appliances and usage hours. | Could | The estimate states assumptions and warns that inverter output and surge limits must also be checked. |
| `FR-RENT-009` | The system shall clearly identify ALICE as intermediary and the third party as equipment owner/provider. | Must | Listing, booking and terms show the responsible provider. |

### 5.7 Reviews, Notifications, Support and Administration

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-REV-001` | Eligible customers shall be able to rate and review completed services. | Must | Only a party to the completed booking can submit one review per eligible review direction. |
| `FR-REV-002` | Providers should be able to leave structured feedback about customers. | Should | Provider feedback is linked to a completed booking and governed by moderation rules. |
| `FR-NOT-001` | The system shall create in-app notifications for key verification, booking, quotation, rental and complaint events. | Must | The intended user receives an event-linked notification. |
| `FR-NOT-002` | The system should support email/SMS notification adapters. | Should | A provider can be configured without changing core booking logic. |
| `FR-ADM-001` | Administrators shall manage users, providers, categories, bookings, rental listings and complaints according to role permissions. | Must | Admin actions succeed only with the required permission and are audited. |
| `FR-ADM-002` | The system shall record administrative changes to verification, user status, disputes and catalogue data. | Must | Audit log records actor, action, target, timestamp and reason. |
| `FR-ADM-003` | The system shall provide a dashboard of basic marketplace indicators. | Should | Admin can view user, provider, booking, completion and dispute counts for a selected period. |
| `FR-SAFE-001` | Customers and providers shall be able to report a user, booking or safety incident. | Must | A report receives a reference and is visible to authorised support personnel only. |
| `FR-SAFE-002` | Administrators shall be able to restrict accounts or listings while investigating a credible report. | Must | Restriction reason, scope, actor and expiry/review date are recorded. |
| `FR-SAFE-003` | The system shall provide a way to block or mute abusive users and limit unwanted contact. | Should | A blocked relationship prevents new direct contact through ALICE. |

---

## 6. Business Rules and Workflow States

### 6.1 Verification Rules
- Phone verification is **not** identity verification.
- Identity verification is **not** professional competence verification.
- Public badges must state **exactly** what was reviewed; do not use a generic "safe" or "guaranteed" badge.
- A provider can offer multiple services, but competence evidence and restrictions are evaluated **per service category** where the risk profile differs.
- A reviewer cannot approve their own account or a submission they made.
- Rejected submissions must have a reason and a route for resubmission or appeal.
- The platform should collect the minimum data required and define document retention and secure deletion rules before public launch.

### 6.2 Booking State Model

| State | Meaning | Allowed Next States (Initial Policy) |
| :--- | :--- | :--- |
| `REQUESTED` | Customer submitted request. | `QUOTATION_PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED` |
| `QUOTATION_PENDING` | Provider is preparing or expected to prepare a quote. | `QUOTATION_RECEIVED`, `DECLINED`, `CANCELLED` |
| `QUOTATION_RECEIVED` | Customer has a quote to review. | `ACCEPTED`, `CANCELLED`, `EXPIRED` |
| `ACCEPTED` | Customer accepted the quote; booking confirmation is pending if applicable. | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | Both parties have agreed to booking details. | `IN_PROGRESS`, `CANCELLED`, `DISPUTED` |
| `IN_PROGRESS` | Service is underway. | `COMPLETED_PENDING_CONFIRMATION`, `DISPUTED` |
| `COMPLETED_PENDING_CONFIRMATION` | Provider marked work complete. | `COMPLETED`, `DISPUTED` |
| `COMPLETED` | Completion was confirmed or resolved. | Review and support actions only |
| `CANCELLED` | Booking was cancelled. | Terminal, except administrative correction |
| `DISPUTED` | A dispute is being reviewed. | `COMPLETED`, `CANCELLED`, `RESOLVED` |

### 6.3 Rental State Model

| State | Meaning |
| :--- | :--- |
| `REQUESTED` | Customer requests equipment for a period. |
| `PENDING_PROVIDER` | Provider must confirm availability and terms. |
| `CONFIRMED` | Rental period and terms agreed. |
| `READY_FOR_HANDOVER` | Equipment prepared for pickup/delivery. |
| `ACTIVE` | Equipment handed over; rental period started. |
| `RETURN_DUE` | Rental due date reached. |
| `RETURNED` | Equipment returned and inspection completed. |
| `COMPLETED` | Rental closed and deposit outcome recorded. |
| `CANCELLED` / `DISPUTED` | Rental cancelled or under review. |

### 6.4 Pricing and Commission Rules
- A customer must see the agreed price basis before confirming a booking.
- Provider quotations must distinguish known charges from estimates.
- Any change to an accepted quotation requires customer approval and a new version/history entry.
- Commission rate and its calculation basis must be configurable by category or transaction type.
- The production payment model remains an open decision: direct provider payment, marketplace collection and provider settlement have different operational and regulatory consequences.
- A hackathon demo may simulate payment; it must label the transaction as simulated and must not imply real funds moved.

### 6.5 Rental-Specific Rules
- A rental provider must have the right to rent out the listed equipment.
- The platform must prevent overlapping confirmed rentals of the same unit.
- Capacity in $\text{kWh}$ / $\text{Wh}$ and output in $\text{kW}$ / $\text{W}$ are different specifications and must be displayed separately.
- A power compatibility estimate must consider both energy demand and maximum continuous/surge output.
- Deposit rules, late fees, damage rules and refunds must be visible before confirmation.
- Water, gas, electrical and other higher-risk services require category-specific provider eligibility and operational safeguards.

---

## 7. External Interface Requirements

### 7.1 User Interfaces
- **Customer mobile PWA:** Browse, search, request, compare, book, rent, review and report.
- **Provider portal:** Manage identity/competence submissions, listings, service areas, availability, quotations and work.
- **Admin dashboard:** Verification queues, moderation, disputes, service configuration, audit and reporting.

### 7.2 Software Interfaces

| Interface | MVP Requirement | Production Consideration |
| :--- | :--- | :--- |
| **OTP/SMS provider** | Use a sandbox or controlled test OTP flow for demo. | Select provider with Cameroon delivery, pricing, sender-ID and delivery reporting. |
| **Object storage** | Store private identity documents and public listing images separately. | Use private buckets, signed access, encryption, retention and malware scanning. |
| **Maps/geocoding** | Support manual Buea neighbourhood selection; map optional. | Use a replaceable adapter, verify map terms, geocoding limits and offline behaviour. |
| **Email** | Optional transactional email. | Provider adapter and delivery failure handling. |
| **MTN MoMo / Orange Money** | No live integration required for demo unless already available. | Integrate only after transaction, callback, refunds and settlement design is approved. |
| **Analytics** | Basic internal usage counters. | Privacy-aware event analytics with documented retention. |

### 7.3 API Interface
The backend shall expose versioned REST endpoints under `/api/v1`. JSON is the default request/response format. APIs must validate payloads, enforce authentication/authorization, return consistent error structures and avoid exposing internal database fields.

### 7.4 Device and Connectivity Interfaces
- Support current mobile browsers commonly used on Android devices.
- Request location permission only when the user invokes a location-dependent feature.
- Allow manual location selection when GPS is denied or unavailable.
- Compress and validate image uploads to reduce bandwidth and storage usage.
- Provide clear loading, retry and offline/error states.

---

## 8. Non-Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `NFR-PERF-001` | For normal browsing under expected pilot load, 95% of API reads should respond within 2.5 seconds, excluding third-party provider latency. | Should | Measure with a documented test profile and report slow endpoints. |
| `NFR-PERF-002` | Search results shall be paginated and indexed for common filters. | Must | A large catalogue does not require returning every provider in one response. |
| `NFR-AVAIL-001` | The pilot service should target 99% monthly availability, excluding announced maintenance and external provider outages. | Should | Monitor uptime and record incidents. |
| `NFR-SEC-001` | All production traffic shall use HTTPS/TLS. | Must | HTTP requests are redirected or rejected in production. |
| `NFR-SEC-002` | Passwords shall be stored using a modern adaptive password hash. | Must | No plaintext or reversible password storage exists. |
| `NFR-SEC-003` | Sensitive endpoints shall implement rate limits and abuse controls. | Must | OTP and login endpoints are protected against automated guessing. |
| `NFR-SEC-004` | Authorization shall be enforced server-side using least privilege. | Must | Changing frontend state or URL cannot bypass permissions. |
| `NFR-SEC-005` | Private identity files shall not be served from public URLs. | Must | Unauthorised users cannot fetch document files. |
| `NFR-PRIV-001` | The system shall minimise personal data collection and define retention/deletion rules. | Must | A data inventory and retention schedule are approved before public pilot. |
| `NFR-PRIV-002` | Sensitive document access and administrative review shall be auditable. | Must | The audit trail records who accessed or decided on sensitive submissions. |
| `NFR-REL-001` | Booking and rental state transitions shall be transactional and protected against duplicate submissions. | Must | Double click/retry does not create duplicate confirmed bookings. |
| `NFR-REL-002` | The system shall back up the database on a defined schedule and test restoration. | Should | A restoration test is recorded before production launch. |
| `NFR-UX-001` | The customer-facing interface shall be mobile-first and responsive. | Must | Core journeys are usable at 360px viewport width without horizontal scrolling. |
| `NFR-UX-002` | The interface shall support English and French content. | Should | Core navigation, labels, validation and transactional notices are localisable. |
| `NFR-UX-003` | The UI shall meet WCAG 2.2 AA contrast and interaction expectations where practicable. | Should | Colour contrast, keyboard focus, labels and touch targets are tested. |
| `NFR-LOW-001` | The application shall minimise payload size and tolerate intermittent connectivity. | Should | Core forms show retry states and avoid losing entered data after recoverable failures. |
| `NFR-MAINT-001` | Backend modules shall be separated by domain within a modular monolith. | Must | Auth, verification, catalogue, booking, rental, review and admin have clear module boundaries. |
| `NFR-MAINT-002` | Core business rules shall be covered by automated tests. | Must | Critical booking and rental transitions have unit/integration tests. |
| `NFR-SCALE-001` | Service categories and geographic areas shall be data-driven rather than hard-coded. | Must | Admin can add a category/area without changing application code. |

---

## 9. Data Requirements and Conceptual Model

### 9.1 Conceptual Entities
*Abbreviated conceptual entity map (Figure 1 in baseline PDF); full attributes and constraints are specified in Section 9.2.*

- **USERS:** `PK user_id`, `phone`, `email`, `password_hash`, `account_status`, `created_at`
- **PROVIDER_PROFILES:** `PK/FK user_id`, `display_name`, `bio`, `base_area`, `verification_status`, `service_radius`
- **SERVICE_CATEGORIES:** `PK category_id`, `name`, `description`, `active`
- **ID_VERIFICATIONS:** `PK verification_id`, `FK user_id`, `document_type`, `file_ref`, `status`, `reviewed_by`
- **PROVIDER_SERVICES:** `PK provider_service_id`, `FK provider_id`, `FK service_id`, `pricing_model`, `base_price`, `active`
- **BOOKINGS:** `PK booking_id`, `FK customer_id`, `FK provider_id`, `status`, `location`, `schedule`
- **QUOTES / REVIEWS:** `FK booking_id`, `FK provider_id`, `amount`, `status / rating`, `comment`
- **RENTALS:** `FK provider_id`, `FK listing_id`, `capacity`, `price`, `dates`, `status`

### 9.2 Core Entities and Minimum Attributes

| Entity | Minimum Attributes / Notes |
| :--- | :--- |
| `users` | `user_id` (PK), `phone_e164`, `email` (nullable), `password_hash`/`auth_subject`, `account_status`, `created_at`, `updated_at` |
| `user_profiles` | `user_id` (PK/FK), `legal_name`, `display_name`, `avatar_ref`, `preferred_language`, profile fields |
| `user_roles` | `user_id` (FK), `role_code` — supports one identity with `CUSTOMER`, `PROVIDER` and admin roles as authorised |
| `user_addresses` | `address_id` (PK), `user_id` (FK), `label`, `neighbourhood_id`, `landmark`, optional coordinates, `delivery_notes` |
| `identity_verifications` | `verification_id`, `user_id`, `document_type`, `private_file_ref`, `status`, `reviewer_id`, `decision_reason`, timestamps |
| `provider_profiles` | `user_id` (PK/FK), `provider_type`, `public_name`, `bio`, `base_area`, `coverage_radius`/areas, `identity_status`, `competence_summary` |
| `provider_credentials` | `credential_id`, `provider_id`, `service_id`, `evidence_type`, private/public file reference, `issuer`, `status`, reviewer and decision |
| `service_categories` | `category_id`, `name_en`, `name_fr`, `icon_key`, `active`, `display_order` |
| `services` | `service_id`, `category_id`, `name_en`, `name_fr`, `description`, `risk_level`, `eligibility_rule`, `active` |
| `provider_services` | `provider_service_id`, `provider_id`, `service_id`, `pricing_model`, `indicative_price`, `currency`, `duration_estimate`, `active` |
| `service_areas` | `area_id`, `name`, `city`, `parent_area_id`, `active`; initial city is Buea |
| `provider_service_areas` | `provider_id`, `service_id`, `area_id`; represents advertised coverage |
| `bookings` | `booking_id`, `customer_id`, `provider_id`, `service_id`, `area_id`, `address_snapshot`, `description`, `schedule`, `price_basis`, `status` |
| `booking_attachments` | `attachment_id`, `booking_id`, private/public file reference, `file_type`, `uploaded_by` |
| `quotations` | `quotation_id`, `booking_id`, `provider_id`, `version`, `line_items`, `total`, `validity`, `status`, `accepted_at` |
| `booking_status_history` | `history_id`, `booking_id`, `old_status`, `new_status`, `actor_id`, `reason`, `timestamp` |
| `rental_listings` | `listing_id`, `owner_provider_id`, `item`, `brand`/`model`, `capacity_wh`, `continuous_output_w`, `peak_output_w`, `condition`, `price`, `deposit`, `active` |
| `rental_availability` | `availability_id`, `listing_id`, `start_at`, `end_at`, `availability_status` |
| `rental_bookings` | `rental_id`, `listing_id`, `customer_id`, `provider_id`, `start`/`end`, `price`, `deposit`, `status`, handover/return data |
| `rental_inspections` | `inspection_id`, `rental_id`, `stage`, `photos`, `accessories`, `serial_number`, `condition_notes`, `actor_id`, `timestamp` |
| `reviews` | `review_id`, `booking_id`, `reviewer_id`, `reviewee_id`, `rating`, `subratings`, `comment`, `moderation_status` |
| `complaints` | `complaint_id`, `booking_id`/`rental_id`, `reporter_id`, `subject_id`, `reason`, `description`, `severity`, `status` |
| `disputes` | `dispute_id`, `case_ref`, `complaint_id`, `assigned_admin`, `outcome`, `resolution_notes`, timestamps |
| `notifications` | `notification_id`, `recipient_id`, `channel`, `event_type`, `payload_ref`, `read_at`, `delivery_status` |
| `transactions` | `transaction_id`, `booking_id`/`rental_id`, `payer_id`, `payee_id`, `gross_amount`, `commission`, `currency`, `payment_method`, `status`, `external_reference` |
| `audit_logs` | `audit_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `reason`, `timestamp`, `safe_metadata` |

### 9.3 Key Relationships
- One user has one profile and may have multiple roles.
- One provider profile can have many provider-service records and many coverage-area records.
- One booking belongs to one customer and one selected provider; one request may have multiple quotations, but only one quote may be accepted for a single booking.
- One completed booking may have one customer review and, if supported, one provider review.
- One equipment listing belongs to one provider and can have many non-overlapping rental bookings.
- Identity and credential records are separate from public provider profiles.
- Sensitive files are stored in private object storage; database rows retain only access-controlled references and metadata.

### 9.4 Data Quality and Retention
- Use stable UUIDs or equivalent non-sequential identifiers for externally exposed records.
- Store timestamps in UTC and render local time for Cameroon users (`Africa/Douala`, UTC+1).
- Store money as integer minor units or decimal values with explicit `XAF` currency; do not use floating-point arithmetic for transaction totals.
- Store power capacity in $\text{Wh}$ and output in $\text{W}$ using explicit unit names; convert for display only.
- Define data retention periods for ID documents, rejected submissions, complaint evidence, booking records and audit logs before public launch.
- Support correction of inaccurate profile information and a documented deletion/anonymisation process subject to legitimate record-retention needs.

---

## 10. Logical System Architecture

The MVP shall use a modular FastAPI application (modular monolith) backed by Supabase. FastAPI exposes versioned REST endpoints and owns ALICE business rules, orchestration, authorization checks and integrations. Supabase provides managed PostgreSQL, Auth, private Storage and selectively enabled Realtime capabilities. The backend dependency and environment manager is `uv`. Separate microservices are not justified at the initial scale.

*(Note: Figure 2 in the baseline PDF illustrates a logical modular-monolith architecture where three client interfaces—Customer Mobile-first PWA, Service Provider Portal, and ALICE Admin Dashboard—communicate via a central REST API layer with modular domain boundaries and replaceable external integration adapters. Per Section 10.1 and Appendix E, Python + FastAPI and Supabase PostgreSQL are the approved implementation technologies.)*

### 10.1 Recommended Technology Baseline

| Layer | Recommended Option | Notes |
| :--- | :--- | :--- |
| **Customer and provider UI** | React + Vite + TypeScript | One mobile-first PWA with role-aware navigation. |
| **Admin UI** | React + Vite + TypeScript | Admin routes with stricter permissions and audit visibility. |
| **Styling** | Tailwind CSS | Design tokens derived from the approved ALICE lavender/periwinkle palette. |
| **Backend API** | Python + FastAPI | Modular monolith: typed request/response models, REST under `/api/v1`; async support where appropriate. |
| **Backend package manager** | `uv` | Manage Python version, dependencies, virtual environment and reproducible lockfile; commit `pyproject.toml` and `uv.lock`. |
| **Database** | Supabase PostgreSQL | Relational source of truth; migrations, constraints, indexes and transactions. |
| **Authentication** | Supabase Auth (phone OTP where configured) + FastAPI authorization | Validate Supabase JWTs server-side; enforce ALICE roles and ownership rules in API and database. |
| **File storage** | Supabase Storage | Private buckets for identity and dispute evidence; separate public bucket only for approved listing/profile media. |
| **Database authorization** | PostgreSQL Row Level Security (RLS) | Enable RLS for exposed tables; least-privilege policies; never expose service-role credentials to browser. |
| **Realtime** | Supabase Realtime selectively | Use for booking status or provider availability only where useful; REST remains authoritative. |
| **WhatsApp channel** | Twilio WhatsApp Business Platform API | Inbound webhook to FastAPI; outbound messaging through Twilio; templates for eligible out-of-session messages. |
| **AI agent** | Backend-orchestrated LLM/tool-calling layer (Google Gemini) | Intent extraction and natural-language interaction; all business actions through typed, permission-checked tools. |
| **Maps** | OpenStreetMap-based display or equivalent adapter | Manual Buea neighbourhood selection remains available. |
| **Payments** | Payment adapter interface; sandbox/manual demo first | Integrate MTN MoMo/Orange Money after transaction, reconciliation and refund design. |
| **Deployment** | Static frontend hosting + Python ASGI hosting + Supabase | Keep secrets server-side; separate development, staging and production configuration. |

### 10.2 Backend Module Boundaries

| Module | Responsibilities |
| :--- | :--- |
| **Auth & access** | Registration, OTP, sessions, roles, access control. |
| **Users & profiles** | Customer/provider profile, addresses, settings. |
| **Verification** | Identity submissions, competence evidence, reviewer workflow. |
| **Catalogue** | Categories, services, risk rules, geographic areas. |
| **Discovery** | Search, filters, provider suitability and ranking. |
| **Bookings** | Requests, quotations, scheduling, status transitions. |
| **Rentals** | Listings, capacity specifications, availability, handover and return. |
| **Reviews** | Rating eligibility, moderation, provider/customer feedback. |
| **Safety & support** | Reports, complaints, disputes, restrictions and case notes. |
| **Notifications** | In-app events, email/SMS adapter and delivery statuses. |
| **Admin & audit** | Administrative permissions, dashboards, immutable-style audit records. |
| **Payments** | Transaction records, commission calculation and payment-provider adapters. |

### 10.3 API Conventions
- Prefix all routes with `/api/v1`.
- Use consistent response envelopes and error codes.
- Validate all request data on the server.
- Use idempotency keys for operations that could create duplicate bookings or transactions.
- Use pagination for lists and filters for discovery.
- Never expose password hashes, private document URLs, raw tokens or internal reviewer notes in public API responses.
- Document endpoint permissions and ownership rules.

---

## 11. User Interface and Visual Design Requirements

### 11.1 Supplied Reference and Design Interpretation
*Reference (Figure 3 in baseline PDF): User-provided mobile UI reference (Qwash). Its visual language is adopted; laundry-specific content and the Qwash identity are not part of ALICE.*

The reference shows three mobile screens: a home/dashboard screen, an explore-services screen and a profile screen. ALICE should reuse the visual principles rather than copy the laundry-specific wording or brand:
- Lavender gradient header
- Dark navy header text/surfaces
- Large rounded white content panels
- Service cards with clear imagery
- Compact status indicators
- Generous spacing
- Persistent bottom navigation

### 11.2 Recommended ALICE Navigation

| Navigation Item | Purpose |
| :--- | :--- |
| **Home** | Personalised greeting, service search, popular categories, nearby providers, active bookings and relevant service alerts. |
| **Explore** | Full category grid, search, filters and location-aware provider results. |
| **Bookings** | Upcoming, active, completed and cancelled service bookings. |
| **Rentals** | Browse and manage third-party equipment rental listings and rental bookings. |
| **Profile** | Identity status, account details, addresses, preferred language, help, safety and settings. |

> **Navigation design note:** The supplied reference has a prominent central circular action. ALICE may use that position for a primary "Request a service" action, but it should not obscure the five primary navigation destinations or reduce accessible tap targets.

### 11.3 Home Screen Requirements
- Gradient header with ALICE wordmark, notification access and profile shortcut.
- Personalised greeting that does not expose sensitive data on a shared screen.
- Prominent search field: *"What service do you need?"*
- Quick category cards for Repairs, Cleaning, Water, Gas, Laundry, Deliveries and Power Rental.
- Active booking card with clear progress and next action.
- Nearby or popular services, with location area stated.
- Safety/help access visible without dominating the screen.

### 11.4 Explore Screen Requirements
- Search input with clear, accessible placeholder and empty state.
- Category sections and service cards with image/icon, name, indicative price when available and availability/verification indicators.
- Filter drawer or chips for neighbourhood, provider status, availability, price and rating.
- Provider result cards show service fit, service area, provider display name and accurate verification badges.
- Do not fabricate response times, ratings or prices where data is unavailable.

### 11.5 Profile Screen Requirements
- Profile completeness indicator may be shown, but must not imply verification.
- Identity verification status and provider competence status are distinct.
- Saved delivery/service addresses with edit/delete controls.
- Account roles and provider onboarding entry point.
- Settings for language, notifications, privacy, security and support.
- Payment methods, when introduced, must be represented by provider-issued tokens or masked references; ALICE must not store raw card numbers or CVV.

### 11.6 Design Tokens and Colour Palette

| Token | HEX | Intended Use | Notes |
| :--- | :--- | :--- | :--- |
| **Primary lavender** | `#8979E9` | Main gradient/background identity | Use mainly for decorative/background surfaces; white-text contrast is about 3.46:1, so not for small white body text. |
| **Electric lavender** | `#9A73F5` | Gradient highlight | Use as gradient stop and selected decorative emphasis; avoid small white text on this colour. |
| **Periwinkle blue** | `#AAADF2` | Gradient transition | Best for background and decorative surfaces; use dark text on top. |
| **Royal indigo** | `#585FB7` | Primary buttons and selected states | White contrast is about 5.53:1; suitable for normal button text. |
| **Midnight navy** | `#181B2A` | Header and dark surfaces | Primary dark text/surfaces; high contrast with white. |
| **Pure white** | `#FDFDFE` | Cards and primary surfaces | Main card surface. |
| **Cloud gray** | `#F0F1F5` | Page/background neutral | Corrected from the supplied `#FOF1F5`, which contains letter O and is invalid hex. |
| **Dark slate** | `#343752` | Body text and secondary headings | Use for readable text on light surfaces. |
| **Vivid blue** | `#2448EF` | Links and selected/high-priority actions | Use sparingly; strong white contrast. |
| **Orchid pink** | `#D168DF` | Promotional or secondary accent | Do not use alone for small white text. |
| **Mint green (proposed)** | `#34C399` | Success/positive status accent | The supplied `#340399` is purple, not mint; `#34C399` is a proposed correction, subject to final design approval. |

### 11.7 Gradient Specification
The supplied gradient is retained as the primary brand treatment:

```css
background: linear-gradient(135deg, #8980EA 0%, #AAADF2 50%, #9A73F5 100%);
```

> **Note:** The gradient start supplied in the CSS sample (`#8980EA`) is slightly different from the named primary lavender (`#8979E9`). The design team should choose one canonical token. This SRS preserves `#8980EA` for the gradient and `#8979E9` as the named primary palette token pending approval.

### 11.8 Typography, Shape and Spacing
- Use a clean sans-serif family such as Inter, Manrope or the platform system sans-serif.
- Use large, clear page titles; body text should remain readable on small screens.
- Cards should use generous rounded corners consistent with the reference; avoid excessive nesting of cards.
- Use consistent 8-point spacing increments and a limited radius scale.
- Use icons with labels for important navigation; never rely on colour alone for status.
- Use motion sparingly; respect reduced-motion preferences.

### 11.9 Accessibility and Content
- Maintain WCAG 2.2 AA contrast for text and controls where applicable.
- Do not use pale periwinkle or orchid as small-text foreground on white.
- Use explicit focus indicators, form labels, error descriptions and screen-reader semantics.
- All critical customer/provider flows should be available in English and French before broad public rollout.
- Use plain language; avoid unclear labels such as "trusted" without a defined verification meaning.

---

## 12. Security, Privacy and Safety Requirements

### 12.1 Two-Sided Safety Model
ALICE must protect both the customer and the provider. Verification is not a guarantee of behaviour; it is one layer in a wider safety system. The platform must provide clear booking details, scoped information sharing, reporting and accountable review.

| Control | Customer Protection | Provider Protection |
| :--- | :--- | :--- |
| **Identity status** | Know whether the provider identity has been checked. | Know whether the customer identity has been checked. |
| **Booking confirmation** | Know who is expected, for what service, at what time and at what location. | Know the customer, requested work, agreed scope and visit location. |
| **Job PIN / check-in** | Helps confirm the correct booking is being started. | Helps confirm the correct customer/booking before work begins. |
| **Reporting** | Report misconduct, threats, fraud or unsafe service. | Report harassment, unsafe conditions, false claims or non-payment. |
| **Privacy** | Do not expose full ID documents or unnecessary personal details. | Do not expose full ID documents or unnecessary personal details. |
| **Dispute process** | Submit evidence and receive a case reference. | Respond to allegations and submit evidence. |
| **Account controls** | Block/report users and restrict unwanted contact. | Block/report users and restrict unwanted contact. |

### 12.2 Identity Document Handling
- Collect only document types required by the verification policy.
- Use private storage and short-lived, authorised access links.
- Limit access to named reviewers and log access.
- Do not display a customer or provider identity document to the other party.
- Define retention and secure deletion rules before collecting real identity documents.
- Do not use face recognition or biometric inference in the MVP. Any future liveness/biometric service requires separate privacy, security and legal review.

### 12.3 Service-Category Risk Controls

| Service Type | Additional Control Examples |
| :--- | :--- |
| **Electrical work** | Category-specific competence evidence; no claim of certification unless checked; safe work scope and complaint escalation. |
| **Gas delivery** | Onboard authorised suppliers; clear supplier responsibility; do not have ALICE itself handle gas cylinders without separate operating approval. |
| **Water delivery** | Distinguish drinking and non-drinking water; do not display health/quality claims without evidence. |
| **Babysitting / home assistance** | Enhanced identity/reference checks, clear scope, guardian controls where relevant and an incident escalation procedure; consider excluding from MVP. |
| **Power equipment rental** | Verified owner/provider, equipment condition, output/capacity specifications, safe-use instructions and damage/return terms. |
| **Appliance repair** | Scope and parts estimates should be approved; clear distinction between diagnosis fee and repair cost. |

### 12.4 Operational and Policy Readiness
Before public pilot, the team must obtain appropriate local legal advice on personal-data processing, consumer terms, marketplace liability, payment flows, service-provider onboarding and category-specific safety requirements. This SRS does not provide legal advice or assert that a particular provider or service is licensed.

---

## 13. MVP Scope, Exclusions and Release Criteria

### 13.1 MVP Must-Have Scope
1. Customer and provider registration with phone verification.
2. Manual identity-verification queue for both customers and providers.
3. Separate provider competence evidence and status.
4. Service catalogue with a small, curated Buea launch set.
5. Provider profiles, neighbourhood coverage and search.
6. Service request, provider response, quotation and booking confirmation.
7. Booking status history and completion confirmation.
8. Third-party rental listing and request workflow for portable power stations.
9. Reviews and complaints for completed bookings.
10. Admin dashboard for verification, category management, bookings and complaints.
11. Responsive mobile UI based on the supplied purple/lavender design direction.

### 13.2 Recommended Launch Category Set

| Launch Category | Example Services | Why Include in MVP |
| :--- | :--- | :--- |
| **Repairs** | Plumbing, electrical, water-pump repair | Clear local use cases; provider identity and skills checks can be demonstrated. |
| **Household** | Cleaning, laundry, ironing | Common, easy-to-explain booking workflow. |
| **Essential supply** | Household water delivery, cooking gas through authorised suppliers | Demonstrates delivery and service-area logic. |
| **Equipment rental** | Portable power stations (third-party owned) | Demonstrates a distinct rental workflow and Buea-specific demand hypothesis. |

### 13.3 Excluded from Hackathon MVP
- Nationwide provider onboarding and multi-city dispatch.
- Automated ID OCR, face recognition or biometric liveness.
- AI-based provider certification or autonomous fraud decisions.
- Live GPS tracking of providers.
- Escrow, automatic payouts, refunds and full financial ledger unless payment partner integration is already validated.
- Medical, childcare or other high-risk services until stronger operational controls are designed.
- ALICE-owned equipment stock.
- Complex in-app voice/video calling.

### 13.4 MVP Acceptance Criteria

| ID | Acceptance Criterion | Evidence |
| :--- | :--- | :--- |
| `AC-01` | A customer can register, verify phone and submit an identity document for review. | Demo recording and test case. |
| `AC-02` | An administrator can review identity submissions and record a decision with a reason. | Admin workflow and audit record. |
| `AC-03` | A provider can submit identity and service-specific competence evidence separately. | Provider profile and verification records. |
| `AC-04` | Only eligible providers appear in eligible service discovery results. | Search test with verified, pending and suspended providers. |
| `AC-05` | A customer can submit a service request and receive a provider quotation. | End-to-end booking test. |
| `AC-06` | Customer quotation acceptance creates a confirmed booking with full status history. | Database/API test and UI evidence. |
| `AC-07` | The system prevents duplicate/overlapping confirmed rentals of one unit. | Rental concurrency test. |
| `AC-08` | A customer can request a third-party $2\text{ kWh}$-class power station listing and view its capacity and output specifications. | Rental demo and listing data. |
| `AC-09` | A completed booking enables review; an uncompleted booking does not. | Review eligibility test. |
| `AC-10` | Customer and provider can report a safety or service concern. | Complaint creation and admin view. |
| `AC-11` | The mobile interface is usable at 360px width and matches approved design tokens. | Responsive visual inspection. |
| `AC-12` | Private identity files are not accessible to anonymous or unrelated accounts. | Access-control test. |

---

## 14. Verification and Validation Plan

### 14.1 Test Levels

| Test Level | Focus | Examples |
| :--- | :--- | :--- |
| **Unit tests** | Isolated business rules. | Booking state transitions, commission calculation, quote totals, eligibility checks. |
| **Integration tests** | Backend modules and database transactions. | Create request, quote, accept quote; prevent overlapping rentals; audit verification decision. |
| **API tests** | Contracts, permissions and error handling. | Customer cannot read another user's booking; provider cannot approve own verification. |
| **UI tests** | Core user journeys and responsive behaviour. | Register, search, book, inspect profile, request rental, report issue. |
| **Security tests** | Authentication, authorisation and file privacy. | OTP brute-force limits, ID-file access controls, role bypass attempts. |
| **Usability tests** | Clarity and task completion with real users. | Students and household users try to find a plumber or rent backup power. |
| **Operational tests** | Logging, backups, failure recovery. | Restore database backup; retry failed notifications; recover interrupted request. |

### 14.2 Priority End-to-End Scenarios
1. Customer with pending identity review attempts to book a restricted service; system blocks the action and explains next step.
2. Verified customer requests a plumber in Molyko; eligible providers are returned; provider quotes; customer accepts; booking progresses to completion.
3. Provider is identity verified but skills evidence is pending; profile displays exact status and restricted services cannot be accepted.
4. Customer requests drinking water; non-potable water listings are clearly distinguished and not presented as drinking water.
5. Customer requests a power station for 24 hours; overlapping rental request is rejected after another customer confirms the same unit.
6. Provider reports harassment from a customer; the case is created, relevant parties are restricted from direct contact as policy requires, and admin can review.
7. Customer tries to submit a review for a cancelled booking; system rejects it.

### 14.3 Pilot Validation Metrics
- Time from service search to a confirmed booking.
- Provider response rate and median response time.
- Percentage of requests receiving at least one quotation.
- Booking completion rate.
- Cancellation and dispute rate.
- Customer and provider satisfaction after completed jobs.
- Rental listing utilisation and return-condition incidents.
- Verification review time and rejection/additional-information rate.

---

## 15. Assumptions, Dependencies, Risks and Open Decisions

### 15.1 Assumptions
- The initial operational geography is Buea only.
- Students and households are primary customers.
- Providers and equipment owners are independent third parties.
- Manual review is the initial verification method.
- The marketplace will begin with a curated set of service providers rather than an unrestricted open directory.
- The customer application is mobile-first and will be delivered as a PWA for the MVP.
- The initial currency is `XAF` and the initial languages are English and French.

### 15.2 Dependencies
- Access to reliable local service providers willing to participate in a pilot.
- An agreed list of neighbourhoods and initial service coverage areas in Buea.
- A secure document-storage option and reviewer operating procedure.
- A selected OTP/SMS provider before production phone verification.
- A support owner and response process for complaints and safety reports.
- A payment/settlement decision before real-money marketplace commission collection.
- Category-specific evidence and safety rules for higher-risk services.

### 15.3 Major Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Provider quality varies** | Customer harm, complaints and loss of trust. | Category-specific competence review, transparent badges, completed-job history and complaint handling. |
| **Identity documents are exposed** | Privacy harm and potential identity misuse. | Private storage, least privilege, access logs, retention controls and no public document URLs. |
| **Marketplace has too few providers** | Customers cannot find matches. | Start with a curated launch set and limited categories/neighbourhoods; onboard supply before marketing demand. |
| **Providers and customers transact outside ALICE** | Commission leakage and reduced dispute visibility. | Clear platform value, booking records, fair terms and phased payment facilitation; do not assume all off-platform activity can be prevented. |
| **Water/gas/electrical category incidents** | Physical safety and reputational risk. | Limit launch categories, verify supplier evidence, define operating rules and escalation. |
| **Rental equipment damage or non-return** | Financial loss and disputes. | Provider ownership checks, deposits, handover photos, serial tracking and explicit rental terms. |
| **Unreliable connectivity** | Failed requests and user frustration. | Lightweight PWA, manual location entry, retry handling and save-progress behaviour. |
| **Incorrect or unapproved legal claims** | Compliance and liability exposure. | Local legal review before pilot, label verification precisely; avoid guarantees. |

### 15.4 Open Decisions Requiring Product-Owner Approval

| Decision | Why It Matters | Proposed Default for MVP |
| :--- | :--- | :--- |
| **Supported identity documents and review standard** | Determines user onboarding, storage and reviewer procedure. | Agree a documented list with local legal/privacy review; manual review only. |
| **Provider verification levels and category evidence** | Determines what "verified" means for each service. | Identity checked + service-specific evidence reviewed + platform work history. |
| **Who may request multiple providers** | Affects provider spam and response workflow. | One provider initially, allow a controlled shortlist later. |
| **Quote expiry and response timeouts** | Affects request lifecycle. | Configurable defaults; initial suggested quote validity 24 hours. |
| **Cancellation and no-show rules** | Affects trust and financial fairness. | Simple recorded reasons; no automated penalty until policy is approved. |
| **Payment and commission collection** | Determines transaction ledger, refunds and provider settlement. | Demo simulation/manual recording; production payment flow deferred. |
| **Customer/provider contact visibility** | Affects privacy and coordination. | In-app messages or controlled contact reveal after booking; avoid public phone numbers. |
| **Rental deposits and damage claims** | Affects user trust and provider risk. | Provider-defined terms disclosed before booking; manual dispute review. |
| **Babysitting and elderly care launch status** | Higher safeguarding obligations. | Exclude from initial public MVP pending enhanced controls. |
| **Brand palette conflict resolution** | One accent was mislabelled and neutral hex contains a typo. | Use corrected cloud grey `#F0F1F5`; decide whether `#34C399` replaces the incorrect mint entry `#340399`. |

---

## Appendix A. Initial Service Catalogue

| Category | Candidate Services |
| :--- | :--- |
| **Household and domestic** | Home cleaning; deep cleaning; laundry; ironing; cooking/meal preparation; housekeeping; gardening; pest control; upholstery cleaning; moving assistance. |
| **Repairs and maintenance** | Plumbing; electrical repairs; carpentry; masonry; painting; roofing; welding; locksmith; water-pump maintenance; generator repair; solar/inverter installation. |
| **Appliances and electronics** | Refrigerator repair; washing machine repair; TV repair; phone repair; laptop repair; small-appliance repair; air-conditioning service. |
| **Water, gas and essential supplies** | Household water delivery; drinking water delivery; authorised cooking-gas refill/exchange; groceries; foodstuffs; fruits and vegetables; household essentials. |
| **Delivery and logistics** | Parcel delivery; grocery delivery; errands; furniture transport; moving assistance; waste collection. |
| **Personal and learning services** | Hairdressing; barbering; tailoring; makeup; photography; tutoring; basic IT support. |
| **Equipment rentals** | Portable power stations; generators; pumps; ladders; pressure washers; cleaning machines; selected tools and event equipment. |

> **Catalogue governance:** Categories are configurable. The team should activate only services for which it can define provider eligibility, customer expectations, pricing fields, and safety/complaint handling.

---

## Appendix B. Initial API Surface

| Domain | Illustrative Endpoints (under `/api/v1`) |
| :--- | :--- |
| **Authentication** | `POST /auth/register`; `POST /auth/send-otp`; `POST /auth/verify-otp`; `POST /auth/login`; `POST /auth/logout`; `POST /auth/recovery` |
| **Profile** | `GET /users/me`; `PATCH /users/me`; `GET /users/me/addresses`; `POST /users/me/addresses` |
| **Verification** | `POST /verifications/identity`; `POST /verifications/competence`; `GET /verifications/me`; `GET /admin/verifications`; `PATCH /admin/verifications/{id}` |
| **Catalogue / discovery** | `GET /categories`; `GET /services`; `GET /providers`; `GET /providers/{id}`; `GET /providers/{id}/services` |
| **Bookings** | `POST /bookings`; `GET /bookings`; `GET /bookings/{id}`; `POST /bookings/{id}/quotations`; `POST /quotations/{id}/accept`; `PATCH /bookings/{id}/status` |
| **Rentals** | `POST /rental-listings`; `GET /rental-listings`; `GET /rental-listings/{id}`; `POST /rental-bookings`; `PATCH /rental-bookings/{id}/status` |
| **Reviews / support** | `POST /reviews`; `POST /reports`; `POST /complaints`; `GET /complaints/{id}` |
| **Admin** | `GET /admin/dashboard`; `GET /admin/users`; `PATCH /admin/users/{id}/status`; `GET /admin/audit-logs` |

> **Note:** This is a route inventory, not a final API contract. Each endpoint requires a schema, permission matrix, response examples, error codes and automated tests before implementation is considered complete.

---

## Appendix C. Glossary

| Term | Meaning |
| :--- | :--- |
| **Competence evidence** | Material used to assess a provider's ability to deliver a specific service. |
| **E.164** | International standard format for telephone numbers. |
| **Idempotency** | Property that makes repeated submission of the same operation safe from duplicate effects. |
| **Least privilege** | Giving a user or system only the permissions necessary for its task. |
| **Marketplace commission** | Fee earned by ALICE for a successfully completed eligible transaction. |
| **PWA** | Progressive Web App. |
| **Service area** | Geographical area in which a provider advertises availability. |
| **State transition** | A permitted change from one booking, verification or rental status to another. |
| **Two-sided marketplace** | A platform connecting two groups, here customers and providers. |
| **Usable capacity** | Energy practically available to a load after system losses and operating constraints; distinct from nominal battery capacity. |

> **SRS completion note:** This specification is ready for team review and decomposition into database schema, API contracts, UI wireframes and development tickets. It intentionally records unresolved operational and payment decisions as open items; these must be approved before a public pilot.

---

## Appendix D. WhatsApp AI Agent Requirements

**Status:** Required product capability; staged implementation. The WhatsApp AI agent is a core ALICE differentiator intended to reduce friction for customers who prefer conversational interaction over navigating a mobile application. Twilio is the WhatsApp Business API provider. The agent is an additional access channel to the same ALICE marketplace, not a separate marketplace or independent source of truth.

### D.1 Purpose and Product Outcomes
- Allow a customer to discover services using ordinary conversational language in English or French.
- Reduce the number of screens and form fields required to submit a service request.
- Help customers understand categories, service areas, provider options, quotations, booking status and rental listings.
- Support users with limited digital confidence or low-bandwidth access by offering a familiar messaging channel.
- Provide transactional updates and reminders where the customer has opted in and WhatsApp policy permits the message.
- Hand off to a human support operator when the request is ambiguous, sensitive, disputed or outside the agent's authorised capabilities.

### D.2 Scope of the Agent

| Capability | Agent Behaviour | MVP Priority |
| :--- | :--- | :--- |
| **Conversational onboarding** | Explain ALICE, identify whether the person wants to find a service or offer one, and guide them to account linking or app registration. | Must |
| **Service discovery** | Understand requests such as *"I need a plumber in Molyko"* and search eligible providers using ALICE backend tools. | Must |
| **Request drafting** | Collect service type, issue description, neighbourhood, preferred date/time and optional photos in a conversational sequence. | Must |
| **Booking creation** | Summarise the request and ask for explicit confirmation before creating a booking through a backend tool. | Must |
| **Quotation explanation** | Retrieve and explain quotations, line items, validity and provider details without changing the quote. | Must |
| **Booking status** | Answer *"Has the electrician accepted?"* using the authenticated user's booking records. | Must |
| **Power rental discovery** | Find third-party equipment listings and explain capacity ($\text{Wh}$), continuous output ($\text{W}$), rental price, deposit and availability. | Must |
| **Rental request** | Collect duration and intended appliances, explain compatibility limitations and submit a request only after confirmation. | Should |
| **Water and household supply requests** | Collect quantity, delivery location, intended use and delivery window; present available suppliers. | Should |
| **Complaint initiation** | Capture the issue, booking reference and preferred contact method, then create a support case or hand off. | Should |
| **Provider onboarding guidance** | Explain how to apply as a provider and list required evidence; final verification remains a human-admin process. | Should |
| **Human handoff** | Transfer the conversation context and transcript summary to authorised support staff. | Must |

### D.3 Supported User Journeys

#### D.3.1 Find and Book a Service
1. Customer sends: *"I need someone to fix a leaking tap in Molyko."*
2. Agent identifies `intent = service_discovery` and extracts `category = plumbing` and `neighbourhood = Molyko`.
3. If critical details are missing, the agent asks one question at a time (for example, preferred time or whether the leak is urgent).
4. FastAPI calls the provider-search tool. The tool returns only eligible providers whose verification and service-area rules pass.
5. Agent presents a concise shortlist with provider display name, relevant verification badges, indicative price or quote-required label, rating and availability where known.
6. Customer selects a provider or asks to send a request to eligible providers.
7. Agent collects the request details, reads back a summary and asks for explicit confirmation.
8. After confirmation and authorization, the backend creates the request and returns a booking/request reference.
9. Agent confirms what happened and explains the next step. It must not claim a provider accepted until the backend records acceptance.

#### D.3.2 Power Station Rental
1. Customer asks for a $2\text{ kWh}$ power station for one day.
2. Agent asks what devices the customer plans to run and, where necessary, approximate wattage and duration.
3. Agent retrieves available third-party listings and compares capacity in $\text{Wh}$, continuous output in $\text{W}$, peak output, rental rate, deposit and delivery/pickup terms.
4. Agent explains that energy capacity and inverter output are different constraints; it must not guarantee runtime from capacity alone.
5. Agent warns if a requested appliance may exceed continuous or surge output and recommends provider confirmation where specifications are incomplete.
6. Agent summarises the rental request and obtains explicit confirmation before submission.

#### D.3.3 Booking Status and Transactional Support
1. The agent must authenticate or link the WhatsApp number to an ALICE account before revealing private booking, address, quotation or rental details.
2. It retrieves the record through the backend using the authenticated user identity and checks ownership.
3. It explains the current status and timestamp in plain language.
4. If the customer disputes the status or reports a safety issue, the agent creates a support case or immediately offers human handoff.

### D.4 Functional Requirements — WhatsApp Channel

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-WA-001` | The system shall receive inbound WhatsApp messages through a Twilio-configured webhook. | Must | A valid Twilio webhook is accepted; malformed or unauthenticated requests are rejected. |
| `FR-WA-002` | The system shall validate Twilio webhook signatures before processing inbound events. | Must | Requests with invalid signatures fail securely; valid requests are processed. |
| `FR-WA-003` | The system shall normalise WhatsApp sender identifiers to E.164 and map them to an ALICE user only through an approved account-linking process. | Must | A phone-number match alone does not grant access to private account data. |
| `FR-WA-004` | The system shall maintain conversation state with message IDs, timestamps, channel, linked user ID (if any), language and session context. | Must | A multi-turn request can continue after a user sends follow-up messages. |
| `FR-WA-005` | The agent shall support English and French and allow the user to switch language. | Must | The agent responds in the selected or confidently detected language; uncertain language triggers clarification. |
| `FR-WA-006` | The agent shall identify intents for service discovery, request drafting, booking status, quotations, rental discovery, complaint initiation and human support. | Must | Test utterances map to the expected intent or trigger a clarification. |
| `FR-WA-007` | The agent shall ask for missing mandatory information one question at a time and avoid collecting unnecessary personal data. | Must | Incomplete requests are not submitted; unnecessary sensitive details are not requested. |
| `FR-WA-008` | The agent shall use approved backend tools to search services and providers; it shall not invent provider availability, prices, ratings or verification status. | Must | Every presented marketplace fact is traceable to a backend result. |
| `FR-WA-009` | The agent shall obtain explicit customer confirmation before creating a booking, submitting a rental request, cancelling a request or performing another consequential action. | Must | No consequential action occurs solely from inferred intent. |
| `FR-WA-010` | The agent shall enforce the same authentication, role, ownership and eligibility rules as the PWA. | Must | A WhatsApp user cannot access another user's records or bypass provider eligibility. |
| `FR-WA-011` | The agent shall support human handoff with a concise conversation summary and relevant reference IDs. | Must | Support staff can see the reason for escalation without receiving unnecessary secrets. |
| `FR-WA-012` | The system shall process Twilio delivery callbacks and record message delivery status where available. | Should | Sent, delivered, failed and undelivered states are recorded when supplied by Twilio. |
| `FR-WA-013` | The system shall use approved WhatsApp message templates for business-initiated messages outside the permitted customer-service window. | Must | Out-of-window free-form messages are not sent; approved template and opt-in rules are enforced. |
| `FR-WA-014` | The system shall deduplicate inbound webhook events and outbound actions using provider message IDs and idempotency keys. | Must | Twilio retries do not create duplicate bookings or duplicate agent replies. |
| `FR-WA-015` | The system shall support opt-in, opt-out and communication preference management for WhatsApp notifications. | Must | STOP/opt-out requests are recorded and suppress non-essential outbound messages. |
| `FR-WA-016` | The agent shall provide a clear route to a human support person at any time during a supported interaction. | Must | A user can request a human and the system creates or routes a support handoff. |

### D.5 AI Agent Behaviour, Boundaries and Tool Permissions
The language model must not have direct database credentials or unrestricted SQL access. It must not be able to call arbitrary URLs, execute code, or change ALICE records directly. It may only invoke a small allowlist of typed backend tools exposed by FastAPI.

| Tool (Illustrative) | Permitted Action | Authorization / Safeguard |
| :--- | :--- | :--- |
| `search_services(query, neighbourhood)` | Search public catalogue and eligible provider listings. | Public/anonymous-safe fields only; exclude suspended and ineligible providers. |
| `get_provider_public_profile(provider_id)` | Retrieve public provider profile and badges. | Never return identity documents, private phone numbers or reviewer notes. |
| `create_service_request(draft)` | Create a customer service request. | Authenticated account; validate fields; show summary, explicit confirmation; idempotency key. |
| `list_my_bookings(filters)` | List bookings belonging to the authenticated customer/provider. | User identity derived from validated session, never from model-supplied user ID. |
| `get_my_booking(booking_id)` | Retrieve one owned booking and allowed status fields. | Ownership check on every request. |
| `list_my_quotations(booking_id)` | Retrieve quotations for an owned request. | Ownership and booking-state checks. |
| `search_rental_listings(filters)` | Search third-party rental listings. | Return verified listing fields, terms and specification completeness. |
| `create_rental_request(draft)` | Submit a rental request. | Authenticated user, availability recheck; explicit confirmation; idempotency. |
| `create_support_case(details)` | Create a complaint/support case. | Collect minimum necessary data; route urgent safety issues to a human. |
| `request_human_handoff(reason)` | Transfer to support queue. | Persist conversation reference and safe summary. |

**Prohibited Agent Actions:**
The agent must **not**:
- Approve identity or professional verification
- Certify an artisan's competence
- Guarantee a provider will arrive
- Negotiate or alter provider prices
- Mark a job complete
- Declare a payment successful without a verified transaction record
- Issue refunds
- Adjudicate disputes
- Reveal private identity documents
- Provide medical, legal or emergency-response determinations
- Override safety, eligibility and platform policies

For ambiguous requests, low confidence, conflicting backend results, sensitive topics or repeated tool failures, the agent must ask a clarifying question or escalate. It must state when it is an AI assistant and make human support accessible.

### D.6 Account Linking and Authentication
- A WhatsApp sender is initially an unlinked channel identity, not an authenticated ALICE session.
- Account linking should use a short-lived one-time code generated by ALICE and entered in the authenticated PWA, or another secure verified flow approved by the product owner.
- Do not rely solely on matching the WhatsApp phone number to a profile. Phone numbers may be shared, recycled or changed.
- After linking, the backend stores a channel identity record mapping the WhatsApp sender to the ALICE user ID, with `linked_at`, `status`, `consent` and unlink history.
- Sensitive actions may require step-up authentication in the PWA or a separate OTP challenge. Do not send identity documents or full private addresses in ordinary chat replies.
- Users must be able to unlink WhatsApp, revoke consent and request human support.

### D.7 WhatsApp / Twilio Integration Requirements
- Use Twilio Programmable Messaging with a WhatsApp-enabled sender associated with the ALICE business identity.
- Configure a public HTTPS inbound webhook in FastAPI and a separate delivery-status callback endpoint.
- Validate Twilio request signatures using the official Twilio SDK and the exact externally visible URL and request parameters. Account for reverse-proxy URL handling.
- Use Twilio's WhatsApp Sandbox for development and controlled demonstrations; production requires a registered WhatsApp sender and applicable Meta/Twilio approvals.
- Use the WhatsApp address format `whatsapp:+<E.164 number>` when sending through Twilio.
- Track the last inbound user message and customer-service-window expiry. Free-form replies are allowed only within the applicable 24-hour customer-service window; outside it, use an approved template where permitted.
- Create separate approved templates for supported languages and categories where required (for example, booking confirmation, appointment reminder, quote available, rental return reminder and utility updates).
- Capture and retain appropriate opt-in evidence for proactive notifications. Respect opt-out and template category requirements.
- Use environment secrets for `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` and callback configuration. Never commit credentials.
- Log message IDs and status metadata, not full message contents by default. Apply retention controls to conversation transcripts and media.

### D.8 WhatsApp Message and Conversation Data

| Entity / Table | Key Fields (Illustrative) | Purpose |
| :--- | :--- | :--- |
| `channel_identities` | `id`, `user_id` (nullable), `channel`, `external_address_hash`/encrypted address, `linked_at`, `status`, `consent_at`, `unlinked_at` | Link WhatsApp identity to an ALICE user with lifecycle controls. |
| `conversations` | `id`, `channel`, `channel_identity_id`, `language`, `state`, `last_inbound_at`, `service_window_expires_at`, `assigned_agent`, `handoff_status` | Track conversation and session context. |
| `messages` | `id`, `conversation_id`, `provider_message_id`, `direction`, `message_type`, `redacted_content`/reference, `status`, `created_at` | Idempotency, audit and delivery tracking. |
| `agent_runs` | `id`, `conversation_id`, `intent`, `model`/`provider`, `status`, `latency_ms`, `token_usage`, `tool_trace_reference`, `safety_outcome` | Operational monitoring without exposing secrets. |
| `agent_tool_calls` | `id`, `agent_run_id`, `tool_name`, `arguments_redacted`, `result_reference`, `authorization_outcome`, `confirmed_by_user`, `created_at` | Trace every tool call and consequential action. |
| `notification_preferences` | `user_id`, `whatsapp_opt_in`, `language`, `transactional_updates`, `marketing_opt_in`, `updated_at` | Manage consent and message preferences. |
| `support_handoffs` | `id`, `conversation_id`, `reason`, `summary`, `status`, `assigned_to`, `created_at`, `resolved_at` | Human escalation and resolution. |

The external WhatsApp phone number should be protected at rest and should not be used as a public identifier. Retention periods, lawful basis, consent language and deletion/anonymisation procedures must be approved before production.

### D.9 AI Safety, Privacy and Quality Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `NFR-AI-001` | The agent shall ground marketplace claims in current backend results. | Must | Provider, price, rating, availability and booking facts have source record IDs in tool traces. |
| `NFR-AI-002` | The agent shall not expose another user's personal or transactional data. | Must | Cross-account access tests fail closed. |
| `NFR-AI-003` | The agent shall require explicit confirmation for consequential actions. | Must | Tool call is blocked until confirmation is captured and bound to the action summary. |
| `NFR-AI-004` | The agent shall be resilient to prompt injection in user messages, provider descriptions and uploaded content. | Must | Untrusted content cannot change system rules or expand tool permissions. |
| `NFR-AI-005` | The system shall apply per-user rate limits, abuse detection and cost controls. | Must | Flooding and repeated requests are throttled without creating marketplace records. |
| `NFR-AI-006` | The system shall provide human escalation for uncertainty, safety concerns and complaints. | Must | Escalation creates a support record with context. |
| `NFR-AI-007` | The system shall minimise transcript retention and redact sensitive data from operational logs. | Must | Logs do not contain passwords, OTPs, full identity-document numbers or private document URLs. |
| `NFR-AI-008` | The system shall monitor agent latency, tool failures, fallback rate, resolution rate and cost per conversation. | Should | Dashboard/report exposes operational metrics. |
| `NFR-AI-009` | The agent shall support English and French with consistent service terminology. | Must | Bilingual test suite passes for core intents. |
| `NFR-AI-010` | The system shall prevent duplicate actions caused by Twilio webhook retries or model retries. | Must | Idempotency tests show one business action per confirmed request. |

### D.10 Conversation Quality and Analytics
Track at minimum:
- Inbound conversations, unique users, linked-account rate
- Intent distribution, service-request completion rate, rental-request completion rate
- Clarification count, human-handoff rate, tool failure rate
- Average and p95 response latency
- User-reported helpfulness, opt-out rate and estimated cost per resolved conversation

Do not optimise only for conversation length; optimise for successful, safe task completion. A controlled test set should include common Buea language variants, code-switching between English and French, spelling errors, neighbourhood names, ambiguous service descriptions, low-confidence cases, prompt injection attempts and adversarial requests to expose another user's data.

### D.11 Rollout Stages

| Stage | Scope | Exit Criteria |
| :--- | :--- | :--- |
| **D0 — Technical proof** | Twilio Sandbox; inbound webhook; signature validation; basic reply; FastAPI + `uv` deployment. | Inbound and outbound test messages work; webhook retries do not duplicate responses. |
| **D1 — Read-only assistant** | Bilingual FAQs, category discovery, public provider search and public rental listing search. | Grounded answers; no private data; human handoff works. |
| **D2 — Authenticated assistant** | Secure account linking; own booking and quotation lookup; notification preferences. | Ownership tests pass; opt-in and opt-out work; no sensitive data leak. |
| **D3 — Transaction assistant** | Draft and confirm service requests and rental requests through backend tools. | Explicit confirmation, idempotency, audit and availability recheck pass. |
| **D4 — Production hardening** | Approved sender/templates, monitoring, support staffing, privacy review and load/security testing. | Operational owner, approved templates, incident process and release checklist signed off. |

---

## Appendix E. Backend Implementation Standards (FastAPI, Supabase and uv)

### E.1 Approved Backend Stack

| Component | Decision | Implementation Notes |
| :--- | :--- | :--- |
| **Language** | Python | Pin supported Python version in project configuration and CI. |
| **API framework** | FastAPI | Use typed Pydantic request/response schemas, dependency injection and OpenAPI documentation. |
| **ASGI server** | Uvicorn | Run FastAPI as an ASGI application; configure production process and health checks. |
| **Backend package manager** | `uv` | Use `uv` for dependency resolution, virtual environments, Python version management and reproducible installs. |
| **Project metadata** | `pyproject.toml` | Declare runtime and development dependencies, scripts, lint/test configuration and Python constraints. |
| **Lockfile** | `uv.lock` | Commit lockfile; CI and deployment use locked/synced dependencies. |
| **Database** | Supabase PostgreSQL | Use PostgreSQL as the source of truth; apply migrations and constraints. |
| **Auth** | Supabase Auth | Validate JWTs server-side; define user-to-role mapping and secure account linking. |
| **Storage** | Supabase Storage | Private buckets and short-lived signed URLs for protected files. |
| **RLS** | PostgreSQL Row Level Security | Enable and test RLS on exposed tables; least privilege; never expose service-role key to client. |
| **Realtime** | Supabase Realtime (selective) | Use only for features requiring live updates; not a substitute for backend authorization. |

### E.2 Responsibility Boundaries
FastAPI owns ALICE application logic: service eligibility, provider matching, quotation rules, booking and rental state transitions, commissions, dispute workflows, WhatsApp orchestration, tool permissions, audit events and integration adapters. Supabase supplies managed infrastructure primitives: PostgreSQL, authentication, object storage and optional realtime delivery. Supabase does not replace ALICE's domain logic.

All consequential business operations should pass through FastAPI service functions. The browser and AI agent must not write directly to core marketplace tables through unrestricted Supabase client access. If the frontend uses Supabase Auth directly, it may receive a user session, but it must call FastAPI for privileged marketplace operations. RLS remains a second enforcement layer, not the only application authorization mechanism.

### E.3 Recommended Repository Structure

```text
alice-backend/
├── pyproject.toml
├── uv.lock
├── .python-version
├── .env.example
├── README.md
├── alembic.ini
├── migrations/
├── app/
│   ├── main.py
│   ├── core/               # settings, logging, security, dependencies
│   ├── api/v1/             # routers and API schemas
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── verification/
│   │   ├── catalogue/
│   │   ├── providers/
│   │   ├── bookings/
│   │   ├── rentals/
│   │   ├── reviews/
│   │   ├── disputes/
│   │   ├── notifications/
│   │   └── whatsapp_agent/
│   ├── integrations/
│   │   ├── supabase/
│   │   ├── twilio/
│   │   └── ai_provider/
│   └── workers/            # asynchronous jobs, retries, scheduled tasks
└── tests/
    ├── unit/
    ├── integration/
    ├── api/
    └── security/
```

### E.4 `uv` Workflow Requirements
`uv` is the required backend package manager. `pip`, Poetry or manually maintained `requirements.txt` files must not become competing sources of truth for the backend project.

| Task | Command | Purpose |
| :--- | :--- | :--- |
| **Initialise project** | `uv init` | Create Python project metadata. |
| **Add runtime dependency** | `uv add fastapi uvicorn supabase pydantic-settings` | Add and lock application dependencies; confirm package choices and versions during implementation. |
| **Add development tools** | `uv add --dev pytest ruff mypy httpx` | Add test, lint, type-check and API-test tooling. |
| **Install locked dependencies** | `uv sync --locked` | Install exactly the dependency graph recorded in `uv.lock`; fail if lockfile is stale. |
| **Run development server** | `uv run uvicorn app.main:app --reload` | Start local FastAPI server. |
| **Run tests** | `uv run pytest` | Execute automated tests. |
| **Lint** | `uv run ruff check .` | Check code quality. |
| **Format** | `uv run ruff format .` | Apply consistent formatting. |
| **Refresh lockfile** | `uv lock` | Resolve and write dependency lockfile after approved dependency changes. |

Commit `pyproject.toml` and `uv.lock`. Do not commit `.venv`, `.env`, service-role keys, Twilio auth tokens or Google Gemini API keys. CI should install with `uv sync --locked` and run tests, linting and type checks.

### E.5 Supabase Database and Security Requirements
- Use Supabase PostgreSQL as the primary relational database; replace the previous MySQL assumption in all implementation plans.
- Define schema migrations as version-controlled SQL or an approved migration tool workflow. Production schema changes must not be made manually without a recorded migration.
- Enable RLS on tables exposed through Supabase APIs. Create explicit policies for each role and operation; test policies using representative `anon`, `authenticated`, customer, provider and admin contexts.
- Keep Supabase service-role credentials exclusively on trusted server infrastructure. Never bundle them in React assets, browser environment variables or WhatsApp agent prompts.
- Use Supabase Auth JWT validation in FastAPI. Verify signature, issuer, audience/expiry as applicable, and derive user identity from validated claims rather than user IDs supplied by clients or the language model.
- Use private Storage buckets for identity documents, competence evidence, complaint attachments and private conversation media. Use short-lived signed access after authorization.
- Separate public catalogue images from private user evidence. Apply upload type/size limits and malware/content checks where available.
- Use database constraints and transactions for booking acceptance, rental availability, quotation acceptance and other race-sensitive operations.
- Use database indexes for neighbourhood, category, provider status, availability, booking owner/status and rental availability queries.
- Use Realtime only for authorised changes such as booking progress or provider availability; validate channel access and do not publish sensitive table changes.

### E.6 WhatsApp Agent Integration Flow

```text
Customer WhatsApp
       │
       ▼
Twilio WhatsApp Business Platform (signed inbound webhook)
       │
       ▼
FastAPI POST /api/v1/integrations/twilio/whatsapp/inbound
       │
       ├──► Validate signature + deduplicate event (MessageSid)
       ▼
Conversation Orchestrator (load consent, channel link & safe context)
       │
       ▼
AI Intent / Tool Planner (allowlisted typed tools only)
       │
       ▼
ALICE Domain Services (bookings, providers, rentals, support)
       │
       ├──► Supabase PostgreSQL (source of truth)
       ├──► Supabase Storage (private media)
       └──► Audit / analytics / handoff queue
       │
       ▼
Response Policy + Redaction + WhatsApp 24h Window Check
       │
       ▼
Twilio Messaging API ──► Customer WhatsApp
```

The AI planner proposes a tool call; FastAPI validates the schema, authenticated principal, authorization, business state and confirmation requirement before execution. Tool results are returned to the agent for natural-language rendering only after private fields have been filtered.

### E.7 Suggested FastAPI Routes for WhatsApp

| Method and Path | Purpose | Security Notes |
| :--- | :--- | :--- |
| `POST /api/v1/integrations/twilio/whatsapp/inbound` | Receive Twilio inbound WhatsApp webhook. | Validate Twilio signature; accept only expected content type; deduplicate `MessageSid`. |
| `POST /api/v1/integrations/twilio/whatsapp/status` | Receive message delivery callbacks. | Validate signature; store status metadata; do not trust client-supplied status. |
| `POST /api/v1/whatsapp/link/start` | Start secure account-linking flow. | Rate limit; generate short-lived, single-use challenge. |
| `POST /api/v1/whatsapp/link/confirm` | Confirm link challenge. | Require authenticated ALICE session or approved step-up verification. |
| `DELETE /api/v1/whatsapp/link` | Unlink WhatsApp identity. | Require authenticated account owner; audit event. |
| `GET /api/v1/whatsapp/preferences` | Read WhatsApp communication preferences. | Authenticated owner only. |
| `PATCH /api/v1/whatsapp/preferences` | Update opt-in, opt-out and language preferences. | Authenticated owner; preserve consent history. |

### E.8 Configuration and Secret Management

| Variable / Secret | Purpose | Handling |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase project endpoint. | Server configuration; public project URL may also be used by frontend where intended. |
| `SUPABASE_ANON_KEY` | Supabase public/anon key. | May be used client-side only with correct RLS; never treat as authorization by itself. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server key. | Backend secret only; never expose to browser, logs or model. |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier. | Backend secret/configuration. |
| `TWILIO_AUTH_TOKEN` | Twilio webhook validation and API credential. | Backend secret; rotate if exposed. |
| `TWILIO_WHATSAPP_FROM` | Approved/sandbox WhatsApp sender. | Configuration; use correct WhatsApp address format (`whatsapp:+...`). |
| `GEMINI_API_KEY` | Google Gemini API credential. | Backend secret; never expose to browser, logs or model. |
| `APP_ENV` / `PUBLIC_BASE_URL` | Environment and canonical public URL used in webhook validation. | Separate development, staging and production values. |

Use a managed secret store in production. A local `.env` file is acceptable for development only and must be ignored by Git. Provide `.env.example` with variable names and descriptions but no real values.

### E.9 Backend Quality and Deployment Gates
- OpenAPI documentation must be generated from FastAPI schemas and reviewed as part of API changes.
- Use Pydantic validation for inbound API and tool payloads; reject unknown or invalid fields where appropriate.
- Use structured logs with correlation IDs across HTTP request, Twilio `MessageSid`, conversation ID, agent run and business transaction.
- Implement timeouts, bounded retries and circuit-breaker/fallback behaviour for Twilio, Supabase and AI-provider calls.
- Make webhook processing idempotent. Acknowledge provider webhooks promptly and move longer AI processing to a background task/queue when required.
- Do not hold an inbound webhook request open while a long model interaction runs if it risks provider timeout; return the appropriate acknowledgement and send the response asynchronously.
- Add health and readiness endpoints; readiness should verify critical dependencies without exposing secrets.
- Run database backup/restore tests and document recovery responsibilities.
- Use separate Supabase projects or isolated environments for development, staging and production.
- Before public launch, run authorization/RLS tests, webhook signature tests, prompt-injection tests, privacy review, cost/load tests and end-to-end bilingual tests.

---

## Appendix F. Integration and Operational References

| Reference | Official URL | Implementation Use |
| :--- | :--- | :--- |
| **Twilio WhatsApp Business Platform** | `https://www.twilio.com/docs/whatsapp/api` | Sender setup, inbound webhooks, outbound messaging and WhatsApp service windows. |
| **Twilio WhatsApp key concepts** | `https://www.twilio.com/docs/whatsapp/key-concepts` | 24-hour customer-service window, templates and message categories. |
| **Twilio WhatsApp rich messaging features** | `https://www.twilio.com/docs/whatsapp/message-features` | Supported message formats and interactive content. |
| **Supabase Python quickstart** | `https://supabase.com/docs/guides/getting-started/quickstarts/flask` | Python application connection and database setup. |
| **Supabase Row Level Security** | `https://supabase.com/docs/guides/database/postgres/row-level-security` | Database-level authorization and RLS policies. |
| **Supabase Product security** | `https://supabase.com/docs/guides/security/product-security` | Production security checklist for Auth, Database, Storage and Realtime. |
| **`uv` project and package management** | `https://docs.astral.sh/uv/` | Project metadata, dependency management, lockfiles and reproducible sync. |

---

## Appendix G. Google Gemini AI Provider Specification

**Decision:** Google Gemini is the selected and required foundation-model provider for the ALICE WhatsApp AI assistant. Twilio remains the WhatsApp Business messaging channel. FastAPI remains the orchestration and policy-enforcement layer. Supabase remains the data platform. The AI model does not own marketplace state and does not directly access the database.

### G.1 Provider and Integration Decision

| Area | Approved Decision | Requirement |
| :--- | :--- | :--- |
| **Model provider** | Google Gemini | All production LLM inference for the initial WhatsApp agent shall use Gemini models through Google's supported API. |
| **API integration** | Gemini API / Google AI Studio project | Use a dedicated Google project and API key for ALICE; document the selected model ID and API version in deployment configuration. |
| **Python SDK** | Google Gen AI SDK (`google-genai`) | Add and lock the dependency with `uv`; isolate SDK calls behind an internal adapter. |
| **Orchestration** | FastAPI | FastAPI controls prompts, tool schemas, authorization, confirmation, retries, timeouts and output filtering. |
| **Messaging** | Twilio WhatsApp API | Twilio handles inbound/outbound WhatsApp messages, delivery callbacks and template messaging. |
| **Data** | Supabase PostgreSQL / Storage | Gemini receives only the minimum data needed for the current task; no direct Supabase credentials or unrestricted database access. |
| **Initial model strategy** | A suitable Gemini Flash-class model for routine interactions | Choose the exact production model after bilingual, tool-calling, latency and cost evaluation; keep model ID configurable. |

### G.2 API Subscription and Billing Clarification
The user's Google AI Pro subscription may provide higher limits and model access in supported Google AI Studio interactive experiences, but it must not be treated as an automatic entitlement to unlimited or included Gemini API usage from ALICE's deployed backend. Programmatic Gemini API usage is governed by the API project's applicable usage tier, rate limits and billing configuration. Before production, the ALICE owner must verify current Google account benefits, API access, billing requirements, model availability in the target region and applicable pricing.

- Create a dedicated Google AI Studio / Google Cloud project for ALICE rather than using a personal development key as the permanent production credential.
- Create a Gemini API key for the project and store it only as a backend secret (`GEMINI_API_KEY`).
- Start with an available free or eligible development tier if permitted, and observe its rate limits and data-use terms.
- Before enabling paid API billing, configure budgets, alerts, spend monitoring and a maximum application-level request budget.
- Do not assume that Google AI Pro subscription fees cover token charges generated by ALICE's server-side API requests.
- Review Google's current Gemini API terms and data handling rules before sending customer conversations, phone numbers, addresses, identity details or complaint content to the model.
- Use synthetic or redacted data for development and evaluation wherever possible.

### G.3 Gemini API Integration Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| `FR-GEM-001` | The backend shall call Gemini only from trusted server-side code using the official Google Gen AI Python SDK or a supported HTTPS API. | Must | No Gemini API key appears in frontend bundles, mobile/PWA code or client logs. |
| `FR-GEM-002` | The backend shall keep the Gemini model identifier configurable by environment or server configuration. | Must | Model can be changed without rewriting marketplace business logic. |
| `FR-GEM-003` | The backend shall send typed function/tool declarations for the approved ALICE tool allowlist. | Must | Model can request only documented tools; unknown tool names are rejected. |
| `FR-GEM-004` | The backend shall validate every Gemini-proposed tool call against Pydantic schemas and authenticated user permissions. | Must | Invalid fields and unauthorized actions are rejected before execution. |
| `FR-GEM-005` | The backend shall require explicit user confirmation before executing consequential tool calls. | Must | No booking, rental, cancellation or other consequential action is performed from model inference alone. |
| `FR-GEM-006` | The backend shall treat model output as untrusted and filter/redact it before sending to Twilio. | Must | Private fields, internal prompts, stack traces and secrets are not sent to customers. |
| `FR-GEM-007` | The backend shall implement timeouts, bounded retries, rate limits and fallback/handoff behaviour for Gemini API failures. | Must | Transient errors do not create duplicate transactions; customer receives a safe fallback. |
| `FR-GEM-008` | The backend shall record model ID, request correlation ID, latency, token usage when supplied, tool-call outcomes and safety outcomes. | Should | Operations can estimate cost and diagnose failures without retaining unnecessary sensitive content. |
| `FR-GEM-009` | The backend shall apply configurable input/output token limits and conversation-context limits. | Must | Unbounded conversation history cannot cause uncontrolled cost or latency. |
| `FR-GEM-010` | The backend shall evaluate Gemini in English and French against a curated ALICE task and safety test suite before release. | Must | Core intents, tool use, clarification and refusal/escalation tests meet agreed thresholds. |

### G.4 Recommended Python Package and Environment
Use Google's official Python package `google-genai`, installed and locked through `uv`. The SDK must be wrapped by an internal adapter (for example, `app/integrations/gemini/client.py`) so the rest of the application does not depend directly on provider-specific request/response structures.

| Item | Value / Example | Notes |
| :--- | :--- | :--- |
| **`uv` dependency** | `uv add google-genai` | Adds the SDK to `pyproject.toml` and updates `uv.lock`. |
| **Environment variable** | `GEMINI_API_KEY` | Secret injected into backend runtime. |
| **Model setting** | `GEMINI_MODEL=<approved-model-id>` | Keep configurable; do not hardcode preview model names in business logic. |
| **Adapter module** | `app/integrations/gemini/client.py` | Owns client construction, request config, timeouts, retries and response normalization. |
| **Agent module** | `app/modules/whatsapp_agent/` | Owns system instructions, conversation state, tool schemas and policy checks. |
| **Tests** | Mock Gemini adapter in unit tests | Integration tests may call a non-production project with controlled test data. |

### G.5 Model Selection and Evaluation
Do not select a model solely because it is the newest or most powerful. The WhatsApp assistant primarily needs reliable intent recognition, natural English/French responses, structured output, tool calling, low latency and predictable operating cost. A Gemini Flash-class model is the recommended starting candidate for routine service discovery and booking assistance. A more capable model may be considered for difficult multi-step requests only if evaluation demonstrates meaningful benefit and the cost is acceptable.

| Evaluation Dimension | How ALICE Should Test It |
| :--- | :--- |
| **English/French quality** | Test Cameroon-relevant English and French, code-switching, spelling variants and local service vocabulary. |
| **Tool-call accuracy** | Measure correct tool selection, valid arguments, refusal of unknown tools and avoidance of invented data. |
| **Safety and authorization** | Attempt cross-user booking lookup, requests for ID documents, provider verification bypass and unauthorised cancellations. |
| **Latency** | Measure median and p95 response time from inbound Twilio event to customer reply. |
| **Cost** | Measure input/output token use and cost per resolved customer task, including context and retry overhead. |
| **Robustness** | Test Twilio retries, model timeouts, malformed outputs, unavailable providers and ambiguous neighbourhood/service requests. |

### G.6 Data Minimisation and Privacy Controls
- Do not send raw identity documents, full identity-document numbers, authentication tokens, OTPs, payment credentials or private signed Storage URLs to Gemini.
- Where a user asks about a booking, retrieve and authorize the booking in FastAPI first; pass only the fields needed to generate the response.
- Use internal IDs or redacted references rather than full phone numbers and addresses where feasible.
- Keep system instructions and tool definitions server-side; never allow a user message or provider listing to override them.
- Set and document conversation retention, redaction and deletion rules. Apply the same policy to AI traces, Twilio message logs and support handoff records.
- Review the applicable Google Gemini API data-use and retention terms for the selected API tier before production processing of personal data.

### G.7 Fallback and Provider Resilience
Gemini is the selected primary provider; the MVP does not require multi-provider AI routing. However, ALICE must degrade safely when Gemini is unavailable: acknowledge the message, offer a limited non-AI menu or human support, preserve any confirmed draft, and never repeat a consequential action automatically. The provider adapter should keep model-specific code isolated so a future provider change would not require rewriting booking, rental or verification modules.

### G.8 Release Acceptance Checklist
- [ ] A dedicated ALICE Google project and API key are configured.
- [ ] The exact Gemini model ID and supported API interface are recorded.
- [ ] API rate limits, billing tier, terms and data handling are reviewed.
- [ ] `GEMINI_API_KEY` is stored in backend secrets and absent from client assets and Git history.
- [ ] `uv.lock` contains the approved `google-genai` dependency.
- [ ] English/French task and safety evaluations pass.
- [ ] Tool calls are validated and consequential actions require confirmation.
- [ ] Usage, latency, errors and cost are observable.
- [ ] Fallback and human handoff work during simulated Gemini outages.