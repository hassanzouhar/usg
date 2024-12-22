// This file contains environment variables for the static site
window.__env = {
    SUPABASE_URL: "https://vfqxllqyplkvfqtnvsgc.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcXhsbHF5cGxrdmZxdG52c2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4OTk4MTMsImV4cCI6MjA1MDQ3NTgxM30.mGQp2QZdU81u8ONiyT-mX5qNO3FKzW356PsEXwFCXc4"
};

// Helper function to safely get environment variables
window.getEnvVar = function(key) {
if (!window.__env) {
    console.error('Environment configuration not loaded');
    throw new Error('Environment configuration not loaded');
}

const value = window.__env[key];
if (typeof value === 'undefined' || value === null) {
    console.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing ${key} environment variable`);
}

return value;
};
