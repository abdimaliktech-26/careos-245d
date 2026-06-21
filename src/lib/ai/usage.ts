export function currentPeriod(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7) // 'YYYY-MM'
}

export function isOverLimit(currentCount: number, monthlyLimit: number): boolean {
  return currentCount >= monthlyLimit
}
