/**
 * ALICE Typed API Client
 * Targets VITE_API_BASE_URL (default: http://localhost:8000/api/v1)
 * Enforces Bearer JWT, Idempotency-Key headers, and NFR-LOW-001 offline state handling.
 */

import {
  Booking,
  Complaint,
  InAppNotification,
  PowerCompatibilityResult,
  ProviderSearchResult,
  RentalBooking,
  RentalInspection,
  RentalListing,
  Review,
  ServiceArea,
  ServiceCategory,
  ServiceItem,
  UserProfile,
  VerificationItem,
} from '../types';

import {
  INITIAL_BOOKINGS,
  INITIAL_BUEA_AREAS,
  INITIAL_CATEGORIES,
  INITIAL_DISPUTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROVIDERS,
  INITIAL_RENTAL_BOOKINGS,
  INITIAL_RENTAL_LISTINGS,
  INITIAL_SERVICES,
  INITIAL_USER_PROFILE,
  INITIAL_VERIFICATIONS,
} from './mockData';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1';

// Local storage state keys for offline persistence (NFR-LOW-001)
const STORAGE_KEYS = {
  TOKEN: 'alice_jwt_token',
  USER_ID: 'alice_user_id',
  ROLE: 'alice_active_role',
  BOOKINGS: 'alice_store_bookings',
  RENTALS: 'alice_store_rentals',
  VERIFICATIONS: 'alice_store_verifications',
  DISPUTES: 'alice_store_disputes',
};

// In-memory state synchronized with local storage
let memoryBookings: Booking[] = loadFromStorage(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
let memoryRentals: RentalBooking[] = loadFromStorage(STORAGE_KEYS.RENTALS, INITIAL_RENTAL_BOOKINGS);
let memoryVerifications: VerificationItem[] = loadFromStorage(STORAGE_KEYS.VERIFICATIONS, INITIAL_VERIFICATIONS);
let memoryDisputes: Complaint[] = loadFromStorage(STORAGE_KEYS.DISPUTES, INITIAL_DISPUTES);
let memoryProfile: UserProfile = { ...INITIAL_USER_PROFILE };

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota or incognito
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setStoredToken(token: string | null, userId?: string) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (userId) localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  }
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');

  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message = errorJson.detail || errorJson.message || `API error ${response.status}`;
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    // If backend is offline or network fails, fallback gracefully (NFR-LOW-001)
    console.warn(`[ALICE API Client] Network call to ${path} failed, falling back to local simulation:`, error);
    throw error;
  }
}

/**
 * High-Level Typed ALICE API Client
 */
