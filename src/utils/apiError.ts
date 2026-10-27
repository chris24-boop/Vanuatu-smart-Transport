import { isAxiosError } from 'axios';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return error instanceof Error ? error.message : fallback;
}
