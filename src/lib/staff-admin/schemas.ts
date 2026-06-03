import { z } from 'zod'

export const createStaffSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
})

export type CreateStaffInput = z.infer<typeof createStaffSchema>
