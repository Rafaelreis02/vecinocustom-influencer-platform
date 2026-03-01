'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingBag,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Stats {
  total: number;
  pending: number;
  processing: number;
  paid: number;
  totalOrders: number;
  totalInfluencers: number;
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
      if (tempStart && new Date(dateStr) < new Date(tempStart)) {
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

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-50 w-[280px]">
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

          <p className="text-xs text-gray-500 mb-2 text-center">
            {selecting === 'start' ? 'Clique na data inicial' : 'Clique na data final'}
          </p>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

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

export default function CommissionsOverviewPage() {
  const { addToast } = useGlobalToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [activeFilter, setActiveFilter] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadStats();
  }, [activeFilter, customStartDate, customEndDate]);

  async function loadStats() {
    try {
      setLoading(true);
      
      let start: Date;
      let end: Date;
      
      if (activeFilter === 'custom' && customStartDate && customEndDate) {
        start = new Date(customStartDate);
        end = new Date(customEndDate);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(activeFilter));
      }
      
      const res = await fetch(`/api/analytics/commissions-real?start=${start.toISOString()}&end=${end.toISOString()}`);
      
      if (!res.ok) throw new Error('Erro ao carregar estatísticas');
      
      const result = await res.json();
      if (result.success) {
        setStats(result.data.stats);
      } else {
        throw new Error(result.error || 'Erro ao carregar dados');
      }

    } catch (error) {
      console.error('Error loading stats:', error);
      addToast('Erro ao carregar estatísticas', 'error');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total em Comissões',
      value: formatCurrency(stats.total),
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-600',
      description: 'Valor total gerado',
    },
    {
      title: 'Pendentes',
      value: formatCurrency(stats.pending),
      icon: TrendingUp,
      color: 'bg-yellow-100 text-yellow-600',
      description: `${((stats.pending / stats.total) * 100).toFixed(1)}% do total`,
    },
    {
      title: 'Aprovadas (Aguardam Pagamento)',
      value: formatCurrency(stats.processing),
      icon: ShoppingBag,
      color: 'bg-indigo-100 text-indigo-600',
      description: 'Prontas para pagar',
    },
    {
      title: 'Já Pagas',
      value: formatCurrency(stats.paid),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      description: 'Pagamentos realizados',
    },
    {
      title: 'Total de Encomendas',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-purple-100 text-purple-600',
      description: 'Encomendas com comissão',
    },
    {
      title: 'Influencers Ativos',
      value: stats.totalInfluencers,
      icon: Users,
      color: 'bg-pink-100 text-pink-600',
      description: 'Com comissões geradas',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros - Mesmo layout da aba Pagas */}
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

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Como funciona?</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Pendentes:</strong> Comissões que precisam de aprovação (encomenda por encomenda)</li>
          <li>• <strong>Aprovadas:</strong> Comissões validadas, aguardam pagamento ao influencer</li>
          <li>• <strong>Pagas:</strong> Pagamentos já realizados aos influencers</li>
        </ul>
      </div>
    </div>
  );
}
