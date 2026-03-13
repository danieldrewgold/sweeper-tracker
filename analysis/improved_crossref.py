"""Improved cross-reference with better street name normalization."""
import json
import pandas as pd
import re
from collections import defaultdict
import sys
sys.path.insert(0, '.')
from analysis.sweep_ticket_crossref import parse_violation_time

TICKET_COUNTY_TO_BORO = {
    'NY': '1', 'MN': '1', 'BX': '2', 'BRONX': '2',
    'K': '3', 'BK': '3', 'KINGS': '3',
    'Q': '4', 'QN': '4', 'QNS': '4',
    'R': '5', 'ST': '5', 'RICH': '5',
}

def normalize_v3(name):
    if not name:
        return ''
    name = str(name).upper().strip()
    name = re.sub(r'\s+', ' ', name)

    # Strip "W/S of", "E/S of", "N/S of" prefixes (ticket-writer shorthand)
    name = re.sub(r'^[NESW]/S\s+OF\s+', '', name)

    # Remove ordinal suffixes: 89TH -> 89, 3RD -> 3, 42ND -> 42, 1ST -> 1
    name = re.sub(r'(\d+)(ST|ND|RD|TH)\b', r'\1', name)

    # Expand directional prefixes (E -> EAST, W -> WEST)
    name = re.sub(r'^E\s', 'EAST ', name)
    name = re.sub(r'^W\s', 'WEST ', name)
    name = re.sub(r'^N\s', 'NORTH ', name)
    name = re.sub(r'^S\s', 'SOUTH ', name)

    # Full words to abbreviations (applied to ALL words, including suffixes)
    replacements = {
        'STREET': 'ST', 'AVENUE': 'AVE', 'BOULEVARD': 'BLVD',
        'DRIVE': 'DR', 'PLACE': 'PL', 'ROAD': 'RD',
        'LANE': 'LN', 'COURT': 'CT', 'TERRACE': 'TER',
        'PARKWAY': 'PKWY', 'EXPRESSWAY': 'EXPY',
        'CONCOURSE': 'CONC', 'TURNPIKE': 'TPKE',
        'HIGHWAY': 'HWY',
        # Directional suffixes — CSCL uses abbreviated form
        'NORTH': 'N', 'SOUTH': 'S', 'EAST': 'E', 'WEST': 'W',
    }
    words = name.split()
    out = []
    for i, w in enumerate(words):
        if w in replacements:
            # Don't abbreviate directionals at position 0 (already expanded above)
            if i == 0 and w in ('NORTH', 'SOUTH', 'EAST', 'WEST'):
                out.append(w)
            else:
                out.append(replacements[w])
        else:
            out.append(w)
    name = ' '.join(out)

    name = re.sub(r'\bPKY\b', 'PKWY', name)

    # Common CSCL spelling mismatches
    # Mc/Mac compounds: tickets merge, CSCL uses space
    # Only split if followed by consonant cluster typical of Scottish/Irish names
    name = re.sub(r'\bMAC(D[AO]|K[AE]|D[OU])', r'MAC \1', name)  # MACDONOUGH -> MAC DONOUGH
    name = re.sub(r'\bMC(K[I]|D[O]|G[AEIO])', r'MC \1', name)    # MCKIBBIN -> MC KIBBIN
    # Compound words CSCL splits
    name = re.sub(r'\bOCEANVIEW\b', 'OCEAN VIEW', name)
    # HEIGHTS -> HTS
    name = re.sub(r'\bHEIGHTS\b', 'HTS', name)
    # Beach -> BCH (Queens beach streets)
    name = re.sub(r'^BEACH\b', 'BCH', name)
    # Plurals: RAYMONDS -> RAYMOND, etc
    name = re.sub(r'RAYMONDS\b', 'RAYMOND', name)
    # 6 AVE / 6TH AVE in Manhattan = AVE OF THE AMERICAS in CSCL
    # (handled by fallback matching, not here — too specific)

    # Handle truncated ticket names: if name ends mid-word with a common
    # suffix pattern, try to complete it
    # e.g. "BOULEVAR" -> "BLVD", "PARKWA" -> "PKWY", "AVENU" -> "AVE"
    truncation_fixes = {
        r'BOULE[VARD]*$': 'BLVD',
        r'PARKWA[Y]?$': 'PKWY',
        r'AVEN[UE]*$': 'AVE',
        r'STREE[T]?$': 'ST',
        r'\bSTR$': 'ST',
        r'DRI[VE]*$': 'DR',
        r'PLAC[E]?$': 'PL',
        r'TERRAC[E]?$': 'TER',
        r'EXPRESSWA[Y]?$': 'EXPY',
    }
    for pattern, repl in truncation_fixes.items():
        name = re.sub(pattern, repl, name)

    name = re.sub(r'\s+', ' ', name).strip()
    return name


