#!/usr/bin/env python3
"""
Parivar Path - Supabase Live Migration Tool
Applies all SQL migrations and seeds reference data to a Supabase project.

Usage:
    python tools/apply_supabase_migrations.py [DATABASE_URL]
    
If DATABASE_URL is not provided, it reads from .env or SUPABASE_DB_URL.
"""

import os
import sys
import glob

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def get_db_url():
    if len(sys.argv) > 1 and sys.argv[1].startswith("postgres"):
        return sys.argv[1]
    
    # Check environment variables
    url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if url:
        return url
        
    # Check .env in services/api or root
    for env_path in [
        os.path.join(os.path.dirname(__file__), "..", "services", "api", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    ]:
        if os.path.exists(env_path):
            with open(env_path, encoding="utf-8") as f:
                for line in f:
                    if line.startswith("DATABASE_URL=") or line.startswith("SUPABASE_DB_URL="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if "postgres" in val:
                            return val
                            
    return None

def main():
    print("=" * 60)
    print("  PARIVAR PATH - SUPABASE MIGRATION RUNNER")
    print("=" * 60)
    
    db_url = get_db_url()
    if not db_url:
        print("\n[!] No database URL provided.")
        print("Please provide your Supabase Postgres connection string:")
        print("  python tools/apply_supabase_migrations.py \"postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres\"")
        print("\nOr set SUPABASE_DB_URL in your environment or .env file.")
        return 1

    # Convert asyncpg prefix if present
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        import psycopg2
    except ImportError:
        try:
            import psycopg as psycopg2
        except ImportError:
            print("[x] Error: Neither 'psycopg2' nor 'psycopg' is installed.")
            print("Run: pip install psycopg2-binary or pip install psycopg")
            return 1

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    migrations_dir = os.path.join(base_dir, "supabase", "migrations")
    seed_file = os.path.join(base_dir, "supabase", "seed.sql")

    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    
    if not migration_files:
        print(f"[!] No migration files found in {migrations_dir}")
        return 1

    print(f"\n[+] Connecting to Supabase database...")
    try:
        conn = psycopg2.connect(sync_url)
        conn.autocommit = True
        cursor = conn.cursor()
        print("[v] Connected successfully!")
    except Exception as e:
        print(f"[x] Connection failed: {e}")
        return 1

    # Track migrations in a schema table
    cursor.execute("""
        create table if not exists public._parivar_migrations (
            version text primary key,
            applied_at timestamptz not null default now()
        );
    """)

    cursor.execute("select version from public._parivar_migrations;")
    applied = {row[0] for row in cursor.fetchall()}

    print(f"\n[+] Applying {len(migration_files)} migration(s)...")
    for file_path in migration_files:
        filename = os.path.basename(file_path)
        if filename in applied:
            print(f"  [i] Skipping already applied: {filename}")
            continue

        print(f"  [>] Applying: {filename} ...")
        with open(file_path, "r", encoding="utf-8") as f:
            sql = f.read()

        try:
            cursor.execute(sql)
            cursor.execute("insert into public._parivar_migrations (version) values (%s);", (filename,))
            print(f"  [v] Applied successfully: {filename}")
        except Exception as e:
            print(f"  [x] Error in {filename}: {e}")
            return 1

    # Apply seed if exists
    if os.path.exists(seed_file):
        print(f"\n[+] Applying seed data from: {os.path.basename(seed_file)} ...")
        with open(seed_file, "r", encoding="utf-8") as f:
            seed_sql = f.read()
        try:
            cursor.execute(seed_sql)
            print("  [v] Seed data applied successfully!")
        except Exception as e:
            print(f"  [!] Warning on seed data: {e}")

    # Print summary of tables and RLS
    print("\n[+] Verification of Schema & Security:")
    cursor.execute("""
        select tablename, rowsecurity 
        from pg_tables 
        where schemaname = 'public' and tablename not like '\\_%'
        order by tablename;
    """)
    rows = cursor.fetchall()
    print(f"  {'Table':<25} | {'RLS Enabled':<12}")
    print("  " + "-" * 40)
    for table, rls in rows:
        status = "[v] YES" if rls else "[!] NO"
        print(f"  {table:<25} | {status}")

    cursor.close()
    conn.close()
    print("\n[SUCCESS] Supabase database migrations completed cleanly!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
