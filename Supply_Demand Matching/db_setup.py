"""
db_setup.py - local SQLite database for developing the Matching Engine (Person 4)

Run:  python db_setup.py
Needs: matching_engine.py in the same folder. No extra libraries.

Later, replace sqlite3 with the team's shared database (PostgreSQL/MySQL).
The table structure and the logic stay the same.
"""

import sqlite3
from matching_engine import Listing, Demand, run_matching

DB = "kisan_market.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    listing_id   TEXT PRIMARY KEY,
    kisan_id     TEXT NOT NULL,
    crop         TEXT NOT NULL,
    quantity_kg  REAL NOT NULL,
    remaining_kg REAL NOT NULL,          -- reduced as batches are made
    grade        TEXT NOT NULL,          -- A / B / C
    floor_price  REAL NOT NULL,          -- Rs/kg
    lat          REAL NOT NULL,
    lon          REAL NOT NULL,
    status       TEXT DEFAULT 'ACTIVE'   -- ACTIVE / SOLD_OUT
);

CREATE TABLE IF NOT EXISTS demands (
    demand_id       TEXT PRIMARY KEY,
    buyer_id        TEXT NOT NULL,
    crop            TEXT NOT NULL,
    quantity_kg     REAL NOT NULL,
    min_grade       TEXT NOT NULL,
    max_price       REAL NOT NULL,
    lat             REAL NOT NULL,
    lon             REAL NOT NULL,
    max_distance_km REAL DEFAULT 150,
    status          TEXT DEFAULT 'OPEN'  -- OPEN / MATCHED
);

CREATE TABLE IF NOT EXISTS batches (       -- Person 5 reads this table
    batch_id     TEXT PRIMARY KEY,
    demand_id    TEXT NOT NULL,
    buyer_id     TEXT NOT NULL,
    crop         TEXT NOT NULL,
    total_kg     REAL NOT NULL,
    total_value  REAL NOT NULL,
    status       TEXT NOT NULL,          -- FULL / PARTIAL
    logistics_status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS batch_items (   -- one row per farmer in a batch
    batch_id    TEXT NOT NULL,
    listing_id  TEXT NOT NULL,
    kisan_id    TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    lat         REAL NOT NULL,           -- pickup point
    lon         REAL NOT NULL
);
"""

SAMPLE_LISTINGS = [
    ("L1", "KISAN-001", "Tomato", 200, 200, "A", 18, 28.67, 77.42),
    ("L2", "KISAN-002", "Tomato", 150, 150, "B", 15, 28.75, 77.50),
    ("L3", "KISAN-003", "Tomato", 300, 300, "A", 20, 28.98, 77.70),
    ("L4", "KISAN-004", "Onion",  500, 500, "B", 22, 28.70, 77.45),
]
SAMPLE_DEMANDS = [
    ("D1", "BUYER-A", "Tomato", 500, "B", 25, 28.6139, 77.2090, 100),
    ("D2", "BUYER-B", "Onion",  300, "B", 25, 28.6692, 77.4538, 50),
]


def init_db(conn):
    conn.executescript(SCHEMA)
    if conn.execute("SELECT COUNT(*) FROM listings").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO listings (listing_id,kisan_id,crop,quantity_kg,remaining_kg,"
            "grade,floor_price,lat,lon) VALUES (?,?,?,?,?,?,?,?,?)", SAMPLE_LISTINGS)
        conn.executemany(
            "INSERT INTO demands (demand_id,buyer_id,crop,quantity_kg,min_grade,"
            "max_price,lat,lon,max_distance_km) VALUES (?,?,?,?,?,?,?,?,?)", SAMPLE_DEMANDS)
        conn.commit()


def run_matching_from_db(conn):
    """Read ACTIVE listings + OPEN demands -> match -> save batches."""
    conn.row_factory = sqlite3.Row

    # 1. Load from DB into engine objects
    listings = []
    for r in conn.execute("SELECT * FROM listings WHERE status='ACTIVE' AND remaining_kg>0"):
        l = Listing(r["listing_id"], r["kisan_id"], r["crop"], r["quantity_kg"],
                    r["grade"], r["floor_price"], r["lat"], r["lon"])
        l.remaining_kg = r["remaining_kg"]        # respect earlier reservations
        listings.append(l)

    demands = [
        Demand(r["demand_id"], r["buyer_id"], r["crop"], r["quantity_kg"],
               r["min_grade"], r["max_price"], r["lat"], r["lon"], r["max_distance_km"])
        for r in conn.execute("SELECT * FROM demands WHERE status='OPEN'")
    ]

    # 2. Match
    batches, unmatched = run_matching(listings, demands)

    # 3. Save results
    for b in batches:
        conn.execute("INSERT INTO batches (batch_id,demand_id,buyer_id,crop,total_kg,"
                     "total_value,status) VALUES (?,?,?,?,?,?,?)",
                     (b.batch_id, b.demand_id, b.buyer_id, b.crop,
                      b.total_kg, b.total_value, b.status))
        for a in b.allocations:
            conn.execute("INSERT INTO batch_items VALUES (?,?,?,?,?,?,?)",
                         (b.batch_id, a.listing_id, a.kisan_id, a.quantity_kg,
                          a.price_per_kg, a.lat, a.lon))
        conn.execute("UPDATE demands SET status='MATCHED' WHERE demand_id=?", (b.demand_id,))
    for l in listings:                             # save reduced quantities
        conn.execute("UPDATE listings SET remaining_kg=?, status=? WHERE listing_id=?",
                     (l.remaining_kg, "SOLD_OUT" if l.remaining_kg <= 0 else "ACTIVE",
                      l.listing_id))
    conn.commit()
    return batches, unmatched


if __name__ == "__main__":
    conn = sqlite3.connect(DB)
    init_db(conn)
    batches, unmatched = run_matching_from_db(conn)

    print(f"Created {len(batches)} batch(es); {len(unmatched)} demand(s) unmatched\n")
    for row in conn.execute("SELECT batch_id, crop, buyer_id, total_kg, status FROM batches"):
        print(dict(zip(("batch_id", "crop", "buyer", "total_kg", "status"), row)))
    print("\nOpen", DB, "in 'DB Browser for SQLite' to see all tables.")