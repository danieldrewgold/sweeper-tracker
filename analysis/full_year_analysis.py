"""
Full-year cross-reference and seasonality analysis.

Uses the complete dataset:
  - 4.67M sweep GPS records (Mar 2025 - Mar 2026)
  - 1.065M parking tickets (Jun 2025 - Jan 2026)
  - 122k CSCL centerline segments

Produces:
  1. Cross-reference: tickets vs sweeps (before/after/same/no-sweep)
  2. Double-sweep detection by month (seasonality test)
  3. Inspector timing analysis (full dataset)
  4. Post-sweep return patterns (full dataset)
  5. Seasonality breakdown of all metrics
  6. Updated feature feasibility numbers
"""
import json
import os
import re
import sys
import time
from collections import defaultdict

import pandas as pd

sys.path.insert(0, ".")
from analysis.sweep_ticket_crossref import parse_violation_time
from analysis.improved_crossref import normalize_v3, TICKET_COUNTY_TO_BORO

OUT_DIR = "sweep_analysis_output"
os.makedirs(OUT_DIR, exist_ok=True)

BORO_NAMES = {
    "1": "Manhattan", "2": "Bronx", "3": "Brooklyn",
    "4": "Queens", "5": "Staten Island",
}
COUNTY_TO_BORO_NAME = {
    k: BORO_NAMES.get(v, v) for k, v in TICKET_COUNTY_TO_BORO.items()
}

SEASON_MAP = {
    3: "Spring", 4: "Spring", 5: "Spring",
    6: "Summer", 7: "Summer", 8: "Summer",
    9: "Fall", 10: "Fall", 11: "Fall",
    12: "Winter", 1: "Winter", 2: "Winter",
}


# ═══════════════════════════════════════════════════════════════
# DATA LOADING
# ═══════════════════════════════════════════════════════════════

def load_data():
    """Load all three datasets."""
    print("Loading data...")
    t0 = time.time()

    with open("sweep_data/sweep_gps_full_year.json") as f:
        sweeps = pd.DataFrame(json.load(f))
    print(f"  Sweeps:  {len(sweeps):>12,} records ({time.time()-t0:.1f}s)")

    t1 = time.time()
    with open("sweep_data/tickets_full_year.json") as f:
        tickets = pd.DataFrame(json.load(f))
    print(f"  Tickets: {len(tickets):>12,} records ({time.time()-t1:.1f}s)")

    t2 = time.time()
    with open("sweep_data/cscl_centerline.json") as f:
        cscl = pd.DataFrame(json.load(f))
    print(f"  CSCL:    {len(cscl):>12,} records ({time.time()-t2:.1f}s)")

    # Parse dates
    sweeps["ts"] = pd.to_datetime(sweeps["date_visited"], errors="coerce")
    tickets["issue_date_parsed"] = pd.to_datetime(tickets["issue_date"], errors="coerce")

    # Parse ticket times
    times = tickets["violation_time"].apply(parse_violation_time)
    tickets["_hour"] = times.apply(lambda x: x[0])
    tickets["_min"] = times.apply(lambda x: x[1])
    tickets["_minutes"] = tickets["_hour"] * 60 + tickets["_min"]

    # Normalize ticket fields
    tickets["_county"] = tickets["violation_county"].astype(str).str.upper().str.strip()
    tickets["_boro_code"] = tickets["_county"].map(TICKET_COUNTY_TO_BORO)
    tickets["_boro_name"] = tickets["_county"].map(COUNTY_TO_BORO_NAME).fillna("Unknown")
    tickets["_month"] = tickets["issue_date_parsed"].dt.to_period("M")
    tickets["_date"] = tickets["issue_date_parsed"].dt.date
    tickets["_season"] = tickets["issue_date_parsed"].dt.month.map(SEASON_MAP)

    print(f"  Total load time: {time.time()-t0:.1f}s")
    return sweeps, tickets, cscl


# ═══════════════════════════════════════════════════════════════
# CSCL LOOKUP + TICKET MATCHING
# ═══════════════════════════════════════════════════════════════

def parse_hn(raw, is_queens=False):
    """Parse a house number into a comparable integer.

    Queens uses hyphenated block-lot format (e.g. '133-14' = block 133, lot 14).
    CSCL stores these as '133-014'. Tickets may have '133-14' or '13314'.
    We convert to block*10000+lot for proper numeric comparison.

    Non-Queens boroughs use plain numbers ('150') which stay as-is.
    Returns None for empty/zero/unparseable values.
    """
    if not raw or pd.isna(raw):
        return None
    s = str(raw).strip()
    if not s or s == "0":
        return None

    # Hyphenated format: '133-14', '198-008', '133-099'
    m = re.match(r"^(\d+)-(\d+)$", s)
    if m:
        block = int(m.group(1))
        lot = int(m.group(2))
        if block == 0 and lot == 0:
            return None
        return block * 10000 + lot

    # Plain number
    m = re.match(r"^(\d+)$", s)
    if m:
        num = int(m.group(1))
        if num == 0:
            return None
        # Non-hyphenated Queens ticket: '12311' = block 123, lot 11
        # Split: last 2 digits are lot number
        if is_queens and num >= 100:
            block = num // 100
            lot = num % 100
            return block * 10000 + lot
        return num

    return None


