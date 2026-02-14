'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProductSearchResult {
  title: string;
  url: string;
  image: string | null;
}

interface ProductSearchInputProps {
  value: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: ProductSearchResult[];
  onSelect: (product: ProductSearchResult) => void;
  disabled: boolean;
  isLoading?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function ProductSearchInput({
  value,
  searchQuery,
  onSearchChange,
  results,
  onSelect,
  disabled,
  isLoading = false,
  placeholder = 'Search product... (e.g. "necklace")',
  label,
  required = false,
}: ProductSearchInputProps) {
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show results when searching (with proper states)
  useEffect(() => {
    if (searchQuery.length >= 3) {
      // Show dropdown if:
      // - We have results, OR
      // - We're currently loading
      setShowResults(results.length > 0 || isLoading);
    } else {
      setShowResults(false);
    }
  }, [searchQuery, results, isLoading]);

  const handleSelectProduct = (product: ProductSearchResult) => {
    onSelect(product);
    setShowResults(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {value ? (
        // Selected product display
        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
          <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onSelect({ title: '', url: '', image: null });
              }}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Change product
            </button>
          )}
        </div>
      ) : (
        // Search input
        <div>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />

          {/* Dropdown Results */}
          {searchQuery.length >= 3 && (results.length > 0 || isLoading) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {isLoading && (
                <div className="px-4 py-6 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Searching...</span>
                </div>
              )}
              
              {!isLoading && results.length === 0 && (
                <div className="px-4 py-6 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600">No products found for "{searchQuery}"</span>
                </div>
              )}
              
              {results.length > 0 && results.map((product, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3 transition"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-200 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-900 truncate">{product.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
