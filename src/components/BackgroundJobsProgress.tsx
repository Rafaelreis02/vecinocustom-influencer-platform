'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useBackgroundJobs } from '@/hooks/useBackgroundJobs';

export function BackgroundJobsProgress() {
  const { visibleJobs, activeJobs, completedJobs, hideJobReport, deleteJob } = useBackgroundJobs();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (visibleJobs.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
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
        return `${job.progress}% - Processando (${job.importedItems} encontrados)`;
      case 'COMPLETED':
        return `✅ Concluído (${job.importedItems} influencers)`;
      case 'FAILED':
        return '❌ Falhou';
      default:
        return '';
    }
  };

  const handleClose = (jobId: string, status: string) => {
    if (status === 'COMPLETED' || status === 'FAILED') {
      hideJobReport(jobId);
    } else {
      deleteJob(jobId);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {visibleJobs.map((job) => (
          <div key={job.id} className="mb-2 last:mb-0">
            {/* Barra de progresso principal */}
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              {getStatusIcon(job.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {job.type === 'PROSPECTOR' ? 'Descoberta' : 'Importação'}
                    {job.config.seed && ` @${job.config.seed}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getStatusText(job)}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      job.status === 'COMPLETED' ? 'bg-green-500' :
                      job.status === 'FAILED' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-1">
                {/* Expandir/Colapsar relatório */}
                {(job.status === 'COMPLETED' || job.status === 'FAILED') && job.result && (
                  <button
                    onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition"
                    title="Ver relatório"
                  >
                    {expandedJobId === job.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                )}
                
                {/* Fechar */}
                <button
                  onClick={() => handleClose(job.id, job.status)}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition"
                  title="Fechar"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Relatório colapsível */}
            {expandedJobId === job.id && job.result && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {job.result.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">{job.result.message}</span>
                    </div>
                    
                    {job.result.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500">Pedidos:</span>
                          <span className="font-semibold ml-1">{job.config.max}</span>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500">Importados:</span>
                          <span className="font-semibold ml-1 text-green-600">{job.result.stats.imported}</span>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500">Processados:</span>
                          <span className="font-semibold ml-1">{job.result.stats.processed}</span>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <span className="text-gray-500">Ignorados:</span>
                          <span className="font-semibold ml-1 text-gray-600">{job.result.stats.skipped}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p className="font-medium">Erro:</p>
                    <p className="text-sm">{job.result.error || job.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}