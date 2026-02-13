'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';

// DateRangePicker Component
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
            className="h-4 w-4 ml-2 cursor-pointer hover:text-gray-300" 
            onClick={(e) => { 
              e.stopPropagation(); 
              onClear();
              setIsOpen(false);
            }}
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

// QuickFilter Component
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

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeFilter, setActiveFilter] = useState<string>('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, [activeFilter, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let start: Date;
      let end: Date;
      
      if (activeFilter === 'custom' && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        start = new Date();
        start.setDate(start.getDate() - parseInt(activeFilter));
      }
      
      const response = await fetch(
        `/api/analytics/summary?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Unknown error');
      setData({
        summary: {
          totalSales: 0,
          totalCommissions: 0,
          roiPercentage: 0,
          transactionCount: 0,
        },
        commissionsByStatus: {
          pending: 0,
          approved: 0,
          paid: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setActiveFilter('custom');
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setActiveFilter('30');
  };

  const handleQuickFilter = (days: string) => {
    setStartDate('');
    setEndDate('');
    setActiveFilter(days);
  };

  const displayData = data || {
    summary: {
      totalSales: 0,
      totalCommissions: 0,
      roiPercentage: 0,
      transactionCount: 0,
    },
    commissionsByStatus: {
      pending: 0,
      approved: 0,
      paid: 0,
    },
  };

  const cards = [
    {
      title: 'Total de Vendas',
      value: displayData.summary?.totalSales?.toFixed(2) || '0.00',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total de Comissões',
      value: displayData.summary?.totalCommissions?.toFixed(2) || '0.00',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'ROI (%)',
      value: displayData.summary?.roiPercentage?.toFixed(2) || '0.00',
      icon: ShoppingBag,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Transações',
      value: displayData.summary?.transactionCount || '0',
      icon: DollarSign,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Vendas, comissões e performance</p>
      </div>

      {/* Filters */}
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
          </div>

          <DateRangePicker 
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
            onClear={handleClearDates}
          />
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
          <p className="text-sm">
            Nota: {error} (a mostrar dados vazios)
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando dados...</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">{card.title}</span>
                <div className={`${card.color} p-2 rounded-lg`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                €{card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Commission Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Comissões Pendentes</span>
            <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            €{displayData.commissionsByStatus?.pending?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Comissões Aprovadas</span>
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            €{displayData.commissionsByStatus?.approved?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Comissões Pagas</span>
            <div className="bg-green-100 text-green-600 p-2 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            €{displayData.commissionsByStatus?.paid?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>
    </div>
  );
}
