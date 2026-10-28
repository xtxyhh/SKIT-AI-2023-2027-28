"""
Week 7 - Estimate Generation Logic Prototype
HealWithIndia standalone demonstration. Rates are illustrative only.
"""
from __future__ import annotations
import json
import unittest
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Sequence

CURRENCY = "INR"
MAX_ITEMS = 30
MAX_QUANTITY = 100
MAX_DISCOUNT = Decimal("0.20")
CATEGORIES = {"consultation", "laboratory", "imaging", "procedure", "medicine", "other"}
DEFAULT_CATALOG = {
    "general_consultation": ("General consultation", "consultation", "500.00"),
    "specialist_consultation": ("Specialist consultation", "consultation", "900.00"),
    "complete_blood_count": ("Complete blood count", "laboratory", "350.00"),
    "blood_glucose": ("Blood glucose test", "laboratory", "120.00"),
    "lipid_profile": ("Lipid profile", "laboratory", "700.00"),
    "thyroid_panel": ("Thyroid panel", "laboratory", "650.00"),
    "xray_chest": ("Chest X-ray", "imaging", "800.00"),
    "ultrasound": ("Ultrasound", "imaging", "1500.00"),
    "ecg": ("ECG", "procedure", "450.00"),
    "dressing": ("Basic dressing", "procedure", "300.00"),
    "generic_medicine_pack": ("Example medicine pack", "medicine", "250.00"),
    "misc_service": ("Miscellaneous service", "other", "200.00"),
}
DISCLAIMER = (
    "Indicative estimate only. Sample rates are illustrative, not a hospital "
    "quote or medical advice. Confirm prices with the provider."
)

def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()

def money(value: Any) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def money_text(value: Decimal) -> str:
    return f"{CURRENCY} {money(value):,.2f}"

def normalize_key(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return "_".join(value.strip().lower().split())

def normalize_note(value: Any, limit: int = 180) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]

@dataclass
class Issue:
    field: str
    code: str
    message: str
    severity: str = "error"
    def as_dict(self) -> Dict[str, str]:
        return {"field": self.field, "code": self.code,
                "message": self.message, "severity": self.severity}

@dataclass
class Result:
    valid: bool = True
    issues: List[Issue] = field(default_factory=list)
    estimate: Dict[str, Any] = field(default_factory=dict)
    def add(self, field_name: str, code: str, message: str,
            severity: str = "error") -> None:
        self.issues.append(Issue(field_name, code, message, severity))
        if severity == "error":
            self.valid = False
    def as_dict(self) -> Dict[str, Any]:
        return {"valid": self.valid,
                "issues": [x.as_dict() for x in self.issues],
                "estimate": self.estimate}

@dataclass
class Line:
    key: str
    label: str
    category: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    note: str = ""
    def as_dict(self) -> Dict[str, Any]:
        return {"key": self.key, "label": self.label,
                "category": self.category, "quantity": self.quantity,
                "unit_price": str(money(self.unit_price)),
                "subtotal": str(money(self.subtotal)), "note": self.note}

@dataclass
class Estimate:
    estimate_id: str
    created_at: str
    owner: str
    lines: List[Line]
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    status: str = "draft"
    disclaimer: str = DISCLAIMER
    def as_dict(self) -> Dict[str, Any]:
        return {
            "estimate_id": self.estimate_id,
            "created_at": self.created_at,
            "owner": self.owner,
            "lines": [x.as_dict() for x in self.lines],
            "subtotal": str(money(self.subtotal)),
            "discount": str(money(self.discount)),
            "tax": str(money(self.tax)),
            "total": str(money(self.total)),
            "currency": CURRENCY,
            "status": self.status,
            "disclaimer": self.disclaimer,
        }