def build_cscl_lookup(cscl):
    """Build (normalized_name, boro) -> [{physical_id, ranges: [(lo, hi), ...]}].

    Each side (L/R) of a segment produces its own address range.
    Sides with no addresses (0/0) are skipped.
    """
    print("\nBuilding CSCL lookup...")
    cscl["_boro"] = cscl["boroughcode"].astype(str).str.strip()
    lookup = defaultdict(list)

    for _, row in cscl.iterrows():
        pid = row.get("physicalid")
        if not pid:
            continue
        boro = row["_boro"]
        is_queens = (boro == "4")
        ranges = []
        for side in ["l", "r"]:
            lo_raw = row.get(f"{side}_low_hn")
            hi_raw = row.get(f"{side}_high_hn")
            if lo_raw and hi_raw:
                lo = parse_hn(lo_raw, is_queens=is_queens)
                hi = parse_hn(hi_raw, is_queens=is_queens)
                if lo is not None and hi is not None:
                    ranges.append((min(lo, hi), max(lo, hi)))

        entry = {"physical_id": pid, "ranges": ranges}
        for name_col in ["full_street_name", "stname_label"]:
            norm = normalize_v3(row.get(name_col, ""))
            if norm:
                lookup[(norm, boro)].append(entry)

    print(f"  Lookup keys: {len(lookup):,}")
    return lookup


def match_tickets_to_segments(tickets, lookup):
    """Match each ticket to a CSCL physical_id. Optimized for 1M+ records."""
    print("\nMatching tickets to CSCL segments...")
    t0 = time.time()

    # Pre-normalize all street names (vectorized where possible)
    tickets["_norm_street"] = tickets["street_name"].apply(normalize_v3)

    # Extract house numbers — Queens-aware parsing
    def extract_house_num(row):
        hn = row["house_number"]
        if pd.isna(hn) or not hn:
            return None
        boro = str(row["_boro_code"]) if pd.notna(row["_boro_code"]) else ""
        return parse_hn(hn, is_queens=(boro == "4"))

    tickets["_house_num"] = tickets.apply(extract_house_num, axis=1)

    # Group by unique (street, boro) pairs to avoid redundant lookups
    unique_pairs = tickets.groupby(["_norm_street", "_boro_code"]).size().reset_index()
    print(f"  Unique (street, boro) pairs: {len(unique_pairs):,}")

    # Pre-build segment lookup for each unique pair
    pair_segments = {}
    truncated_matches = 0
    for _, row in unique_pairs.iterrows():
        street = row["_norm_street"]
        boro = row["_boro_code"]
        if not street or pd.isna(boro):
            continue
        key = (street, str(boro))
        segs = lookup.get(key, [])
        if not segs and len(street) >= 15:
            for lk in lookup:
                if lk[1] == str(boro) and lk[0].startswith(street):
                    segs = lookup[lk]
                    truncated_matches += 1
                    break
        if segs:
            pair_segments[(street, str(boro))] = segs

    print(f"  Pairs with CSCL match: {len(pair_segments):,} (incl {truncated_matches} truncated)")

    # Now match each ticket
    matched = 0
    pids = [None] * len(tickets)

    for idx, row in tickets.iterrows():
        street = row["_norm_street"]
        boro = str(row["_boro_code"]) if pd.notna(row["_boro_code"]) else ""
        segs = pair_segments.get((street, boro))
        if not segs:
            continue

        house = row["_house_num"]
        house = None if not pd.notna(house) else house
        pid = None
        if house is not None:
            for seg in segs:
                for lo, hi in seg["ranges"]:
                    if lo <= house <= hi:
                        pid = seg["physical_id"]
                        break
                if pid is not None:
                    break

        if pid is None:
            if len(segs) == 1:
                pid = segs[0]["physical_id"]
            elif house is not None:
                best_pid, best_dist = None, float('inf')
                for seg in segs:
                    for lo, hi in seg["ranges"]:
                        dist = max(0, lo - house) if house < lo else max(0, house - hi) if house > hi else 0
                        if dist < best_dist:
                            best_dist = dist
                            best_pid = seg["physical_id"]
                if best_dist <= 20:
                    pid = best_pid

        if pid is not None:
            pids[idx] = pid
            matched += 1
        else:
            continue

        if (idx + 1) % 200000 == 0:
            elapsed = time.time() - t0
            rate = (idx + 1) / elapsed
            print(f"    {idx+1:>10,} processed, {matched:>10,} matched ({rate:,.0f}/sec)")

    tickets["physical_id"] = pids
    elapsed = time.time() - t0
    match_rate = matched / len(tickets) * 100
    print(f"  Matched: {matched:,} / {len(tickets):,} ({match_rate:.1f}%) in {elapsed:.1f}s")

    # Fill in geocoded letter tickets
    letter_pid_path = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                                   "sweep_analysis_output", "letter_ticket_pids.json")
    if os.path.exists(letter_pid_path):
        import json as _json
        with open(letter_pid_path) as f:
            letter_pids = _json.load(f)
        filled = 0
        for idx, row in tickets.iterrows():
            if pids[idx] is None:
                sn = str(row.get("summons_number", ""))
                if sn in letter_pids:
                    pids[idx] = letter_pids[sn]
                    filled += 1
        tickets["physical_id"] = pids
        matched += filled
        print(f"  + {filled:,} letter tickets filled from geocoding (total {matched:,})")

    return tickets


# ═══════════════════════════════════════════════════════════════
# SWEEP INDEX
# ═══════════════════════════════════════════════════════════════

