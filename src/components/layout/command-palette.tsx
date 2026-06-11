'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, ClipboardPlus, FilePen, UserPlus } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { visibleNavGroups } from '@/components/layout/nav-config'
import type { Role } from '@/types/app'

interface CommandPaletteProps {
  role: Role
}

interface QuickAction {
  label: string
  href: string
  icon: typeof UserPlus
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New Client', href: '/clients/new', icon: UserPlus },
  { label: 'New Packet', href: '/packets', icon: ClipboardPlus },
  { label: 'New Note', href: '/notes', icon: FilePen },
  { label: 'New Incident', href: '/incidents', icon: CirclePlus },
]

/** "nav.billing_readiness" -> "Billing Readiness" */
function labelFromKey(translationKey: string): string {
  const slug = translationKey.split('.').pop() ?? translationKey
  const SPECIAL: Record<string, string> = {
    evv: 'EVV',
    ai_tools: 'AI Tools',
    quality_assurance: 'Quality Assurance',
  }
  const special = SPECIAL[slug]
  if (special) return special
  return slug
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function CommandPalette({ role }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const groups = visibleNavGroups(role)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search pages and actions…" />
        <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href + label} onSelect={() => go(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={labelFromKey(group.labelKey)}>
            {group.items.map(({ href, translationKey, icon: Icon }) => (
              <CommandItem key={href} onSelect={() => go(href)}>
                <Icon className="h-4 w-4" />
                {labelFromKey(translationKey)}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
