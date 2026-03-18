"""
SweepTracker — Ticket vs. Sweep Cross-Reference Analysis
==========================================================
Joins three NYC Open Data datasets to answer:
  1. Are tickets being written BEFORE or AFTER the sweeper passes?
  2. Which blocks get ticketed but rarely swept (enforcement without cleaning)?
  3. Which blocks get swept but rarely ticketed (cleaning without enforcement)?
  4. Do double-sweeps correlate with more late-window tickets?

DATA ARCHITECTURE:
  ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
  │  Parking Tickets │     │  CSCL Centerline  │     │  SweepNYC GPS   │
  │  (pvqr-7yc4)    │     │  (3mf9-qshr)      │     │  (c23c-uwsm)    │
  │                  │     │                    │     │                 │
  │  street_name     │◄───►│  full_stree        │     │  physical_id    │
  │  house_number    │     │  l/r_low/high_hn   │◄───►│  last_cleaned   │
  │  violation_time  │     │  physical_id       │     │                 │
  │  issue_date      │     │  borocode          │     │                 │
  │  violation_county│     │                    │     │                 │
  └─────────────────┘     └──────────────────────┘     └─────────────────┘

  Join path: Ticket → (street_name + house_number + borough) → CSCL → physical_id → Sweep

REQUIREMENTS:
  pip install pandas requests sodapy tqdm

USAGE:
  # Step 1: Download the data (takes a while)
  python sweep_ticket_crossref.py --download

  # Step 2: Run the analysis
  python sweep_ticket_crossref.py --analyze

  # Or do both:
  python sweep_ticket_crossref.py --download --analyze
"""

import pandas as pd
import requests
import json
import os
import re
import argparse
from datetime import datetime, timedelta
from collections import defaultdict

# ── Config ──────────────────────────────────────────────────────────
DATA_DIR = "sweep_data"
OUTPUT_DIR = "sweep_analysis_output"
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Socrata API base
SOCRATA_BASE = "https://data.cityofnewyork.us/resource"

# Dataset IDs
TICKETS_DATASET = "pvqr-7yc4"       # Parking Violations FY2026
SWEEP_DATASET = "c23c-uwsm"          # SweepNYC Street Cleaning
CSCL_DATASET = "inkn-q76z"           # NYC Street Centerline (same as app uses)

VIOLATION_CODE_STREET_CLEANING = "21"

# Borough mappings between datasets
TICKET_COUNTY_TO_BORO = {
    'NY': '1', 'MN': '1',            # Manhattan
    'BX': '2',                         # Bronx
    'K': '3', 'BK': '3', 'KINGS': '3',  # Brooklyn
    'Q': '4', 'QN': '4', 'QNS': '4',    # Queens
    'R': '5', 'ST': '5',              # Staten Island
}

BORO_NAMES = {
    '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn',
    '4': 'Queens', '5': 'Staten Island'
}


# ═══════════════════════════════════════════════════════════════════
# DATA DOWNLOAD
# ═══════════════════════════════════════════════════════════════════

def fetch_paginated(dataset_id, params_base, max_records=200000, batch_size=50000):
    """Paginate through Socrata API."""
    all_records = []
    offset = 0
    while offset < max_records:
        params = {**params_base, "$limit": batch_size, "$offset": offset}
        url = f"{SOCRATA_BASE}/{dataset_id}.json"
        print(f"  Fetching batch at offset {offset}...")
        try:
            resp = requests.get(url, params=params, timeout=120)
            resp.raise_for_status()
            batch = resp.json()
        except Exception as e:
            print(f"  ERROR: {e}")
            break
        if not batch:
            break
        all_records.extend(batch)
        print(f"  → {len(batch)} records (total: {len(all_records)})")
        if len(batch) < batch_size:
            break
        offset += batch_size
    return all_records