def main():
    # Load data
    print('Loading data...')
    with open('sweep_data/tickets_street_cleaning.json') as f:
        tickets = pd.DataFrame(json.load(f))
    with open('sweep_data/cscl_centerline.json') as f:
        cscl = pd.DataFrame(json.load(f))
    with open('sweep_data/sweep_gps_data.json') as f:
        sweeps = pd.DataFrame(json.load(f))

    tickets['issue_date_parsed'] = pd.to_datetime(tickets['issue_date'], errors='coerce')
    sweeps['ts'] = pd.to_datetime(sweeps['date_visited'], errors='coerce')

    # Build improved CSCL lookup using both name columns
    cscl['_norm'] = cscl['full_street_name'].apply(normalize_v3)
    cscl['_norm2'] = cscl['stname_label'].apply(normalize_v3)
    cscl['_boro'] = cscl['boroughcode'].astype(str).str.strip()

    lookup = defaultdict(list)
    for _, row in cscl.iterrows():
        pid = row.get('physicalid')
        if not pid:
            continue
        boro = row['_boro']

        low, high = None, None
        for side in ['l', 'r']:
            lo_raw = row.get(f'{side}_low_hn')
            hi_raw = row.get(f'{side}_high_hn')
            if lo_raw and hi_raw:
                try:
                    lo = int(re.match(r'(\d+)', str(lo_raw)).group(1))
                    hi = int(re.match(r'(\d+)', str(hi_raw)).group(1))
                    if low is None or lo < low:
                        low = lo
                    if high is None or hi > high:
                        high = hi
                except Exception:
                    pass

        entry = {'physical_id': pid, 'addr_low': low, 'addr_high': high}
        for norm in [row['_norm'], row['_norm2']]:
            if norm:
                lookup[(norm, boro)].append(entry)

    print(f'CSCL lookup keys: {len(lookup):,}')

    # Match tickets to segments
    def match_v3(ticket):
        street = normalize_v3(ticket.get('street_name', ''))
        county = str(ticket.get('violation_county', '')).upper().strip()
        boro = TICKET_COUNTY_TO_BORO.get(county, '')
        house = None
        hn = ticket.get('house_number')
        if hn:
            m = re.match(r'(\d+)', str(hn).strip())
            if m:
                house = int(m.group(1))

        if not street:
            return None

        segs = lookup.get((street, boro), [])

        # Try truncated match (ticket names cut at char limit)
        if not segs and len(street) >= 15:
            for key in lookup:
                if key[1] == boro and key[0].startswith(street):
                    segs = lookup[key]
                    break

        if not segs:
            return None

        if house is not None:
            for seg in segs:
                if seg['addr_low'] is not None and seg['addr_high'] is not None:
                    if seg['addr_low'] <= house <= seg['addr_high']:
                        return seg['physical_id']

        return segs[0]['physical_id'] if segs else None

    print('Matching tickets to segments...')
    matched = 0
    tickets['physical_id'] = None
    for idx, row in tickets.iterrows():
        pid = match_v3(row.to_dict())
        if pid:
            tickets.at[idx, 'physical_id'] = pid
            matched += 1
        if (idx + 1) % 50000 == 0:
            print(f'  {idx+1:,} processed, {matched:,} matched')

    print(f'Total matched: {matched:,} / {len(tickets):,} ({matched/len(tickets)*100:.1f}%)')
    print()

    # Build sweep index
    sweep_dates = set(sweeps['ts'].dt.date.dropna())
    sweep_index = defaultdict(list)
    for _, row in sweeps.iterrows():
        pid = str(row['physical_id']).strip()
        ts = row['ts']
        if pd.notna(ts):
            sweep_index[(pid, ts.date())].append(ts)

    swept_segments = set(sweeps['physical_id'].astype(str).unique())

    # Filter tickets: matched + on covered dates
    valid = tickets[
        (tickets['physical_id'].notna()) &
        (tickets['issue_date_parsed'].dt.date.isin(sweep_dates))
    ].copy()
    print(f'Tickets matched + on covered dates: {len(valid):,}')

    # Cross-reference
    before, after, same, no_sweep, no_seg, bad = 0, 0, 0, 0, 0, 0
    after_mins = []

    for _, row in valid.iterrows():
        pid = str(row['physical_id']).strip()
        if pid not in swept_segments:
            no_seg += 1
            continue

        ticket_date = row['issue_date_parsed'].date()
        hour, minute = parse_violation_time(row.get('violation_time'))
        if hour is None:
            bad += 1
            continue

        sweep_times = sweep_index.get((pid, ticket_date), [])
        if not sweep_times:
            no_sweep += 1
            continue

        ticket_time = pd.to_datetime(f'{ticket_date} {hour:02d}:{minute:02d}')
        closest = min(sweep_times, key=lambda s: abs((s - ticket_time).total_seconds()))
        diff = (ticket_time - closest).total_seconds() / 60

        if abs(diff) <= 15:
            same += 1
        elif diff > 0:
            after += 1
            after_mins.append(diff)
        else:
            before += 1

    total_compared = before + after + same
    total_on_known = total_compared + no_sweep

    print()
    print('=' * 60)
    print('IMPROVED CROSS-REFERENCE (v3 normalization)')
    print('=' * 60)
    print(f'Tickets on known-swept segments:   {total_on_known:,}')
    print(f'  Sweep found same day:            {total_compared:,} ({total_compared/max(1,total_on_known)*100:.1f}%)')
    print(f'  No sweep that day:               {no_sweep:,} ({no_sweep/max(1,total_on_known)*100:.1f}%)')
    print(f'  Segment not in sweep data:       {no_seg:,}')
    print()
    if total_compared:
        print(f'Timing breakdown ({total_compared:,} tickets):')
        print(f'  BEFORE sweep:  {before:,} ({before/total_compared*100:.1f}%)')
        print(f'  SAME TIME:     {same:,} ({same/total_compared*100:.1f}%)')
        print(f'  AFTER sweep:   {after:,} ({after/total_compared*100:.1f}%)')
        if after_mins:
            avg = sum(after_mins) / len(after_mins)
            med = sorted(after_mins)[len(after_mins) // 2]
            print(f'  Avg after:     {avg:.0f} min')
            print(f'  Median after:  {med:.0f} min')


if __name__ == '__main__':
    main()
