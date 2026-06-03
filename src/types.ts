// shared contracts — the single source of truth for diff JSON, the .review file,
// and every API request/response body. nothing downstream redefines these shapes.

// ── diff ────────────────────────────────────────────────────────────────────

export type ChangeType = "added" | "modified" | "deleted" | "renamed";

export type LineType = "context" | "addition" | "deletion";

export interface DiffLine {
  type: LineType;
  oldLine: number | null; // null on additions
  newLine: number | null; // null on deletions
  content: string; // line text without the leading +/-/space marker
}

export interface DiffHunk {
  header: string; // e.g. "@@ -38,7 +38,9 @@"
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  oldPath: string | null; // prior path for renames, else null
  changeType: ChangeType;
  additions: number;
  deletions: number;
  binary?: boolean; // true for binary files; hunks is then empty
  hunks: DiffHunk[];
}

export interface DiffResult {
  ref: string; // human-readable ref label, e.g. "working tree" or "feature/x → origin/main"
  files: DiffFile[];
}

// ── review / comments ────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  file: string;
  line: number | null; // new-file line number (range START), or null for a file-level comment
  endLine?: number | null; // inclusive end of a multi-line range; absent/null/equal-to-line ⇒ single line
  lineContent: string | null; // raw diff line (with marker) the comment targets, null when file-level
  text: string;
  createdAt: string; // ISO 8601
}

export interface ReviewMeta {
  ref: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ReviewFile {
  meta: ReviewMeta;
  viewed: string[]; // file paths marked viewed
  comments: Comment[];
}

// ── api bodies ───────────────────────────────────────────────────────────────

// POST /api/comments — full replace of the comments array
export interface CommentsUpdateRequest {
  comments: Comment[];
}

// POST /api/viewed — full replace of the viewed array
export interface ViewedUpdateRequest {
  viewed: string[];
}

// GET /api/update — loupe's own release status vs its git origin
export interface UpdateStatus {
  behind: boolean; // true when a newer release tag exists on origin
  current: string; // installed version (loupe's package.json)
  latest: string; // highest available release tag (equals current when up to date)
  repoPath: string; // loupe's install dir, for the "cd … && git pull" hint
}

// error envelope returned with any non-2xx status
export interface ApiError {
  error: string;
}
