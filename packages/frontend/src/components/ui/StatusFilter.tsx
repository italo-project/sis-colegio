type FilterValue = 'all' | 'active' | 'inactive';

type Props = {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  labels?: {
    all?: string;
    active?: string;
    inactive?: string;
  };
};

export const StatusFilter = ({ value, onChange, labels }: Props) => {
  const options: Array<{ key: FilterValue; label: string }> = [
    { key: 'all', label: labels?.all ?? 'Todos' },
    { key: 'active', label: labels?.active ?? 'Activos' },
    { key: 'inactive', label: labels?.inactive ?? 'Inactivos' },
  ];

  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              isActive
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export type { FilterValue };