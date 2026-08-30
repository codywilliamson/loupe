---
name: Loupe
description: A local proof desk for reading, marking, and returning agent-generated code changes.
colors:
  paper: "#F6F1E7"
  surface: "#FFFCF6"
  surface-muted: "#EEE8DD"
  ink: "#252522"
  muted: "#6E6A61"
  line: "#D5CFC4"
  hover: "#E8E1D5"
  accent: "#C5533D"
  accent-hover: "#A94532"
  focus: "#2D6F91"
  add-bg: "#E2ECE0"
  add-gutter: "#C9DEC7"
  add-text: "#315C38"
  del-bg: "#F1DDD7"
  del-gutter: "#E7C4BA"
  del-text: "#8A3F31"
  inline-add: "#9BBB96"
  inline-del: "#D79382"
  modified-bg: "#E8D7A8"
  modified-text: "#725216"
  renamed-bg: "#D8D9E8"
  renamed-text: "#4B557A"
  success: "#315C38"
  warning: "#725216"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(38px, 4.2vw, 54px)"
    fontWeight: 500
    lineHeight: ".98"
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(28px, 4vw, 46px)"
    fontWeight: 500
    lineHeight: "1"
    letterSpacing: "-.035em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.55"
  reading:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "1.65"
  label:
    fontFamily: "IBM Plex Mono, Cascadia Code, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "1.5"
    letterSpacing: ".08em"
rounded:
  none: "0px"
  xs: "2px"
  sm: "3px"
  md: "4px"
  badge: "5px"
  lg: "7px"
  xl: "8px"
  pill: "10px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "18px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 13px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "6px 11px"
  input-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
---

# Design System: Loupe

## Overview

**Creative North Star: "The Proof Desk / Redline Galley"**

Loupe makes local review feel like proofing a change. Code is the proof, comments are anchored editorial judgment, and the feedback bundle is the marked-up return. The system is compact and code-first: warm paper or charcoal surfaces, restrained ink, vermilion anchors, proof-blue focus, and quiet diff washes keep the brand present without competing with the lines under review.

The app, overview page, and docs share one language but use different composition. The homepage makes an artifact-first full review frame the first viewport: a file context bar, integrated stage rail, four accessible states, and one changing proof surface. Fine registration rules, mono labels, and the split-aperture mark connect the surfaces. Complete light and dark modes are semantic twins, not novelty themes.

**Key Characteristics:**
- Artifact-first hierarchy: the review frame is the explanation, not a mockup beside it.
- Border-defined depth with paper/charcoal tonal layering.
- Warm serif reading voice paired with utilitarian sans and mono labels.
- Vermilion anchors and blue focus marks signal action and attention.
## Colors

The palette is warm, quiet, and legible: bone paper and warm ink in light mode become charcoal paper and cream ink in dark mode, while the accent and status roles remain recognizable.

### Primary
- **Vermilion Anchor** (`#C5533D`; dark `#E0785F`): primary actions, active file state, comment marks, links, and the split-aperture mark.
- **Proof Blue** (`#2D6F91`; dark `#8DB8CA`): visible keyboard focus, hunk headers, and comment borders.

### Neutral
- **Bone Paper** (`#F6F1E7`; dark `#171918`): page/app background.
- **Proof Surface** (`#FFFCF6`; dark `#202321`): diff canvas, header, and modal surfaces.
- **Ledger Surface** (`#EEE8DD`; dark `#292D29`): file tree, gutters, pills, and secondary panels.
- **Warm Ink** (`#252522`; dark `#E3DDD0`): primary text and code.
- **Muted Ink** (`#6E6A61`; dark `#A39D91`): metadata, line numbers, and secondary copy.
- **Registration Line** (`#D5CFC4`; dark `#3A403B`): borders and dividers.
### Status washes
- **Moss Addition** (`#E2ECE0` / `#315C38`; dark `#223729` / `#A9CEA3`): added lines, positive status, and viewed progress.
- **Oxide Deletion** (`#F1DDD7` / `#8A3F31`; dark `#402722` / `#F0A38F`): removed lines and destructive status.
- **Muted Gold Modified** (`#E8D7A8` / `#725216`; dark `#4A3A20` / `#E5C982`): modified-file badges and warnings.
- **Slate Rename** (`#D8D9E8` / `#4B557A`; dark `#33384B` / `#BAC1E0`): renamed-file badges.
**The Two-Mode Rule.** Use the same semantic role in both modes; switch only to the documented dark value. Never introduce a third theme.
## Typography