def build_sweep_index(sweeps):
    """Build (physical_id, date) -> [timestamps] index from 4.67M records."""
    print("\nBuilding sweep index...")
    t0 = time.time()

    # Vectorized prep
    valid = sweeps[sweeps["ts"].notna()].copy()
    valid["_pid_str"] = valid["physical_id"].astype(str).str.strip()
    valid["_date"] = valid["ts"].dt.date

    swept_segments = set(valid["_pid_str"].unique())
    sweep_dates = set(valid["_date"].unique())

    # Group to build index — faster than iterrows
    sweep_index = defaultdict(list)
    segment_dates = defaultdict(set)

    print(f"  Building index from {len(valid):,} valid records...")
    grouped = valid.groupby(["_pid_str", "_date"])["ts"].apply(list)
    for (pid, d), ts_list in grouped.items():
        sweep_index[(pid, d)] = ts_list
        segment_dates[pid].add(d)

    elapsed = time.time() - t0
    print(f"  Index keys: {len(sweep_index):,}")
    print(f"  Swept segments: {len(swept_segments):,}")
    print(f"  Sweep days: {len(sweep_dates):,}")
    print(f"  Built in {elapsed:.1f}s")
    return sweep_index, sweep_dates, swept_segments, segment_dates


# ═══════════════════════════════════════════════════════════════
# PART 1: CROSS-REFERENCE (TICKETS VS SWEEPS)
# ═══════════════════════════════════════════════════════════════

