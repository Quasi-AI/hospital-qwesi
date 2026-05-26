'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { useFormatCurrency } from '@/app/hooks/useFormatCurrency';

interface ServiceItem {
  _id: string;
  name: string;
  description: string;
  unitPrice: number;
  serviceType: 'consultation' | 'procedure' | 'test' | 'medication' | 'room' | 'other';
  isActive: boolean;
}

interface SearchableServiceItemSelectProps {
  value: string;
  onChange: (serviceItem: ServiceItem | null) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableServiceItemSelect({
  value,
  onChange,
  placeholder = "Search and select a service item...",
  className = ""
}: SearchableServiceItemSelectProps) {
  const { formatCurrency } = useFormatCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServiceItem, setSelectedServiceItem] = useState<ServiceItem | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchServiceItems(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Load initial service items when component mounts
  useEffect(() => {
    searchServiceItems('');
  }, []);

  // Sync searchTerm with value prop
  useEffect(() => {
    if (value && value !== searchTerm) {
      setSearchTerm(value);
    } else if (!value && searchTerm && !selectedServiceItem) {
      setSearchTerm('');
    }
  }, [value]);

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

  const searchServiceItems = async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('activeOnly', 'true');
      if (query.trim()) {
        // We'll filter client-side for now, or you can add a search endpoint
      }
      
      const response = await fetch(`/api/billing/service-items?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let items = data.serviceItems || [];
        
        // Filter by search term if provided
        if (query.trim()) {
          const lowerQuery = query.toLowerCase();
          items = items.filter((item: ServiceItem) =>
            item.name.toLowerCase().includes(lowerQuery) ||
            item.description.toLowerCase().includes(lowerQuery)
          );
        }
        
        setServiceItems(items);
      }
    } catch (error) {
      console.error('Error searching service items:', error);
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
      setSelectedServiceItem(null);
      onChange(null);
    }
  };

  const handleServiceItemSelect = (serviceItem: ServiceItem) => {
    setSelectedServiceItem(serviceItem);
    setSearchTerm(serviceItem.name);
    setIsOpen(false);
    onChange(serviceItem);
  };

  const handleClear = () => {
    setSelectedServiceItem(null);
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
        setHighlightedIndex(prev => 
          prev < serviceItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && serviceItems[highlightedIndex]) {
          handleServiceItemSelect(serviceItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {selectedServiceItem && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
        {!selectedServiceItem && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading...
            </div>
          ) : serviceItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No service items found
            </div>
          ) : (
            <ul className="py-1">
              {serviceItems.map((item, index) => (
                <li
                  key={item._id}
                  onClick={() => handleServiceItemSelect(item)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    index === highlightedIndex ? 'bg-gray-100' : ''
                  } ${
                    selectedServiceItem?._id === item._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.serviceType}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