**Display Font:** Source Serif 4 (with Georgia)
**Body Font:** DM Sans (with system-ui)
**Label/Mono Font:** IBM Plex Mono (with Cascadia Code and Consolas)
**Character:** Source Serif 4 supplies the editorial reading voice; DM Sans keeps controls and dense UI clear; IBM Plex Mono makes paths, shortcuts, counts, hunks, and labels feel like working evidence.

### Hierarchy
- **Display** (500, `clamp(38px, 4.2vw, 54px)`, `.98`): homepage stage rail claim and major review statement.
- **Headline** (500, `clamp(28px, 4vw, 46px)`, `1.04`): homepage proof-state title; docs use the larger page-specific title scale.
- **Title** (500, `31px`, `1.1`): site section headings and app reading moments.
- **Body** (400, `13px`, `1.55`): app UI, controls, metadata, and compact status copy.
- **Reading** (400, `17px`, `1.65`): docs prose and explanatory site copy; keep paragraphs near 70ch.
- **Label** (500, `11px`, `.08em`): tags, file paths, commands, hunk labels, and navigation metadata.
**The Evidence Type Rule.** Serif explains the review; mono identifies its coordinates; sans carries the controls.
## Layout

The app is a full-height two-column desk: a persistent 280px file index beside a padded, scrollable diff pane, with a 58px context bar above it. The homepage is a full review artifact with a file context bar, 38% stage rail, centered proof body, and integrated inspect/mark/return/rereview rail; it is the explanation, not a detached hero, ledger, or screenshot gallery. The diff uses 16px breathing room, 16px file separation, sticky file heads, and compact 12px mono rows. At 701–980px the index contracts to 220px. At 700px and below the index becomes a drawer, the app bar becomes a 92px two-row action strip, and the homepage stage stacks rail over proof body with a 44px tab grid.

The site uses a centered container capped at 1180px with responsive inline padding (`18px` to `54px`). The homepage's install scene follows the artifact and keeps shell-neutral two-line commands in a bordered box; on mobile, a 58px sticky Install Loupe action remains available above the safe bottom edge. Docs uses a 220px sticky table of contents beside a 730px reading column; below 700px the docs index becomes a horizontally scrollable sticky strip. **The Artifact-First Rule.** The homepage review frame is the explanation: show the changing proof in context instead of a detached hero, ledger, or screenshot gallery. **The State Continuity Rule.** Keep inspect, mark, return, and rereview in one accessible document; animate with View Transitions when available and update immediately when reduced motion is requested.
## Elevation & Depth

Loupe is flat-by-default. Borders, tonal surfaces, sticky headers, and diff washes do the structural work; cards do not float on decorative shadows. Shadows are reserved for transient overlays: the mobile file drawer, review popover, update popover, and modal. The static site uses the same rule, with one restrained lightbox shadow for media focus.

**The Registration Rule.** A surface earns depth through a line, a wash, or a sticky relationship before it earns a shadow.
## Shapes

The app's shape language is gently compact: 7px is the default radius for buttons, file sections, pills, icon controls, and popovers; 8px is reserved for modals and larger feature surfaces. Supporting radii step down to 5px badges, 4px fields/keyboard keys, 3px filters, and 2px comment editors and inline marks. The marketing/docs site is intentionally more galley-like: proof panels, buttons, and registration rules are square, with color and line doing the rounding's job.

Inputs and controls use a one-pixel registration border. Focus is always a 2px Proof Blue outline with a 2px app offset or 3px site offset; accent border changes may supplement it but never replace it. Respect reduced motion by removing transitions and entrance animations.
## Components

