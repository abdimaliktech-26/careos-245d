import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from '@/components/ui/form-field'

describe('FormField', () => {
  it('renders label and input', () => {
    render(<FormField label="First Name" name="firstName" />)
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<FormField label="Email" name="email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('does not render error when not provided', () => {
    render(<FormField label="Email" name="email" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('passes through type prop to input', () => {
    render(<FormField label="Password" name="password" type="password" />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('marks input required when required prop passed', () => {
    render(<FormField label="Name" name="name" required />)
    expect(screen.getByRole('textbox', { name: /name/i })).toBeRequired()
  })
})
