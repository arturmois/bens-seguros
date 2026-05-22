'use client'

import { useGetGoalsProgress } from '@/api/endpoints/goals/goals'

import type { GoalsProgress } from '../lib/constants'

export function useGoalsProgress(year: number) {
  return useGetGoalsProgress<GoalsProgress>(
    { year },
    {
      query: {
        select: (response) => response.data.data,
      },
    }
  )
}
