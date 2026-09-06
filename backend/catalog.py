# Source: UT Ladakh Public Works (R&B) LSoR 2024 (effective 2024-08-01),
# Ch. 32 vernacular materials and Ch. 5/7 conventional materials, cross-checked
# with CPWD Delhi Schedule of Rates 2023 where Ladakh-specific items are absent.
# Midpoints of the cited ranges, in ₹/m³: RCC 8,250; stone 5,250;
# mud/adobe brick 3,000; rammed earth 2,000.
MATERIAL_COSTS_INR_PER_M3 = {
    "Concrete": 8250,
    "Stone": 5250,
    "Mud_Brick": 3000,
    "Rammed_Earth": 2000,
}

MATERIALS = {
    "Concrete": {"u_value": 1.4, "cost_per_m3_inr": MATERIAL_COSTS_INR_PER_M3["Concrete"]},
    "Mud_Brick": {"u_value": 0.6, "cost_per_m3_inr": MATERIAL_COSTS_INR_PER_M3["Mud_Brick"]},
    "Rammed_Earth": {"u_value": 0.9, "cost_per_m3_inr": MATERIAL_COSTS_INR_PER_M3["Rammed_Earth"]},
    "Stone": {"u_value": 1.8, "cost_per_m3_inr": MATERIAL_COSTS_INR_PER_M3["Stone"]},
}
GLAZING = {
    "single": {"u_value": 5.6, "cost_per_m2_inr": 1800},
    "double": {"u_value": 2.8, "cost_per_m2_inr": 4300},
    "low_e": {"u_value": 1.4, "cost_per_m2_inr": 7000},
}

def material_name(index: int) -> str:
    return list(MATERIALS)[max(0, min(index, len(MATERIALS) - 1))]

def glazing_name(index: int) -> str:
    return list(GLAZING)[max(0, min(index, len(GLAZING) - 1))]
