---
target: docs site AI-generated appearance
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
timestamp: 2026-08-30T01-44-10Z
slug: site-index-html
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3/4 | Active nav and mode are clear, but the page itself has no progress story. |
| 2 | Match with the real world | 3/4 | The proof metaphor fits, but Git terminology assumes fluency. |
| 3 | User control and freedom | 2/4 | Navigation exists, but there is no persistent next action or guided journey. |
| 4 | Consistency and standards | 3/4 | Cohesive, but repeated faux-editorial framing feels generated. |
| 5 | Error prevention | 2/4 | Install commands lack copy affordances and contextual caveats. |
| 6 | Recognition over recall | 2/4 | Visitors reconstruct the workflow from scattered prose and artifacts. |
| 7 | Flexibility and efficiency | n/a | Not applicable to this Persuade surface. |
| 8 | Aesthetic and minimalist design | 3/4 | Restrained, but repetitive sections create sameness rather than pacing. |
| 9 | Error recovery | 2/4 | No fallback story for failed media or installation problems. |
| 10 | Help and documentation | n/a | Detailed docs are a separate linked surface. |
| **Total** |  | **20/32** | **Acceptable; significant improvement needed** |

## Design Specificity Verdict

The styling is authored, but the composition remains a category-interchangeable developer landing page: oversized editorial headline, product mockup, repeated heading-plus-label-plus-border sections, feature ledger, terminal, screenshots, and insider-joke footer. Proof desk became a palette and collection of motifs rather than a product-specific experience.

The deterministic detector found one advisory em-dash warning in `site/index.html`, but degraded parsers prevented selector, custom-property, and contrast analysis. The warning is mostly a false positive. Mutable browser injection was unavailable, so no reliable overlay was presented.

## Overall Impression

The page looks polished enough to pass a screenshot review and generic enough to fail a memory test. Its biggest opportunity is to make Loupe's actual transformation—exact line annotation into agent feedback and rereview—the page itself.

## What's Working

- The split-aperture mark, registration lines, diff washes, and restrained palette are coherent.
- The first diff/comment example communicates anchored feedback quickly.
- The type system fits the editorial/code premise without rounded-dashboard styling.

## Priority Issues

### [P1] The metaphor is stronger than the product proof

Make the first viewport a connected state transformation: selected line, anchored comment, structured feedback, agent response, refreshed proof.

### [P1] Repetition makes the page feel templated

Remove most `@@` labels, collapse the ledger, and create materially different scenes instead of repeating the same bordered treatment.

### [P1] There is no explicit workflow spine

Turn the review loop into four concrete states with one visible outcome per state, then place installation after the demonstrated payoff.

### [P2] Mobile is a scaled desktop proof

Use mobile-specific crops, a short copyable install command, and a persistent bottom action.

### [P2] The visual language is category-adjacent

Invest in Loupe-specific file-tree context, line anchors, review-state transitions, durable local records, and the return-to-agent moment.

## Persona Red Flags

- **Jordan:** Git terminology is unexplained and Get started does not identify the next step.
- **Riley:** Static examples imply capability without failure, empty, or unavailable-repository states.
- **Casey:** Actions remain at the top, screenshots are illegible, commands scroll, and the page is too long.

## Minor Observations

- Mode is ambiguous as an action label.
- The footer joke is not a satisfying close.
- Hidden and visible `h1` structure is awkward.
- Autoplay video competes with the narrative.
- Lazy screenshots can initially appear blank.

## Questions to Consider

- Why can visitors not watch the proof mark become agent-ready feedback?
- Does proof desk describe behavior or only styling?
- What remains unmistakably Loupe when faux-diff cues disappear?
