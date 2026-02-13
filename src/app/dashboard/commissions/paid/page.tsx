'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import {
  DollarSign,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Influencer {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
}

interface PaymentBatch {
  id: string;
  totalAmount: number;
  currency: string;
  paidAt: string;
  influencer: Influencer;
}

// Componente DateRangePicker
function DateRangePicker({ 
  startDate, 
  endDate, 
  onChange,
  onClear
}: { 
  startDate: string; 
  endDate: string; 
  onChange: (start: string, end: string) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<string>(startDate);
  const ref = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }

  function formatDateShort(date: Date) {
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  }

  function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function isBetween(date: Date, start: string, end: string) {
    if (!start || !end) return false;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return date > startDate && date < endDate;
  }

  function handleDateClick(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    
    if (selecting === 'start') {
      setTempStart(dateStr);
      setSelecting('end');
    } else {
      // Selecionou end date
      if (tempStart && new Date(dateStr) < new Date(tempStart)) {
        // Se end é antes de start, troca
        onChange(dateStr, tempStart);
      } else {
        onChange(tempStart, dateStr);
      }
      setSelecting('start');
      setIsOpen(false);
    }
  }

  function handlePrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function handleNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  const displayText = startDate && endDate 
    ? `${formatDateShort(new Date(startDate))} - ${formatDateShort(new Date(endDate))}`
    : 'Selecionar datas';

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative" ref={ref}>
      {/* Input/Botão */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
          startDate && endDate 
            ? 'bg-slate-900 text-white border-slate-900' 
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">{displayText}</span>
        {startDate && endDate && (
          <X 
            className="h-4 w-4 ml-2 hover:text-gray-300" 
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          />
        )}
      </button>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-50 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500 mb-2 text-center">
            {selecting === 'start' ? 'Clique na data inicial' : 'Clique na data final'}
          </p>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) return <div key={index} />;
              
              const dateStr = date.toISOString().split('T')[0];
              const isStart = startDate && isSameDay(date, new Date(startDate));
              const isEnd = endDate && isSameDay(date, new Date(endDate));
              const isInRange = isBetween(date, startDate, endDate);
              const isTempStart = tempStart && isSameDay(date, new Date(tempStart)) && selecting === 'end';
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`
                    h-8 w-8 rounded-full text-sm font-medium transition
                    ${isStart || isEnd || isTempStart
                      ? 'bg-slate-900 text-white' 
                      : isInRange
                        ? 'bg-slate-100 text-slate-900'
                        : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente QuickFilter
function QuickFilter({ 
  label, 
  active, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        active 
          ? 'bg-slate-900 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

export default function PaidCommissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <PaidCommissionsContent />
    </Suspense>
  );
}

function PaidCommissionsContent() {
  const { addToast } = useGlobalToast();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [activeFilter, setActiveFilter] = useState<string>('30'); // '30', '60', '90', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadPaidBatches();
  }, [activeFilter, customStartDate, customEndDate]);

  async function loadPaidBatches() {
    try {
      setLoading(true);
      
      let startDate: string | null = null;
      let endDate: string | null = null;
      
      if (activeFilter === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate).toISOString();
      } else if (activeFilter !== 'custom') {
        const days = parseInt(activeFilter);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        startDate = start.toISOString();
        endDate = end.toISOString();
      }
      
      let url = '/api/commissions/batches';
      if (startDate && endDate) {
        url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      setBatches(data.batches || []);

    } catch (error) {
      console.error('Error loading paid batches:', error);
      addToast('Erro ao carregar histórico', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleDateRangeChange(start: string, end: string) {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setActiveFilter('custom');
  }

  function handleClearCustom() {
    setCustomStartDate('');
    setCustomEndDate('');
    setActiveFilter('30');
  }

  function handleQuickFilter(days: string) {
    setCustomStartDate('');
    setCustomEndDate('');
    setActiveFilter(days);
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-PT');
  }

  const totalPaid = batches.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCount = batches.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Período:</span>
          
          <div className="flex flex-wrap items-center gap-2">
            <QuickFilter 
              label="Últimos 30 dias" 
              active={activeFilter === '30'} 
              onClick={() => handleQuickFilter('30')} 
            />
            <QuickFilter 
              label="Últimos 60 dias" 
              active={activeFilter === '60'} 
              onClick={() => handleQuickFilter('60')} 
            />
            <QuickFilter 
              label="Últimos 90 dias" 
              active={activeFilter === '90'} 
              onClick={() => handleQuickFilter('90')} 
            />
            
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            <DateRangePicker 
              startDate={customStartDate}
              endDate={customEndDate}
              onChange={handleDateRangeChange}
              onClear={handleClearCustom}
            />
          </div>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <p className="text-sm text-green-700">Total Pago</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700">Nº de Pagamentos</p>
          <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
        </div>
      </div>

      {/* Lista Simples - Uma linha por item */}
      {batches.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pagamento encontrado</h3>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {batches.map((batch, index) => (
            <div 
              key={batch.id} 
              className={`p-4 flex items-center justify-between ${index !== batches.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {batch.influencer.avatarUrl ? (
                    <img 
                      src={batch.influencer.avatarUrl} 
                      alt={batch.influencer.name} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    batch.influencer.name.charAt(0).toUpperCase()
                  )}
                </div>
                
                {/* Nome */}
                <h3 className="font-semibold text-gray-900">{batch.influencer.name}</h3>
              </div>

              {/* Valor + Data */}
              <div className="text-right">
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(batch.totalAmount)}
                </span>
                <p className="text-xs text-gray-500">{formatDate(batch.paidAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
