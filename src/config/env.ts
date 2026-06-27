/**
 * Environment configuration with validation
 * Fail-fast if required environment variables are missing
 */

// Required environment variables
const REQUIRED_ENV_VARS = ['VITE_API_URL'] as const;

// Validate environment variables at startup
function validateEnv() {
  const missing: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Run validation
validateEnv();

// Export validated environment variables
export const env = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Security: Ensure API URL uses HTTPS in production
if (env.isProduction && !env.apiUrl.startsWith('https://')) {
  console.warn(
    '⚠️ WARNING: API URL should use HTTPS in production environment'
  );
}

export default env;
