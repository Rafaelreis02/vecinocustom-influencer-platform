'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface ProcessingJob {
  id: string;
  seed: string;
  status: 'running' | 'completed' | 'error';
  message?: string;
  result?: any;
}

// Store global simples (fora do React)
const globalJobs = new Map<string, ProcessingJob>();
let listeners: (() => void)[] = [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function startProcessing(seed: string, max: number, platform: string, dryRun: boolean): string {
  const id = `proc_${Date.now()}`;
  
  globalJobs.set(id, {
    id,
    seed,
    status: 'running',
  });
  
  notifyListeners();
  
  // Fazer o fetch
  fetch('/api/prospector/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed, max, platform, dryRun }),
  })
    .then(async res => {
      const data = await res.json();
      
      if (!res.ok) {
        globalJobs.set(id, {
          ...globalJobs.get(id)!,
          status: 'error',
          message: data.error || 'Erro desconhecido',
        });
      } else {
        globalJobs.set(id, {
          ...globalJobs.get(id)!,
          status: 'completed',
          result: data,
          message: data.message || `${data.stats?.imported} influencers encontrados`,
        });
      }
      notifyListeners();
    })
    .catch(err => {
      globalJobs.set(id, {
        ...globalJobs.get(id)!,
        status: 'error',
        message: err.message,
      });
      notifyListeners();
    });
  
  return id;
}

export function dismissJob(id: string) {
  globalJobs.delete(id);
  notifyListeners();
}

export function useProcessingJobs() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);
  
  return {
    jobs: Array.from(globalJobs.values()),
    runningJobs: Array.from(globalJobs.values()).filter(j => j.status === 'running'),
    completedJobs: Array.from(globalJobs.values()).filter(j => j.status !== 'running'),
    dismissJob,
  };
}

export function ProcessingBanner() {
  const { jobs, dismissJob } = useProcessingJobs();
  
  if (jobs.length === 0) return null;
  
  return (
    <div className="mb-6 space-y-2">
      {jobs.map(job => (
        <div 
          key={job.id}
          className={`rounded-lg border p-3 flex items-center gap-3 ${
            job.status === 'running' 
              ? 'bg-blue-50 border-blue-200' 
              : job.status === 'completed'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {job.status === 'running' ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              job.status === 'running' ? 'text-blue-900' :
              job.status === 'completed' ? 'text-emerald-900' :
              'text-red-900'
            }`}>
              {job.status === 'running' 
                ? `🔍 A descobrir influencers @${job.seed}...`
                : job.message
              }
            </p>
            
            {job.status === 'completed' && job.result?.stats && (
              <p className="text-xs text-emerald-700 mt-0.5">
                {job.result.stats.imported} importados de {job.result.requested || job.result.stats.processed} pedidos
              </p>
            )}
          </div>
          
          {job.status !== 'running' && (
            <button
              onClick={() => dismissJob(job.id)}
              className="p-1.5 hover:bg-black/5 rounded-md transition flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}