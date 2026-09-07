"""デモ・検証用のテストデータを API 経由で投入する。

使い方:
  コンテナ内から:  docker compose exec api python seed.py
  ホストから:      uv run python eln_db/seed.py --base http://localhost:8080/api
"""
import argparse
import json
import sys
import urllib.error
import urllib.request

COMPOUNDS = [
    # name, smiles, density (g/mL, 液体のみ)
    ("4-Bromoanisole",        "COc1ccc(Br)cc1",            1.494),
    ("Phenylboronic acid",    "OB(O)c1ccccc1",             None),
    ("Potassium carbonate",   "[K+].[K+].[O-]C([O-])=O",   None),
    ("Palladium(II) acetate", "CC(=O)O[Pd]OC(C)=O",        None),
    ("Toluene",               "Cc1ccccc1",                 0.867),
    ("Water",                 "O",                         1.000),
    ("4-Methoxybiphenyl",     "COc1ccc(-c2ccccc2)cc1",     None),
    # 検索デモ用
    ("Benzoic acid",          "OC(=O)c1ccccc1",            None),
    ("Tryptamine",            "NCCc1c[nH]c2ccccc12",       None),
    ("Indole-3-acetic acid",  "OC(=O)Cc1c[nH]c2ccccc12",   None),
    ("Ethyl acetate",         "CCOC(C)=O",                 0.902),
]

REACTIONS = [
    {
        "exp_code": "HN-001",
        "title": "Suzuki-Miyaura coupling of 4-bromoanisole",
        "date": "2026-09-01T10:00:00",
        "scale": 1.0,
        "conc": 0.2,
        "temperature": 90.0,
        "duration_h": 12.0,
        "note": "Demo data. Ar, toluene/water 4:1.",
        "components": [
            {"smiles": "COc1ccc(Br)cc1",          "name": "4-Bromoanisole",        "role": "reactant", "equiv": 1.0, "density": 1.494},
            {"smiles": "OB(O)c1ccccc1",           "name": "Phenylboronic acid",    "role": "reactant", "equiv": 1.2},
            {"smiles": "[K+].[K+].[O-]C([O-])=O", "name": "Potassium carbonate",   "role": "reagent",  "equiv": 2.0},
            {"smiles": "CC(=O)O[Pd]OC(C)=O",      "name": "Palladium(II) acetate", "role": "catalyst", "equiv": 0.02},
            {"smiles": "Cc1ccccc1",               "name": "Toluene",               "role": "solvent",  "density": 0.867},
            {"smiles": "O",                       "name": "Water",                 "role": "solvent",  "density": 1.000},
            {"smiles": "COc1ccc(-c2ccccc2)cc1",   "name": "4-Methoxybiphenyl",     "role": "product",  "equiv": 1.0, "yield_percent": 87.0},
        ],
    },
]


def post(base: str, path: str, payload: dict) -> tuple[int, dict | None]:
    """POST して (status, body) を返す。4xx でも例外にせず呼び出し側で判断する"""
    req = urllib.request.Request(
        f"{base}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = None
        return e.code, body


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000",
                        help="API のベース URL (末尾スラッシュ無し)")
    args = parser.parse_args()
    base = args.base.rstrip("/")

    print(f"[seed] target: {base}")

    created = skipped = failed = 0
    for name, smiles, density in COMPOUNDS:
        payload = {"name": name, "smiles": smiles}
        if density is not None:
            payload["density"] = density
        status, body = post(base, "/compounds", payload)
        if status == 201:
            created += 1
            print(f"  + {name:<24} MW={body['mw']:.2f}")
        elif status == 409:
            skipped += 1
            print(f"  = {name:<24} (already exists)")
        else:
            failed += 1
            print(f"  ! {name:<24} {status} {body}")
    print(f"[seed] compounds: created={created} skipped={skipped} failed={failed}")

    for rxn in REACTIONS:
        status, body = post(base, "/reactions", rxn)
        if status == 201:
            print(f"  + reaction {rxn['exp_code']} (id={body['id']}, {len(body['components'])} components)")
        else:
            print(f"  ! reaction {rxn['exp_code']} {status} {body}")
            failed += 1

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())