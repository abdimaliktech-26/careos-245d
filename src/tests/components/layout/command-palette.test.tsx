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

  test('typed query shows Ask CareAssist item that dispatches careassist:ask', async () => {
    const user = userEvent.setup({ delay: null })
    const askListener = vi.fn()
    window.addEventListener('careassist:ask', askListener)
    render(<CommandPalette role="staff" />)
    await user.keyboard('{Meta>}k{/Meta}')
    await user.type(screen.getByPlaceholderText(/search/i), 'what is a 45 day review')
    const askItem = await screen.findByText(/Ask CareAssist/i)
    await user.click(askItem)
    expect(askListener).toHaveBeenCalledTimes(1)
    const event = askListener.mock.calls[0][0] as CustomEvent<{ question: string }>
    expect(event.detail.question).toBe('what is a 45 day review')
    window.removeEventListener('careassist:ask', askListener)
  })
})
