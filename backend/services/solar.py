"""
Solar calculation service — ported from Solar_calculationipynb.ipynb.

Provides pvlib-based clear-sky irradiance, POA irradiance, and heat-gain
calculations for the Ladakh region. Used as a shared service by the
thermal-energy and indoor-temp routers.
"""

import logging
from datetime import date, datetime
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
from pvlib.irradiance import (
    get_extra_radiation,
    get_ground_diffuse,
    get_total_irradiance,
)
from pvlib.location import Location, lookup_altitude
from pvlib.solarposition import get_solarposition

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Constants from the notebook
# ──────────────────────────────────────────────────────────────────────
DEFAULT_SURFACE_TILT = 46.0  # degrees — notebook cell 06
DEFAULT_SURFACE_AZIMUTH = 180.0  # south-facing — notebook cell 06
DEFAULT_ALBEDO = 0.20  # ground reflectance — notebook cell 06
LADAKH_FALLBACK_ALTITUDE = 3500.0  # metres — demo-day safety net

# In-memory cache for altitude lookups (keyed by rounded lat/lon)
_altitude_cache: Dict[Tuple[float, float], float] = {}


# ──────────────────────────────────────────────────────────────────────
# Core functions (map 1-to-1 to notebook cells)
# ──────────────────────────────────────────────────────────────────────


def get_altitude(lat: float, lon: float) -> float:
    """Lookup altitude via pvlib (notebook cell 02).

    Results are cached per (round(lat,2), round(lon,2)).  If the network
    call fails, returns a hardcoded Ladakh-region fallback altitude.
    """
    key = (round(lat, 2), round(lon, 2))
    if key in _altitude_cache:
        return _altitude_cache[key]
    try:
        alt = lookup_altitude(latitude=lat, longitude=lon)
        _altitude_cache[key] = float(alt)
        return float(alt)
    except Exception as exc:
        logger.warning(
            "Altitude lookup failed for (%.4f, %.4f): %s  — using fallback %.0f m",
            lat,
            lon,
            exc,
            LADAKH_FALLBACK_ALTITUDE,
        )
        _altitude_cache[key] = LADAKH_FALLBACK_ALTITUDE
        return LADAKH_FALLBACK_ALTITUDE


def get_clearsky_irradiance(
    lat: float,
    lon: float,
    alt: float,
    times: pd.DatetimeIndex,
) -> pd.DataFrame:
    """Compute clear-sky GHI / DNI / DHI (notebook cells 03-04).

    Returns a DataFrame with columns ``ghi``, ``dni``, ``dhi``.
    """
    location = Location(lat, lon, tz="Asia/Kolkata", altitude=alt)
    return location.get_clearsky(times)


def get_solar_position(
    lat: float,
    lon: float,
    alt: float,
    times: pd.DatetimeIndex,
) -> pd.DataFrame:
    """Compute solar position angles (notebook cell 05)."""
    return get_solarposition(
        time=times, latitude=lat, longitude=lon, altitude=alt
    )


def get_poa_irradiance(
    clearsky: pd.DataFrame,
    solar_position: pd.DataFrame,
    surface_tilt: float = DEFAULT_SURFACE_TILT,
    surface_azimuth: float = DEFAULT_SURFACE_AZIMUTH,
    albedo: float = DEFAULT_ALBEDO,
) -> pd.DataFrame:
    """Compute Plane-of-Array irradiance — Hay-Davies model (cells 06-13).

    Returns a DataFrame whose ``poa_global`` column is the total POA
    irradiance used downstream for heat-gain calculations.
    """
    times = clearsky.index
    dni_extra = get_extra_radiation(times)

    total_irrad = get_total_irradiance(
        surface_tilt=surface_tilt,
        surface_azimuth=surface_azimuth,
        solar_zenith=solar_position["zenith"],
        solar_azimuth=solar_position["azimuth"],
        dni=clearsky["dni"],
        ghi=clearsky["ghi"],
        dhi=clearsky["dhi"],
        dni_extra=dni_extra,
        model="haydavies",
        albedo=albedo,
    )
    return total_irrad


def compute_heat_gain(
    poa_global: pd.Series,
    surface_absorptivity: float,
    glazing_shgc: float,
    surface_area: float,
) -> Tuple[pd.Series, pd.Series]:
    """Compute solar heat gain for opaque + glazed surfaces (cell 15).

    Returns ``(q_gain_opaque, q_gain_glazing)``.
    """
    q_gain_opaque = poa_global * surface_absorptivity * surface_area
    q_gain_glazing = poa_global * glazing_shgc * surface_area
    return q_gain_opaque, q_gain_glazing


# ──────────────────────────────────────────────────────────────────────
# Convenience wrappers (used by routers to auto-fill GHI)
# ──────────────────────────────────────────────────────────────────────


def get_current_ghi(lat: float, lon: float) -> float:
    """Average daytime GHI for today — replicates thermal_energy notebook cell 14.

    Computes clear-sky GHI from midnight to current IST hour, drops zeros
    (nighttime), and returns the mean.  Returns 0.0 if the sun hasn't
    risen yet today.
    """
    from zoneinfo import ZoneInfo

    alt = get_altitude(lat, lon)

    ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
    current_time = ist_now.strftime("%H:%M")
    today = ist_now.date()

    times = pd.date_range(
        start=f"{today} 00:00",
        end=f"{today} {current_time}",
        freq="1h",
        tz="Asia/Kolkata",
    )

    clearsky = get_clearsky_irradiance(lat, lon, alt, times)
    ghi_values = clearsky["ghi"].to_numpy()

    valid_ghi = ghi_values[ghi_values > 0]
    if len(valid_ghi) > 0:
        return float(np.average(valid_ghi))
    return 0.0


def get_ghi_for_hour(
    lat: float, lon: float, month: int, hour: int
) -> float:
    """GHI for a specific month/hour — for indoor-temp auto-fill.

    Uses mid-month of a reference year (2024) to build a single-timestamp
    clear-sky estimate.
    """
    alt = get_altitude(lat, lon)
    target = pd.Timestamp(
        year=2024, month=month, day=15, hour=hour, tz="Asia/Kolkata"
    )
    times = pd.DatetimeIndex([target])
    clearsky = get_clearsky_irradiance(lat, lon, alt, times)
    return float(clearsky["ghi"].iloc[0])
