# Quirky Name Generator (QNG)

A single-page procedural sci-fi superintelligence name and manifest generator inspired by Iain M. Banks’ *Culture* Minds and *Rain World* Iterators.

> *Vibe-coded within [aistudio.google.com](https://aistudio.google.com) with Gemini 4 Hydrogen.*

---

## Project Goal

**Quirky Name Generator (QNG)** provides worldbuilders, writers, and game masters with an instant, deterministic registry for generating memorable artificial intelligence and megastructure identities. Given the same integer base seed and active trait filters, the procedural engine guarantees identical results across sessions and browsers, while keeping lexical word banks in an external YAML file for effortless customization.

---

## Features

- **Deterministic 32-bit PRNG Engine (`Mulberry32`)**
  - Derives per-row seeds via `RowSeed(i) = (BaseSeed + i × 10007) mod (2^31 - 1)` with independent bit-mixed sub-streams for `Name`, `Role`, and `Personality`.
  - Generate batches of **1–20** records at a time with direct seed entry or randomized seed rolling.
- **Four Syntactic Naming Archetypes**
  - **Bureaucratic Euphemism:** `[Modifier] + [Institutional Noun]` *(e.g., "No Significant Harassment", "Frank Exchange of Views")*
  - **Conversational Clause:** `[Idiomatic Prefix] + [Action / Concept]` *(e.g., "So Much For Subtlety", "Forgive The Common Sense")*
  - **Zen / Ascetic Posture:** `[Action Verb] + [Natural Phenomenon]` *(e.g., "Looks to the Moon", "Measuring Slow Glaciers")*
  - **Paradoxical Humility:** `[Quantifier / Fragment] + [Mundane Object]` *(e.g., "Five Pebbles", "Drop of Amber")*
- **External YAML Lexicon (`public/lexicon.yaml`)**
  - Roles, personalities, archetype metadata, and all word banks are stored in `public/lexicon.yaml` and fetched at runtime (`/lexicon.yaml`), enabling edits or Docker volume overrides without recompiling.
- **Role & Personality Filtering + Column Toggles**
  - Multi-select filter dropdowns for all 6 Roles and 6 Personalities.
  - Independent visibility toggles for `Name`, `Role`, `Personality`, `Seed`, and `Lore Snippet`—unchecking a column removes it from both the table and generation queue.
- **Dynamic Markdown Export & Live Preview**
  - **2+ active columns:** Exports a GitHub-flavored Markdown table.
  - **1 active column:** Automatically switches to a flat Markdown bullet list (`- Value`).
- **Optional Local LLM Lore Accompaniment**
  - Configurable OpenAI-compatible local endpoint modal (Ollama, LM Studio, LocalAI) with endpoint ping testing, model selection, and graceful offline fallbacks. Numeric seeds are intentionally omitted from LLM requests so lore remains non-deterministic.

---

## Local Development

**Prerequisites:** Node.js 20+ (or 22+)

```bash
# Install dependencies
npm install

# Start Vite dev server on http://localhost:3000
npm run dev

# Type-check and build production bundle into dist/
npm run lint
npm run build
```

---

## Docker Deployment

QNG uses a two-stage build (`node:22-alpine` builder + `caddy:2-alpine` static server) producing a compact runtime image with no Node.js dependencies inside the final container.

### Option 1: Docker Compose (Recommended)

```bash
docker compose up -d --build
```

The application will be available at `http://localhost:3000`.

### Option 2: Docker CLI

```bash
# Build the image
docker build -t qng:latest .

# Run the container
docker run -d \
  --name qng \
  -p 3000:80 \
  --restart unless-stopped \
  qng:latest
```

### Overriding the Lexicon Without Rebuilding

Because `Caddyfile` serves `/lexicon.yaml` with `Cache-Control: no-cache`, you can mount a custom YAML lexicon directly into a running container and refresh your browser:

```bash
docker run -d \
  --name qng \
  -p 3000:80 \
  -v $(pwd)/my-lexicon.yaml:/srv/lexicon.yaml:ro \
  qng:latest
```

### Cross-Platform Build & GHCR Publish

Both `node:22-alpine` and `caddy:2-alpine` support `linux/amd64` and `linux/arm64`. To build and push a multi-architecture image to GitHub Container Registry (`ghcr.io`):

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<your-github-username>/qng:latest \
  --push .
```

> **Note on Local LLM CORS:** When running QNG inside Docker on `http://localhost:3000`, browser requests to a local LLM on your host (e.g., `http://localhost:11434/v1`) require CORS to be enabled on your local LLM server (such as `OLLAMA_ORIGINS="*"` for Ollama or the CORS toggle in LM Studio).

---

## Project Structure

```text
├── public/
│   └── lexicon.yaml          # Roles, personalities, archetypes, and word banks
├── src/
│   ├── components/           # UI controls, data table, filter dropdowns, modals
│   ├── engine/
│   │   ├── prng.ts           # Mulberry32 PRNG and row seed formula
│   │   ├── lexicon.ts        # YAML parser and schema validator
│   │   ├── generator.ts      # Deterministic manifest generator
│   │   └── exporter.ts       # Dynamic Markdown table / bullet-list formatter
│   ├── services/
│   │   └── llmClient.ts      # Optional OpenAI-compatible local LLM client
│   └── App.tsx
├── Dockerfile                # Multi-stage Node builder + Caddy runtime
├── Caddyfile                 # Static serving, compression, and cache rules
├── compose.yaml              # Local Docker Compose setup
└── .dockerignore
```