class Catalog:
    def __init__(self, items: Optional[Dict[str, tuple]] = None):
        source = items or DEFAULT_CATALOG
        self.items: Dict[str, Dict[str, Any]] = {}
        for key, (label, category, price) in source.items():
            self.items[key] = {
                "label": str(label), "category": str(category),
                "unit_price": money(price),
            }
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        return self.items.get(key)
    def list_items(self) -> List[Dict[str, Any]]:
        return [{"key": key, "label": value["label"],
                 "category": value["category"],
                 "unit_price": str(value["unit_price"])}
                for key, value in sorted(self.items.items())]
    def add(self, key: str, label: str, category: str, price: Any) -> None:
        key = normalize_key(key)
        label = normalize_note(label)
        category = normalize_key(category)
        price = money(price)
        if not key or not label:
            raise ValueError("Key and label are required.")
        if category not in CATEGORIES:
            raise ValueError("Unsupported category.")
        if price < 0:
            raise ValueError("Price cannot be negative.")
        self.items[key] = {"label": label, "category": category,
                           "unit_price": price}


# Manual test scenarios for future estimate-rule expansion
MANUAL_CASE_01 = {
    "name": "manual_case_01",
    "enabled": True,
    "sample_index": 1,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.01",
}

MANUAL_CASE_02 = {
    "name": "manual_case_02",
    "enabled": True,
    "sample_index": 2,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.02",
}

MANUAL_CASE_03 = {
    "name": "manual_case_03",
    "enabled": True,
    "sample_index": 3,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.03",
}

MANUAL_CASE_04 = {
    "name": "manual_case_04",
    "enabled": True,
    "sample_index": 4,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.04",
}

MANUAL_CASE_05 = {
    "name": "manual_case_05",
    "enabled": True,
    "sample_index": 5,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.00",
}

MANUAL_CASE_06 = {
    "name": "manual_case_06",
    "enabled": True,
    "sample_index": 6,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.01",
}

MANUAL_CASE_07 = {
    "name": "manual_case_07",
    "enabled": True,
    "sample_index": 7,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.02",
}

MANUAL_CASE_08 = {
    "name": "manual_case_08",
    "enabled": True,
    "sample_index": 8,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.03",
}

MANUAL_CASE_09 = {
    "name": "manual_case_09",
    "enabled": True,
    "sample_index": 9,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.04",
}

MANUAL_CASE_10 = {
    "name": "manual_case_10",
    "enabled": True,
    "sample_index": 10,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.00",
}

MANUAL_CASE_11 = {
    "name": "manual_case_11",
    "enabled": True,
    "sample_index": 11,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.01",
}

MANUAL_CASE_12 = {
    "name": "manual_case_12",
    "enabled": True,
    "sample_index": 12,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.02",
}

MANUAL_CASE_13 = {
    "name": "manual_case_13",
    "enabled": True,
    "sample_index": 13,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.03",
}

MANUAL_CASE_14 = {
    "name": "manual_case_14",
    "enabled": True,
    "sample_index": 14,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.04",
}

MANUAL_CASE_15 = {
    "name": "manual_case_15",
    "enabled": True,
    "sample_index": 15,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.00",
}

MANUAL_CASE_16 = {
    "name": "manual_case_16",
    "enabled": True,
    "sample_index": 16,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.01",
}

MANUAL_CASE_17 = {
    "name": "manual_case_17",
    "enabled": True,
    "sample_index": 17,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.02",
}

MANUAL_CASE_18 = {
    "name": "manual_case_18",
    "enabled": True,
    "sample_index": 18,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.03",
}

MANUAL_CASE_19 = {
    "name": "manual_case_19",
    "enabled": True,
    "sample_index": 19,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.04",
}

MANUAL_CASE_20 = {
    "name": "manual_case_20",
    "enabled": True,
    "sample_index": 20,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.00",
}

MANUAL_CASE_21 = {
    "name": "manual_case_21",
    "enabled": True,
    "sample_index": 21,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.01",
}

MANUAL_CASE_22 = {
    "name": "manual_case_22",
    "enabled": True,
    "sample_index": 22,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.02",
}

