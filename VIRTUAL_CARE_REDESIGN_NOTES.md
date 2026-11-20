# Qwesi virtual-care redesign

## Included in this revision
- Replaced the public homepage with a responsive virtual-care marketplace layout.
- Homepage directory fetches approved online-bookable doctors and herbalists, with provider-type filters and search.
- Removed physical-facility, staff, nursing, inpatient, lab, radiology, ambulance, inventory and blood-bank entries from the main workspace sidebar.
- Removed nurse as a public signup choice and added herbalist as a provider signup choice.
- Added consultation fee and currency fields to provider records; doctors and herbalists can set a consultation fee in their profile.
- Public and patient provider directories now include approved herbalists.
- Public appointment requests capture the provider's consultation fee and leave payment status pending.
- Updated shared colors and focus states for a cleaner responsive visual system.

## Important remaining integration work
- The repository's public appointment request flow still creates a pending-payment appointment request; this revision does not implement or verify a completed Paystack/card/mobile-money checkout, payment webhook, refund handling, provider payout, or platform commission settlement.
- The requested platform service-charge percentage and the exact definition of the system-wide average fee need a business rule/configuration before collection and settlement can safely be enabled.
- Existing legacy staff/nurse/hospital records and physical-care routes are retained in the database/code for compatibility, but the removed items are hidden from the primary navigation and nurse is no longer offered for new signup.
- Full end-to-end verification requires installing the project dependencies and connecting the deployment's database/payment credentials.
