"use client";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`h-9 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-ink bg-ink text-card"
                : "border-line bg-card text-ink hover:bg-chip"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
