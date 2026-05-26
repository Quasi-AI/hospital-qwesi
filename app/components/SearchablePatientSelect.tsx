'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Patient {
  _id: string;
  patientId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string | Date;
  gender?: string;
}

interface SearchablePatientSelectProps {
  value: string;
  onChange: (patient: Patient | null) => void;
  /** When set from parent (e.g. URL prefill), keeps input + selection in sync */
  syncPatient?: Patient | null;
  placeholder?: string;
  className?: string;
}

export default function SearchablePatientSelect({
  value,
  onChange,
  syncPatient,
  placeholder = 'Search and select a patient...',
  className = '',
}: SearchablePatientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchPatients(searchTerm);
      } else {
        setPatients([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Load initial patients when component mounts
  useEffect(() => {
    searchPatients('');
  }, []);

  // Sync when parent preloads patient (e.g. ?patientId= from patient record)
  useEffect(() => {
    if (syncPatient?._id) {
      setSelectedPatient(syncPatient);
      setSearchTerm(syncPatient.name);
    } else if (syncPatient === null) {
      setSelectedPatient(null);
      setSearchTerm('');
    }
  }, [syncPatient]);

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

  const searchPatients = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // If search term is cleared, clear selection
    if (!newSearchTerm.trim()) {
      setSelectedPatient(null);
      onChange(null);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.name);
    setIsOpen(false);
    onChange(patient);
  };

  const handleClear = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < patients.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && patients[highlightedIndex]) {
          handlePatientSelect(patients[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const controlCls =
    'h-8 w-full rounded-md border border-gray-300 bg-white py-1 pl-8 pr-[4.25rem] text-xs leading-tight text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={controlCls}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          {selectedPatient && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear patient"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-expanded={isOpen}
            aria-label="Toggle patient list"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-0.5 max-h-52 w-full overflow-auto rounded-md border border-gray-300 bg-white text-xs shadow-md">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-2 py-2 text-gray-500">
              <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              <span>Searching...</span>
            </div>
          ) : patients.length > 0 ? (
            patients.map((patient, index) => (
              <div
                key={patient._id}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handlePatientSelect(patient)}
                className={`cursor-pointer border-b border-gray-100 px-2 py-1.5 last:border-b-0 ${
                  index === highlightedIndex ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{patient.name}</div>
                    <div className="truncate text-[11px] leading-snug text-gray-500">
                      ID: {patient.patientId} • {patient.email}
                    </div>
                  </div>
                  <div className="shrink-0 truncate text-[11px] text-gray-400">{patient.phone}</div>
                </div>
              </div>
            ))
          ) : searchTerm.trim() ? (
            <div className="px-2 py-2 text-center text-[11px] text-gray-500">
              No patients found for &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div className="px-2 py-2 text-center text-[11px] text-gray-500">Start typing to search patients...</div>
          )}
        </div>
      )}
    </div>
  );
}
