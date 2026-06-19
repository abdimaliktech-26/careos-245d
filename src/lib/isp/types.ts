import { z } from 'zod'

export type PlanStatus = 'draft' | 'active' | 'under_review' | 'expired'

export type ServicePlan = {
  id: string
  organization_id: string
  client_id: string
  plan_type: string | null
  status: PlanStatus
  assessed_needs: string | null
  summary: string | null
  effective_date: string | null
  review_date: string | null
  annual_review_date: string | null
  activated_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PlanService = {
  id: string
  service_plan_id: string
  service_name: string
  frequency: string | null
  units: string | null
  responsible_party: string | null
  notes: string | null
  sort_order: number
}

export type PlanRisk = {
  id: string
  service_plan_id: string
  risk: string
  mitigation: string | null
  severity: string | null
  sort_order: number
}

export type PlanSignature = {
  id: string
  service_plan_id: string
  signer_role: string
  signer_name: string
  signer_user_id: string | null
  signature_data: string | null
  signed_at: string
}

export const planFormSchema = z.object({
  clientId: z.string().uuid(),
  planType: z.string().max(40).optional().nullable(),
  assessedNeeds: z.string().max(8000).optional().nullable(),
  summary: z.string().max(8000).optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  reviewDate: z.string().optional().nullable(),
  annualReviewDate: z.string().optional().nullable(),
})
export type PlanFormInput = z.infer<typeof planFormSchema>

export const serviceSchema = z.object({
  serviceName: z.string().min(1).max(200),
  frequency: z.string().max(120).optional().nullable(),
  units: z.string().max(60).optional().nullable(),
  responsibleParty: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const riskSchema = z.object({
  risk: z.string().min(1).max(2000),
  mitigation: z.string().max(2000).optional().nullable(),
  severity: z.enum(['low', 'medium', 'high']).optional().nullable(),
})

export const signSchema = z.object({
  signerRole: z.enum(['client', 'guardian', 'case_manager', 'staff']),
  signerName: z.string().min(1).max(200),
  signatureData: z.string().max(200000).optional().nullable(),
})
