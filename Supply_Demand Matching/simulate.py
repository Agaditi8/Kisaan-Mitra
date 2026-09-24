"""
simulate.py - fills a fresh database with SIMULATED farmers and buyers,
runs the matching engine, prints a report, and exports batches.json
(the file Person 5's logistics engine would read).

Run:  python simulate.py
Needs matching_engine.py and db_setup.py in the same folder.
"""

import os
import json
import random
import sqlite3

from db_setup import SCHEMA, run_matching_from_db

DB = "simulated_market.db"
random.seed(42)          # same data every run; change/remove for new data

# ---------------- Simulated geography (Delhi-NCR) ----------------
FARM_VILLAGES = {          # name: (lat, lon)
    "Loni":          (28.75, 77.29),
    "Muradnagar":    (28.78, 77.50),
    "Modinagar":     (28.83, 77.58),
    "Hapur":         (28.73, 77.78),
    "Meerut":        (28.98, 77.70),
    "Sikandrabad":   (28.45, 77.69),
    "Dadri":         (28.55, 77.55),
    "Bulandshahr":   (28.40, 77.85),
    "Khoda":         (28.62, 77.37),
    "Raj Nagar Ext": (28.69, 77.43),
}

BUYERS = [                 # buyer_id, (lat, lon), radius_km
    ("Azadpur Mandi Trader",   (28.71, 77.17), 120),
    ("Ghazipur Mandi Trader",  (28.62, 77.32),  80),
    ("Noida Retail Chain",     (28.57, 77.32),  70),
    ("Gurugram Restaurant Grp",(28.46, 77.03), 110),
    ("Faridabad Wholesaler",   (28.41, 77.31),  90),
    ("Meerut Food Processor",  (28.99, 77.71),  60),
    ("Delhi Hotel Supplier",   (28.61, 77.21), 100),
    ("Ghaziabad Vendor Union", (28.67, 77.44),  50),
]

# crop: (typical farmer floor Rs/kg, typical order size range kg)
CROPS = {
    "Tomato": (18, (400, 1200)),
    "Onion":  (22, (500, 1500)),
    "Potato": (15, (600, 1800)),
    "Wheat":  (26, (800, 2000)),
}
GRADES = ["A", "B", "C"]
GRADE_WEIGHTS = [0.3, 0.5, 0.2]


def jitter(v, spread=0.03):
    return round(v + random.uniform(-spread, spread), 4)


def make_listings(n=45):
    rows = []
    for i in range(1, n + 1):
        crop = random.choice(list(CROPS))
        base = CROPS[crop][0]
        village, (lat, lon) = random.choice(list(FARM_VILLAGES.items()))
        qty = random.choice([50, 80, 100, 120, 150, 200, 250, 300, 400])
        grade = random.choices(GRADES, GRADE_WEIGHTS)[0]
        floor = round(base * random.uniform(0.75, 1.2) + (2 if grade == "A" else 0), 1)
        rows.append((f"L{i:03d}", f"KISAN-{1000 + i}", crop, qty, qty, grade,
                     floor, jitter(lat), jitter(lon)))
    return rows


def make_demands(n=10):
    rows = []
    for i in range(1, n + 1):
        crop = random.choice(list(CROPS))
        base, (lo, hi) = CROPS[crop]
        buyer, (lat, lon), radius = random.choice(BUYERS)
        qty = random.randrange(lo, hi, 50)
        min_grade = random.choice(["A", "B", "B", "C"])
        max_price = round(base * random.uniform(0.95, 1.5), 1)   # some buyers pay too little
        rows.append((f"D{i:03d}", f"{buyer} #{i}", crop, qty, min_grade,
                     max_price, lat, lon, radius))
    return rows


def main():
    if os.path.exists(DB):
        os.remove(DB)                          # fresh start each run
    conn = sqlite3.connect(DB)
    conn.executescript(SCHEMA)

    listings, demands = make_listings(), make_demands()
    conn.executemany("INSERT INTO listings (listing_id,kisan_id,crop,quantity_kg,"
                     "remaining_kg,grade,floor_price,lat,lon) VALUES (?,?,?,?,?,?,?,?,?)",
                     listings)
    conn.executemany("INSERT INTO demands (demand_id,buyer_id,crop,quantity_kg,min_grade,"
                     "max_price,lat,lon,max_distance_km) VALUES (?,?,?,?,?,?,?,?,?)",
                     demands)
    conn.commit()

    # ---------- Show the simulated INPUT ----------
    print("=" * 78)
    print(f"SIMULATED INPUT: {len(listings)} farmer listings, {len(demands)} buyer demands")
    print("=" * 78)
    print("\nSample farmer listings (first 8):")
    print(f"{'ID':<6}{'Kisan ID':<12}{'Crop':<8}{'Qty kg':>7}{'Grade':>6}{'Floor Rs/kg':>12}")
    for r in listings[:8]:
        print(f"{r[0]:<6}{r[1]:<12}{r[2]:<8}{r[3]:>7}{r[5]:>6}{r[6]:>12}")

    print("\nBuyer demands:")
    print(f"{'ID':<6}{'Buyer':<34}{'Crop':<8}{'Qty kg':>7}{'MinGr':>6}{'MaxRs':>7}{'Radius':>7}")
    for r in demands:
        print(f"{r[0]:<6}{r[1]:<34}{r[2]:<8}{r[3]:>7}{r[4]:>6}{r[5]:>7}{r[8]:>7}")

    # ---------- Run the engine ----------
    batches, unmatched = run_matching_from_db(conn)

    # ---------- Report ----------
    print("\n" + "=" * 78)
    print(f"RESULT: {len(batches)} batches created, {len(unmatched)} demands unmatched")
    print("=" * 78)
    for b in batches:
        print(f"\n{b.batch_id}  {b.crop:<7} -> {b.buyer_id}")
        print(f"   {b.status}: {b.total_kg:.0f}/{b.requested_kg:.0f} kg "
              f"({b.fill_pct}%), avg Rs{b.avg_price_per_kg}/kg, value Rs{b.total_value:,.0f}")
        print(f"   Pooled from {len(b.allocations)} farmers:")
        for a in b.allocations:
            print(f"      {a.kisan_id}  {a.quantity_kg:>5.0f} kg  grade {a.grade}  "
                  f"Rs{a.price_per_kg}/kg  {a.distance_km} km")

    if unmatched:
        print("\nUnmatched demands (no batch could be formed):")
        for d in unmatched:
            print(f"   {d.demand_id} {d.crop} {d.quantity_kg:.0f} kg, min grade "
                  f"{d.min_grade}, max Rs{d.max_price}/kg - "
                  "not enough eligible supply (crop / grade / price / distance)")

    # ---------- Supply left over ----------
    print("\nUnsold supply left in listings (kg by crop):")
    for crop, kg in conn.execute("SELECT crop, SUM(remaining_kg) FROM listings "
                                 "GROUP BY crop ORDER BY crop"):
        print(f"   {crop:<8}{kg:>8.0f} kg")

    # ---------- Export for Person 5 ----------
    with open("batches.json", "w") as f:
        json.dump([json.loads(b.to_json()) for b in batches], f, indent=2)
    print("\nExported batches.json  (hand this to the logistics engine)")
    print(f"Database saved as {DB}  (open with DB Browser for SQLite)")


if __name__ == "__main__":
    main()
