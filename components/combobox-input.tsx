'use client'

interface ComboboxInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
  className?: string
}

export default function ComboboxInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  className,
}: ComboboxInputProps) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        required={required}
      />
      <datalist id={id}>
        {options.map((opt, idx) => (
          <option key={`${id}-opt-${idx}`} value={opt} />
        ))}
      </datalist>
    </div>
  )
}
