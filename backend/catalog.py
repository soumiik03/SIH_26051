MATERIALS = {
    "brick": {"u_value": 1.6, "cost_per_m2": 33},
    "aac": {"u_value": 0.8, "cost_per_m2": 45},
    "insulated_panel": {"u_value": 0.35, "cost_per_m2": 74},
}
GLAZING = {
    "single": {"u_value": 5.6, "cost_per_m2": 22},
    "double": {"u_value": 2.8, "cost_per_m2": 52},
    "low_e": {"u_value": 1.4, "cost_per_m2": 89},
}

def material_name(index: int) -> str:
    return list(MATERIALS)[max(0, min(index, len(MATERIALS) - 1))]

def glazing_name(index: int) -> str:
    return list(GLAZING)[max(0, min(index, len(GLAZING) - 1))]
