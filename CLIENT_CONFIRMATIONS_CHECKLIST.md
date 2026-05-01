# Khan Bhai S. — Pre-Development Client Confirmation Checklist

**Project**: Khan Bhai S. Complete Website Build
**Status**: Ready for Development (pending confirmations)
**Build Start**: Upon completion of all confirmations below
**Estimated Timeline**: 7-8 days after confirmations

---

## CRITICAL ITEMS (Block Development)

### 1. Pricing — Room Types
- [ ] **Standard Room** — Final price per night (placeholder: ₹1,200)
- [ ] **Deluxe Room** — Final price per night (placeholder: ₹2,000)
- [ ] **Premium Suite** — Final price per night (placeholder: ₹3,500)
- [ ] **Family Room** — Final price per night (placeholder: ₹2,800)

**Why Important**: Pricing directly impacts checkout calculations and booking form.
**Action**: Provide final pricing or confirm placeholders are acceptable.

---

### 2. Pricing — Tour Packages
- [ ] **Nainital Weekend** (2D/1N) — Final price per person (placeholder: ₹4,500)
- [ ] **Jim Corbett Safari** (3D/2N) — Final price per person (placeholder: ₹8,000)
- [ ] **Kedarnath Yatra** (4D/3N) — Final price per person (placeholder: ₹12,000)
- [ ] **Nainital + Bhimtal Combo** (3D/2N) — Final price (placeholder: ₹6,500)

**Why Important**: Tour pricing displayed on /travel page and in checkout.
**Action**: Provide final pricing or confirm placeholders are acceptable.

---

### 3. Contact Information — WhatsApp
- [ ] **Owner's WhatsApp Number** (mobile) — Full 10-digit Indian number

**Why Important**: 
- Stored in .env variable, used for all booking alerts
- Customers can click to WhatsApp owner directly
- Change in one place updates everywhere

**Action**: Provide in format: +91XXXXXXXXXX

---

### 4. Contact Information — Email
- [ ] **Owner's Email Address** — Primary email for booking notifications

**Why Important**:
- Receives every booking alert
- Should be checked daily (or set up email-to-SMS forwarding)
- Used for admin login account creation

**Action**: Provide a reliable email that owner checks regularly.

---

### 5. Email Configuration — Gmail SMTP
- [ ] **Gmail Account Email** — For sending booking confirmations

**Option A (Recommended)**:
- [ ] Use owner's Gmail account
- [ ] Generate App Password (in Google Account settings)
- [ ] Store credentials in .env

**Option B (Alternative)**:
- [ ] Create dedicated Gmail (e.g., khanbhais.bookings@gmail.com)
- [ ] Share credentials securely

**Why Important**: Sends transactional emails to customers + owner.
**Action**: Choose Option A or B, provide credentials.

---

### 6. Razorpay Payment Gateway
- [ ] **Razorpay Account Created** (or in progress)
- [ ] **Test Mode API Keys Ready**
  - [ ] Key ID: `rzp_test_xxxxxx`
  - [ ] Key Secret: `rzp_test_xxxxxx`
- [ ] **Plan to Obtain Live Keys** — Timeline & KYC readiness

**Why Important**: Enables test mode deployment immediately; live mode after KYC.
**Action**: Create account at razorpay.com, provide test API keys.

---

## IMPORTANT ITEMS (Critical UX)

### 7. Domain Name
- [ ] Preferred custom domain (e.g., khanbhais.in)
  - OR
- [ ] Approve launching on `khanbhais.vercel.app` initially, custom domain later

**Why Important**: Used in DNS setup, email signatures, WhatsApp links.
**Action**: Decide now or accept vercel.app domain for launch.

---

### 8. Timezone
- [ ] Confirm timezone for bookings & timestamps

Options:
- [ ] IST (Indian Standard Time) — UTC+5:30 ✓ Recommended
- [ ] Other (specify): ___________

**Why Important**: Dates/times stored in UTC, displayed in local timezone.
**Action**: Confirm IST is correct.

---

## CONTENT ITEMS (Design & Display)

### 9. Branding — Logo
- [ ] **Logo file** (SVG or high-res PNG) — For navbar and hero

**Requirements**: 
- Vector format (SVG) preferred
- Minimum 512x512px
- Transparent background
- Both horizontal and square versions if available

**Action**: Provide logo file via email/drive.

---

### 10. Branding — Color Approval
- [ ] **Approve Primary Gold Color**: #C9A84C
  - Used for buttons, headings, accents
  - [ ] Approved
  - [ ] Request different shade (provide hex code)

**Why Important**: Golden luxury aesthetic matches hotel/restaurant concept.
**Action**: Confirm or suggest alternative.

---

### 11. Branding — Fonts Approval
- [ ] **Playfair Display** (serif) for headings — Approved ✓
- [ ] **Poppins** (sans-serif) for body — Approved ✓

**Why Important**: Fonts affect brand perception and readability.
**Action**: Confirm or suggest alternatives.

---

### 12. Brand Story — "About Us" Text
- [ ] **Brand story / company history** — 2-3 paragraphs for home page

**Suggested Content**: 
- When was Khan Bhai founded?
- What makes it special?
- Mission/values statement

**Where Used**: Home page + footer
**Action**: Provide 150-300 word narrative.

---

### 13. Restaurant Page — Operating Hours
- [ ] **Monday-Friday Hours** (e.g., 11:00 AM - 11:00 PM)
- [ ] **Saturday Hours** (e.g., 11:00 AM - 12:00 AM)
- [ ] **Sunday Hours** (e.g., 11:00 AM - 10:00 PM)
- [ ] **Closed Days** (e.g., None, or specific day)

**Where Used**: /restaurant page
**Action**: Provide opening/closing times.

