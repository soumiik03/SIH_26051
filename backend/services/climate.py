"""NASA POWER climate data client with an in-memory request cache."""

from dataclasses import dataclass
from datetime import date, timedelta
import json
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
_cache: dict[tuple[float, float, str, str], "ClimateData"] = {}
_cache_lock = Lock()


@dataclass(frozen=True)
class ClimateData:
    latitude: float
    longitude: float
    ambient_temp_c: float
    wind_speed_ms: float
    humidity_pct: float
    ghi_kwh_m2_day: float
    rain_last_7days_mm: float
    source: str = "NASA POWER"


def _value(series: dict, key: str, default: float = 0.0) -> float:
    value = series.get(key, default)
    return default if value is None or value == -999 else float(value)


def get_climate(lat: float, lon: float, start: date | None = None, end: date | None = None) -> ClimateData:
    """Fetch representative daily climate data for a point and cache it."""
    # POWER daily observations can lag the current day; yesterday is a
    # reliable default for a demo while explicit ranges remain supported.
    end = end or (date.today() - timedelta(days=1))
    start = start or end
    if start > end:
        raise ValueError("start date must not be after end date")
    key = (round(lat, 4), round(lon, 4), start.isoformat(), end.isoformat())
    with _cache_lock:
        cached = _cache.get(key)
    if cached:
        return cached

    params = {"parameters": "T2M,WS10M,RH2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR", "community": "RE", "longitude": lon, "latitude": lat, "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON"}
    request = Request(f"{NASA_POWER_URL}?{urlencode(params)}", headers={"User-Agent": "thermal-shelter-api/1.0"})
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"NASA POWER climate lookup failed: {exc}") from exc

    parameters = payload.get("properties", {}).get("parameter", {})
    day = end.strftime("%Y%m%d")
    rain = sum(_value(parameters.get("PRECTOTCORR", {}), (end - timedelta(days=i)).strftime("%Y%m%d")) for i in range(7))
    result = ClimateData(lat, lon, _value(parameters.get("T2M", {}), day), _value(parameters.get("WS10M", {}), day), _value(parameters.get("RH2M", {}), day), _value(parameters.get("ALLSKY_SFC_SW_DWN", {}), day), rain)
    with _cache_lock:
        _cache[key] = result
    return result
