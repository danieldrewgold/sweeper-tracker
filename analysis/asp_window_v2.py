"""
ASP Window Analysis v2 — Side-of-Street Aware

Fixes the side-of-street problem from v1 by splitting "no sweep found"
into two distinct categories:

  - sweep_confirmed:    Sweep GPS during this ticket's ASP window -> correct side swept
  - no_sweep_all_day:   No sweep GPS on this segment AT ALL that day -> sweeper never came
  - sweep_wrong_window: Sweep GPS exists that day but outside ASP window -> likely other side
  - inconclusive:       Segment not in GPS system, unparseable window, or no date coverage

"no_sweep_all_day" is the strong, defensible claim: the sweeper genuinely never
visited this block on the day the ticket was issued, regardless of side.

"sweep_wrong_window" means the sweeper was on the block, but the GPS timestamp
doesn't fall within the ASP window on the ticket. For two-window blocks this
almost certainly means the sweeper was doing the other side's window. For
single-window blocks, it could mean the sweeper ran early/late.
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
os.makedirs(OUT_DIR, exist_ok=True)

BORO_NAMES = {
    "1": "Manhattan", "2": "Bronx", "3": "Brooklyn",
    "4": "Queens", "5": "Staten Island",
}
COUNTY_TO_BORO_NAME = {
    k: BORO_NAMES.get(v, v) for k, v in TICKET_COUNTY_TO_BORO.items()
}


def parse_asp_time(val):
    """Parse ASP time string to minutes from midnight."""
    if not val or pd.isna(val):
        return None
    val = str(val).strip().upper()
    m = re.match(r"^(\d{2,4})([AP])$", val)
    if not m:
        return None
    time_part = m.group(1)
    ampm = m.group(2)
    if len(time_part) <= 2:
        hour = int(time_part)
        minute = 0
    else:
        hour = int(time_part[:-2])
        minute = int(time_part[-2:])
    if hour > 23 or minute > 59:
        return None
    if ampm == "P" and hour != 12:
        hour += 12
    elif ampm == "A" and hour == 12:
        hour = 0
    return hour * 60 + minute


def fix_asp_window(start_min, end_min):
    """Fix 12:xx AM parsing for ASP windows."""
    if start_min is None or end_min is None:
        return None, None
    if end_min >= start_min:
        duration = end_min - start_min
        if duration > 720:
            return None, None
        return start_min, end_min
    if end_min < 60:
        fixed_end = end_min + 720
        duration = fixed_end - start_min
        if 15 <= duration <= 720:
            return start_min, fixed_end
    if start_min >= 720:
        fixed_start = start_min - 720
        duration = end_min - fixed_start
        if 15 <= duration <= 720:
            return fixed_start, end_min
    wrapped_end = end_min + 1440
    duration = wrapped_end - start_min
    if 15 <= duration <= 720:
        return start_min, wrapped_end
    return None, None


def main():
    total_start = time.time()

    # ─── Load ───
    print("Loading data...")
    t0 = time.time()
    with open("sweep_data/tickets_full_year.json") as f:
        tickets = pd.DataFrame(json.load(f))
    with open("sweep_data/sweep_gps_full_year.json") as f:
        sweeps = pd.DataFrame(json.load(f))
    with open("sweep_data/cscl_centerline.json") as f:
        cscl = pd.DataFrame(json.load(f))
    print(f"  Loaded in {time.time()-t0:.1f}s")

    # ─── Parse ticket fields ───
    tickets["issue_date_parsed"] = pd.to_datetime(tickets["issue_date"], errors="coerce")
    tickets["_date"] = tickets["issue_date_parsed"].dt.date
    tickets["_month"] = tickets["issue_date_parsed"].dt.to_period("M")
    tickets["_county"] = tickets["violation_county"].astype(str).str.upper().str.strip()
    tickets["_boro_code"] = tickets["_county"].map(TICKET_COUNTY_TO_BORO)
    tickets["_boro_name"] = tickets["_county"].map(COUNTY_TO_BORO_NAME).fillna("Unknown")

    # Parse ASP windows
    tickets["_asp_start_raw"] = tickets["from_hours_in_effect"].apply(parse_asp_time)
    tickets["_asp_end_raw"] = tickets["to_hours_in_effect"].apply(parse_asp_time)
    fixed = tickets.apply(
        lambda r: fix_asp_window(r["_asp_start_raw"], r["_asp_end_raw"]),
        axis=1, result_type="expand",
    )
    tickets["_asp_start"] = fixed[0]
    tickets["_asp_end"] = fixed[1]

    has_window = tickets["_asp_start"].notna() & tickets["_asp_end"].notna()
    print(f"  Parseable ASP windows: {has_window.sum():,} / {len(tickets):,}")

    # ─── Build CSCL lookup ───
    print("Building CSCL lookup...")
    cscl["_boro"] = cscl["boroughcode"].astype(str).str.strip()
    lookup = defaultdict(list)
    for _, row in cscl.iterrows():
        pid = row.get("physicalid")
        if not pid:
            continue
        boro = row["_boro"]
        low, high = None, None
        for side in ["l", "r"]:
            lo_raw = row.get(f"{side}_low_hn")
            hi_raw = row.get(f"{side}_high_hn")
            if lo_raw and hi_raw:
                try:
                    lo = int(re.match(r"(\d+)", str(lo_raw)).group(1))
                    hi = int(re.match(r"(\d+)", str(hi_raw)).group(1))
                    if lo == 0 and hi == 0:
                        continue  # 0-0 means no data for this side
                    if lo == 0:
                        lo = hi  # treat as single-point range
                    if low is None or lo < low:
                        low = lo
                    if high is None or hi > high:
                        high = hi
                except Exception:
                    pass
        entry = {"physical_id": pid, "addr_low": low, "addr_high": high}
        for name_col in ["full_street_name", "stname_label"]:
            norm = normalize_v3(row.get(name_col, ""))
            if norm:
                lookup[(norm, boro)].append(entry)
    print(f"  Lookup keys: {len(lookup):,}")

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
        if not segs and len(street) >= 15:
            for lk in lookup:
                if lk[1] == str(boro) and lk[0].startswith(street):
                    segs = lookup[lk]
                    break
        if segs:
            pair_segments[(street, str(boro))] = segs

    matched = 0
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
            continue  # no range match — skip rather than assign to wrong segment
        pids[idx] = pid
        matched += 1
        if (idx + 1) % 200000 == 0:
            print(f"    {idx+1:,} processed, {matched:,} matched")
    tickets["physical_id"] = pids
    print(f"  Matched: {matched:,} / {len(tickets):,} ({matched/len(tickets)*100:.1f}%) in {time.time()-t0:.1f}s")

    # ─── Build sweep index ───
    print("Building sweep index...")
    t0 = time.time()
    sweeps["ts"] = pd.to_datetime(sweeps["date_visited"], errors="coerce")
    valid_s = sweeps[sweeps["ts"].notna()].copy()
    valid_s["_pid_str"] = valid_s["physical_id"].astype(str).str.strip()
    valid_s["_date"] = valid_s["ts"].dt.date

    swept_segments = set(valid_s["_pid_str"].unique())
    sweep_dates = set(valid_s["_date"].unique())

    # (pid, date) -> [minutes_from_midnight, ...]
    sweep_index = defaultdict(list)
    grouped = valid_s.groupby(["_pid_str", "_date"])["ts"].apply(list)
    for (pid, d), ts_list in grouped.items():
        sweep_index[(pid, d)] = [ts.hour * 60 + ts.minute for ts in ts_list]
    print(f"  Index keys: {len(sweep_index):,}, built in {time.time()-t0:.1f}s")

    # ─── Build segment ASP schedule from ticket data ───
    # For each physical_id, what distinct ASP windows exist?
    print("Building segment ASP schedules...")
    segment_windows = defaultdict(set)
    for _, row in tickets[tickets["physical_id"].notna() & has_window].iterrows():
        pid = str(row["physical_id"]).strip()
        window_key = (row["_asp_start"], row["_asp_end"])
        segment_windows[pid].add(window_key)

    n_windows_dist = defaultdict(int)
    for pid, windows in segment_windows.items():
        n_windows_dist[min(len(windows), 4)] += 1
    print(f"  Segments with 1 ASP window:  {n_windows_dist.get(1, 0):,}")
    print(f"  Segments with 2 ASP windows: {n_windows_dist.get(2, 0):,}")
    print(f"  Segments with 3+ windows:    {n_windows_dist.get(3, 0) + n_windows_dist.get(4, 0):,}")

    # ═══════════════════════════════════════════════════════════
    # CLASSIFY EACH TICKET
    # ═══════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("CLASSIFYING TICKETS (SIDE-AWARE)")
    print("=" * 70)

    results = []
    counts = defaultdict(int)
    t0 = time.time()

    for idx, (_, row) in enumerate(tickets.iterrows()):
        pid_raw = row.get("physical_id")
        asp_start = row["_asp_start"]
        asp_end = row["_asp_end"]
        ticket_date = row["_date"]

        # ─── Inconclusive checks ───
        if pd.isna(pid_raw) or pid_raw is None:
            cat = "inconclusive"
            reason = "no_segment_match"
            counts["inconclusive_no_match"] += 1
        elif pd.isna(asp_start) or pd.isna(asp_end):
            cat = "inconclusive"
            reason = "unparseable_asp_window"
            counts["inconclusive_no_window"] += 1
        else:
            pid = str(pid_raw).strip()
            if pid not in swept_segments:
                cat = "inconclusive"
                reason = "segment_not_in_gps"
                counts["inconclusive_no_gps"] += 1
            elif ticket_date not in sweep_dates:
                cat = "inconclusive"
                reason = "date_not_in_sweep_data"
                counts["inconclusive_no_date"] += 1
            else:
                sweep_mins = sweep_index.get((pid, ticket_date), [])

                if not sweep_mins:
                    # ═══ NO SWEEP ON THIS SEGMENT ALL DAY ═══
                    # Strongest finding: sweeper never came to this block
                    cat = "no_sweep_all_day"
                    reason = "no_gps_record_on_segment_this_day"
                    counts["no_sweep_all_day"] += 1
                else:
                    # Sweep(s) exist on this segment this day.
                    # Did any fall within the ticket's ASP window?
                    buffer = 15  # minutes
                    window_start = asp_start - buffer
                    window_end = asp_end + buffer

                    in_window = False
                    for sm in sweep_mins:
                        if window_start <= sm <= window_end:
                            in_window = True
                            break
                        if window_end > 1440 and sm <= (window_end - 1440):
                            in_window = True
                            break

                    if in_window:
                        cat = "sweep_confirmed"
                        reason = "sweep_during_asp_window"
                        counts["sweep_confirmed"] += 1
                    else:
                        # Sweep exists but outside this ASP window.
                        # Check: is there a DIFFERENT known ASP window
                        # on this segment that the sweep DOES match?
                        other_windows = segment_windows.get(pid, set())
                        matched_other = False
                        for ow_start, ow_end in other_windows:
                            if (ow_start, ow_end) == (asp_start, asp_end):
                                continue
                            ow_s = ow_start - buffer
                            ow_e = ow_end + buffer
                            for sm in sweep_mins:
                                if ow_s <= sm <= ow_e:
                                    matched_other = True
                                    break
                            if matched_other:
                                break

                        if matched_other:
                            cat = "sweep_wrong_window"
                            reason = "sweep_during_other_sides_window"
                            counts["sweep_other_side"] += 1
                        else:
                            # Sweep on segment but doesn't match ANY known window.
                            # Could be early/late sweeper, schedule mismatch, etc.
                            cat = "sweep_wrong_window"
                            reason = "sweep_outside_any_known_window"
                            counts["sweep_unmatched_time"] += 1

        results.append({
            "summons_number": row.get("summons_number"),
            "physical_id": str(pid_raw) if pd.notna(pid_raw) else "",
            "street_name": row.get("street_name", ""),
            "house_number": row.get("house_number", ""),
            "boro": row["_boro_name"],
            "date": str(ticket_date) if ticket_date else "",
            "month": str(row["_month"]),
            "asp_window": f"{row['from_hours_in_effect']}-{row['to_hours_in_effect']}",
            "category": cat,
            "reason": reason,
            "violation_precinct": row.get("violation_precinct", ""),
        })

        if (idx + 1) % 200000 == 0:
            elapsed = time.time() - t0
            print(f"    {idx+1:,} classified ({elapsed:.0f}s)")

    elapsed = time.time() - t0
    print(f"\n  Classified {len(results):,} tickets in {elapsed:.1f}s")

    # ═══════════════════════════════════════════════════════════
    # RESULTS
    # ═══════════════════════════════════════════════════════════
    rdf = pd.DataFrame(results)
    total = len(rdf)

    confirmed = (rdf["category"] == "sweep_confirmed").sum()
    no_sweep = (rdf["category"] == "no_sweep_all_day").sum()
    wrong_window = (rdf["category"] == "sweep_wrong_window").sum()
    inconclusive = (rdf["category"] == "inconclusive").sum()

    print(f"\n{'=' * 70}")
    print("RESULTS: 4-CATEGORY CLASSIFICATION")
    print(f"{'=' * 70}")

    print(f"\n  ALL {total:,} TICKETS:")
    print(f"  {'Category':<30s} {'Count':>10s} {'%':>7s}")
    print(f"  {'-' * 50}")
    print(f"  {'Sweep confirmed':<30s} {confirmed:>10,} {confirmed/total*100:>6.1f}%")
    print(f"  {'No sweep all day':<30s} {no_sweep:>10,} {no_sweep/total*100:>6.1f}%")
    print(f"  {'Sweep wrong window (other side)':<30s} {wrong_window:>10,} {wrong_window/total*100:>6.1f}%")
    print(f"  {'Inconclusive':<30s} {inconclusive:>10,} {inconclusive/total*100:>6.1f}%")

    # ─── Excluding inconclusive ───
    conclusive = total - inconclusive
    print(f"\n  EXCLUDING INCONCLUSIVE ({conclusive:,} tickets):")
    print(f"  {'Category':<30s} {'Count':>10s} {'%':>7s}")
    print(f"  {'-' * 50}")
    print(f"  {'Sweep confirmed':<30s} {confirmed:>10,} {confirmed/conclusive*100:>6.1f}%")
    print(f"  {'No sweep all day':<30s} {no_sweep:>10,} {no_sweep/conclusive*100:>6.1f}%")
    print(f"  {'Sweep wrong window':<30s} {wrong_window:>10,} {wrong_window/conclusive*100:>6.1f}%")

    # ─── Wrong window sub-breakdown ───
    ww = rdf[rdf["category"] == "sweep_wrong_window"]
    other_side = (ww["reason"] == "sweep_during_other_sides_window").sum()
    unmatched = (ww["reason"] == "sweep_outside_any_known_window").sum()
    print(f"\n  SWEEP WRONG WINDOW BREAKDOWN ({wrong_window:,}):")
    print(f"    Matched to other side's window:  {other_side:>8,} ({other_side/max(1,wrong_window)*100:.1f}%)")
    print(f"    No matching window (early/late):  {unmatched:>8,} ({unmatched/max(1,wrong_window)*100:.1f}%)")

    # ─── Inconclusive breakdown ───
    print(f"\n  INCONCLUSIVE BREAKDOWN ({inconclusive:,}):")
    for reason in ["inconclusive_no_match", "inconclusive_no_gps",
                    "inconclusive_no_window", "inconclusive_no_date"]:
        print(f"    {reason:<40s} {counts[reason]:>8,}")

    # ─── By borough ───
    print(f"\n  BY BOROUGH (excluding inconclusive):")
    concl = rdf[rdf["category"] != "inconclusive"]
    print(f"  {'Borough':<15s} {'Confirmed':>10s} {'No Sweep':>10s} {'Wrong Win':>10s} {'No Sweep%':>10s}")
    print(f"  {'-' * 60}")
    for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
        b = concl[concl["boro"] == boro]
        if len(b) == 0:
            continue
        bc = (b["category"] == "sweep_confirmed").sum()
        bn = (b["category"] == "no_sweep_all_day").sum()
        bw = (b["category"] == "sweep_wrong_window").sum()
        print(f"  {boro:<15s} {bc:>10,} {bn:>10,} {bw:>10,} {bn/len(b)*100:>9.1f}%")

    # ─── By month ───
    print(f"\n  BY MONTH (excluding inconclusive):")
    print(f"  {'Month':<12s} {'Confirmed':>10s} {'No Sweep':>10s} {'Wrong Win':>10s} {'No Sweep%':>10s}")
    print(f"  {'-' * 57}")
    for month in sorted(concl["month"].unique()):
        m = concl[concl["month"] == month]
        mc = (m["category"] == "sweep_confirmed").sum()
        mn = (m["category"] == "no_sweep_all_day").sum()
        mw = (m["category"] == "sweep_wrong_window").sum()
        print(f"  {month:<10s} {mc:>10,} {mn:>10,} {mw:>10,} {mn/len(m)*100:>9.1f}%")

    # ─── No-sweep rate by borough by month ───
    print(f"\n  NO-SWEEP-ALL-DAY RATE BY BOROUGH BY MONTH:")
    print(f"  {'Month':<12s} {'Manhattan':>11s} {'Brooklyn':>11s} {'Queens':>11s} {'Bronx':>11s}")
    print(f"  {'-' * 60}")
    for month in sorted(concl["month"].unique()):
        vals = []
        for boro in ["Manhattan", "Brooklyn", "Queens", "Bronx"]:
            sub = concl[(concl["month"] == month) & (concl["boro"] == boro)]
            if len(sub) == 0:
                vals.append("     -     ")
            else:
                ns = (sub["category"] == "no_sweep_all_day").sum()
                vals.append(f"  {ns/len(sub)*100:>5.1f}%   ")
        print(f"  {month:<10s} {''.join(vals)}")

    # ─── Top streets with no-sweep-all-day ───
    ns_df = rdf[rdf["category"] == "no_sweep_all_day"]
    print(f"\n  TOP 20 STREETS: NO SWEEP ALL DAY (sweeper never came)")
    ns_streets = ns_df.groupby(["street_name", "boro"]).size().sort_values(ascending=False)
    print(f"  {'Street':<35s} {'Boro':<15s} {'Count':>7s}")
    print(f"  {'-' * 60}")
    for (street, boro), count in ns_streets.head(20).items():
        print(f"  {street:<35s} {boro:<15s} {count:>7,}")

    # ─── Top precincts by no-sweep-all-day rate ───
    print(f"\n  TOP 15 PRECINCTS BY NO-SWEEP-ALL-DAY RATE (min 500 conclusive):")
    prec = concl.groupby("violation_precinct").agg(
        total=("category", "count"),
        no_sweep=("category", lambda x: (x == "no_sweep_all_day").sum()),
        wrong_win=("category", lambda x: (x == "sweep_wrong_window").sum()),
    ).reset_index()
    prec["no_sweep_rate"] = prec["no_sweep"] / prec["total"] * 100
    prec = prec[prec["total"] >= 500].sort_values("no_sweep_rate", ascending=False)
    print(f"  {'Precinct':>10s} {'Total':>8s} {'No Sweep':>10s} {'Wrong Win':>10s} {'Rate':>8s}")
    print(f"  {'-' * 50}")
    for _, row in prec.head(15).iterrows():
        print(
            f"  {row['violation_precinct']:>10s} {int(row['total']):>8,} "
            f"{int(row['no_sweep']):>10,} {int(row['wrong_win']):>10,} "
            f"{row['no_sweep_rate']:>7.1f}%"
        )

    # ─── Key stat: tickets where we can confidently say sweeper never came ───
    print(f"\n{'=' * 70}")
    print("KEY FINDING")
    print(f"{'=' * 70}")
    print(f"\n  Of {conclusive:,} conclusive tickets:")
    print(f"    {confirmed:,} ({confirmed/conclusive*100:.1f}%) -> Sweeper came during the ASP window")
    print(f"    {wrong_window:,} ({wrong_window/conclusive*100:.1f}%) -> Sweeper was on block, different window (other side)")
    print(f"    {no_sweep:,} ({no_sweep/conclusive*100:.1f}%) -> Sweeper NEVER visited this block that day")

    # ─── Save ───
    print(f"\n  Saving outputs...")
    rdf.to_csv(os.path.join(OUT_DIR, "asp_v2_classification.csv"), index=False)
    print(f"    asp_v2_classification.csv ({len(rdf):,} rows)")

    # Street-level summary
    street_summary = concl.groupby(["street_name", "boro"]).agg(
        total=("category", "count"),
        confirmed=("category", lambda x: (x == "sweep_confirmed").sum()),
        no_sweep_all_day=("category", lambda x: (x == "no_sweep_all_day").sum()),
        wrong_window=("category", lambda x: (x == "sweep_wrong_window").sum()),
    ).reset_index()
    street_summary["no_sweep_rate"] = (
        street_summary["no_sweep_all_day"] / street_summary["total"] * 100
    ).round(1)
    street_summary.sort_values("no_sweep_all_day", ascending=False).to_csv(
        os.path.join(OUT_DIR, "asp_v2_by_street.csv"), index=False
    )
    print(f"    asp_v2_by_street.csv ({len(street_summary):,} rows)")

    prec.to_csv(os.path.join(OUT_DIR, "asp_v2_by_precinct.csv"), index=False)
    print(f"    asp_v2_by_precinct.csv ({len(prec):,} rows)")

    total_elapsed = time.time() - total_start
    print(f"\n{'=' * 70}")
    print(f"COMPLETE - Total time: {total_elapsed/60:.1f} minutes")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
