'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Sparkles, Search } from 'lucide-react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';

export function BackgroundJobsProgress() {
  const { visibleJobs } = useBackgroundJobs();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set());

  // Filtrar jobs dismissed
  const jobs = visibleJobs.filter(job => !dismissedJobs.has(job.id));
  
  if (jobs.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (job: any) => {
    switch (job.status) {
      case 'PENDING':
        return 'A iniciar...';
      case 'RUNNING':
        return `${job.progress}% · ${job.importedItems} encontrados`;
      case 'COMPLETED':
        return `${job.importedItems} influencers importados`;
      case 'FAILED':
        return 'Erro no processamento';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'RUNNING':
        return 'bg-blue-600';
      default:
        return 'bg-amber-400';
    }
  };

  const handleDismiss = (jobId: string) => {
    setDismissedJobs(prev => new Set(prev).add(jobId));
  };

  return (
    <div className="mt-4 space-y-3">
      {jobs.map((job) => (
        <div 
          key={job.id} 
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Barra de progresso principal */}
          <div className="flex items-center gap-3 p-3">
            {getStatusIcon(job.status)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">
                  Descoberta {job.config.seed && `@${job.config.seed}`}
                </span>
                <span className="text-xs text-gray-500">
                  {getStatusText(job)}
                </span>
              </div>
              
              {/* Progress bar mais bonita */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getStatusColor(job.status)}`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-0.5">
              {/* Expandir/Colapsar relatório */}
              {(job.status === 'COMPLETED' || job.status === 'FAILED') && job.result && (
                <button
                  onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                  title="Ver relatório"
                >
                  {expandedJobId === job.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
              
              {/* Fechar */}
              <button
                onClick={() => handleDismiss(job.id)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                title="Fechar"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Relatório colapsível */}
          {expandedJobId === job.id && job.result && (
            <div className="border-t border-gray-100 bg-gray-50/50 p-4">
              {job.result.success ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">{job.result.message}</span>
                  </div>
                  
                  {job.result.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                        <div className="text-lg font-bold text-gray-900">{job.config.max}</div>
                        <div className="text-xs text-gray-500">Pedidos</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                        <div className="text-lg font-bold text-emerald-600">{job.result.stats.imported}</div>
                        <div className="text-xs text-gray-500">Importados</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                        <div className="text-lg font-bold text-gray-900">{job.result.stats.processed}</div>
                        <div className="text-xs text-gray-500">Processados</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                        <div className="text-lg font-bold text-gray-600">{job.result.stats.skipped}</div>
                        <div className="text-xs text-gray-500">Ignorados</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700">Erro no processamento</p>
                  <p className="text-sm text-red-600 mt-1">{job.result.error || job.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}