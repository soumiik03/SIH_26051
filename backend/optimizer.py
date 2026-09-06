"""Multi-objective optimization engine for passive shelter envelope design.

Finds the Pareto front balancing:
  1. Minimum daily heating energy demand (kWh)
  2. Minimum capital installation cost (INR)

Uses NSGA-II via pymoo when available, with a resilient vectorized Pareto
grid solver fallback for guaranteed reliability in any environment.
"""

import logging
import numpy as np

try:
    from catalog import material_name, glazing_name, MATERIALS, GLAZING
    from predictors import build_analysis, estimate_install_cost, predict_daily_heating_kwh
    from optimization_schemas import OptimizationRequest, Design
except ImportError:
    from backend.catalog import material_name, glazing_name, MATERIALS, GLAZING
    from backend.predictors import build_analysis, estimate_install_cost, predict_daily_heating_kwh
    from backend.optimization_schemas import OptimizationRequest, Design

logger = logging.getLogger(__name__)

# Try importing pymoo for NSGA-II
_HAS_PYMOO = False
try:
    from pymoo.algorithms.moo.nsga2 import NSGA2
    from pymoo.core.problem import Problem
    from pymoo.optimize import minimize
    from pymoo.termination import get_termination
    _HAS_PYMOO = True
except ImportError:
    _HAS_PYMOO = False


if _HAS_PYMOO:
    class ThermalProblem(Problem):
        def __init__(self, request: OptimizationRequest):
            super().__init__(
                n_var=3,
                n_obj=2,
                xl=np.array([0, 0, 0]),
                xu=np.array([2, 250, 2]),
            )
            self.request = request

        def _evaluate(self, x, out, *args, **kwargs):
            objectives = []
            for material_i, insulation_mm, glazing_i in x:
                design = Design(
                    material=material_name(round(material_i)),
                    insulation_mm=round(float(insulation_mm), 1),
                    glazing=glazing_name(round(glazing_i)),
                    area_m2=self.request.design.area_m2,
                )
                analysis = build_analysis(self.request, design)
                objectives.append(
                    [
                        analysis["thermal_energy"]["daily_heating_kwh"],
                        analysis["cost"]["estimated_install_cost"],
                    ]
                )
            out["F"] = np.array(objectives)


def _pareto_grid_fallback(request: OptimizationRequest) -> list[dict]:
    """Resilient fallback solver that sweeps design space and extracts non-dominated solutions."""
    candidates = []
    materials = list(MATERIALS.keys())
    glazings = list(GLAZING.keys())
    insulations = [0.0, 25.0, 50.0, 75.0, 100.0, 150.0, 200.0, 250.0]

    for mat in materials:
        for ins in insulations:
            for glz in glazings:
                design = Design(
                    material=mat,
                    insulation_mm=ins,
                    glazing=glz,
                    area_m2=request.design.area_m2,
                )
                heating = predict_daily_heating_kwh(request, design)
                cost = estimate_install_cost(design)
                candidates.append(
                    {
                        "design": design.model_dump(),
                        "daily_heating_kwh": round(float(heating), 2),
                        "estimated_install_cost": round(float(cost), 2),
                    }
                )

    # Extract non-dominated (Pareto optimal) points
    pareto = []
    for i, p in enumerate(candidates):
        dominated = False
        p_energy = p["daily_heating_kwh"]
        p_cost = p["estimated_install_cost"]
        for j, q in enumerate(candidates):
            if i == j:
                continue
            q_energy = q["daily_heating_kwh"]
            q_cost = q["estimated_install_cost"]
            if (q_energy <= p_energy and q_cost <= p_cost) and (
                q_energy < p_energy or q_cost < p_cost
            ):
                dominated = True
                break
        if not dominated:
            pareto.append(p)

    unique = {
        f"{p['design']['material']}-{p['design']['insulation_mm']}-{p['design']['glazing']}": p
        for p in pareto
    }
    return sorted(
        unique.values(),
        key=lambda item: (item["estimated_install_cost"], item["daily_heating_kwh"]),
    )


def optimize(request: OptimizationRequest) -> list[dict]:
    """Return non-dominated Pareto front trade-offs between energy and INR cost."""
    if _HAS_PYMOO:
        try:
            problem = ThermalProblem(request)
            algorithm = NSGA2(pop_size=request.population_size)
            termination = get_termination("n_gen", request.generations)
            result = minimize(
                problem,
                algorithm,
                termination,
                seed=42,
                verbose=False,
            )
            points = []
            for values, objectives in zip(result.X, result.F):
                design = Design(
                    material=material_name(round(values[0])),
                    insulation_mm=round(float(values[1]), 1),
                    glazing=glazing_name(round(values[2])),
                    area_m2=request.design.area_m2,
                )
                points.append(
                    {
                        "design": design.model_dump(),
                        "daily_heating_kwh": round(float(objectives[0]), 2),
                        "estimated_install_cost": round(float(objectives[1]), 2),
                    }
                )

            unique = {
                f"{p['design']['material']}-{p['design']['insulation_mm']}-{p['design']['glazing']}": p
                for p in points
            }
            res = sorted(
                unique.values(),
                key=lambda item: (item["estimated_install_cost"], item["daily_heating_kwh"]),
            )
            if res:
                return res
        except Exception as exc:
            logger.warning("pymoo NSGA-II failed (%s), running fallback grid solver", exc)

    return _pareto_grid_fallback(request)