### Buttons
- **Primary:** Vermilion fill, contrasting surface text, 7px corners, and compact `8px 13px` app padding. The site primary is the same accent fill with a square silhouette and a 42px minimum height.
- **Secondary:** Surface fill with a registration border, ink text, 7px corners, and `6px 11px` app padding. Use for cancel, approve, view toggles, and GitHub/outline actions; site outline buttons are square.
- **Hover / Focus:** Shift to documented accent-hover on primary; secondary takes the hover wash. Every button exposes the shared visible focus ring. Disabled primary controls use 50% opacity.
### Filter input
- **Style:** Full-width surface field in the file index, 1px border, 3px radius, `4px 8px` padding, DM Sans text.
- **Focus:** Remove the browser outline and shift the border to Vermilion Anchor while retaining the surrounding system focus behavior.
### File navigation
- **Style:** Ledger Surface column with 280px desktop width, 220px tablet width, nested 12px indentation, mono deltas, 17px change badges, and a 2px inset accent on the active file.
- **Behavior:** Filter and viewed-progress bar stay at the top; on mobile the index is a drawer with a dimmed backdrop and 44px row targets.
### Tags
- **Style:** Lowercase mono pills with 10px radius, 1px neutral border, and `3px 9px` padding. Selected tags use white text on semantic nit/issue/question/praise colors; tags retain text labels so color is not the only cue.
### Comment card
- **Style:** Exact-line anchored card with a Proof Blue border, surface fill, 7px radius, `8px 10px` padding, and max width 720px. Metadata is compact and muted; tag and status sit in the header.
- **States:** Editing shifts the border to Vermilion; addressed uses Proof Blue; resolved mutes opacity and border. Replies use a 2px left rule.
### Modal and popover
- **Style:** Surface background, one-pixel border, 8px modal radius, 7px popover radius, structured head/body/foot, and a restrained charcoal scrim. The compile, help, and What's New dialogs share this frame.
- **Behavior:** Keep review actions visible, allow scrolling inside long content, and preserve a 94vw mobile cap / 88vh max height.
### Diff proof
- **Style:** Border-framed file sections with sticky heads, hunk pills, 12px IBM Plex Mono rows, line-number gutters, and moss/oxide washes. Unified is the default; side-by-side keeps equal panes with independent horizontal strips.
- **Marking:** Bubble actions appear on row hover/focus; range anchors add a 3px Proof Blue gutter rule; word-level additions/deletions use inline moss/oxide marks.
### Homepage review frame
- **Style:** The full review artifact owns the viewport: a file context bar, integrated 38% stage rail, centered proof body, and a single-document state transformation. The rail carries the claim, context, and status; the body carries the changed line, anchored note, return bundle, or resolved response.
- **State rail:** Four accessible tabs are always present in order—inspect, mark, return, rereview—with `aria-selected`, roving tab focus, keyboard arrows/Home/End, and a live `1 of 4` status. Same-document View Transitions animate state changes when available; `prefers-reduced-motion` falls back to an immediate update.
- **Mobile:** Stack the rail above the proof, give each tab at least 44px, let code wrap, and keep the full-width sticky Install Loupe action at 58px. The split-aperture mark remains the 24px vermilion signature in the shell.
## Do's and Don'ts

### Do:
- **Do** keep code, line numbers, file paths, and comment anchors visually primary.
- **Do** use the documented light/dark semantic pair and preserve the same hierarchy in both modes.
- **Do** give touch targets at least 44px on mobile and keep focus visible for keyboard review.
- **Do** use borders and tonal washes for durable structure; reserve shadows for transient overlays.
- **Do** preserve the split-aperture mark, registration rules, and lowercase `loupe` wordmark.

### Don't:
- **Don't** reintroduce the discarded ADO/Claude-inspired themes or add novelty theme variants.
- **Don't** turn the review desk into a floating SaaS dashboard of cards and gradients.
- **Don't** use accent color as decoration when it could be an anchored action, active state, or proof mark.
- **Don't** rely on color alone for diff status, tags, focus, or comment state.
- **Don't** migrate legacy `claude` / `claude-dark` preference values into new visual roles; map them to light/dark only.
