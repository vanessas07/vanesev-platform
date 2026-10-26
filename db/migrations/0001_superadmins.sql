-- ==============================================================================
-- VANESEV Platform - Migration 001: System Superadmins & Access Logs
-- Schema version: 001
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_superadmins (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    session_version INTEGER DEFAULT 1 NOT NULL,
    totp_secret VARCHAR(64),
    totp_enabled BOOLEAN DEFAULT false,
    recovery_codes JSONB DEFAULT '[]'::jsonb,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_access_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    email VARCHAR(255),
    role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_superadmins_email ON public.system_superadmins(email);
CREATE INDEX IF NOT EXISTS idx_system_access_logs_user ON public.system_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_access_logs_created_at ON public.system_access_logs(created_at DESC);
