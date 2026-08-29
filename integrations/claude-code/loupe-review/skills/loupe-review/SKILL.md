---
name: loupe-review
description: Start and continue an explicit Loupe review through the local MCP server.
---

# Loupe review

Use Loupe when the user explicitly asks to review a Git comparison. For current changes, call `start_review` with the exact working directory and ref `working`. Use `staged`, a branch, or a range only when the user requests that comparison. Then honor the Review Policy. For `required`, yield the turn at the Review Hold; when the user resumes, call `get_review` once.

Apply each returned Review Comment, reply with what changed, mark it addressed, and call `request_rereview`. The reviewer alone approves, resolves, or reopens comments. A direct user instruction to continue without waiting overrides only the Review Hold; it does not change the Review Outcome.

The optional completion hook beside this skill is documentation only and is not enabled by default.
