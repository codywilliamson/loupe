# loupe

Local git diff viewer with an Azure DevOps-style UI. Leave inline comments on any line, then export them all as a structured review prompt for any LLM.

**Site & docs: [codywilliamson.github.io/loupe](https://codywilliamson.github.io/loupe/)**

## Screenshots

![loupe — unified diff with markdown preview, a file tree, and inline comments](docs/screenshots/01-overview.png)

| Dark mode | Inline multi-line comment | Side-by-side |
| --- | --- | --- |
| ![dark mode](docs/screenshots/02-dark.png) | ![multi-line comment](docs/screenshots/03-comments.png) | ![side-by-side diff](docs/screenshots/04-side-by-side.png) |

## Install

    bun install

## Usage

    bun src/index.ts                  # working tree vs HEAD (untracked included)
    bun src/index.ts staged           # staged changes only
    bun src/index.ts <branch>         # current branch vs named branch
    bun src/index.ts <ref1>..<ref2>   # commit range

Flags: `--port <n>` fixed port, `--no-open` don't launch the browser, `--version`, `--help`.

loupe reviews whichever git repo you run it from, then prints a `http://localhost:<port>`
URL and opens it in your browser — the diff renders there, not in the terminal. Press `?`
in the UI for keyboard shortcuts.

## Install as a `loupe` command

Run loupe from any repo without typing the full path. Register it globally with bun — works on macOS, Linux, and Windows:

    bun install
    bun link          # puts `loupe` on your PATH

Then, in any git repo: `loupe`, `loupe staged`, `loupe origin/main`.

**Windows fallback** — if `loupe` isn't found after `bun link` (depends how Bun was installed), add a function to your PowerShell profile instead:

    'function loupe { bun "C:\path\to\loupe\src\index.ts" @args }' | Add-Content $PROFILE
    . $PROFILE   # load it into the current session

(swap `C:\path\to\loupe` for wherever you cloned the repo.)

## Comments

Saved to `.review` in the directory you run the command from (auto-added to `.gitignore`).

## Releases

See [CHANGELOG.md](CHANGELOG.md). Current: **v0.5.0**.
