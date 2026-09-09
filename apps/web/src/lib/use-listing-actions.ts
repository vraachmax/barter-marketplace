'use client';

import { useState } from 'react';
import { apiFetchJson } from '@/lib/api';
import { createListingActionRunner, initialListingActionState } from '@/lib/action-gate';

export function useListingActions(refresh: () => Promise<boolean>) {
  const [run] = useState(createListingActionRunner);
  const [state, setState] = useState(initialListingActionState);

  function performAction(path: string, init: RequestInit, onSuccess?: () => void) {
    return run({
      request: () => apiFetchJson(path, { ...init, signal: AbortSignal.timeout(20000) }),
      refresh,
      onSuccess,
      onState: setState,
    });
  }

  return { ...state, performAction };
}
