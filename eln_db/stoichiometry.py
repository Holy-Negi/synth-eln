def compute_equivalents(reaction, scale_mmol):
    """反応の各成分について、scale（mmol）から仕込み量を算出する

    - solvent : conc（mol/L）から全体積を逆算し、solvent_ratio の比で各溶媒に按分する
                （solvent_ratio 未入力の溶媒は 1 として扱うので、全て未入力なら等分）
    - その他  : equiv × scale で mmol、MW から質量、density があれば体積
    - product : 質量を理論収量とみなし、yield_percent から実収量を求める
                equiv 未入力なら律速試薬に対して 1:1（equiv = 1.0）として扱う
    """
    solvent_weights = {
        comp.id: (1.0 if comp.solvent_ratio is None else comp.solvent_ratio)
        for comp in reaction.components
        if comp.role.value == "solvent"
    }
    total_weight = sum(solvent_weights.values())

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
            if reaction.conc and total_weight > 0:
                total_ml = scale_mmol / reaction.conc   # mmol ÷ mol/L = mL
                row["volume_ml"] = total_ml * solvent_weights[comp.id] / total_weight
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
