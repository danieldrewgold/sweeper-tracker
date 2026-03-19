"""
Geocode letter-only tickets (house_number = N/S/E/W) to CSCL segments.

These ~91K tickets have compass-direction house numbers but include
an intersecting_street field (e.g., "40ft E/of W 110 St") that tells
us which cross street they're near. We geocode the cross streets and
CSCL segment midpoints, then spatial-match each ticket to the nearest
segment on its main street.

Output: sweep_analysis_output/letter_ticket_pids.json
  { summons_number: physical_id, ... }
"""

import json
import os
import re
import sys
import time
import math
import requests
import pandas as pd
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(__file__))
from improved_crossref import normalize_v3

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_DIR, "sweep_analysis_output")
CSCL_CACHE = os.path.join(OUTPUT_DIR, "cscl_geocode_cache.json")
CROSS_CACHE = os.path.join(OUTPUT_DIR, "cross_street_geocode_cache.json")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "letter_ticket_pids.json")

BORO_NAMES = {"1": "Manhattan", "2": "Bronx", "3": "Brooklyn", "4": "Queens", "5": "Staten Island"}
TICKET_COUNTY_TO_BORO = {
    "NY": "1", "MN": "1", "BX": "2", "K": "3", "BK": "3",
    "Q": "4", "QN": "4", "R": "5", "ST": "5",
}

GEOSEARCH_URL = "https://geosearch.planninglabs.nyc/v2/search"


