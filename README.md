# loupe

Local git diff viewer with an ADO-style UI. Leave inline comments, then export them as a structured prompt for any LLM.

## Install

    bun install

## Usage

    bun src/index.ts                  # working tree vs HEAD
    bun src/index.ts staged           # staged changes only
    bun src/index.ts <branch>         # current branch vs named branch
    bun src/index.ts <ref1>..<ref2>   # commit range

## Comments

Saved to `.review` in the directory you run the command from (auto-added to `.gitignore`).
