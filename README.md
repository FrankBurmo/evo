# Evo

> **Produktene dine vokser kontinuerlig – automatisk.**

Evo er en proaktiv utviklingsassistent som analyserer alle GitHub-reposene dine med AI og oppretter konkrete GitHub Issues med forbedringsforslag – helt uten at du trenger å gjøre noe manuelt.

<img width="1302" height="1208" alt="image" src="https://github.com/user-attachments/assets/d7b7ab68-6aa4-4c4f-a4d4-08cf66e97ddf" />

---

## Hva løser Evo?

Hvis du har mange GitHub-prosjekter vet du problemet: det hopet seg opp med repos som mangler dokumentasjon, har utdaterte avhengigheter, ligge inaktive, eller aldri har fått den oppfølgingen de fortjener. Du vet det burde gjøres noe, men du rekker det aldri.

**Evo gjør dette jobben for deg.**

Verktøyet går gjennom alle reposene dine, forstår hva slags prosjekt det er (web-app, Android-app, API, bibliotek osv.), og bruker GitHub Copilot til å generere skreddersydde forbedringsforslag. Forslagene havner direkte som GitHub Issues i det aktuelle repoet – tildelt til Copilot Coding Agent slik at de kan løses automatisk.

**Resultatet:** Prosjektene dine forbedres kontinuerlig, selv når du er opptatt med noe annet.

---

## Slik fungerer det

```
Du logger inn med GitHub-token
        ↓
Evo henter alle reposene dine
        ↓
AI analyserer hvert repo (kodestruktur, dokumentasjon, aktivitet, sikkerhet m.m.)
        ↓
Konkrete forbedringsforslag genereres per repo
        ↓
GitHub Issues opprettes automatisk – tildelt Copilot Coding Agent
        ↓
Copilot fikser problemene, du merger pull requests
```

Skanningen kan kjøres manuelt fra dashboardet, via CLI, eller settes opp til å kjøre automatisk med GitHub Actions.

---

## Hva blir analysert?

Evo ser på alt som faktisk betyr noe for kvaliteten på et prosjekt:

- **Dokumentasjon** – manglende README, beskrivelse, lisens, eller konfigurasjonseksempler
- **Vedlikehold** – utdaterte avhengigheter, inaktivitet, åpne issues uten respons
- **Sikkerhet** – kjente sårbarheter, manglende sikkerhetstiltak
- **Testdekning** – manglende tester eller CI-oppsett
- **Synlighet** – hva som skal til for at flere finner og bruker prosjektet
- **Arkitektur** – prosjekttypespesifikke forbedringer (f.eks. Android vs. web vs. API)

<img width="1294" height="1216" alt="image" src="https://github.com/user-attachments/assets/8876eba6-c4e2-498e-9a82-9c2c662135d7" />

---

## Forutsetninger

- **GitHub-konto** med de reposene du vil analysere
- **GitHub Personal Access Token** med `repo`-scope
- **GitHub Copilot-abonnement** (brukes som AI-motor – ingen ekstra AI-kostnad)
- Node.js 18 eller nyere

---

## Kom i gang

### 1. Klon og installer

```bash
git clone https://github.com/FrankBurmo/evo.git
cd evo
npm install
```

### 2. Start Evo

```bash
# Terminal 1 – backend
npm run dev

# Terminal 2 – frontend
npm run dev:client
```

Åpne `http://localhost:3000` i nettleseren.

### 3. Logg inn og skann

Lim inn GitHub-tokenet ditt i innloggingsskjermen, klikk **Skann alle repos**, og se forslagene komme inn.

---

## GitHub Token

Du trenger et Personal Access Token for å bruke Evo:

1. Gå til [GitHub Settings → Tokens](https://github.com/settings/tokens/new)
2. Velg **"Generate new token (classic)"**
3. Gi det et navn (f.eks. `evo`) og velg scope: `repo`
4. Kopier tokenet – det vises bare én gang

Tokenet kan legges inn direkte i innloggingsskjermen, eller settes som miljøvariabel:

```bash
# .env
GITHUB_TOKEN=ghp_ditttoken
```

---

## CLI – kjør fra terminalen

Evo har også et CLI-verktøy for de som foretrekker terminalen eller ønsker å integrere skanningen i egne skript:

```bash
npx evo-scan --token ghp_ditttoken --owner mittbrukernavn
```

Se [`packages/cli/README.md`](packages/cli/README.md) for full dokumentasjon.

---

## Automatisk skanning med GitHub Actions

Legg til en workflow i repoet ditt for daglig eller ukentlig automatisk skanning – da trenger du ikke gjøre noe som helst manuelt:

```yaml
# .github/workflows/evo-scan.yml
on:
  schedule:
    - cron: '0 8 * * 1'  # Hver mandag kl. 08:00
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx evo-scan --token ${{ secrets.GITHUB_TOKEN }} --owner ${{ github.repository_owner }}
```

---

## Teknologi

- **Frontend:** React 19 + Vite, custom CSS
- **Backend:** Node.js + Express, TypeScript
- **GitHub-integrasjon:** `@octokit/rest`
- **AI-motor:** GitHub Copilot Models API (GPT-4.1)

---

## Bidra

Bidrag er velkomne – åpne gjerne en issue eller send en pull request.

## Lisens

MIT
