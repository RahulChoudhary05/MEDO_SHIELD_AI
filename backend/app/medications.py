import csv
import json
import os
from typing import List, Dict, Any, Optional
from app.database import settings

_DEFAULT_DATA = [
    {
        "name": "Acetaminophen",
        "indications": ["pain", "fever"],
        "contraindications": ["severe liver disease"],
        "age_min": 12,
        "age_max": None,
        "notes": "Avoid exceeding recommended daily dose."
    },
    {
        "name": "Ibuprofen",
        "indications": ["pain", "inflammation", "fever"],
        "contraindications": ["peptic ulcer", "kidney disease"],
        "age_min": 12,
        "age_max": None,
        "notes": "Take with food."
    },
    {
        "name": "Metformin",
        "indications": ["type 2 diabetes"],
        "contraindications": ["severe kidney disease"],
        "age_min": 10,
        "age_max": None,
        "notes": "Monitor renal function."
    },
    {
        "name": "Amlodipine",
        "indications": ["hypertension"],
        "contraindications": ["severe hypotension"],
        "age_min": 18,
        "age_max": None,
        "notes": "Check blood pressure regularly."
    }
]

_cached_data: Optional[List[Dict[str, Any]]] = None


def _read_json(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _split_field(value: Optional[str]) -> List[str]:
    if not value:
        return []
    for sep in [";", "|", ","]:
        if sep in value:
            return [item.strip() for item in value.split(sep) if item.strip()]
    return [value.strip()]


def _read_csv(path: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            name = (
                row.get("name")
                or row.get("drug")
                or row.get("drug_name")
                or row.get("drugName")
                or row.get("medicine")
            )
            if not name:
                continue

            indications = (
                _split_field(row.get("indications"))
                or _split_field(row.get("condition"))
                or _split_field(row.get("disease"))
                or _split_field(row.get("symptom"))
            )

            contraindications = (
                _split_field(row.get("contraindications"))
                or _split_field(row.get("warnings"))
                or _split_field(row.get("contraindication"))
            )

            notes = row.get("notes") or row.get("sideEffects") or row.get("description")

            rows.append({
                "name": name,
                "indications": indications,
                "contraindications": contraindications,
                "age_min": None,
                "age_max": None,
                "notes": notes or ""
            })
    return rows


def _download_kaggle_dataset() -> Optional[str]:
    dataset = settings.KAGGLE_DATASET
    data_file = settings.KAGGLE_DATA_FILE
    target_dir = settings.KAGGLE_DATA_DIR
    if not dataset or not data_file:
        return None

    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, data_file)
    if os.path.exists(target_path):
        return target_path

    username = settings.KAGGLE_USERNAME
    api_key = settings.KAGGLE_KEY or settings.KAGGLE_API_TOKEN
    if not username or not api_key:
        return None

    try:
        os.environ["KAGGLE_USERNAME"] = username
        os.environ["KAGGLE_KEY"] = api_key
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        api.dataset_download_file(dataset, data_file, path=target_dir, force=True, quiet=True)
        return target_path
    except Exception:
        return None


def load_medication_data() -> List[Dict[str, Any]]:
    """Load medication dataset from local or Kaggle-sourced file."""
    global _cached_data
    if _cached_data is not None:
        return _cached_data

    data_path = settings.MEDICATION_DATA_PATH
    kaggle_path = _download_kaggle_dataset()

    for path in [data_path, kaggle_path]:
        if not path or not os.path.exists(path):
            continue
        try:
            if path.lower().endswith(".csv"):
                _cached_data = _read_csv(path)
            else:
                _cached_data = _read_json(path)
            return _cached_data
        except Exception:
            continue

    if settings.ALLOW_SAMPLE_MEDICATIONS:
        _cached_data = _DEFAULT_DATA
        return _cached_data

    _cached_data = []
    return _cached_data


def recommend_medications(
    symptoms: List[str],
    conditions: List[str],
    age: Optional[int]
) -> List[Dict[str, Any]]:
    """Basic rule-based medication recommendations with contraindication checks."""
    data = load_medication_data()
    if not data:
        return []
    symptom_set = {s.strip().lower() for s in (symptoms or []) if s.strip()}
    condition_set = {c.strip().lower() for c in (conditions or []) if c.strip()}

    results = []
    for med in data:
        indications = {i.lower() for i in med.get("indications", [])}
        contraindications = {c.lower() for c in med.get("contraindications", [])}

        if symptom_set or condition_set:
            if not (indications & (symptom_set | condition_set)):
                continue

        if condition_set & contraindications:
            continue

        age_min = med.get("age_min")
        age_max = med.get("age_max")
        if age is not None:
            if age_min is not None and age < age_min:
                continue
            if age_max is not None and age > age_max:
                continue

        results.append(med)

    return results[:10]
