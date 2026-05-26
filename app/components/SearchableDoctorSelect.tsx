'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  role?: string;
  qualifications?: string[];
  specialization?: string;
  department?: string;
}

interface SearchableDoctorSelectProps {
  value: string;
  onChange: (doctor: Doctor | null) => void;
  /** When set with `onDoctorIdChange`, selection is driven by id (e.g. URL `doctorId`). */
  doctorId?: string | null;
  /** Called with selected doctor id or null when cleared. */
  onDoctorIdChange?: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  /** Overrides default input styles (non-disabled). */
  inputClassName?: string;
  searchIconClassName?: string;
  actionButtonClassName?: string;
  disabled?: boolean;
}

export default function SearchableDoctorSelect({
  value,
  onChange,
  doctorId,
  onDoctorIdChange,
  placeholder = "Search and select a doctor...",
  className = "",
  inputClassName,
  searchIconClassName,
  actionButtonClassName,
  disabled = false
}: SearchableDoctorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const useIdMode = typeof onDoctorIdChange === 'function';

  // Load doctors when component mounts
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Sync from doctor id (calendar URL, etc.)
  useEffect(() => {
    if (!useIdMode || doctors.length === 0) return;
    const id = doctorId?.trim();
    if (!id) {
      setSelectedDoctor(null);
      setSearchTerm('');
      return;
    }
    const doctor = doctors.find((d) => String(d._id) === id);
    if (doctor) {
      setSelectedDoctor(doctor);
      setSearchTerm(doctor.name);
    }
  }, [doctorId, doctors, useIdMode]);

  // Sync searchTerm and selectedDoctor with value prop when doctors are loaded (name mode)
  useEffect(() => {
    if (useIdMode) return;
    if (doctors.length > 0 && value) {
      if (value !== searchTerm) {
        setSearchTerm(value);
        // Try to find the doctor in the list
        const doctor = doctors.find(d => d.name === value);
        if (doctor) {
          setSelectedDoctor(doctor);
        } else if (value) {
          // If doctor not found in list but value exists, create a placeholder
          const placeholderDoctor: Doctor = {
            _id: '',
            name: value,
            email: '',
            role: 'doctor'
          };
          setSelectedDoctor(placeholderDoctor);
        }
      }
    } else if (!value && searchTerm && !selectedDoctor) {
      setSearchTerm('');
      setSelectedDoctor(null);
    }
  }, [value, doctors, useIdMode]);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        filterDoctors(searchTerm);
      } else {
        fetchDoctors();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const filtered = doctors.filter((doctor) =>
      doctor.name.toLowerCase().includes(lowerQuery) ||
      doctor.email.toLowerCase().includes(lowerQuery)
    );
    // We'll use the filtered list in the dropdown
    // For now, we keep all doctors and filter in the display
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // If search term is cleared, clear selection
    if (!newSearchTerm.trim()) {
      setSelectedDoctor(null);
      onChange(null);
      onDoctorIdChange?.(null);
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSearchTerm(doctor.name);
    setIsOpen(false);
    onChange(doctor);
    onDoctorIdChange?.(doctor._id ? String(doctor._id) : null);
  };

  const handleClear = () => {
    if (disabled) return;
    setSelectedDoctor(null);
    setSearchTerm('');
    onChange(null);
    onDoctorIdChange?.(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    const filteredDoctors = getFilteredDoctors();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredDoctors.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredDoctors[highlightedIndex]) {
          handleDoctorSelect(filteredDoctors[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const getFilteredDoctors = () => {
    if (!searchTerm.trim()) {
      return doctors;
    }
    const lowerQuery = searchTerm.toLowerCase();
    return doctors.filter((doctor) =>
      doctor.name.toLowerCase().includes(lowerQuery) ||
      doctor.email.toLowerCase().includes(lowerQuery) ||
      (doctor.specialization && doctor.specialization.toLowerCase().includes(lowerQuery)) ||
      (doctor.department && doctor.department.toLowerCase().includes(lowerQuery))
    );
  };

  const filteredDoctors = getFilteredDoctors();

  const iconColor = searchIconClassName ?? 'text-gray-400';
  const actionBtn = actionButtonClassName ?? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600';

  const layoutCls =
    'h-8 w-full rounded-md py-1 pl-8 pr-[4.25rem] text-xs leading-tight placeholder:text-gray-400 focus:outline-none';

  const inputCls = disabled
    ? `${layoutCls} cursor-not-allowed border border-gray-300 bg-gray-50 text-gray-600`
    : inputClassName?.trim()
      ? `${layoutCls} ${inputClassName}`
      : `${layoutCls} border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500`;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
          <Search className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} aria-hidden />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputCls}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          {selectedDoctor && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={`rounded p-0.5 ${actionBtn}`}
              aria-label="Clear doctor"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`rounded p-0.5 ${actionBtn}`}
              aria-expanded={isOpen}
              aria-label="Toggle doctor list"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-0.5 max-h-52 w-full overflow-auto rounded-md border border-gray-300 bg-white text-xs shadow-md">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-2 text-gray-500">
              <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              <span>Loading...</span>
            </div>
          ) : filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor, index) => (
              <div
                key={doctor._id ? String(doctor._id) : `doctor-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleDoctorSelect(doctor)}
                className={`cursor-pointer border-b border-gray-100 px-2 py-1.5 last:border-b-0 ${
                  index === highlightedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{doctor.name}</div>
                    <div className="truncate text-[11px] leading-snug text-gray-500">{doctor.email}</div>
                    {doctor.specialization ? (
                      <div className="text-[11px] text-gray-500">{doctor.specialization}</div>
                    ) : null}
                  </div>
                  {doctor.role ? (
                    <div className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                      {doctor.role}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : searchTerm.trim() ? (
            <div className="px-2 py-2 text-center text-[11px] text-gray-500">
              No doctors found for &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="px-2 py-2 text-center text-[11px] text-gray-500">Start typing to search doctors...</div>
          )}
        </div>
      )}
    </div>
  );
}