def download_tickets():
    """Download street cleaning tickets (violation code 21)."""
    print("\n" + "=" * 60)
    print("DOWNLOADING STREET CLEANING TICKETS")
    print("=" * 60)
    params = {
        "$where": f"violation_code='{VIOLATION_CODE_STREET_CLEANING}'",
        "$order": "issue_date DESC",
        "$select": ",".join([
            "summons_number", "issue_date", "violation_time",
            "violation_code", "violation_precinct", "violation_county",
            "house_number", "street_name", "intersecting_street",
            "days_parking_in_effect", "from_hours_in_effect",
            "to_hours_in_effect", "issuer_precinct", "issuer_command"
        ]),
    }
    records = fetch_paginated(TICKETS_DATASET, params, max_records=300000)
    path = os.path.join(DATA_DIR, "tickets_street_cleaning.json")
    with open(path, 'w') as f:
        json.dump(records, f)
    print(f"✓ Saved {len(records):,} tickets to {path}")
    return records


def download_sweep_data():
    """Download SweepNYC street cleaning GPS data (historical sweep records)."""
    print("\n" + "=" * 60)
    print("DOWNLOADING SWEEPNYC HISTORICAL SWEEP RECORDS")
    print("=" * 60)
    # This dataset contains historical sweep records with physical_id
    # and timestamp of when each street segment was visited.
    # (The app also uses a separate live feed for real-time updates,
    # but this Open Data endpoint is the source for historical analysis.)
    params = {"$limit": 5}
    url = f"{SOCRATA_BASE}/{SWEEP_DATASET}.json"
    print("  Fetching sample to check schema...")
    try:
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        sample = resp.json()
        print(f"  Schema sample: {json.dumps(sample[0], indent=2) if sample else 'EMPTY'}")
        # Save the column names for reference
        if sample:
            print(f"  Columns: {list(sample[0].keys())}")
    except Exception as e:
        print(f"  ERROR fetching sample: {e}")
        return []

    # Now fetch all records
    records = fetch_paginated(SWEEP_DATASET, {}, max_records=500000)
    path = os.path.join(DATA_DIR, "sweep_gps_data.json")
    with open(path, 'w') as f:
        json.dump(records, f)
    print(f"✓ Saved {len(records):,} sweep records to {path}")
    return records


def download_cscl():
    """
    Download CSCL centerline data (the bridge between datasets).
    We need: physical_id, full_stree (street name), address ranges, borocode.
    This is a large dataset — we only need specific columns.
    """
    print("\n" + "=" * 60)
    print("DOWNLOADING CSCL CENTERLINE (LOOKUP TABLE)")
    print("=" * 60)

    # First check the schema
    params = {"$limit": 5}
    url = f"{SOCRATA_BASE}/{CSCL_DATASET}.json"
    print("  Fetching sample to check schema...")
    try:
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
        sample = resp.json()
        if sample:
            print(f"  Columns: {list(sample[0].keys())}")
            print(f"  Sample: {json.dumps(sample[0], indent=2)[:500]}")
    except Exception as e:
        print(f"  ERROR: {e}")
        print("  NOTE: CSCL may need to be downloaded as CSV from:")
        print("  https://data.cityofnewyork.us/City-Government/Centerline/3mf9-qshr")
        return []

    # Try to select just the columns we need
    # CSCL column names may vary — common ones:
    # physicalid, full_stree, st_name, l_low_hn, l_high_hn, r_low_hn, r_high_hn, borocode
    try:
        params_full = {
            "$select": "physicalid,full_street_name,stname_label,l_low_hn,l_high_hn,r_low_hn,r_high_hn,boroughcode",
        }
        records = fetch_paginated(CSCL_DATASET, params_full, max_records=200000)
    except Exception:
        print("  Column select failed, trying without $select...")
        records = fetch_paginated(CSCL_DATASET, {}, max_records=200000)

    path = os.path.join(DATA_DIR, "cscl_centerline.json")
    with open(path, 'w') as f:
        json.dump(records, f)
    print(f"✓ Saved {len(records):,} CSCL records to {path}")
    return records


# ═══════════════════════════════════════════════════════════════════
# DATA PARSING & CLEANING
# ═══════════════════════════════════════════════════════════════════

