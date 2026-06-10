import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextField } from '@/components/forms/field-types/text-field'
import { YesNoField } from '@/components/forms/field-types/yesno-field'
import { CheckboxField } from '@/components/forms/field-types/checkbox-field'
import { SelectField } from '@/components/forms/field-types/select-field'

describe('TextField', () => {
  it('renders a text input with label', () => {
    render(<TextField field={{ id: 'name', label: 'Full Name', type: 'text' }} value="" onChange={() => {}} />)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('renders a textarea when type is textarea', () => {
    render(<TextField field={{ id: 'notes', label: 'Notes', type: 'textarea' }} value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument()
  })

  it('shows required asterisk when required', () => {
    render(<TextField field={{ id: 'name', label: 'Name', type: 'text', required: true }} value="" onChange={() => {}} />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})

describe('YesNoField', () => {
  it('renders Yes and No radio options', () => {
    render(<YesNoField field={{ id: 'consent', label: 'Consent given?', type: 'yesno' }} value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Yes')).toBeInTheDocument()
    expect(screen.getByLabelText('No')).toBeInTheDocument()
  })
})

describe('CheckboxField', () => {
  it('renders a checkbox with label', () => {
    render(<CheckboxField field={{ id: 'agree', label: 'I agree', type: 'checkbox' }} checked={false} onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByText('I agree')).toBeInTheDocument()
  })

  it('reflects checked state', () => {
    render(<CheckboxField field={{ id: 'agree', label: 'I agree', type: 'checkbox' }} checked={true} onChange={() => {}} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})

describe('SelectField', () => {
  it('renders a select with options', () => {
    render(
      <SelectField
        field={{ id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }}
        value=""
        onChange={() => {}}
      />
    )
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument()
  })
})
