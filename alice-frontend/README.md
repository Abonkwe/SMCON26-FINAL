# ALICE Mobile-First PWA Frontend

Progressive Web App for **ALICE** — Buea's essential services marketplace and portable power station rental platform.

Built with **React 18 + Vite + TypeScript + Tailwind CSS** following **ALICE SRS v1.2** and the **Engineering Step-by-Step Build Guide**.

---

## 🎨 Design System & Brand Palette

Strictly configured in `tailwind.config.ts` per Section 11 of the SRS:

| Token Name | Hex Code | Intended Use |
| :--- | :--- | :--- |
| `primary-lavender` | `#8979E9` | Main brand surface |
| `electric-lavender` | `#9A73F5` | Gradient accent |
| `periwinkle-blue` | `#AAADF2` | Gradient midpoint |
| `royal-indigo` | `#585FB7` | Primary buttons & CTAs (5.53:1 contrast) |
| `midnight-navy` | `#181B2A` | Primary text & dark surfaces |
| `pure-white` | `#FDFDFE` | Elevated content panels |
| `cloud-gray` | `#F0F1F5` | Page background neutral |
| `dark-slate` | `#343752` | Body text & subtitles |
| `vivid-blue` | `#2448EF` | High-priority links |
| `orchid-pink` | `#D168DF` | Promotional accent |
| `mint-green` | `#34C399` | Verification & success badges |

**Signature Header Gradient:** `linear-gradient(135deg, #8980EA 0%, #AAADF2 50%, #9A73F5 100%)`

---

## 📱 Core Features & User Journeys

1. **PWA Installability & Offline Caching (`NFR-LOW-001`)**:
   - Web App Manifest (`manifest.webmanifest`)
   - Service worker (`public/sw.js`) for offline shell caching
   - Responsive down to `360px` viewport width with zero horizontal scrolling (`NFR-UX-001`)

2. **Auth & Role Switcher**:
   - Cameroon `+237` phone normalization & time-limited OTP authentication
   - Seamless role switching between **Customer**, **Provider Portal**, and **Admin Dashboard**

3. **5-Destination Bottom Navigation + Central Action Button**:
   - `Home` | `Explore` | **`+ Request` (Central Action)** | `Bookings` | `Rentals` | `Profile`
   - Touch targets $\ge 44\text{px}$

4. **Service Request & Quotation Lifecycle (Section 6.2)**:
   - Multi-step request drawer with Buea neighbourhood selection
   - Itemized quotation breakdown card (`labour`, `materials`, `delivery`, `fees`, `total XAF`) with 24h expiry countdown
   - Job-start 4-digit one-time PIN check-in modal
   - Two-sided completion sign-off
   - Post-completion reviews strictly gated behind completed jobs (`AC-09`)
   - Incident reporting generating `ALICE-CASE-XXXX` references

5. **Third-Party Power Station Rentals (Section 6.5 & AC-08)**:
   - Battery Capacity in $\text{Wh}$ explicitly separated from Inverter Output in $\text{W}$
   - Interactive appliance runtime & surge compatibility calculator
   - Mandatory deposit acknowledgment checkbox
   - Handover and return condition inspection logging

6. **Bilingual Support (`NFR-UX-002`)**:
   - English (`EN`) and French (`FR`) toggle across all screens and notifications

7. **WhatsApp AI Assistant Linking**:
   - In-app 6-digit code generator calling `POST /api/v1/whatsapp/link/start`

---

## 🚀 Getting Started

```bash
cd alice-frontend
npm install
npm run dev
```

App will run at `http://localhost:5173`.
FastAPI backend calls proxy to `http://localhost:8000/api/v1`.

