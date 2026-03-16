"""
Generate precinctDetails.ts from step1_segment_skip_rates.csv + sweepData.json.

Strategy:
1. Read crossref_full_year.csv to get one summons_number per physical_id
2. Batch-query ticket API for violation_precinct using those summons numbers
3. Group segments by precinct, pick top 3 worst blocks per precinct
4. Use GPS-corrected skip rates from sweepData.json (avg of DOW rates where GPS detected)
"""
import csv
import json
import os
import requests
import time
import sys
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE)

STEP1_CSV = os.path.join(PROJECT_DIR, "sweep_analysis_output/step1_segment_skip_rates.csv")
CROSSREF_CSV = os.path.join(PROJECT_DIR, "sweep_analysis_output/crossref_full_year.csv")
SWEEP_DATA_JSON = os.path.join(PROJECT_DIR, "src/data/sweepData.json")
CSCL_API = "https://data.cityofnewyork.us/resource/inkn-q76z.json"
TICKET_API = "https://data.cityofnewyork.us/resource/pvqr-7yc4.json"
OUTPUT_FILE = os.path.join(PROJECT_DIR, "src/data/precinctDetails.ts")

def clean_street_name(name):
    """Title-case street names and fix common abbreviations."""
    import re
    # Fix double spaces
    name = re.sub(r'\s+', ' ', name.strip())
    # Title case
    name = name.title()
    # Fix ordinal suffixes that get title-cased wrong
    name = re.sub(r'(\d)(St|Nd|Rd|Th)\b', lambda m: m.group(1) + m.group(2).lower(), name)
    # Common abbreviation fixes
    name = name.replace(" Ave", " Ave").replace(" Blvd", " Blvd").replace(" Pkwy", " Pkwy")
    return name


BORO_MAP = {
    "Manhattan": "Manhattan",
    "Bronx": "Bronx",
    "Brooklyn": "Brooklyn",
    "Queens": "Queens",
    "Staten Island": "Staten Island",
}


def load_gps_data():
    """Load GPS data from sweepData.json.

    Returns:
      gps_active_days: dict pid -> set of active DOW indices (0=Mon..5=Sat)
      gps_corrected_rates: dict pid -> corrected skip rate
      sweep_dates_by_pid: dict pid -> set of date strings when sweeper came
    """
    if not os.path.exists(SWEEP_DATA_JSON):
        print(f"  WARNING: {SWEEP_DATA_JSON} not found, using step1 rates")
        return {}, {}, {}

    with open(SWEEP_DATA_JSON, "r") as f:
        data = json.load(f)

    gps_active_days = {}
    gps_corrected_rates = {}
    r = data.get("r", {})
    for pid, entry in r.items():
        dow_rates = entry[3] if len(entry) > 3 else None
        if dow_rates is None:
            continue
        active = {i for i, rate in enumerate(dow_rates) if rate >= 0}
        if not active:
            continue
        gps_active_days[pid] = active
        active_rates = [dow_rates[i] for i in active]
        gps_corrected_rates[pid] = round(sum(active_rates) / len(active_rates), 1)

    print(f"  GPS data: {len(gps_corrected_rates)} segments with DOW rates")

    # Load sweep GPS records for per-date sweep confirmation
    SWEEP_PATH = os.path.join(PROJECT_DIR, 'sweep_data', 'sweep_gps_full_year.json')
    sweep_dates_by_pid = defaultdict(set)
    if os.path.exists(SWEEP_PATH):
        print("  Loading sweep GPS dates...")
        with open(SWEEP_PATH) as f:
            sweep_records = json.load(f)
        for rec in sweep_records:
            pid = str(rec.get('physical_id', ''))
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(rec['date_visited'].replace('Z', '+00:00'))
                sweep_dates_by_pid[pid].add(dt.strftime('%Y-%m-%d'))
            except (ValueError, KeyError):
                continue
        print(f"  Sweep dates loaded for {len(sweep_dates_by_pid)} segments")
    else:
        print(f"  WARNING: {SWEEP_PATH} not found, can't compute per-date confirmed counts")

    return gps_active_days, gps_corrected_rates, dict(sweep_dates_by_pid)


