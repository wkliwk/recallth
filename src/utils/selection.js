// Selection helpers for the Cabinet list's select mode. Selections are plain arrays of ids.

export function toggleId(selected, id) {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
}

export function selectAllIds(visibleIds) {
  return [...new Set(visibleIds)]
}

// Keep only ids that are still visible (e.g. after a search/filter change) so "Delete" never acts on hidden items.
export function pruneSelection(selected, visibleIds) {
  const visible = new Set(visibleIds)
  const next = selected.filter((id) => visible.has(id))
  return next.length === selected.length ? selected : next
}

export function allSelected(selected, visibleIds) {
  return visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))
}

// First `max` names and how many more there are, for the confirmation dialog.
export function summarizeNames(names, max = 5) {
  return { shown: names.slice(0, max), more: Math.max(0, names.length - max) }
}