---

### 14. Hotel Amenities List
- [ ] List all amenities (e.g., WiFi, AC, Swimming Pool, Parking, etc.)

**Common Examples**:
- [ ] WiFi (Free)
- [ ] Air Conditioning
- [ ] Swimming Pool
- [ ] Restaurant On-Site
- [ ] Parking (Free/Paid)
- [ ] Gym/Fitness
- [ ] Spa Services
- [ ] Room Service
- [ ] Laundry Service
- [ ] Pet Friendly

**Where Used**: /stay page room cards
**Action**: Provide complete amenities checklist.

---

### 15. Tour Itineraries — Day-by-Day Plans
For each tour package, provide detailed day-by-day breakdown:

**Nainital Weekend (2D/1N)**
- [ ] Day 1 itinerary (arrival, activities, meals)
- [ ] Day 2 itinerary (activities, departure)

**Jim Corbett Safari (3D/2N)**
- [ ] Day 1, Day 2, Day 3 itineraries

**Kedarnath Yatra (4D/3N)**
- [ ] Day 1, Day 2, Day 3, Day 4 itineraries

**Nainital + Bhimtal Combo (3D/2N)**
- [ ] Day 1, Day 2, Day 3 itineraries

**Where Used**: /travel page, tour detail modals
**Action**: Provide detailed itineraries.

---

### 16. Tour Packages — Inclusions
For each tour, specify what's included:

Example Format:
```
- Accommodation (2 nights)
- Daily breakfast & dinner
- One guided tour per day
- Travel by AC vehicle
- Entry tickets to monuments
```

**Action**: List inclusions for all 4 tour packages.

---

## CONTENT ITEMS (Optional for V1, Required for V2)

### 17. Restaurant Photos
- [ ] **Restaurant interior photos** (minimum 5-10 high-quality images)
- [ ] **Food/dish photography** (signature dishes, menu items)

**Current Plan**: Launch with Unsplash stock photos in V1
**V2 Plan**: Replace with real photos when available

**Why Important**: Authentic photos improve booking conversion rate.
**Action**: Provide photos or confirm Unsplash stock photos are acceptable for launch.

---

### 18. Hotel Room Photos
- [ ] **Room category photos** (Standard, Deluxe, Premium, Family)
- [ ] **Minimum 3-5 photos per room type** (different angles)

**Current Plan**: Launch with Unsplash stock photos in V1
**V2 Plan**: Replace with real photos when available

**Action**: Provide photos or confirm Unsplash stock photos are acceptable.

---

### 19. Hotel Exterior / Landscape Photos
- [ ] **Hotel exterior** (front entrance, main facade)
- [ ] **Surrounding landscape** (Haldwani location, mountain views)

**Current Plan**: Launch with Unsplash Himalayan stock photos
**V2 Plan**: Replace with real photos

**Action**: Provide photos or confirm stock photos acceptable.

---

## OPTIONAL ENHANCEMENTS

### 20. Restaurant Menu (Optional for V1)
- [ ] Full restaurant menu with dish names, descriptions, prices
- [ ] Menu categories (Starters, Mains, Breads, Desserts, Beverages)

**Current Plan**: Informational page only (no ordering in V1)
**V2 Plan**: Add menu management + ordering

**Action**: Provide or defer to V2.

---

### 21. Social Media Accounts (Optional)
- [ ] Instagram handle (for footer links)
- [ ] Facebook page URL
- [ ] YouTube channel (if videos available)
- [ ] Twitter/X handle

**Where Used**: Footer, social sharing buttons
**Action**: Provide handles if available.

---

## VERIFICATION & SIGN-OFF

### Technical Verification
- [ ] Client confirms no conflicts with phone number format
- [ ] Client confirms email is deliverable
- [ ] Client confirms Razorpay account will be created before build start

### Content Verification
- [ ] Client reviews all pricing listed above
- [ ] Client reviews brand story
- [ ] Client reviews amenities list
- [ ] Client reviews tour itineraries

### Visual Approval
- [ ] Client approves gold color (#C9A84C)
- [ ] Client approves font choices (Playfair Display + Poppins)
- [ ] Client approves black-and-gold luxury aesthetic

---

## SUBMISSION INSTRUCTIONS

**Please provide responses to:**
1. Email: iteshbisht361@gmail.com
2. Format: Fill out this checklist and reply with checked boxes + details
3. Deadline: Before development starts (Phase 0)

---

## TIMELINE AFTER CONFIRMATIONS

| Phase | Duration | What Happens |
|-------|----------|--------------|
| Phase 0 | Day 1 | Foundation setup (Next.js, Tailwind, DB) |
| Phase 1 | Days 1-2 | Layout shell (navbar, footer, hero) |
| Phase 2 | Days 2-3 | All 3 service pages (restaurant, rooms, tours) |
| Phase 3 | Days 3-4 | Database & API setup |
| Phase 4 | Days 4-5 | Checkout & Razorpay payment |
| Phase 5 | Day 5 | Email & WhatsApp notifications |
| Phase 6 | Days 6-7 | Admin dashboard for bookings |
| Phase 7 | Days 7-8 | Polish, QA, deployment |
| **TOTAL** | **7-8 days** | **Live website** |

---

## SUPPORT & QUESTIONS

If you have questions about any of these items:
- Email: iteshbisht361@gmail.com
- Response time: Within 24 hours

---

## SIGN-OFF

**Client Name**: _________________
**Date**: _________________
**Signature**: _________________

By signing below, client confirms:
- All information above is accurate and complete
- All confirmations provided and verified
- Ready to proceed with Phase 0 development

---

**Document Version**: 1.0
**Last Updated**: 2026-05-01
**Status**: Awaiting Client Confirmation
