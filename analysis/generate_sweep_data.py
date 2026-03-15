#!/usr/bin/env python3
"""Generate a single combined sweepData.json for the frontend app.

Merges reliability (with DOW skip rates from GPS data) + patterns into one
file so the browser makes one request.

Output structure:
{
  "r": { physicalId: [skipRate, totalDays, tickets, dowSkipRates|null] },
  "i": { "street|boro": [median_min, q25, q75, count] },
  "p": { "street|boro": [after_rate, ticket_days] },
  "d": { physicalId: days_count }
}
"""

import csv
import json
import os
import re
from collections import defaultdict
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE)
OUTPUT_DIR = os.path.join(PROJECT_DIR, 'sweep_analysis_output')
SWEEP_PATH = os.path.join(PROJECT_DIR, 'sweep_data', 'sweep_gps_full_year.json')
OUT_FILE = os.path.join(PROJECT_DIR, 'src', 'data', 'sweepData.json')


def normalize_street(s):
    """Normalize street name to CSCL abbreviation style."""
    s = s.upper()
    s = re.sub(r'\bSTREET\b', 'ST', s)
    s = re.sub(r'\bAVENUE\b', 'AVE', s)
    s = re.sub(r'\bBOULEVARD\b', 'BLVD', s)
    s = re.sub(r'\bDRIVE\b', 'DR', s)
    s = re.sub(r'\bPLACE\b', 'PL', s)
    s = re.sub(r'\bROAD\b', 'RD', s)
    s = re.sub(r'\bLANE\b', 'LN', s)
    s = re.sub(r'\bCOURT\b', 'CT', s)
    s = re.sub(r'\bWEST\b', 'W', s)
    s = re.sub(r'\bEAST\b', 'E', s)
    s = re.sub(r'\bNORTH\b', 'N', s)
    s = re.sub(r'\bSOUTH\b', 'S', s)
    s = re.sub(r'(\d+)(?:ST|ND|RD|TH)\b', r'\1', s)
    s = re.sub(r'[^A-Z0-9 ]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def load_reliability_with_dow():
    """Load sweep reliability from CSV + GPS JSON for DOW rates.

    Uses v3 approach: combines skip CSV (ticket analysis) with full-year GPS
    data to compute per-DOW skip rates and include sweep-only segments.
    """
    # 1. Load skip CSV (segments with ticket + sweep analysis)
    skip_path = os.path.join(OUTPUT_DIR, 'step1_segment_skip_rates.csv')
    csv_segments = {}
    with open(skip_path) as f:
        for row in csv.DictReader(f):
            csv_segments[row['physical_id']] = {
                'skip_rate': round(float(row['skip_rate']), 1),
                'total_days': int(row['total_asp_days']),
                'tickets': int(row['total_tickets']),
            }
    print(f"  Skip CSV: {len(csv_segments)} segments")

    # 2. Load GPS data for DOW computation
    if not os.path.exists(SWEEP_PATH):
        print(f"  GPS data not found at {SWEEP_PATH}, skipping DOW rates")
        data = {}
        for pid, info in csv_segments.items():
            data[pid] = [info['skip_rate'], info['total_days'], info['tickets'], None]
        return data

    print("  Loading GPS data (this may take a moment)...")
    with open(SWEEP_PATH) as f:
        sweep_data = json.load(f)
    print(f"  GPS records: {len(sweep_data):,}")

    # Build per-segment sweep dates
    swept_dates = defaultdict(set)
    all_sweep_dates = set()
    for rec in sweep_data:
        pid = str(rec.get('physical_id', ''))
        try:
            dt = datetime.fromisoformat(rec['date_visited'].replace('Z', '+00:00'))
            d = dt.date()
            swept_dates[pid].add(d)
            all_sweep_dates.add(d)
        except (ValueError, KeyError):
            continue

    # Include Mon-Sat (weekday 0-5); some blocks have "EXCEPT SUNDAY" ASP signs
    weekday_dates = sorted(d for d in all_sweep_dates if d.weekday() < 6)
    print(f"  Unique swept segments: {len(swept_dates)}")
    print(f"  Total Mon-Sat dates: {len(weekday_dates)}")

    # 3. Build reliability data
    data = {}

    # Process CSV segments (have ticket data)
    for pid, info in csv_segments.items():
        swept = swept_dates.get(pid, set())
        dow_swept = defaultdict(int)
        dow_total = defaultdict(int)
        for d in weekday_dates:
            dow = d.weekday()
            dow_total[dow] += 1
            if d in swept:
                dow_swept[dow] += 1

        dow_rates = []
        for dow in range(6):
            if dow_total[dow] > 0 and dow_swept[dow] > 0:
                # Sweeper has come at least once on this day — it's a real sweeping day
                rate = round(100 * (1 - dow_swept[dow] / dow_total[dow]), 0)
                dow_rates.append(int(rate))
            else:
                # Sweeper has NEVER come on this day — not a sweeping day, mark as N/A
                dow_rates.append(-1)

        valid_rates = [r for r in dow_rates if r >= 0]
        has_pattern = valid_rates and (max(valid_rates) - min(valid_rates)) > 20

        # Scheduled days = days the sweeper has actually visited at least once
        scheduled_days = {dow for dow in range(6) if dow_total[dow] > 0 and dow_swept[dow] > 0}
        if scheduled_days:
            sched_total = sum(1 for d in weekday_dates if d.weekday() in scheduled_days)
            sched_swept = sum(1 for d in swept if d.weekday() < 6 and d.weekday() in scheduled_days and d in set(weekday_dates))
            skip_rate = round(100 * (1 - sched_swept / sched_total), 1) if sched_total > 0 else info['skip_rate']
            total_days = sched_total
        else:
            skip_rate = info['skip_rate']
            total_days = info['total_days']

        data[pid] = [
            skip_rate,
            total_days,
            info['tickets'],
            dow_rates if has_pattern else None,
        ]

    # Process sweep-only segments (GPS data but no tickets in analysis)
    sweep_only = 0
    for pid, dates in swept_dates.items():
        if pid in csv_segments or pid == '':
            continue
        swept_weekdays = sum(1 for d in dates if d.weekday() < 6)
        if swept_weekdays < 10:
            continue

        dow_swept = defaultdict(int)
        dow_total = defaultdict(int)
        for d in weekday_dates:
            dow = d.weekday()
            dow_total[dow] += 1
            if d in dates:
                dow_swept[dow] += 1

        dow_rates = []
        for dow in range(6):
            if dow_total[dow] > 0 and dow_swept[dow] > 0:
                rate = round(100 * (1 - dow_swept[dow] / dow_total[dow]), 0)
                dow_rates.append(int(rate))
            else:
                dow_rates.append(-1)

        scheduled_days = {dow for dow in range(6) if dow_total[dow] > 0 and dow_swept[dow] > 0}
        if not scheduled_days:
            continue  # No GPS visits at all — skip this segment

        scheduled_total = sum(1 for d in weekday_dates if d.weekday() in scheduled_days)
        scheduled_swept = sum(1 for d in dates if d.weekday() < 6 and d.weekday() in scheduled_days)
        skip_rate = round(100 * (1 - scheduled_swept / scheduled_total), 1) if scheduled_total > 0 else 0.0

        valid_rates = [r for r in dow_rates if r >= 0]
        has_pattern = valid_rates and (max(valid_rates) - min(valid_rates)) > 20

        data[pid] = [skip_rate, scheduled_total, 0, dow_rates if has_pattern else None]
        sweep_only += 1

    # Strip DOW from reliable segments to reduce size
    stripped = 0
    for entry in data.values():
        if entry[0] <= 10 and entry[3] is not None:
            entry[3] = None
            stripped += 1

    print(f"  Sweep-only segments added: {sweep_only}")
    print(f"  Stripped DOW from {stripped} reliable segments")
    return data


def load_inspector_timing():
    """Load inspector timing: 'normalizedStreet|boro' -> [median_min, q25, q75, count]"""
    path = os.path.join(OUTPUT_DIR, 'inspector_timing_full_year.csv')
    best = {}
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            count = int(row['count'])
            spread = float(row['spread'])
            if count < 20 or spread > 120:
                continue
            street = normalize_street(row['_block'].strip())
            boro = row['_boro_name'].strip()
            key = f"{street}|{boro}"
            if key not in best or count > best[key][3]:
                best[key] = [
                    int(round(float(row['median_min']))),
                    int(round(float(row['q25']))),
                    int(round(float(row['q75']))),
                    count,
                ]
    return best


def load_post_sweep():
    """Load post-sweep return: 'normalizedStreet|boro' -> [after_rate, ticket_days]"""
    path = os.path.join(OUTPUT_DIR, 'post_sweep_patterns_full_year.csv')
    best = {}
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ticket_days = int(row['ticket_days'])
            if ticket_days < 10:
                continue
            street = normalize_street(row['street_name'].strip())
            boro = row['boro'].strip()
            key = f"{street}|{boro}"
            if key not in best or ticket_days > best[key][1]:
                best[key] = [round(float(row['after_rate']), 1), ticket_days]
    return best


def load_double_sweep():
    """Load double-sweep: physicalId -> days_count"""
    path = os.path.join(OUTPUT_DIR, 'double_sweep_full_year.csv')
    counts = defaultdict(int)
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row['physical_id'].strip()
            counts[pid] += 1
    return dict(counts)


if __name__ == '__main__':
    print("Loading reliability data...")
    reliability = load_reliability_with_dow()

    print("\nLoading pattern data...")
    inspector = load_inspector_timing()
    post_sweep = load_post_sweep()
    double_sweep = load_double_sweep()

    print(f"\nReliability: {len(reliability)} segments")
    print(f"Inspector timing: {len(inspector)} streets")
    print(f"Post-sweep return: {len(post_sweep)} streets")
    print(f"Double-sweep: {len(double_sweep)} segments")

    combined = {
        'r': reliability,
        'i': inspector,
        'p': post_sweep,
        'd': double_sweep,
    }

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, 'w') as f:
        json.dump(combined, f, separators=(',', ':'))

    size_kb = os.path.getsize(OUT_FILE) / 1024
    print(f"\nOutput: {OUT_FILE} ({size_kb:.0f} KB)")
