"""
Aggregation & Matching Engine  (Person 4)
-----------------------------------------
Input : farmer listings (from Person 1 / Person 2) + buyer demands
Output: bulk batches, ready for Person 5's Logistics & Route Engine

Pipeline
  1. FILTER   - hard rules: same crop, grade OK, price OK, within radius, not expired
  2. SCORE    - rank remaining listings (nearer, better grade, cheaper = better)
  3. AGGREGATE- greedily pool small lots until the buyer's quantity is met
  4. RESERVE  - reduce listing quantity so one lot isn't sold twice
  5. EXPORT   - Batch objects (JSON) with pickup points + total weight
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import date
from math import radians, sin, cos, asin, sqrt
from typing import List, Optional
import json
import uuid

# Grade order: A is best. Buyer asking for "B" accepts A or B.
GRADE_RANK = {"A": 3, "B": 2, "C": 1}


# --------------------------------------------------------------------------
# Data models
# --------------------------------------------------------------------------
@dataclass
class Listing:
    """A farmer's produce listing (comes from Person 1's form / Person 2's voice)."""
    listing_id: str
    kisan_id: str
    crop: str
    quantity_kg: float
    grade: str                # "A" / "B" / "C"
    floor_price: float        # Rs/kg - lowest price farmer will accept (Person 3 can supply)
    lat: float
    lon: float
    available_until: Optional[date] = None
    remaining_kg: float = field(init=False)

    def __post_init__(self):
        self.remaining_kg = self.quantity_kg


@dataclass
class Demand:
    """A buyer's requirement."""
    demand_id: str
    buyer_id: str
    crop: str
    quantity_kg: float
    min_grade: str            # minimum acceptable grade
    max_price: float          # Rs/kg - highest price buyer will pay
    lat: float
    lon: float
    max_distance_km: float = 150.0
    min_fill_pct: float = 0.6  # don't create a batch if we can fill < 60%
    priority: int = 0          # higher = matched first


@dataclass
class Allocation:
    """How much one farmer contributes to one batch."""
    listing_id: str
    kisan_id: str
    quantity_kg: float
    grade: str
    price_per_kg: float
    distance_km: float
    lat: float
    lon: float


@dataclass
class Batch:
    batch_id: str
    demand_id: str
    buyer_id: str
    crop: str
    requested_kg: float
    total_kg: float
    fill_pct: float
    avg_price_per_kg: float
    total_value: float
    status: str               # "FULL" | "PARTIAL"
    buyer_lat: float
    buyer_lon: float
    allocations: List[Allocation]

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def haversine_km(lat1, lon1, lat2, lon2) -> float:
    """Straight-line distance in km. (Exact road distance is Person 5's job.)"""
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


def _norm(s: str) -> str:
    return s.strip().lower()


# --------------------------------------------------------------------------
# Step 1: filter (hard constraints)
# --------------------------------------------------------------------------
def is_eligible(l: Listing, d: Demand, today: date) -> Optional[float]:
    """Return distance in km if the listing can serve the demand, else None."""
    if l.remaining_kg <= 0:
        return None
    if _norm(l.crop) != _norm(d.crop):
        return None
    if GRADE_RANK.get(l.grade, 0) < GRADE_RANK.get(d.min_grade, 0):
        return None
    if l.floor_price > d.max_price:            # farmer wants more than buyer pays
        return None
    if l.available_until and l.available_until < today:
        return None
    dist = haversine_km(l.lat, l.lon, d.lat, d.lon)
    if dist > d.max_distance_km:
        return None
    return dist


# --------------------------------------------------------------------------
# Step 2: score (soft preferences) - tweak weights as needed
# --------------------------------------------------------------------------
def score(l: Listing, d: Demand, dist_km: float,
          w_dist=0.4, w_grade=0.3, w_price=0.3) -> float:
    """0..1, higher is better."""
    dist_score = 1 - min(dist_km / d.max_distance_km, 1)
    grade_score = GRADE_RANK[l.grade] / 3
    # cheaper for the buyer = better (relative to buyer's ceiling)
    price_score = 1 - (l.floor_price / d.max_price) if d.max_price else 0
    return w_dist * dist_score + w_grade * grade_score + w_price * price_score


