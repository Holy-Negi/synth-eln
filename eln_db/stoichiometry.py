def compute_equivalents(reaction, scale_mmol):
    """反応の各成分について、scale（mmol）から仕込み量を算出する

    - solvent : conc（mol/L）から体積を逆算する（equiv は使わない）
    - その他  : equiv × scale で mmol、MW から質量、density があれば体積
    - product : 質量を理論収量とみなし、yield_percent から実収量を求める
                equiv 未入力なら律速試薬に対して 1:1（equiv = 1.0）として扱う
    """
    rows = []
    for comp in reaction.components:
        cpd = comp.compound
        role = comp.role.value
        row = {
            "name": cpd.name, "mw": cpd.mw, "role": role, "equiv": comp.equiv,
            "mmol": None, "mass_g": None, "volume_ml": None,
            "yield_percent": comp.yield_percent, "actual_mass_g": None,
        }
        if role == "solvent":
            if reaction.conc:
                row["volume_ml"] = scale_mmol / reaction.conc
        else:
            equiv = 1.0 if (comp.equiv is None and role == "product") else comp.equiv
            if equiv is not None:
                n = scale_mmol * equiv
                row["mmol"] = n
                if cpd.mw is not None:
                    m = n * cpd.mw / 1000.0   # mmol × g/mol → mg なので 1000 で割って g
                    row["mass_g"] = m
                    if cpd.density:
                        row["volume_ml"] = m / cpd.density
                    if role == "product" and comp.yield_percent is not None:
                        row["actual_mass_g"] = m * comp.yield_percent / 100.0
        rows.append(row)
    return rows
