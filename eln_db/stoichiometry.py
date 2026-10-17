def compute_equivalents(reaction, scale_mmol):
    """反応の各成分について、scale（mmol）から仕込み量を算出する

    - solvent : conc（mol/L）から全体積を逆算し、solvent_ratio の比で各溶媒に按分する
                （solvent_ratio 未入力の溶媒は 1 として扱うので、全て未入力なら等分）
    - 溶液試薬 : solution_molarity があれば mmol ÷ M で体積を出す（質量は出さない）
    - その他  : equiv × scale で mmol、MW と純度から質量、density があれば体積
    - product : 質量を理論収量とみなし、yield_percent から見込み収量を求める
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
            "purity_percent": comp.purity_percent,
            "solution_molarity": comp.solution_molarity,
            "yield_percent": comp.yield_percent, "expected_mass_g": None,
        }
        if role == "solvent":
            if reaction.conc and total_weight > 0:
                total_ml = scale_mmol / reaction.conc   # mmol ÷ mol/L = mL
                row["volume_ml"] = total_ml * solvent_weights[comp.id] / total_weight
            rows.append(row)
            continue

        equiv = 1.0 if (comp.equiv is None and role == "product") else comp.equiv
        if equiv is None:
            rows.append(row)
            continue

        n = scale_mmol * equiv
        row["mmol"] = n
        if comp.solution_molarity:
            row["volume_ml"] = n / comp.solution_molarity   # mmol ÷ mol/L = mL
        elif cpd.mw is not None:
            m = n * cpd.mw / 1000.0   # mmol × g/mol → mg なので 1000 で割って g
            if role == "product":
                row["mass_g"] = m
                if comp.yield_percent is not None:
                    row["expected_mass_g"] = m * comp.yield_percent / 100.0
            else:
                m /= (comp.purity_percent or 100.0) / 100.0   # 不純物の分だけ多く量る
                row["mass_g"] = m
                if cpd.density:
                    row["volume_ml"] = m / cpd.density
        rows.append(row)
    return rows


def _measured_mmol(comp):
    """秤量値（mg）と純度から実際に仕込んだ mmol を返す。求まらなければ None"""
    if comp.measured_mg is None or not comp.compound.mw:
        return None
    return comp.measured_mg * (comp.purity_percent or 100.0) / 100.0 / comp.compound.mw


def apply_isolated_yields(reaction):
    """単離質量（measured_mg）を持つ product の yield_percent を計算して上書きする

    理論 mmol の基準は律速試薬（equiv = 1 の reactant / reagent / catalyst）の秤量値。
    秤量値が無ければ reaction.scale を使う。
    """
    limiting = next(
        (c for c in reaction.components
         if c.role.value not in ("solvent", "product") and c.equiv == 1.0),
        None,
    )
    base_mmol = (_measured_mmol(limiting) if limiting else None) or reaction.scale

    for comp in reaction.components:
        if comp.role.value != "product" or comp.measured_mg is None or not comp.compound.mw:
            continue
        theoretical = base_mmol * (comp.equiv or 1.0)
        if theoretical > 0:
            comp.yield_percent = comp.measured_mg / comp.compound.mw / theoretical * 100.0