def parse_violation_time(time_str):
    """Parse '0830A' → (8, 30) or '0245P' → (14, 45)."""
    if not time_str or len(str(time_str)) < 5:
        return None, None
    time_str = str(time_str).strip()
    try:
        hour = int(time_str[:2])
        minute = int(time_str[2:4])
        ampm = time_str[4].upper() if len(time_str) > 4 else 'A'
        if ampm == 'P' and hour != 12:
            hour += 12
        elif ampm == 'A' and hour == 12:
            hour = 0
        return hour, minute
    except (ValueError, IndexError):
        return None, None


def normalize_street_name(name):
    """Normalize street names for matching between datasets."""
    if not name:
        return ""
    name = str(name).upper().strip()
    # Common abbreviation standardization
    replacements = {
        ' STREET': ' ST', ' AVENUE': ' AVE', ' BOULEVARD': ' BLVD',
        ' DRIVE': ' DR', ' PLACE': ' PL', ' ROAD': ' RD',
        ' LANE': ' LN', ' COURT': ' CT', ' TERRACE': ' TER',
        ' PARKWAY': ' PKWY', ' EXPRESSWAY': ' EXPY',
        ' NORTH ': ' N ', ' SOUTH ': ' S ',
        ' EAST ': ' E ', ' WEST ': ' W ',
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def parse_house_number(hn):
    """Extract numeric part of house number for range matching."""
    if not hn:
        return None
    # Handle formats like "123", "123-45", "123A"
    match = re.match(r'(\d+)', str(hn).strip())
    if match:
        return int(match.group(1))
    return None


# ═══════════════════════════════════════════════════════════════════
# CROSS-REFERENCE ANALYSIS
# ═══════════════════════════════════════════════════════════════════

def build_cscl_lookup(cscl_df):
    """
    Build a lookup: (normalized_street_name, borocode) → list of segments.
    Each segment has: physical_id, address range (low, high).
    """
    print("Building CSCL lookup table...")

    # Detect column names (they vary between dataset versions)
    cols = cscl_df.columns.tolist()
    print(f"  CSCL columns: {cols}")

    # Find the right column names
    street_col = None
    for candidate in ['full_street_name', 'full_stree', 'full_street', 'stname_label', 'st_name', 'stname', 'street']:
        if candidate in cols:
            street_col = candidate
            break

    physid_col = None
    for candidate in ['physicalid', 'physical_id', 'physid']:
        if candidate in cols:
            physid_col = candidate
            break

    boro_col = None
    for candidate in ['boroughcode', 'borocode', 'boro_code', 'borough']:
        if candidate in cols:
            boro_col = candidate
            break

    # Address range columns
    addr_cols = {}
    for prefix in ['l_low_hn', 'l_high_hn', 'r_low_hn', 'r_high_hn']:
        for candidate in [prefix, prefix.upper()]:
            if candidate in cols:
                addr_cols[prefix] = candidate
                break

    if not street_col or not physid_col:
        print(f"  WARNING: Could not find required columns.")
        print(f"  Need street name col (tried: full_stree, st_name, etc.) — found: {street_col}")
        print(f"  Need physical_id col (tried: physicalid, physical_id) — found: {physid_col}")
        print(f"  Available columns: {cols}")
        return {}

    print(f"  Using: street={street_col}, physid={physid_col}, boro={boro_col}")
    print(f"  Address range cols: {addr_cols}")

    lookup = defaultdict(list)
    for _, row in cscl_df.iterrows():
        street = normalize_street_name(row.get(street_col, ''))
        boro = str(row.get(boro_col, '')).strip() if boro_col else ''
        physid = row.get(physid_col)

        if not street or not physid:
            continue

        # Get address ranges
        low = None
        high = None
        for side in ['l', 'r']:
            low_col = addr_cols.get(f'{side}_low_hn')
            high_col = addr_cols.get(f'{side}_high_hn')
            if low_col and high_col:
                lo = parse_house_number(row.get(low_col))
                hi = parse_house_number(row.get(high_col))
                if lo is not None and hi is not None:
                    if low is None or lo < low:
                        low = lo
                    if high is None or hi > high:
                        high = hi

        lookup[(street, boro)].append({
            'physical_id': physid,
            'addr_low': low,
            'addr_high': high,
        })

    print(f"  Built lookup with {len(lookup):,} (street, boro) keys")
    return lookup


def match_ticket_to_segment(ticket, cscl_lookup):
    """
    Match a ticket to a CSCL physical_id using street name + house number + borough.
    Returns physical_id or None.
    """
    street = normalize_street_name(ticket.get('street_name', ''))
    county = str(ticket.get('violation_county', '')).upper().strip()
    boro = TICKET_COUNTY_TO_BORO.get(county, '')
    house_num = parse_house_number(ticket.get('house_number'))

    if not street:
        return None

    segments = cscl_lookup.get((street, boro), [])
    if not segments:
        # Try without boro (less precise but catches more)
        for key, segs in cscl_lookup.items():
            if key[0] == street:
                segments = segs
                break

    if not segments:
        return None

    # If we have a house number, find the matching segment
    if house_num is not None:
        for seg in segments:
            if seg['addr_low'] is not None and seg['addr_high'] is not None:
                if seg['addr_low'] <= house_num <= seg['addr_high']:
                    return seg['physical_id']

    # Smart fallback: single-segment streets use that segment;
    # multi-segment streets try nearest range; otherwise drop
    if len(segments) == 1:
        return segments[0]['physical_id']
    if house_num is not None:
        best_pid, best_dist = None, float('inf')
        for seg in segments:
            if seg['addr_low'] is not None and seg['addr_high'] is not None:
                lo, hi = seg['addr_low'], seg['addr_high']
                dist = max(0, lo - house_num) if house_num < lo else max(0, house_num - hi) if house_num > hi else 0
                if dist < best_dist:
                    best_dist = dist
                    best_pid = seg['physical_id']
        if best_dist <= 20:
            return best_pid
    return None


def run_crossref_analysis(tickets_df, sweep_df, cscl_lookup):
    """
    The main cross-reference: for each ticket, find if/when the sweeper
    passed the same block on the same day, and whether the ticket came
    before or after the sweep.
    """
    print("\n" + "=" * 60)
    print("CROSS-REFERENCE: TICKETS vs. SWEEPS")
    print("=" * 60)

    # Step 1: Match tickets to physical_ids
    print("Step 1: Matching tickets to CSCL street segments...")
    tickets_df['physical_id'] = None
    matched = 0
    for idx, row in tickets_df.iterrows():
        pid = match_ticket_to_segment(row.to_dict(), cscl_lookup)
        if pid:
            tickets_df.at[idx, 'physical_id'] = pid
            matched += 1
        if (idx + 1) % 10000 == 0:
            print(f"  Processed {idx + 1:,} tickets, matched {matched:,}")

    match_rate = matched / len(tickets_df) * 100
    print(f"  ✓ Matched {matched:,} of {len(tickets_df):,} tickets ({match_rate:.1f}%)")

    if matched == 0:
        print("  ERROR: No tickets matched to segments. Check data formats.")
        return

    # Step 2: Build sweep lookup: (physical_id, date) → [sweep_times]
    print("\nStep 2: Building sweep time index...")
    sweep_index = defaultdict(list)

    # Detect sweep data columns
    sweep_cols = sweep_df.columns.tolist()
    print(f"  Sweep columns: {sweep_cols}")

    # The sweep data may have various column names for the timestamp and physical_id
    time_col = None
    for candidate in ['date_visited', 'last_cleaned', 'cleaned_datetime', 'datetime', 'date',
                       'last_visited', 'visit_date', 'timestamp']:
        if candidate in sweep_cols:
            time_col = candidate
            break

    pid_col = None
    for candidate in ['physical_id', 'physicalid', 'physid', 'segment_id']:
        if candidate in sweep_cols:
            pid_col = candidate
            break

    if not time_col or not pid_col:
        print(f"  WARNING: Could not identify sweep columns.")
        print(f"  Time col candidates: last_cleaned, cleaned_datetime, etc. → found: {time_col}")
        print(f"  ID col candidates: physical_id, physicalid → found: {pid_col}")
        print(f"  Available: {sweep_cols}")
        print(f"\n  *** MANUAL FIX NEEDED ***")
        print(f"  Update the column names in this script based on the actual data.")
        return

    print(f"  Using: time={time_col}, physical_id={pid_col}")

    for _, row in sweep_df.iterrows():
        pid = str(row.get(pid_col, '')).strip()
        ts_raw = row.get(time_col, '')
        if not pid or not ts_raw:
            continue
        try:
            ts = pd.to_datetime(ts_raw)
            date_key = ts.strftime('%Y-%m-%d')
            sweep_index[(pid, date_key)].append(ts)
        except:
            continue

    print(f"  Built index with {len(sweep_index):,} (segment, date) entries")

    # Count double-sweeps
    double_sweeps = sum(1 for times in sweep_index.values() if len(times) >= 2)
    print(f"  Double-sweep instances: {double_sweeps:,} ({double_sweeps/max(1,len(sweep_index))*100:.1f}%)")

    # Step 3: For each matched ticket, find the sweep on the same day
    print("\nStep 3: Comparing ticket times to sweep times...")
    results = {
        'ticket_before_sweep': 0,
        'ticket_after_sweep': 0,
        'ticket_no_sweep_found': 0,
        'ticket_same_time': 0,  # within 15 min
        'unmatched': 0,
        'details': [],
    }

    matched_tickets = tickets_df[tickets_df['physical_id'].notna()].copy()
    for _, ticket in matched_tickets.iterrows():
        pid = str(ticket['physical_id']).strip()
        try:
            ticket_date = pd.to_datetime(ticket['issue_date']).strftime('%Y-%m-%d')
        except:
            results['unmatched'] += 1
            continue

        hour, minute = parse_violation_time(ticket.get('violation_time'))
        if hour is None:
            results['unmatched'] += 1
            continue

        ticket_time = pd.to_datetime(f"{ticket_date} {hour:02d}:{minute:02d}")
        sweep_times = sweep_index.get((pid, ticket_date), [])

        if not sweep_times:
            results['ticket_no_sweep_found'] += 1
            continue

        # Find the closest sweep to this ticket
        closest_sweep = min(sweep_times, key=lambda s: abs((s - ticket_time).total_seconds()))
        diff_minutes = (ticket_time - closest_sweep).total_seconds() / 60

        if abs(diff_minutes) <= 15:
            results['ticket_same_time'] += 1
            category = 'same_time'
        elif diff_minutes > 0:
            results['ticket_after_sweep'] += 1
            category = 'after_sweep'
        else:
            results['ticket_before_sweep'] += 1
            category = 'before_sweep'

        results['details'].append({
            'physical_id': pid,
            'ticket_date': ticket_date,
            'ticket_time': ticket_time.strftime('%H:%M'),
            'sweep_time': closest_sweep.strftime('%H:%M'),
            'diff_minutes': round(diff_minutes),
            'category': category,
            'street': ticket.get('street_name', ''),
            'borough': BORO_NAMES.get(
                TICKET_COUNTY_TO_BORO.get(
                    str(ticket.get('violation_county', '')).upper().strip(), ''
                ), ''
            ),
        })

    # Step 4: Report results
    total_compared = (results['ticket_before_sweep'] + results['ticket_after_sweep'] +
                      results['ticket_same_time'])

    print(f"\n{'=' * 60}")
    print("RESULTS")
    print(f"{'=' * 60}")
    print(f"Tickets matched to segments:    {len(matched_tickets):,}")
    print(f"Tickets with sweep on same day: {total_compared:,}")
    print(f"Tickets with NO sweep found:    {results['ticket_no_sweep_found']:,}")
    print(f"Unmatched/unparseable:          {results['unmatched']:,}")
    print()

    if total_compared > 0:
        pct_before = results['ticket_before_sweep'] / total_compared * 100
        pct_after = results['ticket_after_sweep'] / total_compared * 100
        pct_same = results['ticket_same_time'] / total_compared * 100

        print(f"  ★ TICKET BEFORE SWEEP: {results['ticket_before_sweep']:,} ({pct_before:.1f}%)")
        print(f"    (Inspector came BEFORE the sweeper — block hadn't been cleaned yet)")
        print()
        print(f"  ★ TICKET AFTER SWEEP:  {results['ticket_after_sweep']:,} ({pct_after:.1f}%)")
        print(f"    (Inspector came AFTER the sweeper — block was already clean)")
        print()
        print(f"  ★ SAME TIME (±15min):  {results['ticket_same_time']:,} ({pct_same:.1f}%)")
        print(f"    (Inspector and sweeper were on the block around the same time)")
        print()

        # Average time difference for after-sweep tickets
        after_details = [d for d in results['details'] if d['category'] == 'after_sweep']
        if after_details:
            avg_lag = sum(d['diff_minutes'] for d in after_details) / len(after_details)
            print(f"  Average time AFTER sweep when ticketed: {avg_lag:.0f} minutes")

    # Step 5: "Ghost enforcement" — blocks ticketed but never swept
    print(f"\n{'=' * 60}")
    print("ENFORCEMENT WITHOUT CLEANING")
    print(f"{'=' * 60}")
    no_sweep_pct = results['ticket_no_sweep_found'] / max(1, len(matched_tickets)) * 100
    print(f"{results['ticket_no_sweep_found']:,} tickets ({no_sweep_pct:.1f}%) had NO sweep")
    print(f"recorded on the same day as the ticket.")
    print(f"(This could mean: sweeper didn't come, GPS didn't log, or data gap)")

    # Export details
    if results['details']:
        details_df = pd.DataFrame(results['details'])
        detail_path = os.path.join(OUTPUT_DIR, "ticket_sweep_crossref_details.csv")
        details_df.to_csv(detail_path, index=False)
        print(f"\n✓ Detail data exported to {detail_path}")

        # Summary by street
        street_summary = details_df.groupby(['street', 'borough']).agg(
            total=('category', 'count'),
            before_sweep=('category', lambda x: (x == 'before_sweep').sum()),
            after_sweep=('category', lambda x: (x == 'after_sweep').sum()),
            same_time=('category', lambda x: (x == 'same_time').sum()),
            avg_diff_min=('diff_minutes', 'mean'),
        ).reset_index().sort_values('total', ascending=False)

        street_path = os.path.join(OUTPUT_DIR, "ticket_sweep_by_street.csv")
        street_summary.to_csv(street_path, index=False)
        print(f"✓ Street-level summary exported to {street_path}")

    return results


# ═══════════════════════════════════════════════════════════════════
# STANDALONE TICKET ANALYSIS (doesn't need cross-ref)
# ═══════════════════════════════════════════════════════════════════

def run_ticket_analysis(tickets_df):
    """Analyze ticket patterns independent of sweep data."""
    print("\n" + "=" * 60)
    print("TICKET-ONLY ANALYSIS")
    print("=" * 60)

    # Parse times
    tickets_df['_hour'], tickets_df['_minute'] = zip(
        *tickets_df['violation_time'].apply(parse_violation_time)
    )
    tickets_df['issue_date_parsed'] = pd.to_datetime(tickets_df['issue_date'], errors='coerce')

    print(f"Total tickets: {len(tickets_df):,}")
    print(f"Date range: {tickets_df['issue_date_parsed'].min()} to {tickets_df['issue_date_parsed'].max()}")

    # Timing distribution
    print(f"\n--- Ticket Timing (hour of day) ---")
    hour_counts = tickets_df['_hour'].dropna().astype(int).value_counts().sort_index()
    for hour, count in hour_counts.items():
        bar = "█" * (count // max(1, (hour_counts.max() // 40)))
        print(f"  {hour:02d}:00  {bar}  ({count:,})")

    # Within-window analysis
    print(f"\n--- Position Within ASP Window ---")
    # Parse ASP hours
    def parse_hours_field(h):
        try:
            s = str(h).strip()
            if len(s) >= 4:
                return int(s[:2]), int(s[2:4])
        except:
            pass
        return None, None

    valid = tickets_df[tickets_df['_hour'].notna() &
                       tickets_df['from_hours_in_effect'].notna() &
                       tickets_df['to_hours_in_effect'].notna()].copy()

    valid['_asp_start_h'], valid['_asp_start_m'] = zip(
        *valid['from_hours_in_effect'].apply(parse_hours_field)
    )
    valid['_asp_end_h'], valid['_asp_end_m'] = zip(
        *valid['to_hours_in_effect'].apply(parse_hours_field)
    )

    valid = valid[valid['_asp_start_h'].notna() & valid['_asp_end_h'].notna()]

    if len(valid) > 0:
        valid['_min_into_window'] = (
            (valid['_hour'] - valid['_asp_start_h']) * 60 +
            valid['_minute'].fillna(0) - valid['_asp_start_m'].fillna(0)
        )
        valid['_window_len'] = (
            (valid['_asp_end_h'] - valid['_asp_start_h']) * 60 +
            valid['_asp_end_m'].fillna(0) - valid['_asp_start_m'].fillna(0)
        )
        valid = valid[valid['_window_len'] > 0]
        valid['_pct_through'] = (valid['_min_into_window'] / valid['_window_len'] * 100).clip(0, 100)

        print(f"  Analyzed {len(valid):,} tickets with ASP window data")
        for label, lo, hi in [('First 25%', 0, 25), ('25-50%', 25, 50),
                               ('50-75%', 50, 75), ('Last 25%', 75, 100)]:
            count = ((valid['_pct_through'] >= lo) & (valid['_pct_through'] < hi)).sum()
            pct = count / len(valid) * 100
            bar = "█" * int(pct)
            print(f"  {label:<12s} {bar}  {pct:.1f}% ({count:,})")

        # Last 30 min
        late = valid[valid['_min_into_window'] >= (valid['_window_len'] - 30)]
        print(f"\n  ★ {len(late)/len(valid)*100:.1f}% of tickets in LAST 30 min of window")

    # Top blocks
    print(f"\n--- Top 20 Most-Ticketed Blocks ---")
    tickets_df['_block'] = (tickets_df['street_name'].str.upper().str.strip() +
                            ' | PCT ' + tickets_df['violation_precinct'].astype(str))
    for i, (block, count) in enumerate(tickets_df['_block'].value_counts().head(20).items(), 1):
        print(f"  {i:2d}. {block:<45s} {count:>6,}")

    # Borough distribution
    print(f"\n--- Borough Distribution ---")
    tickets_df['_boro'] = tickets_df['violation_county'].map(
        {k: BORO_NAMES.get(v, v) for k, v in TICKET_COUNTY_TO_BORO.items()}
    )
    for boro, count in tickets_df['_boro'].value_counts().items():
        print(f"  {boro:<20s} {count:>8,}")


# ═══════════════════════════════════════════════════════════════════
# DOUBLE-SWEEP ANALYSIS
# ═══════════════════════════════════════════════════════════════════

def analyze_double_sweeps(sweep_df):
    """Identify blocks that get swept twice in the same ASP window."""
    print("\n" + "=" * 60)
    print("DOUBLE-SWEEP ANALYSIS")
    print("=" * 60)

    cols = sweep_df.columns.tolist()
    print(f"  Sweep columns: {cols}")

    # Detect columns
    time_col = None
    for c in ['date_visited', 'last_cleaned', 'cleaned_datetime', 'datetime', 'date', 'last_visited']:
        if c in cols:
            time_col = c
            break

    pid_col = None
    for c in ['physical_id', 'physicalid', 'physid']:
        if c in cols:
            pid_col = c
            break

    if not time_col or not pid_col:
        print(f"  Cannot identify columns. Available: {cols}")
        print(f"  *** NOTE: The SweepNYC dataset may only store the LAST visited time per segment.")
        print(f"  If so, double-sweep detection needs the raw GPS traces, not this summary dataset.")
        print(f"  Check if your sweeptracker.nyc backend stores historical sweep passes.")
        return

    # Group by (physical_id, date) to find multiple passes
    sweep_df['_ts'] = pd.to_datetime(sweep_df[time_col], errors='coerce')
    sweep_df['_date'] = sweep_df['_ts'].dt.date
    sweep_df['_pid'] = sweep_df[pid_col].astype(str)

    daily = sweep_df.groupby(['_pid', '_date']).agg(
        sweep_count=('_ts', 'count'),
        first_sweep=('_ts', 'min'),
        last_sweep=('_ts', 'max'),
    ).reset_index()

    multi = daily[daily['sweep_count'] >= 2]
    print(f"  Total (segment, day) combinations: {len(daily):,}")
    print(f"  With 2+ sweeps on same day: {len(multi):,} ({len(multi)/max(1,len(daily))*100:.1f}%)")

    if len(multi) > 0:
        multi['gap_minutes'] = (multi['last_sweep'] - multi['first_sweep']).dt.total_seconds() / 60
        print(f"  Average gap between sweeps: {multi['gap_minutes'].mean():.0f} minutes")
        print(f"  Median gap: {multi['gap_minutes'].median():.0f} minutes")

        # Which segments get double-swept most often?
        freq = multi.groupby('_pid').size().reset_index(name='double_sweep_days')
        freq = freq.sort_values('double_sweep_days', ascending=False)
        print(f"\n  Top 10 most frequently double-swept segments:")
        for _, row in freq.head(10).iterrows():
            print(f"    Segment {row['_pid']}: {row['double_sweep_days']} days with 2+ sweeps")

        ds_path = os.path.join(OUTPUT_DIR, "double_sweep_segments.csv")
        freq.to_csv(ds_path, index=False)
        print(f"\n  ✓ Double-sweep data exported to {ds_path}")
    else:
        print(f"\n  No double-sweeps found in this data sample.")
        print(f"  Try pulling more records or a wider date range.")


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SweepTracker ticket vs sweep analysis")
    parser.add_argument("--download", action="store_true", help="Download data from NYC Open Data")
    parser.add_argument("--analyze", action="store_true", help="Run analysis on downloaded data")
    parser.add_argument("--tickets-only", action="store_true", help="Run ticket analysis only (no cross-ref)")
    args = parser.parse_args()

    if not args.download and not args.analyze and not args.tickets_only:
        print("Usage:")
        print("  python sweep_ticket_crossref.py --download          # Download all datasets")
        print("  python sweep_ticket_crossref.py --analyze           # Run full cross-reference")
        print("  python sweep_ticket_crossref.py --tickets-only      # Just ticket patterns")
        print("  python sweep_ticket_crossref.py --download --analyze # Both")
        exit(0)

    if args.download:
        download_tickets()
        download_sweep_data()
        download_cscl()
        print("\n✓ All downloads complete. Check sweep_data/ directory.")
        print("  Now run with --analyze to process.")

    if args.analyze or args.tickets_only:
        # Load data
        tickets_path = os.path.join(DATA_DIR, "tickets_street_cleaning.json")
        if not os.path.exists(tickets_path):
            print(f"ERROR: {tickets_path} not found. Run --download first.")
            exit(1)

        print("Loading ticket data...")
        with open(tickets_path) as f:
            tickets_df = pd.DataFrame(json.load(f))
        print(f"  Loaded {len(tickets_df):,} tickets")

        # Always run ticket analysis
        run_ticket_analysis(tickets_df)

        if args.analyze:
            # Load sweep data
            sweep_path = os.path.join(DATA_DIR, "sweep_gps_data.json")
            cscl_path = os.path.join(DATA_DIR, "cscl_centerline.json")

            if not os.path.exists(sweep_path):
                print(f"WARNING: {sweep_path} not found. Skipping cross-reference.")
            elif not os.path.exists(cscl_path):
                print(f"WARNING: {cscl_path} not found. Skipping cross-reference.")
            else:
                print("\nLoading sweep data...")
                with open(sweep_path) as f:
                    sweep_df = pd.DataFrame(json.load(f))
                print(f"  Loaded {len(sweep_df):,} sweep records")

                print("Loading CSCL centerline...")
                with open(cscl_path) as f:
                    cscl_df = pd.DataFrame(json.load(f))
                print(f"  Loaded {len(cscl_df):,} street segments")

                # Double-sweep analysis
                analyze_double_sweeps(sweep_df)

                # Build CSCL lookup and run cross-reference
                cscl_lookup = build_cscl_lookup(cscl_df)
                if cscl_lookup:
                    run_crossref_analysis(tickets_df, sweep_df, cscl_lookup)

    print("\n" + "=" * 60)
    print("DONE. Check sweep_analysis_output/ for results.")
    print("=" * 60)
