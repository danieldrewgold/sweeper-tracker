/** CSCL abbreviations → the full words the ASP signs dataset uses */
export const STREET_ABBREVIATIONS: Record<string, string> = {
  'W': 'WEST', 'E': 'EAST', 'N': 'NORTH', 'S': 'SOUTH',
  'ST': 'STREET', 'AVE': 'AVENUE', 'BLVD': 'BOULEVARD',
  'DR': 'DRIVE', 'PL': 'PLACE', 'RD': 'ROAD', 'LN': 'LANE', 'CT': 'COURT',
  'HTS': 'HEIGHTS',
};

/** "ST MARK'S AVENUE" / "ST MARKS AVE" → ["STREET", "MARKS", "AVENUE"]. Both datasets
 *  go through the same expansion, so "ST" (Saint) lines up on either side. */
export function streetTokens(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/['.]/g, '')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => STREET_ABBREVIATIONS[w] || w);
}

export type StreetMatch = 'exact' | 'loose' | null;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does an ASP street name refer to the CSCL street?
 * - 'exact': same words after normalizing ("RIDGE ST" vs "RIDGE STREET")
 * - 'loose': CSCL words appear in order, each starting a word or running straight on from
 *   the previous one, numbers whole ("MARTIN L KING JR BLVD" vs "MARTIN LUTHER KING JR
 *   BOULEVARD", "MC DONALD AVE" vs "MCDONALD AVENUE")
 * - null: different street. SODA LIKE has no word boundaries, so '%RIDGE%STREET%'
 *   returns ELDRIDGE STREET and '%6%STREET%' returns 16/46/56 STREET; this rejects them.
 */
export function matchStreet(csclName: string, aspName: string): StreetMatch {
  const want = streetTokens(csclName);
  const have = streetTokens(aspName).join(' ');
  if (want.length === 0 || !have) return null;
  if (want.join(' ') === have) return 'exact';

  const pattern = want
    .map((t, i) => {
      const body = escapeRegex(t) + (/\d$/.test(t) ? '(?!\\d)' : '');
      return i === 0 ? `(?:^|\\s)${body}` : `(?:\\s*|.*\\s)${body}`;
    })
    .join('');
  return new RegExp(pattern).test(have) ? 'loose' : null;
}

const MATCH_RANK: Record<string, number> = { exact: 2, loose: 1 };
const rank = (m: StreetMatch) => (m ? MATCH_RANK[m] : 0);

/** Keep items scoring 'exact' if there are any, otherwise the 'loose' ones */
function keepBest<T>(items: T[], score: (item: T) => number): T[] {
  const scored = items.map((item) => ({ item, s: score(item) }));
  const best = Math.max(0, ...scored.map((x) => x.s));
  return best === 0 ? [] : scored.filter((x) => x.s === best).map((x) => x.item);
}

interface SignStreets {
  on_street: string;
  from_street: string;
  to_street: string;
}

/**
 * Narrow ASP rows returned by a LIKE query to the ones on our block.
 * requireBoth: both cross streets must match (either direction); otherwise one is enough.
 * Rows naming the street exactly win over loose matches (e.g. "12 ST" vs "EAST 12 STREET").
 */
export function filterSignsForBlock<T extends SignStreets>(
  signs: T[],
  onStreet: string,
  crossStreets?: [string, string],
  requireBoth = true,
): T[] {
  return keepBest(signs, (s) => {
    const on = rank(matchStreet(onStreet, s.on_street || ''));
    if (!on || !crossStreets) return on;

    const [a, b] = crossStreets;
    const fromA = !!matchStreet(a, s.from_street || '');
    const fromB = !!matchStreet(b, s.from_street || '');
    const toA = !!matchStreet(a, s.to_street || '');
    const toB = !!matchStreet(b, s.to_street || '');
    const onBlock = requireBoth ? (fromA && toB) || (fromB && toA) : fromA || fromB || toA || toB;
    return onBlock ? on : 0;
  });
}
