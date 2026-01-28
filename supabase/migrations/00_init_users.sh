#!/bin/bash
# Initialize Supabase database users
# This script runs before SQL migrations to create required users

set -e

# Get password from environment (set by docker-compose)
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-stockflow-secure-password-2026}"

# Wait for PostgreSQL to be ready
until psql -U supabase_admin -d postgres -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

# Create authenticator role if it doesn't exist
psql -U supabase_admin -d postgres <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE authenticator PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Create supabase_auth_admin if it doesn't exist
psql -U supabase_admin -d postgres <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_auth_admin PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Create supabase_storage_admin if it doesn't exist
psql -U supabase_admin -d postgres <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_storage_admin PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Create supabase_realtime_admin if it doesn't exist
psql -U supabase_admin -d postgres <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
            CREATE ROLE supabase_realtime_admin LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_realtime_admin PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Grant necessary permissions
psql -U supabase_admin -d postgres <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
    GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;
    GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_realtime_admin;
    GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_auth_admin;
    GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_storage_admin;
    GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_realtime_admin;
EOSQL

echo "Database users initialized successfully"
