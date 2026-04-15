import { AxiosError, AxiosResponse } from 'axios';
import logger from './logger';

/**
 * Retries an async function with exponential backoff.
 * Especially useful for external API calls that might be rate-limited.
 */
export const retryRequest = async <T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = 3,
    initialDelay: number = 1000,
    sourceSlug?: string
): Promise<AxiosResponse<T>> => {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;
            const axiosError = error as AxiosError;
            const status = axiosError.response?.status;

            // Retry on 429 (Rate Limit) or 5xx (Server Error) or network issues
            const isRetryable =
                !status || 
                status === 429 || 
                (status >= 500 && status < 600);

            if (!isRetryable || attempt === retries) {
                break;
            }

            const delay = initialDelay * Math.pow(2, attempt - 1);
            logger.warn({
                attempt,
                nextDelay: delay,
                status,
                sourceSlug
            }, 'Request failed, retrying...');

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};