MANUAL_CASE_23 = {
    "name": "manual_case_23",
    "enabled": True,
    "sample_index": 23,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.03",
}

MANUAL_CASE_24 = {
    "name": "manual_case_24",
    "enabled": True,
    "sample_index": 24,
    "purpose": "estimate validation fixture",
    "discount_rate": "0.04",
}


class Validator:
    def __init__(self, catalog: Catalog):
        self.catalog = catalog
    def owner(self, value: Any, result: Result) -> str:
        if not isinstance(value, str):
            result.add("owner", "type", "Owner must be text.")
            return ""
        value = value.strip()
        if len(value) < 3 or len(value) > 40:
            result.add("owner", "length", "Owner must be 3-40 characters.")
        if not value.replace("_", "").replace("-", "").isalnum():
            result.add("owner", "format", "Owner contains invalid characters.")
        return value
    def items(self, value: Any, result: Result) -> List[Dict[str, Any]]:
        if not isinstance(value, list):
            result.add("items", "type", "Items must be a list.")
            return []
        if not value:
            result.add("items", "empty", "At least one item is required.")
            return []
        if len(value) > MAX_ITEMS:
            result.add("items", "count", f"At most {MAX_ITEMS} items allowed.")
            return []
        output = []
        for i, item in enumerate(value):
            field_name = f"items[{i}]"
            if not isinstance(item, dict):
                result.add(field_name, "type", "Item must be an object.")
                continue
            key = normalize_key(item.get("key"))
            catalog_item = self.catalog.get(key)
            if catalog_item is None:
                result.add(field_name + ".key", "unknown",
                           f"Unknown catalog item: {key or '<empty>'}.")
                continue
            quantity = item.get("quantity", 1)
            if isinstance(quantity, bool) or not isinstance(quantity, int):
                result.add(field_name + ".quantity", "type",
                           "Quantity must be an integer.")
                continue
            if quantity < 1 or quantity > MAX_QUANTITY:
                result.add(field_name + ".quantity", "range",
                           f"Quantity must be 1-{MAX_QUANTITY}.")
                continue
            output.append({
                "key": key, "label": catalog_item["label"],
                "category": catalog_item["category"], "quantity": quantity,
                "unit_price": catalog_item["unit_price"],
                "note": normalize_note(item.get("note", "")),
            })
        return output
    def rate(self, value: Any, name: str, maximum: Decimal,
             result: Result) -> Decimal:
        try:
            rate = Decimal(str(value))
        except Exception:
            result.add(name, "type", "Rate must be numeric.")
            return Decimal("0")
        if not rate.is_finite() or rate < 0 or rate > maximum:
            result.add(name, "range", f"Rate must be between 0 and {maximum}.")
            return Decimal("0")
        return rate

