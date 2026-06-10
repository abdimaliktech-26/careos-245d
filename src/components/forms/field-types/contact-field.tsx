import type { FormField } from '@/types/forms'

type ContactValue = { name: string; phone: string; address: string }

type ContactFieldProps = {
  field: FormField
  value: ContactValue
  onChange: (value: ContactValue) => void
}

export function ContactField({ field, value, onChange }: ContactFieldProps) {
  const update = (key: keyof ContactValue) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value })

  return (
    <fieldset className="border border-gray-200 rounded-md p-3 space-y-2">
      <legend className="text-sm font-medium text-gray-700 px-1">{field.label}</legend>
      <input type="text" placeholder="Name" value={value.name} onChange={update('name')}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <input type="text" placeholder="Phone" value={value.phone} onChange={update('phone')}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <input type="text" placeholder="Address" value={value.address} onChange={update('address')}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </fieldset>
  )
}
