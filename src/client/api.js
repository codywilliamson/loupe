// thin fetch wrappers around the loupe server api. all json.

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

// DiffResult
export function getDiff() {
  return getJson("/api/diff");
}

// ReviewFile, normalizing the empty {} into a usable shape.
export async function getComments() {
  const data = await getJson("/api/comments");
  if (!data || !data.comments) return { viewed: [], comments: [] };
  return { viewed: data.viewed ?? [], comments: data.comments ?? [] };
}

// full replace of the comments array; returns updated ReviewFile.
export function saveComments(comments) {
  return postJson("/api/comments", { comments });
}

// full replace of the viewed array; returns updated ReviewFile.
export function saveViewed(viewed) {
  return postJson("/api/viewed", { viewed });
}

// { prompt: string }
export function compile() {
  return getJson("/api/compile");
}

// UpdateStatus — loupe's release status vs origin
export function getUpdate() {
  return getJson("/api/update");
}

// { path, content } — new-side full content of a file, for markdown preview.
export function getFile(path) {
  return getJson(`/api/file?path=${encodeURIComponent(path)}`);
}
