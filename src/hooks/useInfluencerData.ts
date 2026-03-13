'use client';

import useSWR, { mutate } from 'swr';

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Hook to fetch influencer with auto-refresh
export function useInfluencer(influencerId: string) {
  const { data, error, isLoading } = useSWR(
    influencerId ? `/api/influencers/${influencerId}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true, // Refresh when window gets focus
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  );

  return {
    influencer: data,
    isLoading,
    isError: error,
    mutate: () => mutate(`/api/influencers/${influencerId}`),
  };
}

// Hook to fetch workflow with auto-refresh
export function useWorkflow(influencerId: string) {
  const { data, error, isLoading } = useSWR(
    influencerId ? `/api/influencers/${influencerId}/partnerships` : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  return {
    workflow: data?.activeWorkflow || null,
    isLoading,
    isError: error,
    mutate: () => mutate(`/api/influencers/${influencerId}/partnerships`),
  };
}

// Function to invalidate cache (call after mutations)
export function invalidateInfluencerCache(influencerId: string) {
  mutate(`/api/influencers/${influencerId}`);
  mutate(`/api/influencers/${influencerId}/partnerships`);
}
