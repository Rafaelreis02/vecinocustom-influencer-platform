'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

export interface AnalyticsData {
  summary: {
    totalSales: number;
    totalCommissions: number;
    roiPercentage: number;
    transactionCount: number;
  };
  topInfluencers: Array<{
    id: string;
    name: string;
    sales: number;
    commissions: number;
    couponsUsed: number;
  }>;
  topCoupons: Array<{
    code: string;
    influencerName: string;
    usageCount: number;
    totalSales: number;
    commissionTotal: number;
  }>;
  commissionsByStatus: {
    pending: number;
    approved: number;
    paid: number;
  };
  salesTrend: Array<{
    date: string;
    sales: number;
    commissions: number;
  }>;
}

export function useAnalyticsData(
  startDate: string | null,
  endDate: string | null
) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(
          `/api/analytics/summary?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        logger.error('Error fetching analytics data', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return { data, loading, error };
}
