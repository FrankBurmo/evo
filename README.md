# Evo 🌱

Produktene dine vokser kontinuerlig – automatisk.

<img width="1302" height="1208" alt="image" src="https://github.com/user-attachments/assets/d7b7ab68-6aa4-4c4f-a4d4-08cf66e97ddf" />

## Funksjoner ✨

- 📊 **Dashboard**: Visuell oversikt over alle dine GitHub repositories
- 🎯 **Anbefalinger**: Intelligente forslag for hvert repository basert på:
  - Dokumentasjon (README, lisenser, etc.)
  - Aktivitet og vedlikehold
  - Issues og community engagement
  - Synlighet og markedsføring
- 💼 **Markedsmuligheter**: Identifiser potensiale for vekst og forbedring
- 📈 **Statistikk**: Få oversikt over totalt antall repos, stjerner, aktivitet, etc.
- 🔍 **Filtrering**: Sorter repositories basert på:
  - Markedsmuligheter
  - Repositories som trenger oppmerksomhet
  - Aktive vs inaktive repositories

<img width="1294" height="1216" alt="image" src="https://github.com/user-attachments/assets/8876eba6-c4e2-498e-9a82-9c2c662135d7" />

## Teknologi 🛠️

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **API**: GitHub REST API via Octokit
- **Styling**: Custom CSS

## Installasjon 📦

1. Klon repositoryet:
```bash
git clone https://github.com/FrankBurmo/evo.git
cd evo
```

2. Installer dependencies:
```bash
npm install
```

3. (Valgfritt) Opprett en `.env` fil basert på `.env.example`:
```bash
cp .env.example .env
```

Rediger `.env` og legg inn din GitHub Personal Access Token hvis du ønsker det (kan også legges inn i UI).

## Bruk 🚀

### Utviklingsmodus

1. Start backend serveren (i ett terminalvindu):
```bash
npm run dev
```

2. Start frontend utviklingsserveren (i et annet terminalvindu):
```bash
npm run dev:client
```

3. Åpne nettleseren på `http://localhost:3000`

### Produksjonsbuild

1. Bygg frontend:
```bash
npm run build
```

2. Start serveren:
```bash
npm run dev
```

## GitHub Token 🔑

For å bruke applikasjonen trenger du en GitHub Personal Access Token:

1. Gå til [GitHub Settings > Tokens](https://github.com/settings/tokens/new)
2. Klikk "Generate new token (classic)"
3. Gi tokenet et navn (f.eks. "Evo")
4. Velg scope: `repo` (for å lese repositories)
5. Klikk "Generate token"
6. Kopier tokenet (du ser det bare én gang!)

Du kan enten:
- Legge inn tokenet i `.env` filen som `GITHUB_TOKEN`
- Eller oppgi det direkte i applikasjonens login-skjerm

## Anbefalingstyper 💡

Systemet gir anbefalinger basert på:

### 📝 Dokumentasjon
- Manglende README
- Manglende beskrivelse
- Manglende hjemmeside/dokumentasjon

### 🔧 Vedlikehold
- Åpne issues som bør håndteres
- Inaktive repositories
- Behov for oppdateringer

### 🌟 Vekst og synlighet
- Markedsføring av projektet
- Tiltrekke bidragsytere
- Bygge community

### 💼 Markedsmuligheter
- Identifiser repositories med potensiale
- Forslag til hvordan produktet kan tilpasses markedet
- Strategier for produktutvikling

## Bidra 🤝

Bidrag er velkomne! Åpne gjerne en issue eller send en pull request.

## Lisens 📄

MIT
