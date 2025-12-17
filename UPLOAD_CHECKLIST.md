# Critical Files Checklist for GitHub Upload

## ✅ Must Upload These Files:

### Root Configuration Files:
- [ ] package.json
- [ ] package-lock.json
- [ ] tsconfig.json
- [ ] next.config.ts
- [ ] postcss.config.mjs
- [ ] tailwind.config.ts
- [ ] .gitignore
- [ ] README.md
- [ ] DEPLOYMENT_GUIDE.md

### Folders (with all contents):
- [ ] src/ (entire folder with all subfolders)
- [ ] public/ (entire folder)

### SQL Scripts (optional but recommended):
- [ ] fix_sku_and_delete.sql
- [ ] fix_specs_size.sql

## ❌ Do NOT Upload:
- node_modules/
- .next/
- .env.local
- debug_out.txt
- build_log*.txt
- schema_*.txt
- columns.txt
- probe_output.txt
- specs_formula.txt
- GITHUB_UPLOAD_INSTRUCTIONS.md

## Verification:
After uploading, check that GitHub shows:
- src/ folder with app/, components/, types/, utils/ inside
- public/ folder
- All config files at root level

If any are missing, upload them separately.
