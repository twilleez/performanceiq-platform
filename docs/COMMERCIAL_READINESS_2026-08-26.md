# PerformanceIQ — Marketing & Commercial Readiness

Date: 2026-08-26
Owner: Marketing + Product Design
Approver: Program Manager

## Positioning
PerformanceIQ is a performance-training platform that connects readiness, today's training, workout logging, progress and role-specific coaching workflows.

Primary product loop: **Readiness → Today → Log → Progress**.

The public experience must answer four questions quickly:
1. What is PerformanceIQ?
2. Who is it for?
3. What does it help me do?
4. What should I do next?

## Primary audiences
### Athlete
Job: know what to do today and understand whether training is moving forward.
Primary CTA: Create Free Account.

### Solo athlete
Job: structure training without needing a team account.
Primary CTA: Create Free Account / explore Solo demo.

### Coach
Job: organize athletes, programming, readiness and performance information in one workflow.
Primary CTA during beta: explore Coach demo. Do not promise paid team deployment until live Coach authorization testing passes.

### Parent
Job: understand the connected athlete's plan, progress and wellness at an appropriate level.
Primary CTA during beta: explore Parent demo. Do not market live family access until Parent authorization testing passes.

## Trust rules
- Do not describe PIQ Score or readiness as medical diagnosis, injury diagnosis, injury prediction, or medical advice.
- Clearly label sample/demo data.
- Do not claim Coach, Parent or Admin production authorization is verified until the PM test passes.
- Do not publish testimonials, customer counts, performance improvements or conversion statistics without evidence.
- Do not advertise a paid plan that cannot actually be purchased and provisioned.

## Public landing implementation
The production Welcome route is now a commercial landing experience containing:
- outcome-oriented hero;
- clear primary and secondary CTA;
- the Readiness → Today → Log → Progress product loop;
- Athlete, Coach, Solo and Parent audience cards;
- PIQ Score explanation and medical-use disclaimer;
- role demos using sample data;
- repeated signup CTA;
- responsive marketing layout.

## Pricing decision
**No paid price is being published in this phase.** Billing/provisioning has not yet passed a production purchase test, and competitor-price research was not available from the implementation environment during this pass. Publishing a number now would present an unvalidated commercial decision as settled.

Recommended validation sequence:
1. Keep account creation free during controlled beta.
2. Interview/test willingness-to-pay with athletes and coaches.
3. Define entitlements for Free, Athlete/Solo Pro and Coach/Team.
4. Model payment fees, support burden, Supabase usage and target gross margin.
5. Implement Stripe purchase + webhook/provisioning in a test environment.
6. Run successful purchase, renewal/cancel and entitlement regression tests.
7. Only then publish production pricing.

### Pricing hypotheses for research only — NOT production prices
- Athlete/Solo: test monthly willingness-to-pay bands rather than one predetermined price.
- Coach/Team: test per-team or athlete-band pricing and annual contracts.
- School/organization: sales-assisted pricing only after Admin and multi-team workflows are verified.

## Conversion measurement required before paid launch
Track at minimum:
- landing → signup click rate;
- signup start → account created;
- account created → onboarding completed;
- onboarding completed → first readiness check;
- first readiness → first workout logged;
- 7-day active retention;
- Coach demo → qualified team inquiry when that funnel is introduced.

No target percentages are asserted yet because there is no verified production baseline.

## PM acceptance
Marketing implementation can pass when the public landing renders in browser CI, its signup CTA reaches the tested signup route, role demos still work, claims remain within verified product capability, and no unsupported pricing/testimonial/medical claims are present.

Commercial paid-launch acceptance remains separate and requires payment/provisioning plus the outstanding Coach/Parent/Admin live-role gates.
