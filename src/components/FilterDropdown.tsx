import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface FilterDropdownProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (nextSelected: T[]) => void;
}

export function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
}: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allSelected = selected.length === options.length;

  function toggleItem(item: T) {
    const exists = selected.includes(item);
    if (exists) {
      // Maintain at least 1 active option so deterministic generation always has a pool
      if (selected.length <= 1) return;
      onChange(selected.filter((s) => s !== item));
    } else {
      const next = options.filter((opt) => opt === item || selected.includes(opt));
      onChange(next);
    }
  }

  function handleSelectAll() {
    onChange([...options]);
  }

  const summaryLabel = allSelected
    ? 'All Active'
    : `${selected.length} of ${options.length} Active`;

  return (
    <div ref={containerRef} className="relative">
      <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full min-h-[40px] px-3.5 py-2 flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-[#0A0D14] text-sm text-slate-100 hover:border-slate-600 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        <span className="truncate">{summaryLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 right-0 mt-1.5 z-40 rounded-md border border-slate-700 bg-[#111620] shadow-xl py-1.5"
        >
          <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {selected.length === 1 ? 'Minimum 1 active' : `${selected.length} selected`}
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allSelected}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              Select All
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isChecked = selected.includes(option);
              const isLastActive = isChecked && selected.length === 1;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isChecked}
                  onClick={() => toggleItem(option)}
                  disabled={isLastActive}
                  className={`w-full px-3 py-2 text-left text-sm flex items-start gap-2.5 transition-colors ${
                    isLastActive
                      ? 'opacity-65 cursor-not-allowed'
                      : 'hover:bg-slate-800/70 cursor-pointer'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-amber-500 border-amber-500 text-[#090C12]'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />}
                  </span>
                  <span className="text-slate-200 leading-snug">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
