import type { StateProfile } from './types'
import { MN } from './mn'
import { OH } from './oh'
import { AZ } from './az'

const PROFILES: Record<string, StateProfile> = { MN, OH, AZ }
export const DEFAULT_STATE = 'MN'

export function getStateProfile(code: string | null | undefined): StateProfile | null {
  if (!code) return null
  return PROFILES[code.toUpperCase()] ?? null
}

export function listStateProfiles(): StateProfile[] {
  return Object.values(PROFILES)
}