def cross_reference(tickets, sweep_index, sweep_dates, swept_segments):
    """Classify each matched ticket as before/after/same/no-sweep."""
    print("\n" + "=" * 70)
    print("PART 1: CROSS-REFERENCE - TICKETS VS SWEEPS")
    print("=" * 70)

    # Filter: matched tickets on days with sweep coverage
    valid = tickets[
        (tickets["physical_id"].notna()) &
        (tickets["_date"].isin(sweep_dates)) &
        (tickets["_hour"].notna())
    ].copy()
    print(f"\nTickets matched + on covered dates + valid time: {len(valid):,}")

    results = []
    before, after, same, no_sweep, no_seg = 0, 0, 0, 0, 0
    after_mins = []

    t0 = time.time()
    for idx, (_, row) in enumerate(valid.iterrows()):
        pid = str(row["physical_id"]).strip()
        if pid not in swept_segments:
            no_seg += 1
            continue

        ticket_date = row["_date"]
        hour = int(row["_hour"])
        minute = int(row["_min"] or 0)

        # Skip garbage violation_time data
        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            continue

        sweep_times = sweep_index.get((pid, ticket_date), [])
        if not sweep_times:
            cat = "no_sweep"
            no_sweep += 1
            diff_min = None
        else:
            ticket_time = pd.to_datetime(f"{ticket_date} {hour:02d}:{minute:02d}")
            closest = min(sweep_times, key=lambda s: abs((s - ticket_time).total_seconds()))
            diff_min = (ticket_time - closest).total_seconds() / 60

            if abs(diff_min) <= 15:
                cat = "same_time"
                same += 1
            elif diff_min > 0:
                cat = "after_sweep"
                after += 1
                after_mins.append(diff_min)
            else:
                cat = "before_sweep"
                before += 1

        results.append({
            "summons_number": row.get("summons_number"),
            "physical_id": pid,
            "street_name": row.get("street_name"),
            "boro": row["_boro_name"],
            "date": str(ticket_date),
            "month": str(row["_month"]),
            "season": row.get("_season", ""),
            "hour": hour,
            "minute": minute,
            "category": cat,
            "diff_minutes": round(diff_min, 1) if diff_min is not None else None,
        })

        if (idx + 1) % 200000 == 0:
            print(f"    Processed {idx+1:,}...")

    elapsed = time.time() - t0
    print(f"  Classified {len(results):,} tickets in {elapsed:.1f}s")

    # Summary
    total_compared = before + after + same
    total_on_known = total_compared + no_sweep

    print(f"\n  Tickets on known-swept segments:   {total_on_known:,}")
    print(f"    Sweep found same day:            {total_compared:,} ({total_compared/max(1,total_on_known)*100:.1f}%)")
    print(f"    No sweep that day:               {no_sweep:,} ({no_sweep/max(1,total_on_known)*100:.1f}%)")
    print(f"    Segment not in sweep data:       {no_seg:,}")
    print()
    if total_compared:
        print(f"  Timing breakdown ({total_compared:,} tickets):")
        print(f"    BEFORE sweep:  {before:,} ({before/total_compared*100:.1f}%)")
        print(f"    SAME TIME:     {same:,} ({same/total_compared*100:.1f}%)")
        print(f"    AFTER sweep:   {after:,} ({after/total_compared*100:.1f}%)")
        if after_mins:
            avg = sum(after_mins) / len(after_mins)
            med = sorted(after_mins)[len(after_mins) // 2]
            print(f"    Avg gap (after):  {avg:.0f} min")
            print(f"    Median gap:       {med:.0f} min")

    rdf = pd.DataFrame(results)

    # Save detailed cross-reference
    rdf.to_csv(os.path.join(OUT_DIR, "crossref_full_year.csv"), index=False)
    print(f"\n  Saved crossref_full_year.csv ({len(rdf):,} rows)")

    return rdf


# ═══════════════════════════════════════════════════════════════
# PART 2: SEASONALITY ANALYSIS
# ═══════════════════════════════════════════════════════════════

def seasonality_analysis(rdf, sweeps):
    """Break down all metrics by month and season."""
    print("\n" + "=" * 70)
    print("PART 2: SEASONALITY ANALYSIS")
    print("=" * 70)

    # --- 2A: Ticket timing by month ---
    with_sweep = rdf[rdf["category"].isin(["before_sweep", "same_time", "after_sweep"])]

    print(f"\n--- Ticket vs Sweep Timing by Month ---")
    print(f"{'Month':<12s} {'Total':>7s} {'Before':>8s} {'Same':>8s} {'After':>8s} {'After%':>7s}")
    print("-" * 58)

    monthly_stats = []
    for month in sorted(with_sweep["month"].unique()):
        m = with_sweep[with_sweep["month"] == month]
        b = (m["category"] == "before_sweep").sum()
        s = (m["category"] == "same_time").sum()
        a = (m["category"] == "after_sweep").sum()
        total = len(m)
        pct = a / total * 100 if total > 0 else 0
        print(f"  {month:<10s} {total:>7,} {b:>8,} {s:>8,} {a:>8,} {pct:>6.1f}%")
        monthly_stats.append({
            "month": month, "total": total, "before": b,
            "same_time": s, "after": a, "after_pct": round(pct, 1),
        })

    # --- 2B: After-sweep rate by season ---
    print(f"\n--- After-Sweep Rate by Season ---")
    for season in ["Summer", "Fall", "Winter"]:
        s = with_sweep[with_sweep["season"] == season]
        if len(s) == 0:
            continue
        a = (s["category"] == "after_sweep").sum()
        print(f"  {season:<10s} {a:,} / {len(s):,} = {a/len(s)*100:.1f}%")

    # --- 2C: After-sweep rate by borough by month ---
    print(f"\n--- After-Sweep Rate by Borough by Month ---")
    print(f"{'Month':<12s} {'Manhattan':>11s} {'Brooklyn':>11s} {'Queens':>11s} {'Bronx':>11s}")
    print("-" * 60)
    for month in sorted(with_sweep["month"].unique()):
        parts = []
        for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
            sub = with_sweep[(with_sweep["month"] == month) & (with_sweep["boro"] == boro)]
            if len(sub) == 0:
                parts.append("  -  ")
            else:
                a = (sub["category"] == "after_sweep").sum()
                parts.append(f"{a/len(sub)*100:>6.1f}%({len(sub):>4,})")
        # Simplified output
        vals = []
        for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
            sub = with_sweep[(with_sweep["month"] == month) & (with_sweep["boro"] == boro)]
            if len(sub) == 0:
                vals.append("     -     ")
            else:
                a = (sub["category"] == "after_sweep").sum()
                vals.append(f"  {a/len(sub)*100:>5.1f}%   ")
        print(f"  {month:<10s} {''.join(vals)}")

    # --- 2D: Ticket volume by month ---
    print(f"\n--- Total Ticket Volume by Month ---")
    all_monthly = rdf.groupby("month").size()
    for month, count in sorted(all_monthly.items()):
        print(f"  {month}: {count:>8,}")

    # --- 2E: No-sweep rate by month ---
    print(f"\n--- No-Sweep Rate by Month (tickets on swept segments, no sweep that day) ---")
    on_segments = rdf[rdf["category"] != ""]
    for month in sorted(on_segments["month"].unique()):
        m = on_segments[on_segments["month"] == month]
        ns = (m["category"] == "no_sweep").sum()
        total = len(m)
        print(f"  {month:<10s} {ns:,} / {total:,} = {ns/total*100:.1f}% no sweep")

    pd.DataFrame(monthly_stats).to_csv(
        os.path.join(OUT_DIR, "seasonality_monthly.csv"), index=False
    )
    return monthly_stats


# ═══════════════════════════════════════════════════════════════
# PART 3: DOUBLE-SWEEP DETECTION BY SEASON
# ═══════════════════════════════════════════════════════════════

def double_sweep_analysis(sweeps, cscl):
    """Find blocks that get 2+ sweeps per day, broken down by month."""
    print("\n" + "=" * 70)
    print("PART 3: DOUBLE-SWEEP DETECTION BY MONTH")
    print("=" * 70)

    sweeps["_date"] = sweeps["ts"].dt.date
    sweeps["_month"] = sweeps["ts"].dt.to_period("M")
    sweeps["_season"] = sweeps["ts"].dt.month.map(SEASON_MAP)

    # Count sweeps per segment per day
    daily_counts = sweeps.groupby(
        ["physical_id", "_date", "_month", "_season"]
    ).size().reset_index(name="sweep_count")

    total_seg_days = len(daily_counts)
    doubles = daily_counts[daily_counts["sweep_count"] >= 2]
    triples = daily_counts[daily_counts["sweep_count"] >= 3]

    print(f"\nTotal segment-days in data:       {total_seg_days:,}")
    print(f"Segment-days with 2+ sweeps:      {len(doubles):,} ({len(doubles)/total_seg_days*100:.2f}%)")
    print(f"Segment-days with 3+ sweeps:      {len(triples):,} ({len(triples)/total_seg_days*100:.2f}%)")
    print(f"Unique segments ever double-swept: {doubles['physical_id'].nunique():,}")

    # By month
    print(f"\n--- Double-Sweep Rate by Month ---")
    print(f"{'Month':<12s} {'Seg-Days':>10s} {'2+ Sweeps':>10s} {'Rate':>8s} {'3+ Sweeps':>10s}")
    print("-" * 55)

    monthly_double = []
    for month in sorted(daily_counts["_month"].unique()):
        all_m = daily_counts[daily_counts["_month"] == month]
        dbl_m = all_m[all_m["sweep_count"] >= 2]
        tri_m = all_m[all_m["sweep_count"] >= 3]
        rate = len(dbl_m) / len(all_m) * 100 if len(all_m) > 0 else 0
        print(f"  {str(month):<10s} {len(all_m):>10,} {len(dbl_m):>10,} {rate:>7.2f}% {len(tri_m):>10,}")
        monthly_double.append({
            "month": str(month), "total_seg_days": len(all_m),
            "double_sweep_days": len(dbl_m), "rate_pct": round(rate, 2),
            "triple_sweep_days": len(tri_m),
        })

    # By season
    print(f"\n--- Double-Sweep Rate by Season ---")
    for season in ["Spring", "Summer", "Fall", "Winter"]:
        all_s = daily_counts[daily_counts["_season"] == season]
        if len(all_s) == 0:
            continue
        dbl_s = all_s[all_s["sweep_count"] >= 2]
        rate = len(dbl_s) / len(all_s) * 100
        print(f"  {season:<10s} {len(dbl_s):,} / {len(all_s):,} = {rate:.2f}%")

    # Top double-sweep segments — map to street names
    top_doubles = doubles.groupby("physical_id").size().sort_values(ascending=False).head(30)

    # Build pid -> street name map from CSCL
    pid_to_name = {}
    pid_to_boro = {}
    for _, row in cscl.iterrows():
        pid = str(row.get("physicalid", "")).strip()
        name = row.get("full_street_name") or row.get("stname_label") or ""
        boro = BORO_NAMES.get(str(row.get("boroughcode", "")).strip(), "")
        if pid and name:
            pid_to_name[pid] = name
            pid_to_boro[pid] = boro

    print(f"\n--- Top 20 Most Double-Swept Segments ---")
    print(f"{'Segment':<12s} {'Street':<35s} {'Boro':<15s} {'Days':>5s}")
    print("-" * 72)
    for pid, count in top_doubles.head(20).items():
        name = pid_to_name.get(str(pid), "?")
        boro = pid_to_boro.get(str(pid), "?")
        print(f"  {str(pid):<10s} {name:<35s} {boro:<15s} {count:>5}")

    # Double-sweep by borough
    doubles["_boro"] = doubles["physical_id"].astype(str).map(pid_to_boro).fillna("Unknown")
    print(f"\n--- Double-Sweep Frequency by Borough ---")
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]:
        b = doubles[doubles["_boro"] == boro]
        segs = b["physical_id"].nunique()
        days = len(b)
        print(f"  {boro:<15s} {segs:>5,} segments, {days:>6,} double-sweep days")

    pd.DataFrame(monthly_double).to_csv(
        os.path.join(OUT_DIR, "double_sweep_monthly.csv"), index=False
    )

    # Save full double-sweep detail
    doubles_out = doubles.copy()
    doubles_out["street_name"] = doubles_out["physical_id"].astype(str).map(pid_to_name)
    doubles_out["boro"] = doubles_out["_boro"]
    doubles_out[["physical_id", "street_name", "boro", "_date", "sweep_count"]].to_csv(
        os.path.join(OUT_DIR, "double_sweep_full_year.csv"), index=False
    )
    print(f"\n  Saved double_sweep_monthly.csv and double_sweep_full_year.csv")

    return monthly_double


