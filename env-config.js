// This file is generated at build time from .env.development.local
window.__env = {
SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
// Add any other environment variables needed
};

// Helper function to get environment variables
window.getEnvVar = function(key) {
if (!window.__env) {
    throw new Error('Environment variables not loaded');
}
const value = window.__env[key];
if (!value) {
    throw new Error(`Missing ${key} environment variable`);
}
return value;
};

