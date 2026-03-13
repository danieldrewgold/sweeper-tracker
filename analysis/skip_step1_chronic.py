"""
Step 1: Chronic Skip Analysis

For each block segment, calculate how often it gets skipped vs swept.

Methodology:
  An "ASP-active day" is any day where EITHER:
    - A ticket was issued on this segment (proof ASP was enforced), OR
    - A sweep GPS record exists (proof sweeper came)

  If we see a ticket but NO sweep during that ASP window → SKIP
  If we see a sweep → SWEPT (regardless of ticket)

  Skip rate = (ASP-active days without sweep) / (total ASP-active days)

This is conservative: we only count days where we KNOW ASP was active,
and we use the ASP window-specific matching (not just "same day").
"""
import json
import os
import re
import sys
import time
from collections import defaultdict

import pandas as pd

sys.path.insert(0, ".")
from analysis.improved_crossref import normalize_v3, TICKET_COUNTY_TO_BORO

OUT_DIR = "sweep_analysis_output"
BORO_NAMES = {
    "1": "Manhattan", "2": "Bronx", "3": "Brooklyn",
    "4": "Queens", "5": "Staten Island",
}


def parse_asp_time(val):
    if not val or pd.isna(val):
        return None
    val = str(val).strip().upper()
    m = re.match(r"^(\d{2,4})([AP])$", val)
    if not m:
        return None
    time_part, ampm = m.group(1), m.group(2)
    hour = int(time_part[:-2]) if len(time_part) > 2 else int(time_part)
    minute = int(time_part[-2:]) if len(time_part) > 2 else 0
    if hour > 23 or minute > 59:
        return None
    if ampm == "P" and hour != 12:
        hour += 12
    elif ampm == "A" and hour == 12:
        hour = 0
    return hour * 60 + minute


def fix_asp_window(s, e):
    if s is None or e is None:
        return None, None
    if e >= s:
        return (s, e) if (e - s) <= 720 else (None, None)
    if e < 60:
        fe = e + 720
        if 15 <= (fe - s) <= 720:
            return s, fe
    if s >= 720:
        fs = s - 720
        if 15 <= (e - fs) <= 720:
            return fs, e
    we = e + 1440
    if 15 <= (we - s) <= 720:
        return s, we
    return None, None