export const api = {
  // 1. Authentication
  auth: {
    sendOtp: async (phone: string) => {
      try {
        return await request<{ status: string; phone_e164: string; message: string }>('/auth/otp/send', {
          method: 'POST',
          body: JSON.stringify({ phone }),
          skipAuth: true,
        });
      } catch {
        return {
          status: 'success',
          phone_e164: phone.startsWith('+237') ? phone : `+237${phone.replace(/\D/g, '')}`,
          message: 'OTP sent (Demo code: 123456)',
        };
      }
    },

    verifyOtp: async (phone: string, token: string) => {
      try {
        const res = await request<{
          access_token: string;
          token_type: string;
          user_id: string;
          phone_e164: string;
          roles: string[];
          account_status: string;
        }>('/auth/otp/verify', {
          method: 'POST',
          body: JSON.stringify({ phone, token }),
          skipAuth: true,
        });
        setStoredToken(res.access_token, res.user_id);
        return res;
      } catch {
        // Fallback demo token generator
        const demoToken = `mock-jwt-${Date.now()}`;
        const demoUserId = 'usr-demo-01';
        setStoredToken(demoToken, demoUserId);
        return {
          access_token: demoToken,
          token_type: 'bearer',
          user_id: demoUserId,
          phone_e164: phone.startsWith('+237') ? phone : `+237${phone}`,
          roles: ['CUSTOMER'],
          account_status: 'ACTIVE',
        };
      }
    },
  },

  // 2. User & Addresses
  users: {
    getMe: async (): Promise<UserProfile> => {
      try {
        return await request<UserProfile>('/users/me');
      } catch {
        return memoryProfile;
      }
    },

    updateMe: async (data: Partial<UserProfile>): Promise<UserProfile> => {
      try {
        const res = await request<UserProfile>('/users/me', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        memoryProfile = res;
        return res;
      } catch {
        memoryProfile = { ...memoryProfile, ...data };
        return memoryProfile;
      }
    },

    getAddresses: async () => {
      try {
        return await request<UserProfile['addresses']>('/users/me/addresses');
      } catch {
        return memoryProfile.addresses;
      }
    },

    addAddress: async (addr: { neighbourhood: string; street_address: string; landmark?: string }) => {
      try {
        return await request<UserProfile['addresses'][0]>('/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify(addr),
        });
      } catch {
        const newAddr = {
          id: `addr-${Date.now()}`,
          user_id: memoryProfile.id,
          is_primary: memoryProfile.addresses.length === 0,
          ...addr,
        };
        memoryProfile.addresses.push(newAddr);
        return newAddr;
      }
    },
  },

  // 3. Catalogue & Service Areas
  catalogue: {
    getCategories: async (): Promise<ServiceCategory[]> => {
      try {
        return await request<ServiceCategory[]>('/catalogue/categories');
      } catch {
        return INITIAL_CATEGORIES;
      }
    },

    getServices: async (categoryId?: string): Promise<ServiceItem[]> => {
      try {
        const q = categoryId ? `?category_id=${categoryId}` : '';
        return await request<ServiceItem[]>(`/catalogue/services${q}`);
      } catch {
        if (!categoryId) return INITIAL_SERVICES;
        return INITIAL_SERVICES.filter((s) => s.category_id === categoryId);
      }
    },

    getAreas: async (): Promise<ServiceArea[]> => {
      try {
        return await request<ServiceArea[]>('/catalogue/areas');
      } catch {
        return INITIAL_BUEA_AREAS;
      }
    },
  },

  // 4. Providers & Discovery (FR-SRCH-001 to 006)
  providers: {
    search: async (params: {
      service_id?: string;
      area_id?: string;
      keyword?: string;
      verified_only?: boolean;
    }): Promise<ProviderSearchResult[]> => {
      try {
        const queryParams = new URLSearchParams();
        if (params.service_id) queryParams.set('service_id', params.service_id);
        if (params.area_id) queryParams.set('area_id', params.area_id);
        if (params.keyword) queryParams.set('keyword', params.keyword);
        if (params.verified_only) queryParams.set('verified_only', 'true');

        const qs = queryParams.toString();
        return await request<ProviderSearchResult[]>(`/providers${qs ? `?${qs}` : ''}`);
      } catch {
        let results = [...INITIAL_PROVIDERS];
        if (params.verified_only) {
          results = results.filter((p) => p.verification_badges.includes('Identity Checked'));
        }
        if (params.keyword) {
          const kw = params.keyword.toLowerCase();
          results = results.filter(
            (p) =>
              p.display_name.toLowerCase().includes(kw) ||
              p.service_names.some((s) => s.toLowerCase().includes(kw)) ||
              p.area_names.some((a) => a.toLowerCase().includes(kw))
          );
        }
        return results;
      }
    },

    getById: async (providerId: string): Promise<ProviderSearchResult> => {
      try {
        return await request<ProviderSearchResult>(`/providers/${providerId}`);
      } catch {
        const found = INITIAL_PROVIDERS.find((p) => p.id === providerId);
        if (!found) throw new Error('Provider not found');
        return found;
      }
    },

    onboard: async (data: { business_name: string; bio: string; service_ids: string[]; area_ids: string[] }) => {
      try {
        return await request('/providers/onboard', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        if (!memoryProfile.roles.includes('PROVIDER')) {
          memoryProfile.roles.push('PROVIDER');
        }
        return { status: 'success', message: 'Provider onboarded successfully' };
      }
    },
  },

  // 5. Bookings & Quotation Lifecycle (Section 6.2)
  bookings: {
    list: async (): Promise<Booking[]> => {
      try {
        return await request<Booking[]>('/bookings');
      } catch {
        return memoryBookings;
      }
    },

    getById: async (bookingId: string): Promise<Booking> => {
      try {
        return await request<Booking>(`/bookings/${bookingId}`);
      } catch {
        const found = memoryBookings.find((b) => b.id === bookingId);
        if (!found) throw new Error('Booking not found');
        return found;
      }
    },

    create: async (
      data: {
        provider_id: string;
        service_id: string;
        neighbourhood: string;
        description: string;
        scheduled_at: string;
      },
      idempotencyKey?: string
    ): Promise<Booking> => {
      const idemKey = idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      try {
        const res = await request<Booking>('/bookings', {
          method: 'POST',
          body: JSON.stringify(data),
          idempotencyKey: idemKey,
        });
        memoryBookings = [res, ...memoryBookings];
        saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
        return res;
      } catch {
        const srv = INITIAL_SERVICES.find((s) => s.id === data.service_id);
        const prov = INITIAL_PROVIDERS.find((p) => p.id === data.provider_id);
        const newBooking: Booking = {
          id: `book-${Date.now()}`,
          reference: `ALICE-SRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_id: memoryProfile.id,
          provider_id: data.provider_id,
          provider_name: prov ? prov.display_name : 'Fru Plumbing & Engineering',
          service_id: data.service_id,
          service_name: srv ? srv.name : 'Home Service',
          category_slug: srv ? srv.slug : 'repairs',
          neighbourhood: data.neighbourhood,
          description: data.description,
          scheduled_at: data.scheduled_at,
          status: 'REQUESTED',
          history: [{ status: 'REQUESTED', timestamp: new Date().toISOString() }],
          created_at: new Date().toISOString(),
          reviewed: false,
        };
        memoryBookings = [newBooking, ...memoryBookings];
        saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
        return newBooking;
      }
    },

    submitQuotation: async (
      bookingId: string,
      data: {
        labour_xaf: number;
        materials_xaf: number;
        delivery_xaf: number;
        fees_xaf: number;
        notes?: string;
      }
    ) => {
      try {
        return await request(`/bookings/${bookingId}/quotations`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const total = data.labour_xaf + data.materials_xaf + data.delivery_xaf + data.fees_xaf;
        const target = memoryBookings.find((b) => b.id === bookingId);
        if (target) {
          target.status = 'QUOTATION_RECEIVED';
          target.active_quotation = {
            id: `quote-${Date.now()}`,
            booking_id: bookingId,
            provider_id: target.provider_id,
            labour_xaf: data.labour_xaf,
            materials_xaf: data.materials_xaf,
            delivery_xaf: data.delivery_xaf,
            fees_xaf: data.fees_xaf,
            total_xaf: total,
            notes: data.notes,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            created_at: new Date().toISOString(),
          };
          target.history.push({ status: 'QUOTATION_RECEIVED', timestamp: new Date().toISOString() });
          saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
        }
        return { status: 'success', total };
      }
    },

    acceptQuotation: async (quotationId: string): Promise<{ status: string; checkin_pin?: string }> => {
      try {
        return await request<{ status: string; checkin_pin?: string }>(`/bookings/quotations/${quotationId}/accept`, {
          method: 'POST',
        });
      } catch {
        const target = memoryBookings.find((b) => b.active_quotation?.id === quotationId);
        if (target) {
          target.status = 'CONFIRMED';
          target.checkin_pin = String(Math.floor(1000 + Math.random() * 9000));
          target.history.push({
            status: 'CONFIRMED',
            timestamp: new Date().toISOString(),
            note: `PIN generated: ${target.checkin_pin}`,
          });
          saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
          return { status: 'confirmed', checkin_pin: target.checkin_pin };
        }
        return { status: 'confirmed', checkin_pin: '4829' };
      }
    },

    updateStatus: async (
      bookingId: string,
      status: Booking['status'],
      checkinPin?: string
    ): Promise<Booking> => {
      try {
        return await request<Booking>(`/bookings/${bookingId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, checkin_pin: checkinPin }),
        });
      } catch {
        const target = memoryBookings.find((b) => b.id === bookingId);
        if (!target) throw new Error('Booking not found');

        if (status === 'IN_PROGRESS' && checkinPin && target.checkin_pin && checkinPin !== target.checkin_pin) {
          throw new Error('Invalid Check-in PIN. Please ask the customer for the correct 4-digit code.');
        }

        target.status = status;
        target.history.push({ status, timestamp: new Date().toISOString() });
        saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
        return target;
      }
    },
  },

  // 6. Rentals (FR-RENT-001 to 009)
  rentals: {
    getListings: async (): Promise<RentalListing[]> => {
      try {
        return await request<RentalListing[]>('/rentals/listings');
      } catch {
        return INITIAL_RENTAL_LISTINGS;
      }
    },

    createListing: async (listing: Omit<RentalListing, 'id'>): Promise<RentalListing> => {
      try {
        return await request<RentalListing>('/rentals/listings', {
          method: 'POST',
          body: JSON.stringify(listing),
        });
      } catch {
        const newListing: RentalListing = {
          id: `rent-${Date.now()}`,
          ...listing,
        };
        INITIAL_RENTAL_LISTINGS.push(newListing);
        return newListing;
      }
    },

    estimateCompatibility: async (payload: {
      appliances: { name: string; watts: number; hours_per_day: number }[];
      listing_capacity_wh: number;
      listing_continuous_w: number;
    }): Promise<PowerCompatibilityResult> => {
      try {
        return await request<PowerCompatibilityResult>('/rentals/compatibility-estimator', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        // High-fidelity local math matching SRS Section 6.5 & Phase 4 build guide
        let totalWh = 0;
        let peakW = 0;
        for (const item of payload.appliances) {
          totalWh += item.watts * item.hours_per_day;
          peakW += item.watts;
        }

        // 85% usable battery capacity due to inverter DC-AC conversion losses
        const usableWh = Math.round(payload.listing_capacity_wh * 0.85);
        const warnings: string[] = [];

        if (peakW > payload.listing_continuous_w) {
          warnings.push(
            `Appliance load (${peakW}W) exceeds continuous inverter rating (${payload.listing_continuous_w}W). Risk of overload trip!`
          );
        }

        if (totalWh > usableWh) {
          warnings.push(
            `Total energy demand (${totalWh}Wh) exceeds usable battery capacity (${usableWh}Wh). May require midday solar or AC recharge.`
          );
        }

        const avgPower = peakW > 0 ? peakW : 100;
        const runtime = Number((usableWh / avgPower).toFixed(1));

        return {
          is_compatible: warnings.length === 0,
          total_wh_needed: totalWh,
          usable_wh_capacity: usableWh,
          peak_continuous_w_needed: peakW,
          continuous_w_capacity: payload.listing_continuous_w,
          estimated_runtime_hours: runtime,
          warnings,
        };
      }
    },

    book: async (
      data: {
        listing_id: string;
        start_at: string;
        end_at: string;
        terms_accepted: boolean;
      },
      idempotencyKey?: string
    ): Promise<RentalBooking> => {
      const idemKey = idempotencyKey || `rent-idem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      try {
        const res = await request<RentalBooking>('/rentals/bookings', {
          method: 'POST',
          body: JSON.stringify(data),
          idempotencyKey: idemKey,
        });
        memoryRentals = [res, ...memoryRentals];
        saveToStorage(STORAGE_KEYS.RENTALS, memoryRentals);
        return res;
      } catch {
        const listing = INITIAL_RENTAL_LISTINGS.find((l) => l.id === data.listing_id);
        const start = new Date(data.start_at).getTime();
        const end = new Date(data.end_at).getTime();
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const daily = listing ? listing.daily_rate_xaf : 25000;
        const deposit = listing ? listing.deposit_xaf : 50000;

        const newBooking: RentalBooking = {
          id: `rent-bk-${Date.now()}`,
          reference: `ALICE-RENT-2026-${Math.floor(100 + Math.random() * 900)}`,
          listing_id: data.listing_id,
          model_name: listing ? listing.model_name : 'Portable Power Station 2kWh',
          provider_id: listing ? listing.provider_id : 'prov-power-1',
          provider_name: listing ? listing.provider_name : 'Buea Tech Hub Energy',
          customer_id: memoryProfile.id,
          customer_name: memoryProfile.display_name,
          start_at: data.start_at,
          end_at: data.end_at,
          days,
          daily_rate_xaf: daily,
          deposit_xaf: deposit,
          total_xaf: daily * days + deposit,
          status: 'CONFIRMED',
          created_at: new Date().toISOString(),
        };
        memoryRentals = [newBooking, ...memoryRentals];
        saveToStorage(STORAGE_KEYS.RENTALS, memoryRentals);
        return newBooking;
      }
    },

    listMyBookings: async (): Promise<RentalBooking[]> => {
      return memoryRentals;
    },

    createInspection: async (rentalId: string, inspection: Omit<RentalInspection, 'id' | 'created_at'>) => {
      try {
        return await request(`/rentals/bookings/${rentalId}/inspections`, {
          method: 'POST',
          body: JSON.stringify(inspection),
        });
      } catch {
        const target = memoryRentals.find((r) => r.id === rentalId);
        if (target) {
          const rec: RentalInspection = {
            id: `insp-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...inspection,
          };
          if (inspection.inspection_type === 'HANDOVER') {
            target.handover_inspection = rec;
            target.status = 'ACTIVE';
          } else {
            target.return_inspection = rec;
            target.status = 'RETURNED';
          }
          saveToStorage(STORAGE_KEYS.RENTALS, memoryRentals);
        }
        return { status: 'success' };
      }
    },
  },

  // 7. Verifications & Admin Queue (FR-VER-001 to 008)
  verifications: {
    submitIdentity: async (data: { document_type: string; document_url: string }) => {
      try {
        return await request<VerificationItem>('/verifications/identity', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const item: VerificationItem = {
          id: `ver-${Date.now()}`,
          user_id: memoryProfile.id,
          user_name: memoryProfile.display_name,
          phone_e164: memoryProfile.phone_e164,
          verification_type: 'IDENTITY',
          document_type: data.document_type,
          document_url: data.document_url,
          status: 'PENDING_REVIEW',
          submitted_at: new Date().toISOString(),
        };
        memoryProfile.identity_status = 'PENDING_REVIEW';
        memoryVerifications.push(item);
        saveToStorage(STORAGE_KEYS.VERIFICATIONS, memoryVerifications);
        return item;
      }
    },

    submitCompetence: async (data: { service_id: string; document_type: string; document_url: string }) => {
      try {
        return await request<VerificationItem>('/verifications/competence', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const srv = INITIAL_SERVICES.find((s) => s.id === data.service_id);
        const item: VerificationItem = {
          id: `ver-${Date.now()}`,
          user_id: memoryProfile.id,
          user_name: memoryProfile.display_name,
          phone_e164: memoryProfile.phone_e164,
          verification_type: 'COMPETENCE',
          service_id: data.service_id,
          service_name: srv?.name || 'Trade Service',
          document_type: data.document_type,
          document_url: data.document_url,
          status: 'PENDING_REVIEW',
          submitted_at: new Date().toISOString(),
        };
        memoryProfile.competence_status = 'PENDING_REVIEW';
        memoryVerifications.push(item);
        saveToStorage(STORAGE_KEYS.VERIFICATIONS, memoryVerifications);
        return item;
      }
    },

    getAdminQueue: async (): Promise<VerificationItem[]> => {
      try {
        return await request<VerificationItem[]>('/verifications/admin/queue');
      } catch {
        return memoryVerifications;
      }
    },

    review: async (
      verificationId: string,
      action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
      decisionReason: string
    ) => {
      try {
        return await request(`/verifications/admin/${verificationId}/review`, {
          method: 'PATCH',
          body: JSON.stringify({ action, decision_reason: decisionReason }),
        });
      } catch {
        const target = memoryVerifications.find((v) => v.id === verificationId);
        if (target) {
          target.status = action === 'APPROVE' ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'ADDITIONAL_INFORMATION_REQUIRED';
          target.decision_reason = decisionReason;
          target.reviewed_at = new Date().toISOString();
          saveToStorage(STORAGE_KEYS.VERIFICATIONS, memoryVerifications);
        }
        return { status: 'success' };
      }
    },
  },

  // 8. Reviews (AC-09: Only completed bookings)
  reviews: {
    submit: async (data: { booking_id: string; rating: number; comment: string }) => {
      try {
        return await request<Review>('/reviews', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const target = memoryBookings.find((b) => b.id === data.booking_id);
        if (!target || target.status !== 'COMPLETED') {
          throw new Error('Reviews are only permitted for fully COMPLETED bookings (AC-09).');
        }
        target.reviewed = true;
        saveToStorage(STORAGE_KEYS.BOOKINGS, memoryBookings);
        return {
          id: `rev-${Date.now()}`,
          booking_id: data.booking_id,
          reviewer_name: memoryProfile.display_name,
          rating: data.rating,
          comment: data.comment,
          created_at: new Date().toISOString(),
        };
      }
    },
  },

  // 9. Complaints & Disputes
  disputes: {
    lodge: async (data: {
      booking_id?: string;
      category: Complaint['category'];
      description: string;
    }): Promise<Complaint> => {
      try {
        return await request<Complaint>('/disputes/complaints', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        const newComplaint: Complaint = {
          id: `disp-${Date.now()}`,
          case_reference: `ALICE-CASE-${Math.floor(1000 + Math.random() * 9000)}`,
          reporter_id: memoryProfile.id,
          booking_id: data.booking_id,
          category: data.category,
          description: data.description,
          status: 'OPEN',
          created_at: new Date().toISOString(),
        };
        memoryDisputes.push(newComplaint);
        saveToStorage(STORAGE_KEYS.DISPUTES, memoryDisputes);
        return newComplaint;
      }
    },

    getAdminCases: async (): Promise<Complaint[]> => {
      try {
        return await request<Complaint[]>('/disputes/admin/cases');
      } catch {
        return memoryDisputes;
      }
    },

    resolve: async (caseId: string, notes: string) => {
      try {
        return await request(`/disputes/admin/cases/${caseId}/resolve`, {
          method: 'PATCH',
          body: JSON.stringify({ resolution_notes: notes, status: 'RESOLVED' }),
        });
      } catch {
        const target = memoryDisputes.find((d) => d.id === caseId);
        if (target) {
          target.status = 'RESOLVED';
          target.resolution_notes = notes;
          saveToStorage(STORAGE_KEYS.DISPUTES, memoryDisputes);
        }
        return { status: 'resolved' };
      }
    },
  },

  // 10. WhatsApp Linking (Appendix D & E.7)
  whatsapp: {
    startLink: async () => {
      try {
        return await request<{ linking_code: string; expires_in_seconds: number; instructions: string }>(
          '/whatsapp/link/start',
          { method: 'POST' }
        );
      } catch {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        return {
          linking_code: code,
          expires_in_seconds: 600,
          instructions: `Send "LINK ${code}" to the ALICE WhatsApp number (+237670000000) within 10 minutes.`,
        };
      }
    },
  },

  // 11. Admin Metrics & Audit Logs
  admin: {
    getMetrics: async () => {
      try {
        return await request<{
          total_users: number;
          verified_providers: number;
          active_bookings: number;
          active_rentals: number;
          open_disputes: number;
        }>('/admin/metrics');
      } catch {
        return {
          total_users: 142,
          verified_providers: 28,
          active_bookings: memoryBookings.filter((b) => ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)).length,
          active_rentals: memoryRentals.filter((r) => r.status === 'CONFIRMED' || r.status === 'ACTIVE').length,
          open_disputes: memoryDisputes.filter((d) => d.status === 'OPEN').length,
        };
      }
    },

    getAuditLogs: async () => {
      try {
        return await request('/admin/audit-logs');
      } catch {
        return [
          {
            id: 'audit-1',
            actor_id: 'admin-01',
            action: 'VERIFICATION_APPROVED',
            entity_type: 'IdentityVerification',
            entity_id: 'ver-001',
            reason: 'CNI authenticity confirmed via visual security inspection',
            created_at: '2026-11-10T11:45:00+01:00',
          },
          {
            id: 'audit-2',
            actor_id: 'admin-01',
            action: 'DISPUTE_INVESTIGATED',
            entity_type: 'Complaint',
            entity_id: 'disp-001',
            reason: 'Assigned electrical safety inspector to visit site in Molyko',
            created_at: '2026-11-13T07:00:00+01:00',
          },
        ];
      }
    },
  },

  // 12. Notifications
  notifications: {
    list: async (): Promise<InAppNotification[]> => {
      try {
        return await request<InAppNotification[]>('/notifications');
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    },

    markRead: async (notifId: string) => {
      try {
        return await request(`/notifications/${notifId}/read`, { method: 'PATCH' });
      } catch {
        const item = INITIAL_NOTIFICATIONS.find((n) => n.id === notifId);
        if (item) item.is_read = true;
        return { status: 'success' };
      }
    },
  },
};

