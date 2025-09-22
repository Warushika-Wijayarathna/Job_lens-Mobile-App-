export interface ErrorDetails {
  originalError: any;
  extractedMessage: string;
  statusCode?: number;
  timestamp: string;
}

/**
 * Extract detailed error information for debugging
 */
export function extractErrorDetails(error: any): ErrorDetails {
  const timestamp = new Date().toISOString();
  let extractedMessage = 'Unknown error occurred';
  let statusCode: number | undefined;

  console.group(`🚨 [ERROR DEBUG] ${timestamp}`);

  if (error.response) {
    // Axios response error
    statusCode = error.response.status;
    console.log('📡 Backend Response Error:');
    console.log('Status:', error.response.status);
    console.log('Headers:', error.response.headers);
    console.log('Data:', error.response.data);

    const backendData = error.response.data;
    if (typeof backendData === 'string') {
      extractedMessage = backendData;
    } else if (backendData?.error) {
      extractedMessage = backendData.error;
    } else if (backendData?.message) {
      extractedMessage = backendData.message;
    } else {
      extractedMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
  } else if (error.request) {
    // Network error
    console.log('🌐 Network Error:');
    console.log('Request:', error.request);
    extractedMessage = 'Network error - Could not reach server';
  } else if (error.message) {
    // General error
    console.log('⚠️ General Error:');
    console.log('Message:', error.message);
    extractedMessage = error.message;
  } else {
    // Unknown error
    console.log('❓ Unknown Error:');
    console.log('Error object:', error);
    extractedMessage = 'Unknown error occurred';
  }

  console.log('✅ Extracted Message:', extractedMessage);
  console.groupEnd();

  const base = {
    originalError: error,
    extractedMessage,
    timestamp,
  } as { originalError: any; extractedMessage: string; timestamp: string; statusCode?: number };
  if (typeof statusCode === 'number') {
    base.statusCode = statusCode;
  }
  return base;
}

/**
 * Log error details for debugging in development
 */
export function logErrorForDebug(context: string, error: any): string {
  const details = extractErrorDetails(error);

  console.group(`🔍 [${context.toUpperCase()}] Error Debug`);
  console.log('Context:', context);
  console.log('Timestamp:', details.timestamp);
  console.log('Status Code:', details.statusCode || 'N/A');
  console.log('Extracted Message:', details.extractedMessage);
  console.log('Original Error:', details.originalError);
  console.groupEnd();

  return details.extractedMessage;
}

/**
 * Enhanced error handler for async thunks
 */
export function handleAsyncThunkError(error: any, context: string, fallbackMessage: string): string {
  try {
    if (__DEV__) {
      return logErrorForDebug(context, error);
    }
    const details = extractErrorDetails(error);
    return details.extractedMessage || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
