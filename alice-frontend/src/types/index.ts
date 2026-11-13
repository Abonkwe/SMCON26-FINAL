/**
 * ALICE TypeScript Domain Definitions
 * Aligned with SRS v1.2 Sections 4, 5, 6, 11, 12, 13 & Appendix B/D
 */

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'VERIFICATION_REVIEWER' | 'ADMIN';

export type VerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'SUSPENDED';

export type BookingStatus =
  | 'REQUESTED'
  | 'QUOTATION_PENDING'
  | 'QUOTATION_RECEIVED'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED_PENDING_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type RentalStatus =
  | 'REQUESTED'
  | 'PENDING_PROVIDER'
  | 'CONFIRMED'
  | 'READY_FOR_HANDOVER'
  | 'ACTIVE'
  | 'RETURN_DUE'
  | 'RETURNED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface UserAddress {
  id: string;
  user_id: string;
  neighbourhood: string; // e.g. 'Molyko', 'Mile 16', 'Bonduma'
  street_address: string;
  landmark?: string;
  is_primary: boolean;
}

export interface UserProfile {
  id: string;
  phone_e164: string;
  display_name: string;
  legal_name?: string;
  preferred_language: 'en' | 'fr';
  roles: UserRole[];
  account_status: 'ACTIVE' | 'SUSPENDED';
  identity_status: VerificationStatus;
  competence_status: VerificationStatus;
  identity_doc_url?: string;
  addresses: UserAddress[];
  whatsapp_linked: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  name_fr: string;
  slug: string;
  icon: string;
  description: string;
  description_fr: string;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  name_fr: string;
  slug: string;
  pricing_type: 'FIXED' | 'QUOTATION';
  indicative_price_xaf?: number;
  requires_competence_verification: boolean;
  description: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface ProviderSearchResult {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  rating?: number; // Never fabricate if 0 or unreviewed
  review_count: number;
  completed_jobs: number;
  service_names: string[];
  area_names: string[];
  verification_badges: string[]; // ['Identity Checked', 'Skill Assessed', 'Completed Jobs']
  is_paused: boolean;
  indicative_rate_xaf?: number;
}

export interface QuotationItem {
  labour_xaf: number;
  materials_xaf: number;
  delivery_xaf: number;
  fees_xaf: number;
  total_xaf: number;
  notes?: string;
  expires_at: string;
  is_accepted?: boolean;
}

export interface Quotation {
  id: string;
  booking_id: string;
  provider_id: string;
  labour_xaf: number;
  materials_xaf: number;
  delivery_xaf: number;
  fees_xaf: number;
  total_xaf: number;
  notes?: string;
  expires_at: string;
  created_at: string;
}

export interface BookingStatusHistoryItem {
  status: BookingStatus;
  timestamp: string;
  note?: string;
}

export interface Booking {
  id: string;
  reference: string; // e.g. ALICE-SRV-2026-0042
  customer_id: string;
  provider_id: string;
  provider_name: string;
  service_id: string;
  service_name: string;
  category_slug: string;
  neighbourhood: string;
  description: string;
  scheduled_at: string;
  status: BookingStatus;
  checkin_pin?: string; // 4-digit one-time job-start PIN
  active_quotation?: Quotation;
  history: BookingStatusHistoryItem[];
  created_at: string;
  reviewed?: boolean;
}

export interface ApplianceLoad {
  name: string;
  watts: number;
  hours_per_day: number;
}

export interface PowerCompatibilityResult {
  is_compatible: boolean;
  total_wh_needed: number;
  usable_wh_capacity: number; // 85% of battery rating due to inverter losses
  peak_continuous_w_needed: number;
  continuous_w_capacity: number;
  estimated_runtime_hours: number;
  warnings: string[];
}

export interface RentalListing {
  id: string;
  provider_id: string;
  provider_name: string;
  model_name: string; // e.g., EcoFlow Delta 2 Max, Bluetti AC200MAX
  capacity_wh: number; // e.g. 2048 Wh
  continuous_output_w: number; // e.g. 2400 W
  peak_output_w: number; // e.g. 4800 W
  daily_rate_xaf: number;
  deposit_xaf: number;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR';
  connectors: string[]; // ['AC 230V', 'USB-C 100W', 'DC 12V Car Port', 'Anderson Port']
  image_url: string;
  is_available: boolean;
  owner_attestation: boolean;
  location_area: string;
}

export interface RentalBooking {
  id: string;
  reference: string;
  listing_id: string;
  model_name: string;
  provider_id: string;
  provider_name: string;
  customer_id: string;
  customer_name: string;
  start_at: string;
  end_at: string;
  days: number;
  daily_rate_xaf: number;
  deposit_xaf: number;
  total_xaf: number;
  status: RentalStatus;
  handover_inspection?: RentalInspection;
  return_inspection?: RentalInspection;
  created_at: string;
}

export interface RentalInspection {
  id: string;
  rental_id: string;
  inspection_type: 'HANDOVER' | 'RETURN';
  battery_percentage: number;
  cosmetic_condition: string;
  accessories_included: string[];
  serial_number: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_name: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  case_reference: string; // e.g. ALICE-CASE-8841
  reporter_id: string;
  booking_id?: string;
  category: 'SAFETY' | 'POOR_SERVICE' | 'NO_SHOW' | 'OVERCHARGING' | 'EQUIPMENT_DAMAGE' | 'OTHER';
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
  resolution_notes?: string;
  created_at: string;
}

export interface VerificationItem {
  id: string;
  user_id: string;
  user_name: string;
  phone_e164: string;
  verification_type: 'IDENTITY' | 'COMPETENCE';
  service_id?: string;
  service_name?: string;
  document_type: string; // CNI, Passport, Trade Certificate, Apprenticeship Testimonial
  document_url: string;
  status: VerificationStatus;
  decision_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  created_at: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'VERIFICATION' | 'RENTAL' | 'SAFETY';
  is_read: boolean;
  created_at: string;
}

export interface WhatsAppLinkState {
  code: string;
  expires_in_seconds: number;
  instructions: string;
}

