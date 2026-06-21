/** Configurable application name (per deployment via NEXT_PUBLIC_APP_NAME). */
export function appName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'CareIntake'
}
