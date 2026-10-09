const HISTORY_KEY = "promptly-bi-history-v1";
const MAX_HISTORY_ITEMS = 10;

function getStorage(storage) {
  return storage || globalThis.localStorage;
}

function validateHistory(data) {
  if (!Array.isArray(data)) {
    throw new Error("Saved prompt history has an invalid format.");
  }
  return data.filter((item) =>
    item &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.prompt === "string" &&
    typeof item.savedAt === "string" &&
    item.formData &&
    typeof item.formData === "object"
  );
}

function readHistory(storage) {
  try {
    const store = getStorage(storage);
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return { items: [], error: null };
    const parsed = JSON.parse(raw);
    const items = validateHistory(parsed);
    return { items, error: items.length === parsed.length ? null : "Some invalid saved prompts were skipped." };
  } catch (error) {
    return { items: [], error: `Could not read prompt history: ${error.message}` };
  }
}

function writeHistory(items, storage) {
  try {
    const store = getStorage(storage);
    store.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: `Could not save prompt history: ${error.message}` };
  }
}

function saveHistoryItem(item, storage) {
  const history = readHistory(storage);
  if (history.error && history.items.length === 0) {
    return { ok: false, error: history.error };
  }
  const items = [item, ...history.items.filter((saved) => saved.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
  const result = writeHistory(items, storage);
  return { ...result, items };
}

function deleteHistoryItem(id, storage) {
  const history = readHistory(storage);
  if (history.error && history.items.length === 0) {
    return { ok: false, error: history.error };
  }
  const items = history.items.filter((item) => item.id !== id);
  const result = writeHistory(items, storage);
  return { ...result, items };
}

function clearHistory(storage) {
  const result = writeHistory([], storage);
  return { ...result, items: [] };
}

export { HISTORY_KEY, MAX_HISTORY_ITEMS, clearHistory, deleteHistoryItem, readHistory, saveHistoryItem };
