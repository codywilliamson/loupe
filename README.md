# loupe

Local git diff viewer with an Azure DevOps-style UI. Leave inline comments on any line, then export them all as a structured review prompt for any LLM.

## Install

    bun install

## Usage

    bun src/index.ts                  # working tree vs HEAD
    bun src/index.ts staged           # staged changes only
    bun src/index.ts <branch>         # current branch vs named branch
    bun src/index.ts <ref1>..<ref2>   # commit range

loupe reviews whichever git repo you run it from, then prints a `http://localhost:<port>`
URL and opens it in your browser — the diff renders there, not in the terminal.

## Install as a `loupe` command

Run loupe from any repo without typing the full path.

**macOS / Linux** — register it globally with bun:

    bun install
    bun link          # puts `loupe` on your PATH (~/.bun/bin)

**Windows (PowerShell)** — add a function to your profile so it persists across sessions:

    'function loupe { bun "C:\path\to\loupe\src\index.ts" @args }' | Add-Content $PROFILE
    . $PROFILE   # load it into the current session

(swap `C:\path\to\loupe` for wherever you cloned the repo.)

Then, in any git repo: `loupe`, `loupe staged`, `loupe origin/main`.

## Comments

Saved to `.review` in the directory you run the command from (auto-added to `.gitignore`).

## Releases

See [CHANGELOG.md](CHANGELOG.md). Current: **v0.2.0**.