# ═══════════════════════════════════════════════════════════════
# PART 4: INSPECTOR TIMING (FULL DATASET)
# ═══════════════════════════════════════════════════════════════

def inspector_timing_analysis(tickets):
    """Analyze inspector timing patterns with 1M+ tickets."""
    print("\n" + "=" * 70)
    print("PART 4: INSPECTOR TIMING ANALYSIS (FULL DATASET)")
    print("=" * 70)

    valid = tickets[tickets["_hour"].notna()].copy()
    valid["_block"] = valid["street_name"].str.upper().str.strip()

    street_timing = valid.groupby(["_block", "_boro_name"]).agg(
        count=("_minutes", "count"),
        median_min=("_minutes", "median"),
        q25=("_minutes", lambda x: x.quantile(0.25)),
        q75=("_minutes", lambda x: x.quantile(0.75)),
        std=("_minutes", "std"),
    ).reset_index()
    street_timing["spread"] = street_timing["q75"] - street_timing["q25"]

    print(f"\nTotal streets with timing data: {len(street_timing):,}")

    # Feasibility thresholds
    print(f"\n--- Streets by Data Quality Thresholds ---")
    print(f"{'Criteria':<60s} {'Streets':>8s} {'Tickets':>10s}")
    print("-" * 82)

    thresholds = [
        (10, 9999, "Any street with 10+ tickets"),
        (20, 9999, "Any street with 20+ tickets"),
        (50, 9999, "Any street with 50+ tickets"),
        (100, 9999, "Any street with 100+ tickets"),
        (200, 9999, "Any street with 200+ tickets"),
        (500, 9999, "Any street with 500+ tickets"),
        (10, 120, "10+ tickets, spread < 2 hours"),
        (20, 60, "20+ tickets, spread < 1 hour"),
        (20, 30, "20+ tickets, spread < 30 min"),
        (50, 60, "50+ tickets, spread < 1 hour"),
        (50, 30, "50+ tickets, spread < 30 min"),
        (50, 15, "50+ tickets, spread < 15 min"),
        (100, 60, "100+ tickets, spread < 1 hour"),
        (100, 30, "100+ tickets, spread < 30 min"),
        (200, 60, "200+ tickets, spread < 1 hour"),
        (200, 30, "200+ tickets, spread < 30 min"),
    ]
    for min_tix, max_spread, label in thresholds:
        subset = street_timing[
            (street_timing["count"] >= min_tix) &
            (street_timing["spread"] <= max_spread)
        ]
        total_tix = subset["count"].sum()
        print(f"  {label:<58s} {len(subset):>8,} {total_tix:>10,}")

    # Spread distribution
    for min_n, label in [(20, "20+"), (50, "50+"), (100, "100+")]:
        sub = street_timing[street_timing["count"] >= min_n]
        if len(sub) == 0:
            continue
        print(f"\n  Spread distribution (streets with {label} tickets, n={len(sub):,}):")
        for pct in [10, 25, 50, 75, 90]:
            val = sub["spread"].quantile(pct / 100)
            print(f"    {pct}th percentile: {val:.0f} min")

    # By borough
    useful = street_timing[
        (street_timing["count"] >= 50) & (street_timing["spread"] <= 60)
    ]
    print(f"\n--- Useful Streets (50+ tix, <1hr spread) by Borough ---")
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
        count = len(useful[useful["_boro_name"] == boro])
        print(f"  {boro:<15s} {count:>5,} streets")

    # Top 20 most predictable streets
    predictable = street_timing[
        (street_timing["count"] >= 50) & (street_timing["spread"] <= 30)
    ].sort_values("spread").head(20)
    print(f"\n--- Top 20 Most Predictable Streets (50+ tickets) ---")
    print(f"{'Street':<35s} {'Boro':<12s} {'Tix':>5s} {'Median':>8s} {'Spread':>8s}")
    print("-" * 73)
    for _, row in predictable.iterrows():
        med_h = int(row["median_min"] // 60)
        med_m = int(row["median_min"] % 60)
        print(
            f"  {row['_block']:<33s} {row['_boro_name']:<12s} "
            f"{int(row['count']):>5,} {med_h:>2d}:{med_m:02d}    "
            f"{row['spread']:>5.0f} min"
        )

    # Save
    street_timing.to_csv(
        os.path.join(OUT_DIR, "inspector_timing_full_year.csv"), index=False
    )
    print(f"\n  Saved inspector_timing_full_year.csv ({len(street_timing):,} rows)")

    return street_timing


# ═══════════════════════════════════════════════════════════════
# PART 5: POST-SWEEP RETURN PATTERNS (FULL DATASET)
# ═══════════════════════════════════════════════════════════════

def post_sweep_patterns(rdf):
    """Analyze which streets' inspectors come back after sweep."""
    print("\n" + "=" * 70)
    print("PART 5: POST-SWEEP RETURN PATTERNS (FULL DATASET)")
    print("=" * 70)

    with_sweep = rdf[rdf["category"].isin(["before_sweep", "same_time", "after_sweep"])]

    # Per-street, per-day: did any ticket come after the sweep?
    street_days = with_sweep.groupby(["street_name", "boro", "date"]).agg(
        has_after=("category", lambda x: (x == "after_sweep").any()),
        has_before=("category", lambda x: (x == "before_sweep").any()),
        total=("category", "count"),
    ).reset_index()

    street_patterns = street_days.groupby(["street_name", "boro"]).agg(
        ticket_days=("date", "count"),
        after_days=("has_after", "sum"),
        before_days=("has_before", "sum"),
        total_tickets=("total", "sum"),
    ).reset_index()
    street_patterns["after_rate"] = (
        street_patterns["after_days"] / street_patterns["ticket_days"] * 100
    ).round(1)

    print(f"\nTotal streets with cross-ref data: {len(street_patterns):,}")

    # Threshold analysis
    print(f"\n{'Criteria':<60s} {'Streets':>8s}")
    print("-" * 72)

    for min_days, label in [
        (1, "Any street with data"),
        (3, "3+ ticket-days with sweep data"),
        (5, "5+ ticket-days"),
        (8, "8+ ticket-days"),
        (10, "10+ ticket-days"),
        (15, "15+ ticket-days"),
        (20, "20+ ticket-days"),
    ]:
        sub = street_patterns[street_patterns["ticket_days"] >= min_days]
        high = sub[sub["after_rate"] >= 70]
        low = sub[sub["after_rate"] <= 15]
        mid = sub[(sub["after_rate"] > 15) & (sub["after_rate"] < 70)]
        print(f"  {label:<58s} {len(sub):>8,}")
        print(f"    -> Inspector likely returns (>=70%):                  {len(high):>8,}")
        print(f"    -> Inspector rarely returns (<=15%):                  {len(low):>8,}")
        print(f"    -> Unclear / mixed (15-70%):                          {len(mid):>8,}")

    # Distribution at 5+ days
    good = street_patterns[street_patterns["ticket_days"] >= 5]
    print(f"\n--- Distribution of After-Sweep Rate (streets with 5+ days, n={len(good):,}) ---")
    for lo, hi, label in [
        (0, 0, "0% (never returns)"),
        (0.1, 10, "1-10%"),
        (10.1, 20, "11-20%"),
        (20.1, 40, "21-40%"),
        (40.1, 60, "41-60%"),
        (60.1, 80, "61-80%"),
        (80.1, 100, "81-100% (almost always returns)"),
    ]:
        if lo == 0 and hi == 0:
            n = (good["after_rate"] == 0).sum()
        else:
            n = ((good["after_rate"] >= lo) & (good["after_rate"] <= hi)).sum()
        bar = "#" * int(n / max(1, len(good)) * 50)
        print(f"  {label:<35s} {n:>5,}  {bar}")

    # By borough at 5+ days
    print(f"\n--- By Borough (5+ ticket-days) ---")
    print(f"{'Borough':<15s} {'Total':>6s} {'Returns':>8s} {'Rarely':>8s} {'Mixed':>8s}")
    print("-" * 50)
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
        sub = good[good["boro"] == boro]
        if len(sub) == 0:
            continue
        high = (sub["after_rate"] >= 70).sum()
        low = (sub["after_rate"] <= 15).sum()
        mid = len(sub) - high - low
        print(f"  {boro:<13s} {len(sub):>6,} {high:>8,} {low:>8,} {mid:>8,}")

    # Seasonality of post-sweep returns
    print(f"\n--- Post-Sweep Return Rate by Month ---")
    for month in sorted(with_sweep["month"].unique()):
        m = with_sweep[with_sweep["month"] == month]
        a = (m["category"] == "after_sweep").sum()
        total = len(m)
        print(f"  {month}: {a:,} / {total:,} = {a/total*100:.1f}%")

    # Save
    street_patterns.to_csv(
        os.path.join(OUT_DIR, "post_sweep_patterns_full_year.csv"), index=False
    )
    print(f"\n  Saved post_sweep_patterns_full_year.csv ({len(street_patterns):,} rows)")

    return street_patterns


# ═══════════════════════════════════════════════════════════════
# PART 6: COVERAGE ANALYSIS
# ═══════════════════════════════════════════════════════════════

def coverage_analysis(sweeps, cscl, tickets, swept_segments):
    """How much of the city does the sweep data actually cover?"""
    print("\n" + "=" * 70)
    print("PART 6: SWEEP COVERAGE ANALYSIS (FULL YEAR)")
    print("=" * 70)

    # Total sweepable segments (exclude highways etc)
    cscl_pids = set(cscl["physicalid"].astype(str).unique())
    print(f"\nTotal CSCL segments: {len(cscl_pids):,}")
    print(f"Segments with sweep data: {len(swept_segments):,}")
    coverage = len(swept_segments & cscl_pids) / len(cscl_pids) * 100
    print(f"Coverage: {coverage:.1f}%")

    # Coverage by borough
    cscl["_pid_str"] = cscl["physicalid"].astype(str)
    cscl["_boro_name"] = cscl["boroughcode"].astype(str).str.strip().map(BORO_NAMES).fillna("Unknown")

    print(f"\n--- Coverage by Borough ---")
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]:
        boro_pids = set(cscl[cscl["_boro_name"] == boro]["_pid_str"])
        swept = boro_pids & swept_segments
        pct = len(swept) / max(1, len(boro_pids)) * 100
        print(f"  {boro:<15s} {len(swept):>6,} / {len(boro_pids):>6,} = {pct:.1f}%")

    # Coverage by month (how many unique segments swept each month)
    sweeps["_month"] = sweeps["ts"].dt.to_period("M")
    print(f"\n--- Unique Segments Swept by Month ---")
    for month in sorted(sweeps["_month"].unique()):
        m = sweeps[sweeps["_month"] == month]
        n_segs = m["physical_id"].nunique()
        print(f"  {str(month):<10s} {n_segs:>8,} segments swept")

    # Average sweeps per segment per month
    print(f"\n--- Average Sweeps per Segment per Month ---")
    for month in sorted(sweeps["_month"].unique()):
        m = sweeps[sweeps["_month"] == month]
        n_records = len(m)
        n_segs = m["physical_id"].nunique()
        avg = n_records / max(1, n_segs)
        print(f"  {str(month):<10s} {avg:.1f} sweeps/segment")


