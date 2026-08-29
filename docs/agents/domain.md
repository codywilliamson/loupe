# Domain docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- Relevant ADRs under `docs/adr/`.

If either location does not exist, proceed silently. The `/domain-modeling` skill creates the files lazily when terms or durable decisions are resolved.

## File structure

Loupe uses a single context:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

`CONTEXT.md` is a glossary, not a specification or implementation guide. ADRs capture hard-to-reverse architectural decisions that resulted from genuine trade-offs and would otherwise surprise future readers.

## Use the glossary's vocabulary

When output names a domain concept in an issue, proposal, hypothesis, or test, use the term defined in `CONTEXT.md`. Do not drift to synonyms that the glossary explicitly avoids.

If a needed concept is absent, reconsider whether the language belongs to the project or note a genuine gap for `/domain-modeling`.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
