import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface ApiError {
  message: string;
  status?: number;
}

export const useApiError = () => {
  const [error, setError] = useState<ApiError | null>(null);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof AxiosError) {
      setError({
        message: err.response?.data?.message || err.message,
        status: err.response?.status,
      });
    } else if (err instanceof Error) {
      setError({
        message: err.message,
      });
    } else {
      setError({
        message: 'An unexpected error occurred',
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}; 