import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid, Bell, Users, ClipboardList, PenLine, Calendar, MapPin,
  AlertTriangle, Receipt, FileCheck2, BadgeDollarSign, BarChart3, Folder,
  Library, ShieldCheck, Sparkles, HelpCircle, Building2, UserCog,
  GraduationCap, FileText, Upload, Webhook, ScrollText, Settings2, BookOpen,
  Gauge, Gavel, FileWarning, ClipboardCheck, FileBarChart2, History,
  Pill, ClipboardPlus, RefreshCw, PackageCheck, MessageSquare, FolderHeart, HeartPulse,
} from 'lucide-react'
import { isAdmin, isSuperAdmin } from '@/lib/auth/role-guards'
import type { Role } from '@/types/app'

export interface NavItem {
  href: string
  translationKey: string
  icon: LucideIcon
}

export interface NavGroup {
  id: string
  /** i18n key for the group heading */
  labelKey: string
  items: NavItem[]
  adminOnly?: boolean
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'care',
    labelKey: 'nav.group_care',
    items: [
      { href: '/dashboard',     translationKey: 'nav.dashboard',     icon: LayoutGrid },
      { href: '/notifications', translationKey: 'nav.notifications', icon: Bell },
      { href: '/clients',       translationKey: 'nav.clients',       icon: Users },
      { href: '/notes',         translationKey: 'nav.notes',         icon: PenLine },
      { href: '/schedule',      translationKey: 'nav.schedule',      icon: Calendar },
      { href: '/evv',           translationKey: 'nav.evv',           icon: MapPin },
    ],
  },
  {
    id: 'compliance',
    labelKey: 'nav.group_compliance',
    items: [
      { href: '/packets',      translationKey: 'nav.packets',           icon: ClipboardList },
      { href: '/incidents',    translationKey: 'nav.incidents',         icon: AlertTriangle },
      { href: '/qa',           translationKey: 'nav.quality_assurance', icon: ShieldCheck },
      { href: '/form-library', translationKey: 'nav.form_library',      icon: Library },
    ],
  },
  {
    id: 'medications',
    labelKey: 'nav.group_medications',
    items: [
      { href: '/medications',           translationKey: 'nav.medications',          icon: Pill },
      { href: '/medication-pass',       translationKey: 'nav.medication_pass',      icon: ClipboardPlus },
      { href: '/refills',               translationKey: 'nav.refills',              icon: RefreshCw },
      { href: '/pharmacy-orders',       translationKey: 'nav.pharmacy_orders',      icon: PackageCheck },
      { href: '/pharmacy-messages',     translationKey: 'nav.pharmacy_messages',    icon: MessageSquare },
      { href: '/pharmacy-documents',    translationKey: 'nav.pharmacy_documents',   icon: FolderHeart },
      { href: '/medication-compliance', translationKey: 'nav.medication_compliance', icon: HeartPulse },
    ],
  },
  {
    id: 'audit-readiness',
    labelKey: 'nav.group_audit_readiness',
    items: [
      { href: '/audit-readiness',              translationKey: 'nav.audit_dashboard',     icon: Gauge },
      { href: '/audit-readiness/wizard',       translationKey: 'nav.audit_wizard',        icon: Gavel },
      { href: '/audit-readiness/risk',         translationKey: 'nav.audit_risk',          icon: ShieldCheck },
      { href: '/audit-readiness/missing-docs', translationKey: 'nav.audit_missing_docs',  icon: FileWarning },
      { href: '/audit-readiness/staff',        translationKey: 'nav.audit_staff',         icon: UserCog },
      { href: '/audit-readiness/caps',         translationKey: 'nav.audit_caps',          icon: ClipboardCheck },
      { href: '/audit-readiness/reports',      translationKey: 'nav.audit_reports',       icon: FileBarChart2 },
      { href: '/audit-readiness/history',      translationKey: 'nav.audit_history',       icon: History },
    ],
  },
  {
    id: 'business',
    labelKey: 'nav.group_business',
    items: [
      { href: '/billing-readiness',                translationKey: 'nav.billing_readiness', icon: Receipt },
      { href: '/billing-readiness/claims',         translationKey: 'nav.claims',            icon: BadgeDollarSign },
      { href: '/billing-readiness/authorizations', translationKey: 'nav.authorizations',    icon: FileCheck2 },
      { href: '/analytics',                        translationKey: 'nav.analytics',         icon: BarChart3 },
      { href: '/documents',                        translationKey: 'nav.documents',         icon: Folder },
    ],
  },
  {
    id: 'workspace',
    labelKey: 'nav.group_workspace',
    items: [
      { href: '/staff/directory', translationKey: 'nav.staff_directory', icon: UserCog },
      { href: '/ai',              translationKey: 'nav.ai_tools',        icon: Sparkles },
      { href: '/help',            translationKey: 'nav.help_center',     icon: HelpCircle },
    ],
  },
  {
    id: 'admin',
    labelKey: 'admin.administration',
    adminOnly: true,
    items: [
      { href: '/admin/settings',          translationKey: 'admin.settings',          icon: Settings2 },
      { href: '/admin/staff',             translationKey: 'admin.staff',             icon: UserCog },
      { href: '/admin/organizations',     translationKey: 'admin.organizations',     icon: Building2 },
      { href: '/admin/team',              translationKey: 'admin.team',              icon: Users },
      { href: '/admin/trainings',         translationKey: 'admin.trainings',         icon: GraduationCap },
      { href: '/admin/audit-assistant',   translationKey: 'admin.audit_assistant',   icon: Sparkles },
      { href: '/admin/forms',             translationKey: 'admin.form_templates',    icon: FileText },
      { href: '/admin/compliance-alerts', translationKey: 'admin.compliance_alerts', icon: Bell },
      { href: '/admin/import',            translationKey: 'admin.import',            icon: Upload },
      { href: '/admin/help-center',       translationKey: 'admin.help_center',       icon: BookOpen },
      { href: '/admin/webhooks',          translationKey: 'admin.webhooks',          icon: Webhook },
      { href: '/admin/audit-log',         translationKey: 'admin.audit_log',         icon: ScrollText },
    ],
  },
]

export function visibleNavGroups(role: Role): NavGroup[] {
  return NAV_GROUPS.filter(
    (group) => !group.adminOnly || isAdmin(role) || isSuperAdmin(role)
  )
}
