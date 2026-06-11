import { useState, useCallback } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T, Args extends any[]>(
  apiMethod: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await apiMethod(...args);
        setState({
          data: result,
          loading: false,
          error: null,
        });
        return result;
      } catch (err: any) {
        console.error('API execution failed:', err);
        const errorMessage = err?.message || 'A network error occurred. Please try again.';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        return null;
      }
    },
    [apiMethod]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