# ═══════════════════════════════════════════════════════════════
# PART 7: END-OF-MONTH QUOTA ANALYSIS
# ═══════════════════════════════════════════════════════════════

def quota_analysis(tickets):
    """Check for end-of-month enforcement spikes."""
    print("\n" + "=" * 70)
    print("PART 7: END-OF-MONTH QUOTA ANALYSIS")
    print("=" * 70)

    valid = tickets[tickets["_date"].notna()].copy()
    valid["_day"] = valid["issue_date_parsed"].dt.day
    valid["_days_in_month"] = valid["issue_date_parsed"].dt.days_in_month
    valid["_day_position"] = valid["_day"] / valid["_days_in_month"]

    # Group into thirds of month
    def month_third(pos):
        if pos <= 0.33:
            return "First third"
        elif pos <= 0.67:
            return "Middle third"
        else:
            return "Last third"

    valid["_third"] = valid["_day_position"].apply(month_third)

    print(f"\n--- Tickets by Position in Month ---")
    for third in ["First third", "Middle third", "Last third"]:
        n = (valid["_third"] == third).sum()
        pct = n / len(valid) * 100
        print(f"  {third:<15s} {n:>9,} ({pct:.1f}%)")

    # Last 5 days vs rest
    last5 = valid[valid["_days_in_month"] - valid["_day"] < 5]
    rest = valid[valid["_days_in_month"] - valid["_day"] >= 5]
    last5_daily = len(last5) / max(1, last5["_date"].nunique())
    rest_daily = len(rest) / max(1, rest["_date"].nunique())
    print(f"\n  Daily avg (last 5 days of month):   {last5_daily:,.0f} tickets/day")
    print(f"  Daily avg (rest of month):          {rest_daily:,.0f} tickets/day")
    print(f"  Ratio: {last5_daily/max(1,rest_daily):.2f}x")

    # By month
    print(f"\n--- Last-5-Days Ratio by Month ---")
    for month in sorted(valid["_month"].unique()):
        m = valid[valid["_month"] == month]
        m_last5 = m[m["_days_in_month"] - m["_day"] < 5]
        m_rest = m[m["_days_in_month"] - m["_day"] >= 5]
        l5_avg = len(m_last5) / max(1, m_last5["_date"].nunique())
        r_avg = len(m_rest) / max(1, m_rest["_date"].nunique())
        ratio = l5_avg / max(1, r_avg)
        flag = " <-- SPIKE" if ratio > 1.2 else ""
        print(f"  {str(month):<10s} last5={l5_avg:>6,.0f}/day  rest={r_avg:>6,.0f}/day  ratio={ratio:.2f}{flag}")


