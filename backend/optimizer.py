import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.core.problem import Problem
from pymoo.optimize import minimize
from pymoo.termination import get_termination
try:
    from catalog import material_name, glazing_name
    from predictors import build_analysis
    from optimization_schemas import OptimizationRequest, Design
except ImportError:
    from backend.catalog import material_name, glazing_name
    from backend.predictors import build_analysis
    from backend.optimization_schemas import OptimizationRequest, Design




class ThermalProblem(Problem):
    def __init__(self, request: OptimizationRequest):
        super().__init__(n_var=3, n_obj=2, xl=np.array([0, 0, 0]), xu=np.array([2, 250, 2]))
        self.request = request

    def _evaluate(self, x, out, *args, **kwargs):
        objectives = []
        for material_i, insulation_mm, glazing_i in x:
            design = Design(material=material_name(round(material_i)), insulation_mm=round(float(insulation_mm), 1), glazing=glazing_name(round(glazing_i)), area_m2=self.request.design.area_m2)
            analysis = build_analysis(self.request, design)
            # NSGA-II minimizes both: energy (heating deficit proxy) and install cost.
            objectives.append([analysis["thermal_energy"]["daily_heating_kwh"], analysis["cost"]["estimated_install_cost"]])
        out["F"] = np.array(objectives)

def optimize(request: OptimizationRequest) -> list[dict]:
    result = minimize(ThermalProblem(request), NSGA2(pop_size=request.population_size), get_termination("n_gen", request.generations), seed=42, verbose=False)
    points = []
    for values, objectives in zip(result.X, result.F):
        design = Design(material=material_name(round(values[0])), insulation_mm=round(float(values[1]), 1), glazing=glazing_name(round(values[2])), area_m2=request.design.area_m2)
        points.append({"design": design.model_dump(), "daily_heating_kwh": round(float(objectives[0]), 2), "estimated_install_cost": round(float(objectives[1]), 2)})
    # pymoo provides non-dominated points; remove equivalent designs caused by categorical rounding.
    unique = {f'{p["design"]["material"]}-{p["design"]["insulation_mm"]}-{p["design"]["glazing"]}': p for p in points}
    return sorted(unique.values(), key=lambda item: (item["estimated_install_cost"], item["daily_heating_kwh"]))
