export interface Breadcrumb {
  label: string
  href: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const LABEL_OVERRIDES: Record<string, string> = {
  evv: 'EVV',
  qa: 'Quality Assurance',
  ai: 'AI Tools',
  'help-center': 'Help Center',
  'form-library': 'Form Library',
  'billing-readiness': 'Billing Readiness',
}

function labelForSegment(segment: string): string {
  if (UUID_PATTERN.test(segment)) return 'Detail'
  const override = LABEL_OVERRIDES[segment]
  if (override) return override
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function breadcrumbsFromPath(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
  }))
}
