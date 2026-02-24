'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';

interface ProcessingJob {
  id: string;
  name: string;
  type: 'discover' | 'import';
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

// Descoberta em massa
export function startProcessing(name: string, max: number, platform: string, dryRun: boolean): string {
  const id = `proc_${Date.now()}`;
  
  globalJobs.set(id, {
    id,
    name,
    type: 'discover',
    status: 'running',
  });
  
  notifyListeners();
  
  fetch('/api/prospector/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed: name, max, platform, dryRun }),
  })
    .then(async res => {
      const contentType = res.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server error: ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      globalJobs.set(id, {
        ...globalJobs.get(id)!,
        status: 'completed',
        result: data,
        message: `${data.stats?.imported || 0} influencers encontrados`,
      });
      notifyListeners();
    })
    .catch(err => {
      globalJobs.set(id, {
        ...globalJobs.get(id)!,
        status: 'error',
        message: err.message || 'Erro no processamento',
      });
      notifyListeners();
    });
  
  return id;
}

// Import único
export function startImportSingle(handle: string): string {
  const id = `import_${Date.now()}`;
  
  globalJobs.set(id, {
    id,
    name: handle,
    type: 'import',
    status: 'running',
  });
  
  notifyListeners();
  
  // Primeiro analisar
  fetch('/api/worker/analyze-influencer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle, platform: 'TIKTOK' }),
  })
    .then(async res => {
      const contentType = res.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server error: ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      
      // Depois criar na DB
      const createRes = await fetch('/api/influencers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name || handle,
          tiktokHandle: `@${handle}`,
          tiktokFollowers: data.followers,
          totalLikes: data.totalLikes,
          engagementRate: data.engagement,
          averageViews: data.averageViews,
          videoCount: data.videoCount,
          estimatedPrice: data.estimatedPrice,
          fitScore: data.fitScore,
          niche: data.niche,
          tier: data.tier,
          biography: data.biography,
          avatarUrl: data.avatar,
          email: data.email,
          country: data.country,
          verified: data.verified,
          language: data.language || 'Português',
          analysisSummary: data.summary || 'Análise automática.',
          analysisDate: new Date().toISOString(),
          status: 'SUGGESTION',
        }),
      });
      
      if (!createRes.ok) {
        const errorText = await createRes.text();
        throw new Error(errorText);
      }
      
      globalJobs.set(id, {
        ...globalJobs.get(id)!,
        status: 'completed',
        result: data,
        message: `@${handle} importado (Score: ${data.fitScore}/5)`,
      });
      notifyListeners();
    })
    .catch(err => {
      globalJobs.set(id, {
        ...globalJobs.get(id)!,
        status: 'error',
        message: err.message || 'Erro no import',
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
                ? job.type === 'import' 
                  ? `📥 A importar @${job.name}...`
                  : `🔍 A descobrir @${job.name}...`
                : job.message
              }
            </p>
            
            {job.status === 'completed' && job.type === 'discover' && job.result?.stats && (
              <p className="text-xs text-emerald-700 mt-0.5">
                {job.result.stats.imported} importados
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