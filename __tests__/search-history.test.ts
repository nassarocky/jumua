import { recordSearchTerm } from '../app/utils/search-history';

describe('search history utils', () => {
  it('adds a new search term', () => {
    const result = recordSearchTerm([], 'router');
    expect(result).toHaveLength(1);
    expect(result[0].term).toBe('router');
    expect(result[0].count).toBe(1);
  });

  it('increments count for repeated searches', () => {
    const first = recordSearchTerm([], 'router');
    const second = recordSearchTerm(first, 'router');
    expect(second[0].count).toBe(2);
  });

  it('sorts by frequency', () => {
    let entries = recordSearchTerm([], 'phone');
    entries = recordSearchTerm(entries, 'router');
    entries = recordSearchTerm(entries, 'router');

    expect(entries[0].term).toBe('router');
    expect(entries[1].term).toBe('phone');
  });

  it('ignores very short terms', () => {
    expect(recordSearchTerm([], 'a')).toEqual([]);
  });
});
