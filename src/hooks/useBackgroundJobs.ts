'use client';

import { useState, useEffect, useCallback } from 'react';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Job {
  id: string;
  type: 'PROSPECTOR' | 'IMPORT_SINGLE' | 'ANALYZE';
  status: JobStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  importedItems: number;
  config: {
    seed?: string;
    max: number;
    platform: string;
    dryRun: boolean;
    handle?: string;
  };
  result?: {
    success: boolean;
    message?: string;
    stats?: any;
    results?: any[];
    error?: string;
  };
  error?: string;
  reportVisible: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export function useBackgroundJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar jobs ativos
  const fetchJobs = useCallback(async (activeOnly = false) => {
    try {
      const res = await fetch(`/api/jobs${activeOnly ? '?active=true' : ''}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Polling automático para jobs ativos
  useEffect(() => {
    fetchJobs();
    
    const interval = setInterval(() => {
      const hasActiveJobs = jobs.some(j => j.status === 'PENDING' || j.status === 'RUNNING');
      if (hasActiveJobs) {
        fetchJobs();
      }
    }, 2000); // Poll a cada 2 segundos

    return () => clearInterval(interval);
  }, [fetchJobs, jobs]);

  // Criar job de prospector
  const createProspectorJob = async (config: {
    seed: string;
    max: number;
    platform: string;
    dryRun: boolean;
  }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/prospector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create job');
      }
      
      const data = await res.json();
      await fetchJobs(); // Atualizar lista
      return data.jobId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Esconder relatório (clicar no X)
  const hideJobReport = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hide' }),
      });
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Remover job completamente
  const deleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Jobs visíveis (ativos ou com relatório visível)
  const visibleJobs = jobs.filter(job => {
    if (job.status === 'PENDING' || job.status === 'RUNNING') return true;
    if (job.reportVisible && (job.status === 'COMPLETED' || job.status === 'FAILED')) return true;
    return false;
  });

  const activeJobs = jobs.filter(j => j.status === 'PENDING' || j.status === 'RUNNING');
  const completedJobs = jobs.filter(j => 
    (j.status === 'COMPLETED' || j.status === 'FAILED') && j.reportVisible
  );

  return {
    jobs,
    visibleJobs,
    activeJobs,
    completedJobs,
    loading,
    error,
    fetchJobs,
    createProspectorJob,
    hideJobReport,
    deleteJob,
  };
}