export default function SegmentedControl<T extends string | number | null>({
  options, value, onChange, label,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: (v: T) => string
}) {
  const idx = options.indexOf(value)
  const N = options.length
  return (
    <div className="relative flex bg-gray-900/80 border border-white/8 rounded-xl p-1">
      <div
        className="absolute top-1 bottom-1 bg-indigo-600 border border-indigo-500/30 shadow-md shadow-indigo-950/60 rounded-lg pointer-events-none transition-all duration-300 ease-out"
        style={{
          left:  `calc(4px + ${idx} * (100% - 8px) / ${N})`,
          width: `calc((100% - 8px) / ${N})`,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={[
            'relative z-10 flex-1 py-1.5 text-sm rounded-lg transition-colors duration-200 active:scale-[0.97]',
            i === idx ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-200 font-medium',
          ].join(' ')}
        >
          {label(opt)}
        </button>
      ))}
    </div>
  )
}