def main():
    t_start = time.time()

    # ─── Load ───
    print("Loading data...")
    with open("sweep_data/tickets_full_year.json") as f:
        tickets = pd.DataFrame(json.load(f))
    with open("sweep_data/sweep_gps_full_year.json") as f:
        sweeps = pd.DataFrame(json.load(f))
    with open("sweep_data/cscl_centerline.json") as f:
        cscl = pd.DataFrame(json.load(f))
    print(f"  Loaded in {time.time()-t_start:.1f}s")

    # ─── Parse ───
    tickets["issue_date_parsed"] = pd.to_datetime(tickets["issue_date"], errors="coerce")
    tickets["_date"] = tickets["issue_date_parsed"].dt.date
    tickets["_county"] = tickets["violation_county"].astype(str).str.upper().str.strip()
    tickets["_boro_code"] = tickets["_county"].map(TICKET_COUNTY_TO_BORO)
    tickets["_asp_start_raw"] = tickets["from_hours_in_effect"].apply(parse_asp_time)
    tickets["_asp_end_raw"] = tickets["to_hours_in_effect"].apply(parse_asp_time)
    fixed = tickets.apply(
        lambda r: fix_asp_window(r["_asp_start_raw"], r["_asp_end_raw"]),
        axis=1, result_type="expand",
    )
    tickets["_asp_start"] = fixed[0]
    tickets["_asp_end"] = fixed[1]

    sweeps["ts"] = pd.to_datetime(sweeps["date_visited"], errors="coerce")

    # ─── Build CSCL lookup ───
    print("Building CSCL lookup...")
    cscl["_boro"] = cscl["boroughcode"].astype(str).str.strip()
    MAX_ADDR_SPAN = 300  # Exclude segments spanning > 300 house numbers (junk drawer)
    lookup = defaultdict(list)
    pid_to_name = {}
    pid_to_boro = {}
    pid_to_span = {}
    for _, row in cscl.iterrows():
        pid = str(row.get("physicalid", "")).strip()
        name = row.get("full_street_name") or row.get("stname_label") or ""
        boro_code = row["_boro"]
        boro_name = BORO_NAMES.get(boro_code, "Unknown")
        if pid:
            pid_to_name[pid] = name
            pid_to_boro[pid] = boro_name
        low, high = None, None
        for side in ["l", "r"]:
            lo_raw = row.get(f"{side}_low_hn")
            hi_raw = row.get(f"{side}_high_hn")
            if lo_raw and hi_raw:
                try:
                    lo = int(re.match(r"(\d+)", str(lo_raw)).group(1))
                    hi = int(re.match(r"(\d+)", str(hi_raw)).group(1))
                    if low is None or lo < low:
                        low = lo
                    if high is None or hi > high:
                        high = hi
                except Exception:
                    pass
        span = (high - low) if (low is not None and high is not None) else 0
        if pid:
            pid_to_span[pid] = span
        entry = {"physical_id": pid, "addr_low": low, "addr_high": high}
        for name_col in ["full_street_name", "stname_label"]:
            norm = normalize_v3(row.get(name_col, ""))
            if norm:
                lookup[(norm, boro_code)].append(entry)

    # ─── Match tickets to segments ───
    print("Matching tickets to segments...")
    t0 = time.time()
    tickets["_norm_street"] = tickets["street_name"].apply(normalize_v3)

    def extract_hn(hn):
        if pd.isna(hn) or not hn:
            return None
        m = re.match(r"(\d+)", str(hn).strip())
        return int(m.group(1)) if m else None

    tickets["_house_num"] = tickets["house_number"].apply(extract_hn)
    unique_pairs = tickets.groupby(["_norm_street", "_boro_code"]).size().reset_index()
    pair_segments = {}
    for _, row in unique_pairs.iterrows():
        street = row["_norm_street"]
        boro = row["_boro_code"]
        if not street or pd.isna(boro):
            continue
        key = (street, str(boro))
        segs = lookup.get(key, [])
        if not segs:
            for lk in lookup:
                if lk[1] != str(boro):
                    continue
                # Truncated ticket name: CSCL name starts with ticket name
                if len(street) >= 15 and lk[0].startswith(street):
                    segs = lookup[lk]
                    break
                # Directional suffix: "LORING PL" -> "LORING PL N"
                if lk[0].startswith(street + " ") and len(lk[0]) - len(street) <= 3:
                    segs.extend(lookup[lk])
        if segs:
            pair_segments[(street, str(boro))] = segs

    pids = [None] * len(tickets)
    for idx, row in tickets.iterrows():
        street = row["_norm_street"]
        boro = str(row["_boro_code"]) if pd.notna(row["_boro_code"]) else ""
        segs = pair_segments.get((street, boro))
        if not segs:
            continue
        house = row["_house_num"]
        pid = None
        if house is not None:
            for seg in segs:
                if seg["addr_low"] is not None and seg["addr_high"] is not None:
                    if seg["addr_low"] <= house <= seg["addr_high"]:
                        pid = seg["physical_id"]
                        break
        if pid is None:
            pid = segs[0]["physical_id"]
        pids[idx] = pid
    tickets["physical_id"] = pids
    matched = sum(1 for p in pids if p is not None)
    print(f"  Matched: {matched:,} in {time.time()-t0:.1f}s")

    # ─── Build sweep index: (pid, date) -> [minutes_from_midnight] ───
    print("Building sweep index...")
    t0 = time.time()
    valid_s = sweeps[sweeps["ts"].notna()].copy()
    valid_s["_pid"] = valid_s["physical_id"].astype(str).str.strip()
    valid_s["_date"] = valid_s["ts"].dt.date
    swept_segments = set(valid_s["_pid"].unique())

    sweep_index = defaultdict(list)
    grouped = valid_s.groupby(["_pid", "_date"])["ts"].apply(list)
    for (pid, d), ts_list in grouped.items():
        sweep_index[(pid, d)] = [ts.hour * 60 + ts.minute for ts in ts_list]
    print(f"  Built in {time.time()-t0:.1f}s ({len(sweep_index):,} keys)")

    # ═══════════════════════════════════════════════════════════
    # PER-SEGMENT SKIP RATE CALCULATION
    # ═══════════════════════════════════════════════════════════
    print("\nCalculating per-segment skip rates...")
    t0 = time.time()

    # For each segment, collect all ticket-dates and their ASP windows
    # Then check if sweep occurred during that window
    segment_data = defaultdict(lambda: {"swept_days": 0, "skipped_days": 0,
                                         "total_tickets": 0, "no_sweep_tickets": 0})

    has_window = tickets["_asp_start"].notna() & tickets["_asp_end"].notna()
    has_pid = tickets["physical_id"].notna()
    valid_tickets = tickets[has_window & has_pid].copy()
    valid_tickets["_pid_str"] = valid_tickets["physical_id"].apply(
        lambda x: str(x).strip()
    )
    valid_tickets = valid_tickets[valid_tickets["_pid_str"].isin(swept_segments)]

    print(f"  Valid tickets (matched + in GPS + has window): {len(valid_tickets):,}")

    # Group by segment + date to avoid counting the same day twice
    # For each (segment, date), get the ASP window(s)
    seg_date_groups = valid_tickets.groupby(["_pid_str", "_date"]).agg(
        asp_starts=("_asp_start", list),
        asp_ends=("_asp_end", list),
        n_tickets=("_asp_start", "count"),
    ).reset_index()

    print(f"  Unique (segment, date) pairs: {len(seg_date_groups):,}")

    # For each (segment, date): was the segment swept during ANY of its ASP windows?
    buffer = 15
    seg_stats = defaultdict(lambda: {"swept_days": 0, "skipped_days": 0, "total_tickets": 0})

    for _, row in seg_date_groups.iterrows():
        pid = row["_pid_str"]
        d = row["_date"]
        starts = row["asp_starts"]
        ends = row["asp_ends"]
        n_tix = row["n_tickets"]

        sweep_mins = sweep_index.get((pid, d), [])

        swept = False
        if sweep_mins:
            for s, e in zip(starts, ends):
                ws = s - buffer
                we = e + buffer
                for sm in sweep_mins:
                    if ws <= sm <= we:
                        swept = True
                        break
                    if we > 1440 and sm <= (we - 1440):
                        swept = True
                        break
                if swept:
                    break

        if swept:
            seg_stats[pid]["swept_days"] += 1
        else:
            seg_stats[pid]["skipped_days"] += 1
        seg_stats[pid]["total_tickets"] += n_tix

    # Also count sweep-only days (swept but no ticket)
    # This matters for accurate skip rate denominator
    for pid in seg_stats:
        # Count total days this segment was swept in the full year
        total_sweep_days = sum(1 for key in sweep_index if key[0] == pid)
        seg_stats[pid]["total_sweep_days_gps"] = total_sweep_days

    # Actually, iterating all sweep_index keys per segment is slow.
    # Pre-build segment -> total sweep days
    print("  Counting total sweep days per segment...")
    seg_total_sweep_days = defaultdict(int)
    for (pid, d) in sweep_index:
        seg_total_sweep_days[pid] += 1

    # Build final results (filter out junk drawer segments)
    junk_excluded = 0
    junk_tickets = 0
    results = []
    for pid, stats in seg_stats.items():
        if pid_to_span.get(pid, 0) > MAX_ADDR_SPAN:
            junk_excluded += 1
            junk_tickets += stats["total_tickets"]
            continue
        swept_days = stats["swept_days"]        # ticket-days with sweep
        skipped_days = stats["skipped_days"]     # ticket-days without sweep
        total_tickets = stats["total_tickets"]

        # Total sweep days from GPS (includes days with no tickets)
        gps_sweep_days = seg_total_sweep_days.get(pid, 0)

        # Sweep-only days = GPS sweep days that aren't ticket days
        sweep_only_days = max(0, gps_sweep_days - swept_days)

        # Total ASP-active days = ticket-days + sweep-only days
        total_asp_days = swept_days + skipped_days + sweep_only_days

        skip_rate = skipped_days / max(1, total_asp_days) * 100

        results.append({
            "physical_id": pid,
            "street_name": pid_to_name.get(pid, ""),
            "boro": pid_to_boro.get(pid, "Unknown"),
            "total_asp_days": total_asp_days,
            "swept_days": swept_days + sweep_only_days,  # all days with sweep
            "skipped_days": skipped_days,
            "skip_rate": round(skip_rate, 1),
            "total_tickets": total_tickets,
            "tickets_on_skip_days": skipped_days,  # proxy (at least 1 ticket per skip day)
        })

    rdf = pd.DataFrame(results)
    elapsed = time.time() - t0
    print(f"  Computed {len(rdf):,} segment skip rates in {elapsed:.1f}s")
    print(f"  Excluded {junk_excluded:,} junk-drawer segments (addr span > {MAX_ADDR_SPAN}) with {junk_tickets:,} tickets")

    # Count actual tickets on skip days more precisely
    skip_ticket_counts = valid_tickets.copy()
    skip_ticket_counts["_key"] = skip_ticket_counts["_pid_str"] + "|" + skip_ticket_counts["_date"].astype(str)

    # Build set of skip keys
    skip_keys = set()
    for _, row in seg_date_groups.iterrows():
        pid = row["_pid_str"]
        d = row["_date"]
        sweep_mins = sweep_index.get((pid, d), [])
        swept = False
        if sweep_mins:
            for s, e in zip(row["asp_starts"], row["asp_ends"]):
                for sm in sweep_mins:
                    if (s - buffer) <= sm <= (e + buffer):
                        swept = True
                        break
                if swept:
                    break
        if not swept and pid_to_span.get(pid, 0) <= MAX_ADDR_SPAN:
            skip_keys.add(f"{pid}|{d}")

    skip_ticket_mask = skip_ticket_counts["_key"].isin(skip_keys)
    tickets_on_skips = skip_ticket_counts[skip_ticket_mask].groupby("_pid_str").size().to_dict()
    rdf["tickets_on_skip_days"] = rdf["physical_id"].map(tickets_on_skips).fillna(0).astype(int)

    # ═══════════════════════════════════════════════════════════
    # RESULTS
    # ═══════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("STEP 1: CHRONIC SKIP ANALYSIS")
    print("=" * 70)

    # Filter to segments with meaningful data
    min_days = 10  # at least 10 ASP-active days for reliable rate
    reliable = rdf[rdf["total_asp_days"] >= min_days].copy()

    print(f"\nTotal segments with ticket + sweep data: {len(rdf):,}")
    print(f"Segments with {min_days}+ ASP-active days:      {len(reliable):,}")

    # Bucket analysis
    print(f"\n--- Skip Rate Buckets (segments with {min_days}+ days) ---")
    print(f"{'Skip Rate':<25s} {'Segments':>10s} {'% of Total':>10s} {'Avg Tickets':>12s}")
    print("-" * 62)

    buckets = [
        (0, 0, "0% (never skipped)"),
        (0.1, 10, "1-10%"),
        (10.1, 20, "11-20%"),
        (20.1, 30, "21-30%"),
        (30.1, 40, "31-40%"),
        (40.1, 50, "41-50%"),
        (50.1, 60, "51-60%"),
        (60.1, 75, "61-75%"),
        (75.1, 90, "76-90%"),
        (90.1, 100, "91-100% (almost always)"),
    ]
    for lo, hi, label in buckets:
        if lo == 0 and hi == 0:
            sub = reliable[reliable["skip_rate"] == 0]
        else:
            sub = reliable[(reliable["skip_rate"] >= lo) & (reliable["skip_rate"] <= hi)]
        avg_tix = sub["total_tickets"].mean() if len(sub) > 0 else 0
        pct = len(sub) / max(1, len(reliable)) * 100
        print(f"  {label:<23s} {len(sub):>10,} {pct:>9.1f}% {avg_tix:>11.0f}")

    # Key thresholds
    over50 = reliable[reliable["skip_rate"] >= 50]
    over75 = reliable[reliable["skip_rate"] >= 75]
    over90 = reliable[reliable["skip_rate"] >= 90]
    print(f"\n  Segments skipped 50%+ of the time: {len(over50):,}")
    print(f"  Segments skipped 75%+ of the time: {len(over75):,}")
    print(f"  Segments skipped 90%+ of the time: {len(over90):,}")
    print(f"  Total tickets on 50%+ skip blocks: {over50['total_tickets'].sum():,}")

    # Borough breakdown
    print(f"\n--- Skip Rate by Borough (segments with {min_days}+ days) ---")
    print(f"  {'Borough':<15s} {'Segments':>10s} {'Median Skip%':>12s} {'50%+ Skip':>10s} {'75%+ Skip':>10s}")
    print(f"  {'-' * 62}")
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
        b = reliable[reliable["boro"] == boro]
        if len(b) == 0:
            continue
        med = b["skip_rate"].median()
        o50 = (b["skip_rate"] >= 50).sum()
        o75 = (b["skip_rate"] >= 75).sum()
        print(f"  {boro:<15s} {len(b):>10,} {med:>11.1f}% {o50:>10,} {o75:>10,}")

    # Top 50 most chronically skipped
    top50 = reliable.sort_values("skip_rate", ascending=False).head(50)
    print(f"\n--- Top 50 Most Chronically Skipped Blocks ({min_days}+ ASP days) ---")
    print(f"  {'#':<4s} {'Street':<30s} {'Boro':<12s} {'Skip%':>6s} {'Skip/Total':>12s} {'Tickets':>8s}")
    print(f"  {'-' * 76}")
    for rank, (_, row) in enumerate(top50.iterrows(), 1):
        print(
            f"  {rank:<4d} {row['street_name']:<30s} {row['boro']:<12s} "
            f"{row['skip_rate']:>5.1f}% "
            f"{int(row['skipped_days']):>4d}/{int(row['total_asp_days']):>4d}    "
            f"{int(row['total_tickets']):>8,}"
        )

    # Save
    rdf.sort_values("skip_rate", ascending=False).to_csv(
        os.path.join(OUT_DIR, "step1_segment_skip_rates.csv"), index=False
    )
    print(f"\n  Saved step1_segment_skip_rates.csv ({len(rdf):,} rows)")

    total_elapsed = time.time() - t_start
    print(f"\n  Total time: {total_elapsed/60:.1f} minutes")


if __name__ == "__main__":
    main()
