"""Catalogue service returning categories, services, and Buea neighbourhoods."""

from typing import Any, Dict, List, Optional

# Canonical Buea neighbourhoods
BUEA_NEIGHBOURHOODS = [
    {"area_id": "00000000-0000-0000-0001-000000000001", "name": "Molyko", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000002", "name": "Mile 16 (Bolifamba)", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000003", "name": "Bonduma", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000004", "name": "Great Soppo", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000005", "name": "Bokwango", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000006", "name": "Muea", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000007", "name": "Sandpit", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000008", "name": "CheckPoint", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000009", "name": "Clerks Quarters", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000010", "name": "Federal Quarters", "city": "Buea", "active": True},
    {"area_id": "00000000-0000-0000-0001-000000000011", "name": "Buea Town", "city": "Buea", "active": True},
]

# Canonical Launch Categories
LAUNCH_CATEGORIES = [
    {
        "category_id": "00000000-0000-0000-0002-000000000001",
        "name_en": "Repairs & Maintenance",
        "name_fr": "Réparations & Entretien",
        "icon_key": "wrench",
        "display_order": 1,
        "active": True,
    },
    {
        "category_id": "00000000-0000-0000-0002-000000000002",
        "name_en": "Household & Domestic",
        "name_fr": "Ménage & Domestique",
        "icon_key": "sparkles",
        "display_order": 2,
        "active": True,
    },
    {
        "category_id": "00000000-0000-0000-0002-000000000003",
        "name_en": "Essential Supplies",
        "name_fr": "Approvisionnements Essentiels",
        "icon_key": "droplet",
        "display_order": 3,
        "active": True,
    },
    {
        "category_id": "00000000-0000-0000-0002-000000000004",
        "name_en": "Equipment Rentals",
        "name_fr": "Location d'Équipements",
        "icon_key": "battery-charging",
        "display_order": 4,
        "active": True,
    },
]

# Canonical Launch Services
LAUNCH_SERVICES = [
    {
        "service_id": "00000000-0000-0000-0003-000000000001",
        "category_id": "00000000-0000-0000-0002-000000000001",
        "name_en": "Plumbing Repairs",
        "name_fr": "Réparations de Plomberie",
        "description": "Leak fixing, pipe repair, toilet and tap installations",
        "risk_level": "MEDIUM",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000002",
        "category_id": "00000000-0000-0000-0002-000000000001",
        "name_en": "Electrical Repairs",
        "name_fr": "Réparations Électriques",
        "description": "Wiring, breakers, power points, safety checks",
        "risk_level": "HIGH",
        "requires_competence_verification": True,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000003",
        "category_id": "00000000-0000-0000-0002-000000000001",
        "name_en": "Water-Pump Repair",
        "name_fr": "Réparation de Pompe à Eau",
        "description": "Submersible and surface water pump troubleshooting",
        "risk_level": "HIGH",
        "requires_competence_verification": True,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000004",
        "category_id": "00000000-0000-0000-0002-000000000002",
        "name_en": "Home Cleaning",
        "name_fr": "Nettoyage à Domicile",
        "description": "General home, kitchen, and deep compound cleaning",
        "risk_level": "LOW",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000005",
        "category_id": "00000000-0000-0000-0002-000000000002",
        "name_en": "Laundry & Ironing",
        "name_fr": "Lessive & Repassage",
        "description": "Wash, fold, and iron clothes and bedding",
        "risk_level": "LOW",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000006",
        "category_id": "00000000-0000-0000-0002-000000000003",
        "name_en": "Drinking Water Delivery",
        "name_fr": "Livraison d'Eau Potable",
        "description": "Treated spring / mineral drinking water delivery",
        "risk_level": "MEDIUM",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000007",
        "category_id": "00000000-0000-0000-0002-000000000003",
        "name_en": "Household Water Delivery",
        "name_fr": "Livraison d'Eau Domestique",
        "description": "Bulk non-potable water tanker / drums",
        "risk_level": "LOW",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000008",
        "category_id": "00000000-0000-0000-0002-000000000003",
        "name_en": "Authorised Cooking Gas Refill",
        "name_fr": "Recharge de Bouteille de Gaz Agréée",
        "description": "Certified domestic butane bottle replacement with safety check",
        "risk_level": "HIGH",
        "requires_competence_verification": True,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000009",
        "category_id": "00000000-0000-0000-0002-000000000004",
        "name_en": "Portable Power Stations",
        "name_fr": "Stations Électriques Portables",
        "description": "1kWh - 3kWh silent lithium power stations",
        "risk_level": "MEDIUM",
        "requires_competence_verification": False,
        "active": True,
    },
    {
        "service_id": "00000000-0000-0000-0003-000000000010",
        "category_id": "00000000-0000-0000-0002-000000000004",
        "name_en": "Backup Generators",
        "name_fr": "Groupes Électrogènes de Secours",
        "description": "Fuel-powered backup electricity generators",
        "risk_level": "HIGH",
        "requires_competence_verification": True,
        "active": True,
    },
]


def get_categories() -> List[Dict[str, Any]]:
    return [c for c in LAUNCH_CATEGORIES if c["active"]]


def get_services(category_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if category_id:
        return [s for s in LAUNCH_SERVICES if s["active"] and s["category_id"] == category_id]
    return [s for s in LAUNCH_SERVICES if s["active"]]


def get_service_areas() -> List[Dict[str, Any]]:
    return [a for a in BUEA_NEIGHBOURHOODS if a["active"]]
