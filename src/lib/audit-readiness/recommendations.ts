import type { GapCode } from './client-risk'

/** Deterministic regulation category + recommended action per gap code. */
const GAP_GUIDANCE: Record<GapCode, { regulation: string; action: string }> = {
  missing_intake: {
    regulation: '245D.04 Service Initiation',
    action: 'Complete and file the client intake packet, including service agreement and consents.',
  },
  missing_annual_review: {
    regulation: '245D.071 Service Planning — Annual Review',
    action: 'Schedule and document the annual support plan review with the case manager.',
  },
  missing_semi_annual_review: {
    regulation: '245D.071 Service Planning — Progress Review',
    action: 'Complete the semi-annual progress review and obtain required signatures.',
  },
  missing_45_day_review: {
    regulation: '245D.071 Service Planning — 45-Day Review',
    action: 'Conduct the 45-day initial review and file it in the client record.',
  },
  missing_signatures: {
    regulation: '245D.095 Documentation Requirements',
    action: 'Obtain the outstanding client/guardian and case manager signatures on completed forms.',
  },
  missing_support_plan: {
    regulation: '245D.071 Coordinated Service & Support Plan',
    action: 'Develop and activate a coordinated service and support plan (CSSP) for the client.',
  },
  expired_assessment: {
    regulation: '245D.071 Assessment & Plan Review',
    action: 'Reassess the client and refresh the support plan before the next review window.',
  },
  incomplete_service_agreement: {
    regulation: '245D.04 Service Agreement',
    action: 'Finalize and execute the service agreement; move the plan out of draft status.',
  },
}

export function gapRecommendation(code: GapCode): { regulation: string; action: string } {
  return GAP_GUIDANCE[code] ?? { regulation: '245D General', action: 'Review and remediate this compliance gap.' }
}
