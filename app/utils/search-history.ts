export type SearchHistoryEntry = {
  term: string;
  count: number;
  lastSearchedAt: number;
};

export const SEARCH_HISTORY_STORAGE_KEY = 'search_history';
export const MAX_SEARCH_HISTORY = 12;
export const MIN_SEARCH_TERM_LENGTH = 2;

export const normalizeSearchTerm = (term: string): string =>
  term.trim().toLowerCase();

export const recordSearchTerm = (
  entries: SearchHistoryEntry[],
  term: string,
): SearchHistoryEntry[] => {
  const trimmed = term.trim();
  if (trimmed.length < MIN_SEARCH_TERM_LENGTH) {
    return entries;
  }

  const normalized = normalizeSearchTerm(trimmed);
  const now = Date.now();
  const existing = entries.find(
    entry => normalizeSearchTerm(entry.term) === normalized,
  );

  const updated = existing
    ? entries.map(entry =>
        normalizeSearchTerm(entry.term) === normalized
          ? {
              ...entry,
              term: trimmed,
              count: entry.count + 1,
              lastSearchedAt: now,
            }
          : entry,
      )
    : [{ term: trimmed, count: 1, lastSearchedAt: now }, ...entries];

  return updated
    .sort(
      (a, b) =>
        b.count - a.count || b.lastSearchedAt - a.lastSearchedAt,
    )
    .slice(0, MAX_SEARCH_HISTORY);
};

export const parseSearchHistory = (stored: string | null): SearchHistoryEntry[] => {
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is SearchHistoryEntry =>
          typeof entry?.term === 'string' &&
          typeof entry?.count === 'number' &&
          typeof entry?.lastSearchedAt === 'number',
      )
      .sort(
        (a, b) =>
          b.count - a.count || b.lastSearchedAt - a.lastSearchedAt,
      )
      .slice(0, MAX_SEARCH_HISTORY);
  } catch {
    return [];
  }
};
