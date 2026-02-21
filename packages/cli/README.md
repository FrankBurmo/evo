# evo-scan CLI

> Proaktiv GitHub-repo-analyse og automatisk issue-opprettelse – drevet av GitHub Copilot AI.

```
  ███████╗██╗   ██╗ ██████╗
  ██╔════╝██║   ██║██╔═══██╗
  █████╗  ██║   ██║██║   ██║
  ██╔══╝  ╚██╗ ██╔╝██║   ██║
  ███████╗ ╚████╔╝ ╚██████╔╝
  ╚══════╝  ╚═══╝   ╚═════╝
```

## Rask start

Ingen installasjon nødvendig – kjør direkte med `npx`:

```bash
npx evo-scan --token ghp_ditt_token_her
```

Eller sett token som miljøvariabel:

```bash
export GITHUB_TOKEN=ghp_ditt_token_her
npx evo-scan
```

## GitHub Token

Generer et token på [github.com/settings/tokens/new](https://github.com/settings/tokens/new).

Nødvendige scopes:
- `repo` – lese repositories og opprette issues
- `models:read` – bruke GitHub Copilot Models API for AI-analyse

## Brukseksempler

### Skann alle dine repos
```bash
npx evo-scan
```

### Skann én spesifikk repo
```bash
npx evo-scan --repo frankburmo/product-orchestrator
```

### Skann en annen GitHub-bruker/org
```bash
npx evo-scan --owner microsoft --max-repos 20
```

### Regelbasert analyse (uten AI, raskere)
```bash
npx evo-scan --no-ai
```

### Vis kun anbefalinger med høy prioritet
```bash
npx evo-scan --min-priority high
```

### Opprett GitHub Issues automatisk
```bash
npx evo-scan --create-issues --min-priority medium
```

### Forhåndsvis uten å opprette (dry-run)
```bash
npx evo-scan --create-issues --dry-run
```

### JSON-output (for CI/scripting)
```bash
npx evo-scan --json > results.json
```

### Bruk annen AI-modell
```bash
npx evo-scan --model claude-3-5-sonnet
```

## Alle flagg

| Flagg | Beskrivelse | Standard |
|-------|-------------|---------|
| `-t, --token <token>` | GitHub PAT | `GITHUB_TOKEN` env |
| `-o, --owner <owner>` | GitHub-bruker/org å skanne | Autentisert bruker |
| `-r, --repo <repo>` | Skann kun én repo (`owner/repo`) | – |
| `-m, --model <model>` | AI-modell for analyse | `openai/gpt-4.1` |
| `-p, --min-priority <p>` | Minimum prioritet (`high`/`medium`/`low`) | `medium` |
| `--create-issues` | Opprett GitHub Issues automatisk | `false` |
| `--dry-run` | Forhåndsvis issues uten å opprette | `false` |
| `--no-ai` | Kun regelbasert analyse (uten Copilot API) | `false` |
| `--max-repos <n>` | Maks antall repos å skanne | `50` |
| `--json` | Skriv resultater som JSON til stdout | `false` |

## GitHub Actions-integrasjon

Bruk Evo som et steg i en eksisterende workflow:

```yaml
- name: Evo – Repo-analyse
  run: npx evo-scan --create-issues --min-priority high --no-ai
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For full AI-støtte (krever `models:read`-scope via PAT):

```yaml
- name: Evo – AI-drevet analyse
  run: npx evo-scan --create-issues --model openai/gpt-4.1
  env:
    GITHUB_TOKEN: ${{ secrets.EVO_PAT }}
```

## Lokalt

```bash
# Klon
git clone https://github.com/FrankBurmo/product-orchestrator
cd product-orchestrator/packages/cli

# Installer
npm install

# Kjør lokalt
node bin/evo-scan.js --help
```

## Lisens

MIT © Frank Burmo
