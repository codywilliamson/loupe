# Use MCP for agents and CLI/browser for humans

Loupe's versioned review model is the product contract. MCP is the standard agent-facing port, while the CLI and browser remain first-class ports for manual review, deterministic automation, unsupported agents, and copy/paste exports. Skills, plugins, and hooks stay thin: they provide agent-specific session context and enforce the configured Review Policy without moving provider-specific behavior into Loupe's core.

The first MCP interface is six actions: start and inspect a review, reply to and mark comments addressed, request rereview after changes, and cancel. Approval, comment resolution, and reopening remain reviewer-only browser actions so an agent can report its work without accepting its own changes.

The first integration milestone ships Codex and Claude Code adapters. Additional agents wait until the shared MCP interface has been exercised in both clients.

Agent adapters launch reviews explicitly by default. Their installers may offer optional completion hooks, but hooks are never silently enabled. Every Review Session targets an explicit Git comparison; agent context is supporting provenance and does not redefine or infer which edits belong to an agent.

Required review uses a resumable hold rather than a long-running MCP request or model polling loop: the agent launches Loupe, yields its turn, and checks the durable Review Record when the user resumes it. An explicit user instruction may override that hold to handoff without changing the review outcome. MCP Tasks may enhance automatic resumption later when both supported clients negotiate the extension, but are not required for correctness.

Returning feedback requires an unresolved Review Comment and may include a Review Summary. Agent adapters consume the structured Feedback Bundle; manual reviewers use explicit JSON or Markdown copy actions. Approval with unresolved comments is allowed after a warning because reviewer authority, not comment state, determines the outcome.
