# Deployment Guide - Push to GitHub & Vercel

## Step 1: Install Git (if not already installed)
Download and install Git from: https://git-scm.com/download/win

## Step 2: Clean Up Temporary Files
The following files are temporary debug/migration scripts and should be deleted before deployment:

### Delete these SQL files (keep only fix_sku_and_delete.sql and fix_specs_size.sql):
- add_columns.sql
- backup_products.sql
- check_specs.sql
- final_migration.sql
- final_migration_v2.sql
- fine_tune_specs.sql
- fix_rls.sql
- fix_specs_final.sql
- import_effects.sql
- standardize_db.sql
- update_schema_v2.sql
- update_schema_v3.sql
- update_specs_logic.sql

### Delete these JS debug files:
- apply_fix.js
- check_address_cols.js
- check_env.js
- check_fx.js
- check_insert.js
- check_latest.js
- check_schema_details.js
- check_sku.js
- check_specs_schema.js
- check_tables.js
- check_tables_v2.js
- debug_db_data.js
- debug_db_issues.js
- debug_relations.js
- debug_specs.js
- debug_view_server.js
- fetch_lookups.js
- fix_env.js
- fix_env_final.js
- inspect_db.js
- list_env_keys.js
- list_keys.js
- print_url.js
- probe_db_logic.js
- run_migration.js
- test_joins.js
- verify_frontend_data.js

## Step 3: Git Commands to Push

Open PowerShell in your project directory and run:

```powershell
# Navigate to project
cd C:\Users\Admin\.gemini\antigravity\scratch\cpack2025

# Add all changes
git add .

# Commit with a message
git commit -m "Add Delete, U column, File downloads, Enhanced search features"

# Push to GitHub
git push origin main
```

(If your branch is named 'master' instead of 'main', use `git push origin master`)

## Step 4: Vercel Auto-Deploy
- Vercel will automatically detect the push and start deploying
- Check your Vercel dashboard to monitor the deployment
- Once complete, your live site will have all the new features!

## Important Notes:
- Your Supabase environment variables are already configured in Vercel ✓
- The `public/uploads` folder for file storage will be created automatically
- Make sure you've run both SQL scripts in Supabase before using the deployed app:
  1. `fix_sku_and_delete.sql`
  2. `fix_specs_size.sql`