# --------------------------------------------------------------------------
# Step 3-4: aggregate + reserve
# --------------------------------------------------------------------------
def build_batch(d: Demand, listings: List[Listing], today: date) -> Optional[Batch]:
    candidates = []
    for l in listings:
        dist = is_eligible(l, d, today)
        if dist is not None:
            candidates.append((score(l, d, dist), dist, l))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[0], reverse=True)   # best first

    # Check we can reach the minimum fill BEFORE reserving anything
    available = sum(l.remaining_kg for _, _, l in candidates)
    if available < d.quantity_kg * d.min_fill_pct:
        return None

    needed = d.quantity_kg
    allocations: List[Allocation] = []

    for _, dist, l in candidates:
        if needed <= 0:
            break
        take = min(l.remaining_kg, needed)
        l.remaining_kg -= take                            # reserve
        needed -= take
        allocations.append(Allocation(
            listing_id=l.listing_id, kisan_id=l.kisan_id, quantity_kg=take,
            grade=l.grade, price_per_kg=l.floor_price,
            distance_km=round(dist, 1), lat=l.lat, lon=l.lon,
        ))

    total_kg = sum(a.quantity_kg for a in allocations)
    total_value = sum(a.quantity_kg * a.price_per_kg for a in allocations)

    return Batch(
        batch_id=f"B-{uuid.uuid4().hex[:8].upper()}",
        demand_id=d.demand_id, buyer_id=d.buyer_id, crop=d.crop,
        requested_kg=d.quantity_kg, total_kg=total_kg,
        fill_pct=round(100 * total_kg / d.quantity_kg, 1),
        avg_price_per_kg=round(total_value / total_kg, 2),
        total_value=round(total_value, 2),
        status="FULL" if needed <= 0 else "PARTIAL",
        buyer_lat=d.lat, buyer_lon=d.lon,
        allocations=allocations,
    )


def run_matching(listings: List[Listing], demands: List[Demand],
                 today: Optional[date] = None) -> tuple[List[Batch], List[Demand]]:
    """Match all demands. Returns (batches, unmatched_demands)."""
    today = today or date.today()
    # Priority first, then bigger orders first (they need the most pooling)
    ordered = sorted(demands, key=lambda d: (-d.priority, -d.quantity_kg))

    batches, unmatched = [], []
    for d in ordered:
        b = build_batch(d, listings, today)
        (batches if b else unmatched).append(b or d)
    return batches, unmatched


# --------------------------------------------------------------------------
# Demo
# --------------------------------------------------------------------------
if __name__ == "__main__":
    listings = [
        Listing("L1", "KISAN-001", "Tomato", 200, "A", 18, 28.67, 77.42),   # near Ghaziabad
        Listing("L2", "KISAN-002", "Tomato", 150, "B", 15, 28.75, 77.50),
        Listing("L3", "KISAN-003", "Tomato", 300, "A", 20, 28.98, 77.70),   # Meerut side
        Listing("L4", "KISAN-004", "Tomato", 100, "C", 10, 28.60, 77.30),   # grade too low
        Listing("L5", "KISAN-005", "Onion",  500, "B", 22, 28.70, 77.45),
        Listing("L6", "KISAN-006", "Tomato", 80,  "A", 30, 28.70, 77.40),   # price too high
    ]

    demands = [
        Demand("D1", "BUYER-A", "Tomato", 500, "B", max_price=25,
               lat=28.6139, lon=77.2090, max_distance_km=100),               # Delhi mandi
        Demand("D2", "BUYER-B", "Onion", 300, "B", max_price=25,
               lat=28.6692, lon=77.4538, max_distance_km=50),
        Demand("D3", "BUYER-C", "Potato", 200, "A", max_price=15,
               lat=28.6139, lon=77.2090),                                    # nobody grows potato
    ]

    batches, unmatched = run_matching(listings, demands)

    for b in batches:
        print(f"\n=== {b.batch_id} | {b.crop} -> {b.buyer_id} | {b.status} "
              f"({b.total_kg}/{b.requested_kg} kg, avg Rs{b.avg_price_per_kg}/kg)")
        for a in b.allocations:
            print(f"   {a.kisan_id}: {a.quantity_kg:>5.0f} kg, grade {a.grade}, "
                  f"Rs{a.price_per_kg}/kg, {a.distance_km} km away")

    print("\nUnmatched demands:", [d.demand_id for d in unmatched])

    # JSON handed to Person 5 (logistics)
    print("\n--- JSON for logistics engine ---")
    print(batches[0].to_json())
    