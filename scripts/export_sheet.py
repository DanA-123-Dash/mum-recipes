# export_sheet.py
# Exports Google Sheet → data.json for the Mum's Recipes PWA.
# Runs locally and in GitHub Actions.

import json
import os
import sys
import tempfile

from google.oauth2 import service_account
from googleapiclient.discovery import build

# ── Auth ─────────────────────────────────────────────────────────────────────
# In GitHub Actions: GOOGLE_CREDENTIALS_JSON env var holds the JSON content.
# Locally: falls back to GOOGLE_APPLICATION_CREDENTIALS file path.

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

def get_credentials():
    raw = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if raw:
        # GitHub Actions: write JSON content to a temp file
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        tmp.write(raw)
        tmp.close()
        creds = service_account.Credentials.from_service_account_file(tmp.name, scopes=SCOPES)
        os.unlink(tmp.name)
        return creds
    # Local: use file path from env
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not path:
        sys.exit("ERROR: Neither GOOGLE_CREDENTIALS_JSON nor GOOGLE_APPLICATION_CREDENTIALS is set.")
    return service_account.Credentials.from_service_account_file(path, scopes=SCOPES)


# ── Column map (0-indexed, matches Sheet columns A–AL) ──────────────────────
COLS = {
    "id": 0, "slug": 1, "title": 2, "category": 3, "cuisine_primary": 4,
    "difficulty": 5, "serves": 6, "total_mins": 7, "active_cook_time_mins": 8,
    "gluten_free": 9, "dairy_free": 10, "vegetarian": 11, "vegan": 12,
    "nut_free": 13, "freezable": 14, "air_fryer": 15, "air_fryer_adaptable": 16,
    "hazelnut": 17, "brazil_nut": 18, "kcal": 19, "protein_g": 20,
    "ingredients_json": 21, "method_json": 22, "allergens_json": 23,
    "tags": 24, "image_drive_url": 25, "drive_folder_path": 26,
    "source_publication": 27, "source_date": 28, "meal_plan_category": 29,
    "serving_size_context": 30, "date_added": 31, "manually_reviewed": 32,
    "flagged_for_review": 33, "flag_reason": 34, "deleted": 35,
    "image_hash": 36, "method_air_fryer_json": 37,
}

BOOL_COLS = {
    "gluten_free", "dairy_free", "vegetarian", "vegan", "nut_free", "freezable",
    "air_fryer", "air_fryer_adaptable", "hazelnut", "brazil_nut",
    "manually_reviewed", "flagged_for_review", "deleted",
}

JSON_COLS = {"ingredients_json", "method_json", "allergens_json", "method_air_fryer_json"}

INT_COLS = {"serves", "total_mins", "active_cook_time_mins", "kcal", "protein_g"}


def cell(row: list, col: str) -> str:
    idx = COLS[col]
    return row[idx].strip() if idx < len(row) and row[idx] else ""


def parse_row(row: list) -> dict | None:
    """Parse a Sheet row into a clean recipe dict. Returns None if deleted."""
    if cell(row, "deleted").upper() == "TRUE":
        return None

    r = {}
    for col in COLS:
        if col in ("deleted", "image_hash", "drive_folder_path"):
            continue  # skip internal/unused fields

        val = cell(row, col)

        if col in BOOL_COLS:
            r[col] = val.upper() == "TRUE"
        elif col in INT_COLS:
            try:
                r[col] = int(val) if val else None
            except ValueError:
                r[col] = None
        elif col in JSON_COLS:
            # Rename to strip the _json suffix for the PWA
            key = col.replace("_json", "")
            if val:
                try:
                    r[key] = json.loads(val)
                except json.JSONDecodeError:
                    r[key] = [] if col != "allergens_json" else {}
            else:
                r[key] = [] if col != "allergens_json" else {}
        elif col == "tags":
            r["tags"] = [t.strip() for t in val.split(",") if t.strip()] if val else []
        elif col == "image_drive_url":
            # Convert Drive share URL to thumbnail URL that renders in <img> tags
            # uc?export=view URLs redirect through a virus-scan page and don't work as img src
            file_id = None
            if "id=" in val:
                file_id = val.split("id=")[-1].split("&")[0]
            r["image_url"] = f"https://drive.google.com/thumbnail?id={file_id}&sz=w800" if file_id else val
        else:
            r[col] = val

    return r


def main():
    # Load .env if running locally
    try:
        from dotenv import load_dotenv
        # Search upward for .env (handles running from scripts/ or project root)
        for path in ["../.env", "../../.env", os.path.expanduser("~/My Drive/.env"),
                     "/Users/Dan/My Drive/.env"]:
            if os.path.exists(path):
                load_dotenv(path)
                break
    except ImportError:
        pass  # dotenv not available in Actions — env vars set directly

    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        sys.exit("ERROR: GOOGLE_SHEET_ID not set.")

    sheet_tab = os.environ.get("GOOGLE_SHEET_TAB", "Recipes")
    output_path = os.path.join(os.path.dirname(__file__), "..", "data.json")

    print(f"Fetching Sheet {sheet_id} tab '{sheet_tab}'…")
    svc = build("sheets", "v4", credentials=get_credentials())
    result = svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{sheet_tab}!A2:AL",  # skip header row
    ).execute()

    rows = result.get("values", [])
    print(f"  {len(rows)} data row(s) found.")

    recipes = []
    for row in rows:
        parsed = parse_row(row)
        if parsed:
            recipes.append(parsed)

    print(f"  {len(recipes)} recipe(s) exported (after filtering deleted).")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(recipes, f, ensure_ascii=False, indent=2)

    print(f"  Written to {os.path.abspath(output_path)}")


if __name__ == "__main__":
    main()
