# Review an agent change with Loupe

This tutorial connects Claude Code to Loupe, returns one review comment, and verifies the fix.

![Loupe and Claude Code review walkthrough](screenshots/agent-review-walkthrough.gif)

[Watch the MP4](screenshots/agent-review-walkthrough.mp4) or [WebM](screenshots/agent-review-walkthrough.webm).

## Install the Claude Code integration

Run these commands from the Loupe repository root:

```text
bun install
bun link
claude plugin marketplace add .
claude plugin install loupe-review@loupe-local --scope user
```

Start a new Claude Code session or run `/reload-plugins`. Confirm that `loupe --version` works in the same shell. If Claude reports that the MCP server is unavailable, rerun `bun link`, restart the shell, and start a fresh Claude session.

## Open the review

Start Claude Code inside the Git repository containing the change, then ask:

```text
Review my current changes with Loupe.
```

Claude starts the local Review Session and yields. Loupe opens the exact Git comparison in your browser.

## Return feedback

Add line- or file-level comments, open **Review**, and choose **Return Feedback**. Return to Claude Code and say:

```text
continue
```

Claude retrieves the structured feedback, edits the repository, replies to the comments, marks them addressed, and requests rereview.

## Verify and approve

Choose **Re-run the diff** in Loupe. Read the agent's reply and the updated code, then resolve or reopen each thread. Choose **Approve** when the change is ready.

Review Records remain under `~/.loupe/reviews/`, so closing the browser or agent session does not discard the review.
