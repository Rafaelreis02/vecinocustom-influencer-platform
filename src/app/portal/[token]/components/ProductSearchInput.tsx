'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2, Search, X, Package } from 'lucide-react';

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
  placeholder = 'Procurar produto...',
  label,
  required = false,
}: ProductSearchInputProps) {
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mostrar resultados ao procurar
  useEffect(() => {
    if (searchQuery.length >= 2) {
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

  const handleClear = () => {
    onSearchChange('');
    onSelect({ title: '', url: '', image: null });
    inputRef.current?.focus();
  };

  // ✅ Produto selecionado - Visual elegante
  if (value) {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        
        <div className="w-full px-4 py-3.5 bg-[#0E1E37]/5 border-0 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Package className="h-5 w-5 text-[#0E1E37]" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-gray-900 truncate">{value}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ Input de pesquisa - Minimalista
  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                     text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                     disabled:bg-gray-100 disabled:text-gray-400
                     transition-all duration-200"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <X className="h-3 w-3 text-gray-500" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ✅ Dropdown de resultados - Elegante */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-72 overflow-hidden">
          {isLoading && (
            <div className="px-4 py-8 flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#0E1E37]" strokeWidth={1.5} />
              <span className="text-sm text-gray-500">A procurar...</span>
            </div>
          )}
          
          {!isLoading && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Package className="h-8 w-8 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 mb-4">Nenhum produto encontrado</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['pulseira', 'pendente', 'zodíaco', 'personalizado'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSearchChange(tag)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="py-2">
              {results.map((product, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="text-sm text-gray-900 truncate flex-1">{product.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