# ═══════════════════════════════════════════════════════════════
# PART 8: SUMMARY & FEATURE RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════

def write_summary(rdf, street_timing, street_patterns, monthly_double):
    """Write FINDINGS.md with full-year results."""
    print("\n" + "=" * 70)
    print("PART 8: FEATURE FEASIBILITY SUMMARY")
    print("=" * 70)

    # Inspector timing feasibility
    t50_60 = street_timing[
        (street_timing["count"] >= 50) & (street_timing["spread"] <= 60)
    ]
    t100_60 = street_timing[
        (street_timing["count"] >= 100) & (street_timing["spread"] <= 60)
    ]
    t50_30 = street_timing[
        (street_timing["count"] >= 50) & (street_timing["spread"] <= 30)
    ]

    print(f"\n  INSPECTOR TIMING FEATURE:")
    print(f"    Streets at 50+ tix / <1hr spread:   {len(t50_60):,}")
    print(f"    Streets at 100+ tix / <1hr spread:  {len(t100_60):,}")
    print(f"    Streets at 50+ tix / <30min spread: {len(t50_30):,}")
    print(f"    RECOMMENDATION: Show for streets with 50+ tickets and <1hr spread")

    # Post-sweep return feasibility
    good = street_patterns[street_patterns["ticket_days"] >= 5]
    clear_returns = good[good["after_rate"] >= 70]
    clear_no_return = good[good["after_rate"] <= 15]

    print(f"\n  POST-SWEEP RETURN FEATURE:")
    print(f"    Streets with 5+ days of data:       {len(good):,}")
    print(f"    Clear 'returns' (>=70%):             {len(clear_returns):,}")
    print(f"    Clear 'rarely returns' (<=15%):      {len(clear_no_return):,}")
    print(f"    Total clear signal:                  {len(clear_returns) + len(clear_no_return):,}")
    print(f"    RECOMMENDATION: Show for streets with clear signal (>=70% or <=15%)")

    # Double-sweep feature
    print(f"\n  DOUBLE-SWEEP FEATURE:")
    if monthly_double:
        avg_rate = sum(m["rate_pct"] for m in monthly_double) / len(monthly_double)
        max_month = max(monthly_double, key=lambda m: m["rate_pct"])
        min_month = min(monthly_double, key=lambda m: m["rate_pct"])
        print(f"    Average double-sweep rate:          {avg_rate:.2f}%")
        print(f"    Highest month: {max_month['month']} ({max_month['rate_pct']:.2f}%)")
        print(f"    Lowest month:  {min_month['month']} ({min_month['rate_pct']:.2f}%)")
    print(f"    RECOMMENDATION: Flag segments with frequent double-sweeps")

    # Cross-reference summary
    with_sweep = rdf[rdf["category"].isin(["before_sweep", "same_time", "after_sweep"])]
    after_total = (with_sweep["category"] == "after_sweep").sum()
    before_total = (with_sweep["category"] == "before_sweep").sum()
    same_total = (with_sweep["category"] == "same_time").sum()
    total = len(with_sweep)

    print(f"\n  OVERALL CROSS-REFERENCE (n={total:,}):")
    print(f"    Before sweep: {before_total:,} ({before_total/total*100:.1f}%)")
    print(f"    Same time:    {same_total:,} ({same_total/total*100:.1f}%)")
    print(f"    After sweep:  {after_total:,} ({after_total/total*100:.1f}%)")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    total_start = time.time()

    # Load
    sweeps, tickets, cscl = load_data()

    # Match tickets to segments — use step1's matches if available
    match_path = os.path.join(OUT_DIR, "ticket_pid_matches.json")
    if os.path.exists(match_path):
        print(f"\nLoading ticket-to-PID matches from step1...")
        with open(match_path) as f:
            match_map = json.load(f)
        print(f"  Loaded {len(match_map):,} matches from step1")
        pids = [None] * len(tickets)
        matched = 0
        for idx, row in tickets.iterrows():
            sn = str(row.get("summons_number", ""))
            if sn in match_map:
                pids[idx] = match_map[sn]
                matched += 1
        tickets["physical_id"] = pids
        print(f"  Applied: {matched:,} / {len(tickets):,} ({matched/len(tickets)*100:.1f}%)")
    else:
        print(f"\nWARNING: No step1 matches found at {match_path}")
        print(f"  Run skip_step1_chronic.py first! Falling back to independent matching...")
        lookup = build_cscl_lookup(cscl)
        tickets = match_tickets_to_segments(tickets, lookup)

    # Build sweep index
    sweep_index, sweep_dates, swept_segments, segment_dates = build_sweep_index(sweeps)

    # Part 1: Cross-reference
    rdf = cross_reference(tickets, sweep_index, sweep_dates, swept_segments)

    # Part 2: Seasonality
    seasonality_analysis(rdf, sweeps)

    # Part 3: Double-sweep detection
    monthly_double = double_sweep_analysis(sweeps, cscl)

    # Part 4: Inspector timing
    street_timing = inspector_timing_analysis(tickets)

    # Part 5: Post-sweep return patterns
    street_patterns = post_sweep_patterns(rdf)

    # Part 6: Coverage
    coverage_analysis(sweeps, cscl, tickets, swept_segments)

    # Part 7: Quota analysis
    quota_analysis(tickets)

    # Part 8: Summary
    write_summary(rdf, street_timing, street_patterns, monthly_double)

    total_elapsed = time.time() - total_start
    print(f"\n{'=' * 70}")
    print(f"COMPLETE - Total time: {total_elapsed/60:.1f} minutes")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
