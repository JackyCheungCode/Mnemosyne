# Mnemosyne

Global B2B Intelligence — personal global B2B company discovery.

## First phase
- Google SERP-based candidate website discovery.
- Search syntax preview with country, language, company-type terms and exclusion domains.
- Search results table.
- Cloudflare Pages Function proxy; API credentials remain server-side.

## Cloudflare Pages
Project: `mnemosyne-console` · Production branch: `main` · Framework: None · Build command: empty · Build output directory: `/` (repository root).

Set Production secrets/variables:
- `BRIGHTDATA_API_KEY`: Bright Data API key
- `BRIGHTDATA_SERP_ZONE`: exact SERP zone name

Never commit API credentials. This first phase intentionally excludes AI scoring, contact discovery, CRM and multi-user features.
