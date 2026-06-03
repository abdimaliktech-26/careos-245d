import { z } from 'zod'

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().default('MN'),
  zip: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  guardianRelationship: z.string().optional(),
  programId: z.string().uuid('Invalid program').optional().or(z.literal('')),
  intakeDate: z.string().min(1, 'Intake date required'),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientSchema = createClientSchema.omit({ intakeDate: true }).partial()

export type UpdateClientInput = z.infer<typeof updateClientSchema>