class EstimateEngine:
    def __init__(self, catalog: Optional[Catalog] = None,
                 default_tax: Any = "0"):
        self.catalog = catalog or Catalog()
        self.validator = Validator(self.catalog)
        self.default_tax = Decimal(str(default_tax))
        self.estimates: Dict[str, Estimate] = {}
    def calculate(self, request: Any) -> Result:
        result = Result()
        if not isinstance(request, dict):
            result.add("request", "type", "Request must be an object.")
            return result
        owner = self.validator.owner(request.get("owner"), result)
        items = self.validator.items(request.get("items"), result)
        discount_rate = self.validator.rate(
            request.get("discount_rate", "0"), "discount_rate",
            MAX_DISCOUNT, result)
        tax_rate = self.validator.rate(
            request.get("tax_rate", str(self.default_tax)), "tax_rate",
            Decimal("1"), result)
        if not result.valid:
            return result
        lines = []
        for item in items:
            unit = money(item["unit_price"])
            line_total = money(unit * item["quantity"])
            lines.append(Line(item["key"], item["label"], item["category"],
                              item["quantity"], unit, line_total, item["note"]))
        subtotal = money(sum((x.subtotal for x in lines), Decimal("0")))
        discount = money(subtotal * discount_rate)
        taxable = max(Decimal("0"), subtotal - discount)
        tax = money(taxable * tax_rate)
        total = money(taxable + tax)
        estimate_id = "EST-" + datetime.now(timezone.utc).strftime(
            "%Y%m%d%H%M%S") + f"-{len(self.estimates) + 1:04d}"
        estimate = Estimate(estimate_id, now_utc(), owner, lines, subtotal,
                            discount, tax, total)
        self.estimates[estimate_id] = estimate
        result.estimate = estimate.as_dict()
        return result
    def get(self, estimate_id: str) -> Optional[Estimate]:
        return self.estimates.get(estimate_id)
    def list_for_owner(self, owner: str) -> List[Estimate]:
        return [x for x in self.estimates.values() if x.owner == owner]
    def change_status(self, estimate_id: str, status: str) -> bool:
        if status not in {"draft", "reviewed", "confirmed", "cancelled"}:
            return False
        estimate = self.get(estimate_id)
        if estimate is None:
            return False
        estimate.status = status
        return True
    def export_json(self, estimate_id: str) -> str:
        estimate = self.get(estimate_id)
        if estimate is None:
            raise KeyError("Estimate not found.")
        return json.dumps(estimate.as_dict(), indent=2)
    def compare(self, requests: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
        output = []
        for index, request in enumerate(requests, 1):
            result = self.calculate(request)
            output.append({
                "scenario": index, "valid": result.valid,
                "total": result.estimate.get("total"),
                "issues": [x.as_dict() for x in result.issues],
            })
        return output

def sample_request() -> Dict[str, Any]:
    return {
        "owner": "yash_demo",
        "items": [
            {"key": "general_consultation", "quantity": 1},
            {"key": "complete_blood_count", "quantity": 1},
            {"key": "blood_glucose", "quantity": 1},
        ],
        "discount_rate": "0.05",
        "tax_rate": "0",
    }

def show(title: str, result: Result) -> None:
    print(f"\n--- {title} ---")
    print(json.dumps(result.as_dict(), indent=2))

def run_demo() -> None:
    engine = EstimateEngine()
    result = engine.calculate(sample_request())
    show("Standard estimate", result)
    bad = sample_request()
    bad["items"].append({"key": "unknown_test", "quantity": 1})
    show("Unknown catalog item", engine.calculate(bad))
    bad = sample_request()
    bad["items"][0]["quantity"] = -1
    show("Invalid quantity", engine.calculate(bad))
    discount_case = sample_request()
    discount_case["discount_rate"] = "0.15"
    show("Discount scenario", engine.calculate(discount_case))
    if result.valid:
        estimate_id = result.estimate["estimate_id"]
        print("\n--- Export ---")
        print(engine.export_json(estimate_id))
        engine.change_status(estimate_id, "reviewed")
        print("Status:", engine.get(estimate_id).status)
    cases = [
        sample_request(),
        {"owner": "yash_demo", "items": [{"key": "ultrasound"}]},
        {"owner": "yash_demo", "items": [
            {"key": "specialist_consultation"},
            {"key": "thyroid_panel"}], "discount_rate": "0.10"},
    ]
    print("\n--- Scenario comparison ---")
    print(json.dumps(engine.compare(cases), indent=2))

class TestMoney(unittest.TestCase):
    def test_rounding(self):
        self.assertEqual(money("2.345"), Decimal("2.35"))
    def test_integer(self):
        self.assertEqual(money(4), Decimal("4.00"))
    def test_format(self):
        self.assertEqual(money_text(Decimal("500")), "INR 500.00")

class TestCatalog(unittest.TestCase):
    def setUp(self):
        self.catalog = Catalog()
    def test_list(self):
        self.assertGreater(len(self.catalog.list_items()), 0)
    def test_get(self):
        self.assertEqual(self.catalog.get("ecg")["category"], "procedure")
    def test_unknown(self):
        self.assertIsNone(self.catalog.get("unknown"))
    def test_add(self):
        self.catalog.add("new_test", "New test", "laboratory", "123.45")
        self.assertEqual(self.catalog.get("new_test")["unit_price"],
                         Decimal("123.45"))
    def test_negative_price(self):
        with self.assertRaises(ValueError):
            self.catalog.add("bad", "Bad", "other", -1)
    def test_category(self):
        with self.assertRaises(ValueError):
            self.catalog.add("bad", "Bad", "unknown", 1)

class TestValidator(unittest.TestCase):
    def setUp(self):
        self.validator = Validator(Catalog())
    def test_owner(self):
        result = Result()
        self.assertEqual(self.validator.owner("yash_demo", result), "yash_demo")
        self.assertTrue(result.valid)
    def test_short_owner(self):
        result = Result()
        self.validator.owner("x", result)
        self.assertFalse(result.valid)
    def test_owner_symbols(self):
        result = Result()
        self.validator.owner("bad owner", result)
        self.assertFalse(result.valid)
    def test_items(self):
        result = Result()
        self.assertEqual(len(self.validator.items(
            [{"key": "ecg", "quantity": 2}], result)), 1)
        self.assertTrue(result.valid)
    def test_unknown_item(self):
        result = Result()
        self.validator.items([{"key": "missing"}], result)
        self.assertFalse(result.valid)
    def test_zero_quantity(self):
        result = Result()
        self.validator.items([{"key": "ecg", "quantity": 0}], result)
        self.assertFalse(result.valid)
    def test_fraction_quantity(self):
        result = Result()
        self.validator.items([{"key": "ecg", "quantity": 1.5}], result)
        self.assertFalse(result.valid)
    def test_bool_quantity(self):
        result = Result()
        self.validator.items([{"key": "ecg", "quantity": True}], result)
        self.assertFalse(result.valid)
    def test_discount_limit(self):
        result = Result()
        self.validator.rate("0.21", "discount", MAX_DISCOUNT, result)
        self.assertFalse(result.valid)
    def test_tax_limit(self):
        result = Result()
        self.validator.rate("1.2", "tax", Decimal("1"), result)
        self.assertFalse(result.valid)
    def test_bad_items_type(self):
        result = Result()
        self.validator.items("ecg", result)
        self.assertFalse(result.valid)
    def test_too_many_items(self):
        result = Result()
        self.validator.items([{"key": "ecg"}] * 31, result)
        self.assertFalse(result.valid)

class TestEngine(unittest.TestCase):
    def setUp(self):
        self.engine = EstimateEngine()
    def test_valid(self):
        result = self.engine.calculate(sample_request())
        self.assertTrue(result.valid)
        self.assertIn("total", result.estimate)
    def test_subtotal(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "general_consultation"},
            {"key": "blood_glucose", "quantity": 2}]}
        result = self.engine.calculate(request)
        self.assertTrue(result.valid)
        self.assertEqual(result.estimate["subtotal"], "740.00")
    def test_discount(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "general_consultation"}], "discount_rate": "0.10"}
        result = self.engine.calculate(request)
        self.assertEqual(result.estimate["discount"], "50.00")
        self.assertEqual(result.estimate["total"], "450.00")
    def test_wrong_request(self):
        self.assertFalse(self.engine.calculate("bad").valid)
    def test_invalid_owner(self):
        request = sample_request()
        request["owner"] = "?"
        self.assertFalse(self.engine.calculate(request).valid)
    def test_invalid_item(self):
        request = sample_request()
        request["items"] = [{"key": "missing"}]
        self.assertFalse(self.engine.calculate(request).valid)
    def test_status(self):
        result = self.engine.calculate(sample_request())
        estimate_id = result.estimate["estimate_id"]
        self.assertTrue(self.engine.change_status(estimate_id, "reviewed"))
        self.assertEqual(self.engine.get(estimate_id).status, "reviewed")
    def test_bad_status(self):
        result = self.engine.calculate(sample_request())
        self.assertFalse(self.engine.change_status(
            result.estimate["estimate_id"], "paid"))
    def test_export(self):
        result = self.engine.calculate(sample_request())
        data = json.loads(self.engine.export_json(result.estimate["estimate_id"]))
        self.assertIn("lines", data)
    def test_owner_list(self):
        self.engine.calculate(sample_request())
        self.assertEqual(len(self.engine.list_for_owner("yash_demo")), 1)
    def test_compare(self):
        self.assertEqual(len(self.engine.compare([sample_request()])), 1)


    def test_tax_calculation(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "general_consultation"}], "tax_rate": "0.10"}
        result = self.engine.calculate(request)
        self.assertTrue(result.valid)
        self.assertEqual(result.estimate["tax"], "50.00")
        self.assertEqual(result.estimate["total"], "550.00")

    def test_zero_discount(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "general_consultation"}], "discount_rate": "0"}
        result = self.engine.calculate(request)
        self.assertEqual(result.estimate["discount"], "0.00")

    def test_maximum_discount(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "general_consultation"}], "discount_rate": "0.20"}
        result = self.engine.calculate(request)
        self.assertTrue(result.valid)
        self.assertEqual(result.estimate["total"], "400.00")

    def test_unknown_estimate(self):
        self.assertIsNone(self.engine.get("EST-missing"))

    def test_export_unknown_estimate(self):
        with self.assertRaises(KeyError):
            self.engine.export_json("EST-missing")

    def test_cancelled_status(self):
        result = self.engine.calculate(sample_request())
        estimate_id = result.estimate["estimate_id"]
        self.assertTrue(self.engine.change_status(estimate_id, "cancelled"))
        self.assertEqual(self.engine.get(estimate_id).status, "cancelled")

    def test_multiple_owner_records(self):
        self.engine.calculate(sample_request())
        request = {"owner": "other_demo", "items": [{"key": "ecg"}]}
        self.engine.calculate(request)
        self.assertEqual(len(self.engine.list_for_owner("other_demo")), 1)
        self.assertEqual(len(self.engine.list_for_owner("yash_demo")), 1)

    def test_note_normalization(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "ecg", "note": "  routine   follow up  "}]}
        result = self.engine.calculate(request)
        self.assertTrue(result.valid)
        self.assertEqual(result.estimate["lines"][0]["note"],
                         "routine follow up")

    def test_quantity_limit(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "ecg", "quantity": 101}]}
        self.assertFalse(self.engine.calculate(request).valid)

    def test_negative_discount(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "ecg"}], "discount_rate": "-0.01"}
        self.assertFalse(self.engine.calculate(request).valid)

    def test_non_numeric_tax(self):
        request = {"owner": "yash_demo", "items": [
            {"key": "ecg"}], "tax_rate": "not-a-rate"}
        self.assertFalse(self.engine.calculate(request).valid)

    def test_decimal_rounding_in_total(self):
        catalog = Catalog({"test": ("Rounding item", "other", "12.345")})
        engine = EstimateEngine(catalog)
        result = engine.calculate({"owner": "yash_demo",
                                   "items": [{"key": "test", "quantity": 3}]})
        self.assertTrue(result.valid)
        self.assertEqual(result.estimate["subtotal"], "37.05")

def run_tests() -> None:
    suite = unittest.defaultTestLoader.loadTestsFromModule(
        __import__(__name__))
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)

def main() -> None:
    print("Week 7 - Estimate Generation Logic Prototype")
    print("Using illustrative sample rates in INR.")
    run_demo()
    print("\nRunning automated tests...")
    run_tests()

if __name__ == "__main__":
    main()
