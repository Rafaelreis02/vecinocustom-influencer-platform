// ============================================
// Background Job Manager - Cache em memória
// ============================================
// Jobs são armazenados em memória e removidos quando o user clica no X
// ou após TTL (1 hora)
// ============================================

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type JobType = 'PROSPECTOR' | 'IMPORT_SINGLE' | 'ANALYZE';

export interface JobStats {
  totalFollowing: number;
  filteredByFollowers: number;
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  apiCalls: number;
  apiCallsSaved: number;
}

export interface JobResult {
  success: boolean;
  message?: string;
  stats?: JobStats;
  results?: any[];
  error?: string;
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  importedItems: number;
  config: {
    seed?: string;
    max: number;
    platform: string;
    dryRun: boolean;
    handle?: string; // Para import single
  };
  result?: JobResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  userId: string;
  // Flag para controlar se o relatório está visível
  reportVisible: boolean;
}

// Cache em memória
const jobsCache = new Map<string, BackgroundJob>();
const userJobs = new Map<string, Set<string>>(); // userId -> Set<jobId>

const JOB_TTL = 60 * 60 * 1000; // 1 hora
const MAX_JOBS_PER_USER = 5;

// Cleanup periódico
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobsCache.entries()) {
    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      if (now - job.updatedAt.getTime() > JOB_TTL) {
        deleteJob(id);
      }
    }
  }
}, 5 * 60 * 1000); // A cada 5 minutos

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createJob(
  type: JobType,
  config: BackgroundJob['config'],
  userId: string
): BackgroundJob {
  // Limpar jobs antigos do user se necessário
  const userJobIds = userJobs.get(userId) || new Set();
  if (userJobIds.size >= MAX_JOBS_PER_USER) {
    const oldestJobId = Array.from(userJobIds)[0];
    deleteJob(oldestJobId);
  }

  const job: BackgroundJob = {
    id: generateJobId(),
    type,
    status: 'PENDING',
    progress: 0,
    totalItems: config.max,
    processedItems: 0,
    importedItems: 0,
    config,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId,
    reportVisible: true, // Mostrar relatório por defeito
  };

  jobsCache.set(job.id, job);
  
  if (!userJobs.has(userId)) {
    userJobs.set(userId, new Set());
  }
  userJobs.get(userId)!.add(job.id);

  return job;
}

export function getJob(jobId: string): BackgroundJob | undefined {
  return jobsCache.get(jobId);
}

export function getUserJobs(userId: string): BackgroundJob[] {
  const jobIds = userJobs.get(userId) || new Set();
  return Array.from(jobIds)
    .map(id => jobsCache.get(id))
    .filter((job): job is BackgroundJob => job !== undefined)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getActiveUserJobs(userId: string): BackgroundJob[] {
  return getUserJobs(userId).filter(job => 
    job.status === 'PENDING' || job.status === 'RUNNING'
  );
}

export function updateJob(jobId: string, updates: Partial<BackgroundJob>): BackgroundJob | undefined {
  const job = jobsCache.get(jobId);
  if (!job) return undefined;

  Object.assign(job, updates, { updatedAt: new Date() });
  
  // Calcular progresso
  if (job.totalItems > 0) {
    job.progress = Math.min(100, Math.round((job.processedItems / job.totalItems) * 100));
  }

  return job;
}

export function completeJob(jobId: string, result: JobResult): BackgroundJob | undefined {
  return updateJob(jobId, {
    status: result.success ? 'COMPLETED' : 'FAILED',
    result,
    completedAt: new Date(),
    progress: 100,
  });
}

export function failJob(jobId: string, error: string): BackgroundJob | undefined {
  return updateJob(jobId, {
    status: 'FAILED',
    error,
    completedAt: new Date(),
    progress: 100,
  });
}

export function deleteJob(jobId: string): boolean {
  const job = jobsCache.get(jobId);
  if (!job) return false;

  jobsCache.delete(jobId);
  
  const userJobIds = userJobs.get(job.userId);
  if (userJobIds) {
    userJobIds.delete(jobId);
    if (userJobIds.size === 0) {
      userJobs.delete(job.userId);
    }
  }

  return true;
}

export function hideJobReport(jobId: string): BackgroundJob | undefined {
  return updateJob(jobId, { reportVisible: false });
}

// Para debugging
export function getJobsStats() {
  return {
    totalJobs: jobsCache.size,
    users: userJobs.size,
  };
}