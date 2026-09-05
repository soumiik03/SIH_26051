from fastapi import APIRouter, HTTPException

try:
    from optimization_schemas import OptimizationRequest
    from predictors import build_analysis
    from optimizer import optimize
    from golden import golden
except ImportError:
    from backend.optimization_schemas import OptimizationRequest
    from backend.predictors import build_analysis
    from backend.optimizer import optimize
    from backend.golden import golden

router = APIRouter(prefix="/optimization", tags=["Optimization"])


@router.post("/run")
def run_optimization(payload: OptimizationRequest):
    """Return a Pareto front of low-energy versus low-cost shelter designs."""
    try:
        return {
            "status": "ok",
            "baseline": build_analysis(payload),
            "pareto_front": optimize(payload),
            "generations": payload.generations,
            "population_size": payload.population_size,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {exc}",
        ) from exc


@router.post("/dashboard")
def dashboard(payload: OptimizationRequest):
    """Unified prediction and Pareto-front result for the results dashboard."""
    try:
        return {
            "status": "ok",
            "baseline": build_analysis(payload),
            "pareto_front": optimize(payload),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Dashboard analysis failed: {exc}",
        ) from exc


@router.get("/golden/{location}")
def get_golden_case(location: str):
    """Known-good result used only when the live API is unavailable."""
    result = golden(location)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="No golden case. Available: Leh, Delhi, Bengaluru.",
        )
    return {
        "status": "fallback",
        "source": "golden-case",
        "result": result,
    }