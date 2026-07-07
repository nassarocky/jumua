import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseSearchHistory,
  recordSearchTerm,
  SEARCH_HISTORY_STORAGE_KEY,
  SearchHistoryEntry,
} from '@utils/search-history';

export const useSearchHistory = () => {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)
      .then(stored => {
        setEntries(parseSearchHistory(stored));
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    AsyncStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isHydrated]);

  const recordSearch = useCallback((term: string) => {
    setEntries(current => recordSearchTerm(current, term));
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    frequentSearches: entries,
    recordSearch,
    clearHistory,
    isHydrated,
  };
};