def load_crossref_tickets():
    """Load all tickets from crossref, grouped by physical_id.

    Returns dict: pid -> list of date strings (ticket dates).
    """
    from datetime import datetime
    pid_tickets = defaultdict(list)
    with open(CROSSREF_CSV, "r") as f:
        for row in csv.DictReader(f):
            pid = row["physical_id"]
            date_str = row["date"]  # format: YYYY-MM-DD
            pid_tickets[pid].append(date_str)
    print(f"  Crossref: {sum(len(v) for v in pid_tickets.values())} tickets across {len(pid_tickets)} segments")
    return dict(pid_tickets)


def load_step1():
    from datetime import datetime

    # Load GPS data
    gps_active_days, gps_corrected_rates, sweep_dates_by_pid = load_gps_data()

    # Load per-ticket dates from crossref for GPS-corrected noSweep/confirmed
    pid_tickets = load_crossref_tickets()

    segments = {}
    corrected_count = 0
    with open(STEP1_CSV, "r") as f:
        for row in csv.DictReader(f):
            pid = row["physical_id"]
            step1_rate = float(row["skip_rate"])
            step1_tickets = int(row["total_tickets"])
            step1_skip_tickets = int(row["tickets_on_skip_days"])

            if pid in gps_corrected_rates and pid in gps_active_days:
                skip_rate = gps_corrected_rates[pid]
                active_days = gps_active_days[pid]
                sweep_dates = sweep_dates_by_pid.get(pid, set())
                ticket_dates = pid_tickets.get(pid, [])

                # Recompute noSweep/confirmed using only tickets on GPS-active DOW
                no_sweep = 0
                confirmed = 0
                for d_str in ticket_dates:
                    try:
                        dt = datetime.strptime(d_str, '%Y-%m-%d')
                        dow = dt.weekday()  # 0=Mon..6=Sun
                    except ValueError:
                        continue
                    if dow >= 6 or dow not in active_days:
                        continue  # Skip tickets on non-sweep days for this side
                    if d_str in sweep_dates:
                        confirmed += 1
                    else:
                        no_sweep += 1

                total_tickets = no_sweep + confirmed
                corrected_count += 1
            else:
                skip_rate = step1_rate
                total_tickets = step1_tickets
                no_sweep = step1_skip_tickets
                confirmed = step1_tickets - step1_skip_tickets

            segments[pid] = {
                "pid": pid,
                "street_name": row["street_name"],
                "boro": row["boro"],
                "skip_rate": skip_rate,
                "total_tickets": total_tickets,
                "tickets_on_skip_days": no_sweep,
                "confirmed_tickets": confirmed,
            }
    print(f"  {corrected_count}/{len(segments)} segments GPS-corrected")
    return segments


def load_pid_summons():
    """Get one summons_number per physical_id from crossref."""
    pid_summons = {}
    with open(CROSSREF_CSV, "r") as f:
        for row in csv.DictReader(f):
            pid = row["physical_id"]
            if pid not in pid_summons:
                pid_summons[pid] = row["summons_number"]
    return pid_summons


