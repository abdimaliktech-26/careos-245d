import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { CommandPalette } from '@/components/layout/command-palette'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
}))

describe('CommandPalette', () => {
  test('opens on Cmd+K and lists navigation', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="org_admin" />)
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  test('hides admin destinations for staff', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="staff" />)
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument()
  })

  test('navigates on selection', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="staff" />)
    await user.keyboard('{Meta>}k{/Meta}')
    await user.click(screen.getByText('New Client'))
    expect(push).toHaveBeenCalledWith('/clients/new')
  })
})
