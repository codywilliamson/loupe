# Store keyed Review Records outside repositories

Loupe will store authoritative Review Records under a per-user data location keyed by review ID rather than treating a repository-local `.review` file as session identity. Records preserve review activity, comments, replies, and outcomes; agents may mark comments addressed, but reviewers own resolution and approval. Project files remain available as explicit import/export artifacts so manual and portable workflows survive without coupling concurrent agent tasks to one working-directory file. Approved and cancelled records remain local until explicitly deleted; Loupe does not silently clean up review history.

Existing `.review` files remain untouched when discovered. Loupe prompts the reviewer to import the legacy record or remove it with explicit confirmation; it never migrates or deletes one automatically.