def batch_get_precincts(summons_list):
    """Query ticket API for violation_precinct given summons numbers."""
    results = {}
    chunk_size = 45  # keep URL length reasonable

    for i in range(0, len(summons_list), chunk_size):
        chunk = summons_list[i:i+chunk_size]
        where_parts = " OR ".join(f"summons_number='{s}'" for s in chunk)
        params = {
            "$select": "summons_number, violation_precinct",
            "$where": where_parts,
            "$limit": len(chunk),
        }
        try:
            resp = requests.get(TICKET_API, params=params, timeout=30)
            if resp.status_code == 200:
                for row in resp.json():
                    sn = row.get("summons_number", "")
                    prec = row.get("violation_precinct", "")
                    if sn and prec:
                        results[sn] = prec
            else:
                print(f"  API error {resp.status_code} at chunk {i}")
        except Exception as e:
            print(f"  Request error at chunk {i}: {e}")

        if i > 0 and (i // chunk_size) % 50 == 0:
            print(f"  Precinct lookup progress: {i}/{len(summons_list)}")
            time.sleep(0.5)

    return results


def clean_house_number(hn):
    """Clean NYC house numbers: '139-000' -> '139', '106-098' -> '106-98', '78-001' -> '78-01'."""
    if not hn or hn == "0":
        return ""
    # Queens-style hyphenated: e.g. "139-000", "106-098"
    # These are block-lot format, NOT ranges
    parts = hn.split("-")
    if len(parts) == 2:
        prefix, suffix = parts
        # Remove leading zeros from suffix, but keep at least 1 digit
        suffix = suffix.lstrip("0") or "0"
        # If suffix is "0" or "00" etc, it's a round number — just use prefix
        if suffix == "0" or suffix == "00" or suffix == "000":
            return prefix
        return f"{prefix}-{suffix}"
    return hn


def format_house_range(low, high):
    """Format a house number range for display."""
    low_clean = clean_house_number(low)
    high_clean = clean_house_number(high)
    if not low_clean and not high_clean:
        return ""
    if low_clean == high_clean:
        return low_clean
    if not low_clean:
        return high_clean
    if not high_clean:
        return low_clean
    return f"{low_clean} to {high_clean}"


def get_house_numbers_batch(pids):
    """Fetch house numbers for pids from CSCL API."""
    pid_houses = {}
    chunk_size = 40
    pid_list = list(pids)

    for i in range(0, len(pid_list), chunk_size):
        chunk = pid_list[i:i+chunk_size]
        where_clause = " OR ".join(f"physicalid='{p}'" for p in chunk)
        params = {
            "$select": "physicalid, l_low_hn, l_high_hn, r_low_hn, r_high_hn",
            "$where": where_clause,
            "$limit": len(chunk),
        }
        try:
            resp = requests.get(CSCL_API, params=params, timeout=30)
            if resp.status_code == 200:
                for row in resp.json():
                    pid = row.get("physicalid", "")
                    r_low = row.get("r_low_hn", "0")
                    r_high = row.get("r_high_hn", "0")
                    l_low = row.get("l_low_hn", "0")
                    l_high = row.get("l_high_hn", "0")
                    if r_low and r_low != "0":
                        pid_houses[pid] = format_house_range(r_low, r_high)
                    elif l_low and l_low != "0":
                        pid_houses[pid] = format_house_range(l_low, l_high)
                    else:
                        pid_houses[pid] = ""
        except Exception as e:
            print(f"  CSCL error: {e}")
        time.sleep(0.05)

    return pid_houses


PRECINCT_CACHE = os.path.join(PROJECT_DIR, "sweep_analysis_output/pid_precinct_cache.json")


def main():
    # 1. Load step1 segments
    segments = load_step1()
    print(f"Loaded {len(segments)} segments from step1")

    # 2. Get pid -> precinct mapping (from cache or API)
    if os.path.exists(PRECINCT_CACHE):
        print(f"Loading precinct mapping from cache...")
        with open(PRECINCT_CACHE) as f:
            pid_precinct = json.load(f)
        print(f"Cached precinct mapping: {len(pid_precinct)} segments")
    else:
        pid_summons = load_pid_summons()
        print(f"Found summons for {len(pid_summons)} pids in crossref")

        summons_to_pid = {}
        for pid, sn in pid_summons.items():
            if pid in segments:
                summons_to_pid[sn] = pid

        print(f"Querying precincts for {len(summons_to_pid)} summons...")
        summons_precinct = batch_get_precincts(list(summons_to_pid.keys()))
        print(f"Got precincts for {len(summons_precinct)} summons")

        pid_precinct = {}
        for sn, prec in summons_precinct.items():
            pid = summons_to_pid.get(sn)
            if pid:
                pid_precinct[pid] = prec

        # Cache for future runs
        with open(PRECINCT_CACHE, 'w') as f:
            json.dump(pid_precinct, f)
        print(f"Cached precinct mapping to {PRECINCT_CACHE}")

    print(f"Assigned precinct to {len(pid_precinct)} segments")

    # 5. Group by precinct
    by_precinct = defaultdict(list)
    for pid, prec in pid_precinct.items():
        by_precinct[prec].append(segments[pid])

    print(f"Found {len(by_precinct)} precincts")

    # 6. For each precinct, pick top 3 worst blocks by tickets_on_skip_days
    worst_pids = set()
    precinct_data = {}

    for prec in sorted(by_precinct.keys(), key=lambda x: int(x) if x.isdigit() else 0):
        if not prec.isdigit() or int(prec) == 0:
            continue  # Skip junk precinct 0
        segs = by_precinct[prec]
        boro = segs[0]["boro"] if segs else ""

        # Top 3 by skip-day tickets, require minimum 5 no-sweep tickets
        # AND confirmed > 0 (to exclude side-of-street data artifacts where
        # the sweeper services the opposite curb but never this one)
        eligible = [s for s in segs if s["tickets_on_skip_days"] >= 5 and s.get("confirmed_tickets", 1) > 0]
        ranked = sorted(
            eligible,
            key=lambda s: s["tickets_on_skip_days"],
            reverse=True
        )[:3]

        if not ranked:
            continue

        for s in ranked:
            worst_pids.add(s["pid"])

        precinct_data[prec] = {
            "borough": BORO_MAP.get(boro, boro),
            "segments": len(segs),
            "worst_segs": ranked,
        }

    # 7. Fetch house numbers for worst blocks
    print(f"Fetching house numbers for {len(worst_pids)} worst blocks...")
    pid_houses = get_house_numbers_batch(worst_pids)

    # 8. Output TypeScript
    lines = []
    lines.append('export interface PrecinctDetail {')
    lines.append('  borough: string;')
    lines.append('  segments: number;')
    lines.append('  worstBlocks: { street: string; houses: string; noSweep: number; confirmed: number; skipRate: number }[];')
    lines.append('}')
    lines.append('')
    lines.append('export const PRECINCT_DETAILS: Record<number, PrecinctDetail> = {')

    for prec in sorted(precinct_data.keys(), key=lambda x: int(x) if x.isdigit() else 0):
        d = precinct_data[prec]
        blocks = []
        for s in d["worst_segs"]:
            houses = pid_houses.get(s["pid"], "")
            noSweep = s["tickets_on_skip_days"]
            confirmed = s.get("confirmed_tickets", s["total_tickets"] - s["tickets_on_skip_days"])
            skipRate = s["skip_rate"]
            street_display = clean_street_name(s["street_name"])
            blocks.append(
                f'{{ street: {json.dumps(street_display)}, houses: {json.dumps(houses)}, '
                f'noSweep: {noSweep}, confirmed: {confirmed}, skipRate: {skipRate} }}'
            )
        blocks_str = ", ".join(blocks)
        lines.append(
            f'  {prec}: {{ borough: {json.dumps(d["borough"])}, segments: {d["segments"]}, '
            f'worstBlocks: [{blocks_str}] }},'
        )

    lines.append('};')
    lines.append('')

    with open(OUTPUT_FILE, 'w') as f:
        f.write('\n'.join(lines))

    print(f"\nWrote {OUTPUT_FILE} with {len(precinct_data)} precincts")

    # 9. Output precinct summary table (for dataFacts.ts PRECINCT_DATA)
    print("\n=== PRECINCT SUMMARY TABLE (GPS-corrected) ===")
    precinct_summary = []
    for prec in sorted(by_precinct.keys(), key=lambda x: int(x) if x.isdigit() else 0):
        if not prec.isdigit() or int(prec) == 0:
            continue
        segs = by_precinct[prec]
        total = sum(s["total_tickets"] for s in segs)
        no_sweep = sum(s["tickets_on_skip_days"] for s in segs)
        if total < 10:
            continue
        rate = round(100 * no_sweep / total, 1) if total > 0 else 0.0
        precinct_summary.append((int(prec), total, no_sweep, rate))

    # Sort by no-sweep rate descending
    precinct_summary.sort(key=lambda x: x[3], reverse=True)

    summary_file = os.path.join(PROJECT_DIR, "sweep_analysis_output/precinct_summary_corrected.json")
    with open(summary_file, 'w') as f:
        json.dump(precinct_summary, f)
    print(f"Wrote {summary_file} with {len(precinct_summary)} precincts")
    for prec, total, ns, rate in precinct_summary[:10]:
        print(f"  Precinct {prec}: {total} total, {ns} no-sweep, {rate}% rate")


if __name__ == "__main__":
    main()