def geocode(query, retries=3):
    """Geocode an address via NYC GeoSearch. Returns (lon, lat) or None."""
    for attempt in range(retries):
        try:
            r = requests.get(GEOSEARCH_URL, params={"text": query}, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get("features"):
                    coords = data["features"][0]["geometry"]["coordinates"]
                    return coords  # [lon, lat]
            if r.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            return None
        except (requests.RequestException, ValueError):
            time.sleep(1)
    return None


def parse_cross_street(s):
    """Parse cross street name from intersecting_street field."""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    # "40ft E/of W 110 St" -> "W 110 St"
    m = re.match(r"^\d+\s*ft\s+[NSEW]/of\s+(.+)", s, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # "E/of W 110 St" -> "W 110 St"
    m = re.match(r"^[NSEW]/of\s+(.+)", s, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return s.strip()


def haversine_dist(lon1, lat1, lon2, lat2):
    """Approximate distance in meters between two lat/lon points."""
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def load_cache(path):
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}


def save_cache(path, data):
    with open(path, "w") as f:
        json.dump(data, f)


def main():
    print("=" * 60)
    print("GEOCODE LETTER TICKETS")
    print("=" * 60)

    # ─── Load data ───
    print("\nLoading data...")
    with open(os.path.join(PROJECT_DIR, "sweep_data/tickets_full_year.json")) as f:
        tickets = pd.DataFrame(json.load(f))
    with open(os.path.join(PROJECT_DIR, "sweep_data/cscl_centerline.json")) as f:
        cscl = json.load(f)

    tickets["_boro_code"] = (
        tickets["violation_county"].astype(str).str.upper().str.strip().map(TICKET_COUNTY_TO_BORO)
    )
    tickets["_norm_street"] = tickets["street_name"].apply(normalize_v3)

    # Identify letter tickets
    letter_mask = tickets["house_number"].str.match(r"^[A-Za-z]$", na=False)
    letter = tickets[letter_mask].copy()
    print(f"  Letter tickets: {len(letter):,}")

    # Find which streets have letter tickets
    letter_streets = set()
    for _, row in letter.iterrows():
        norm = row["_norm_street"]
        boro = row["_boro_code"]
        if norm and pd.notna(boro):
            letter_streets.add((norm, str(boro)))
    print(f"  Streets with letter tickets: {len(letter_streets)}")

    # ─── Step 1a: Geocode CSCL segment midpoints ───
    print("\n--- Step 1a: Geocode CSCL segments ---")
    cscl_cache = load_cache(CSCL_CACHE)
    print(f"  Cached: {len(cscl_cache)} segments")

    # Build list of segments to geocode
    segments_to_geocode = []
    for row in cscl:
        pid = str(row.get("physicalid", ""))
        boro = str(row.get("boroughcode", "")).strip()
        if pid in cscl_cache:
            continue
        # Check if this segment is on a street with letter tickets
        on_letter_street = False
        street_name = ""
        for nc in ["full_street_name", "stname_label"]:
            norm = normalize_v3(row.get(nc, ""))
            if (norm, boro) in letter_streets:
                on_letter_street = True
                street_name = row.get(nc, "")
                break
        if not on_letter_street:
            continue
        # Get midpoint address
        lo = hi = None
        for side in ["l", "r"]:
            lo_raw = row.get(f"{side}_low_hn")
            hi_raw = row.get(f"{side}_high_hn")
            if lo_raw and hi_raw and str(lo_raw) not in ("0", "nan", "None"):
                try:
                    lo_i, hi_i = int(lo_raw), int(hi_raw)
                    if lo_i > 0:
                        lo = lo_i if lo is None else min(lo, lo_i)
                        hi = hi_i if hi is None else max(hi, hi_i)
                except (ValueError, TypeError):
                    pass
        if lo is None:
            cscl_cache[pid] = None  # No address, can't geocode
            continue
        mid = (lo + hi) // 2
        boro_name = BORO_NAMES.get(boro, "New York")
        segments_to_geocode.append((pid, mid, street_name, boro_name))

    print(f"  Segments to geocode: {len(segments_to_geocode)}")

    if segments_to_geocode:
        t0 = time.time()
        success = 0
        done = 0

        def geocode_seg(item):
            pid, mid, street, boro_name = item
            query = f"{mid} {street} {boro_name}"
            return pid, geocode(query)

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(geocode_seg, item): item for item in segments_to_geocode}
            for future in as_completed(futures):
                pid, coords = future.result()
                if coords:
                    cscl_cache[pid] = coords
                    success += 1
                else:
                    cscl_cache[pid] = None
                done += 1
                if done % 1000 == 0:
                    elapsed = time.time() - t0
                    rate = done / elapsed
                    eta = (len(segments_to_geocode) - done) / rate / 60
                    print(f"    {done:,}/{len(segments_to_geocode):,} geocoded ({success:,} ok, {rate:.0f}/s, ETA {eta:.0f}m)")
                    save_cache(CSCL_CACHE, cscl_cache)

        save_cache(CSCL_CACHE, cscl_cache)
        geocoded = sum(1 for v in cscl_cache.values() if v is not None)
        print(f"  Total geocoded segments: {geocoded:,} / {len(cscl_cache):,}")

    # ─── Step 1b: Geocode cross streets ───
    print("\n--- Step 1b: Geocode cross streets ---")
    cross_cache = load_cache(CROSS_CACHE)
    print(f"  Cached: {len(cross_cache)} cross streets")

    # Collect unique (cross_street, boro) pairs
    cross_streets_to_geocode = {}
    for _, row in letter.iterrows():
        cross = parse_cross_street(row.get("intersecting_street"))
        boro = row["_boro_code"]
        if cross and pd.notna(boro):
            key = f"{cross}|{boro}"
            if key not in cross_cache:
                boro_name = BORO_NAMES.get(str(boro), "New York")
                cross_streets_to_geocode[key] = (cross, boro_name)

    print(f"  Cross streets to geocode: {len(cross_streets_to_geocode)}")

    if cross_streets_to_geocode:
        t0 = time.time()
        success = 0
        done = 0
        items = list(cross_streets_to_geocode.items())

        def geocode_cross(item):
            key, (cross, boro_name) = item
            query = f"1 {cross} {boro_name}"
            return key, geocode(query)

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(geocode_cross, item): item for item in items}
            for future in as_completed(futures):
                key, coords = future.result()
                if coords:
                    cross_cache[key] = coords
                    success += 1
                else:
                    cross_cache[key] = None
                done += 1
                if done % 500 == 0:
                    elapsed = time.time() - t0
                    rate = done / elapsed
                    eta = (len(items) - done) / rate / 60
                    print(f"    {done:,}/{len(items):,} geocoded ({success:,} ok, {rate:.0f}/s, ETA {eta:.0f}m)")
                    save_cache(CROSS_CACHE, cross_cache)

        save_cache(CROSS_CACHE, cross_cache)
        geocoded = sum(1 for v in cross_cache.values() if v is not None)
        print(f"  Total geocoded cross streets: {geocoded:,} / {len(cross_cache):,}")

    # ─── Step 1c: Spatial match ───
    print("\n--- Step 1c: Spatial match ---")

    # Build index: (norm_street, boro) -> [(pid, lon, lat), ...]
    seg_index = defaultdict(list)
    for row in cscl:
        pid = str(row.get("physicalid", ""))
        boro = str(row.get("boroughcode", "")).strip()
        coords = cscl_cache.get(pid)
        if coords is None:
            continue
        for nc in ["full_street_name", "stname_label"]:
            norm = normalize_v3(row.get(nc, ""))
            if norm:
                seg_index[(norm, boro)].append((pid, coords[0], coords[1]))

    print(f"  Segment index: {len(seg_index)} streets, {sum(len(v) for v in seg_index.values())} entries")

    # Match each letter ticket
    result = {}
    matched = 0
    no_cross_coords = 0
    no_seg_on_street = 0

    for _, row in letter.iterrows():
        cross = parse_cross_street(row.get("intersecting_street"))
        boro = row["_boro_code"]
        norm = row["_norm_street"]
        summons = row["summons_number"]

        if not cross or pd.isna(boro):
            continue

        # Get cross street coordinates
        cross_key = f"{cross}|{boro}"
        cross_coords = cross_cache.get(cross_key)
        if cross_coords is None:
            no_cross_coords += 1
            continue

        # Find nearest segment on main street
        segs = seg_index.get((norm, str(boro)), [])
        if not segs:
            no_seg_on_street += 1
            continue

        # Find nearest by distance
        best_pid = None
        best_dist = float("inf")
        for pid, lon, lat in segs:
            dist = haversine_dist(cross_coords[0], cross_coords[1], lon, lat)
            if dist < best_dist:
                best_dist = dist
                best_pid = pid

        # Accept if within 500m (about 5 blocks — generous but avoids cross-city matches)
        if best_pid and best_dist <= 500:
            result[str(summons)] = best_pid
            matched += 1

    print(f"\n  Results:")
    print(f"    Matched: {matched:,}")
    print(f"    No cross street coords: {no_cross_coords:,}")
    print(f"    No segments on street: {no_seg_on_street:,}")
    print(f"    Total letter tickets: {len(letter):,}")
    print(f"    Match rate: {matched / len(letter) * 100:.1f}%")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(result, f)
    print(f"\n  Saved {OUTPUT_FILE} ({len(result):,} entries)")


if __name__ == "__main__":
    main()
