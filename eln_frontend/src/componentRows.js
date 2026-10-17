// ===== 反応成分の入力行 ⇔ API ペイロードの変換 =====
// フォームの値は文字列で持ち、送信時に数値 / null へ変換する

// compoundId: 登録済み化合物から選んだ行なら その id。手入力の行は null
export const EMPTY_ROW = {
  compoundId: null,
  name: "",
  smiles: "",
  role: "reactant",
  equiv: "",
  density: "",
  yield: "",
  ratio: "",
  measured: "",
  purity: "",
  molarity: "",
};

// "" は null、それ以外は数値にする
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

// role ごとに意味を持つ項目だけ送る（role を変えた行に残った値を無視するため）
export const toComponentPayload = (row) => {
  const isSolvent = row.role === "solvent";
  const isProduct = row.role === "product";
  return {
    name: row.name || null,
    smiles: row.smiles,
    role: row.role,
    equiv: isSolvent ? null : numOrNull(row.equiv),
    density: numOrNull(row.density),
    yield_percent: isProduct ? numOrNull(row.yield) : null,
    solvent_ratio: isSolvent ? numOrNull(row.ratio) : null,
    measured_mg: isSolvent ? null : numOrNull(row.measured),
    purity_percent: isSolvent || isProduct ? null : numOrNull(row.purity),
    solution_molarity: isSolvent || isProduct ? null : numOrNull(row.molarity),
  };
};

// API の成分（ReactionComponentRead）→ 入力行。?? "" で null を空欄にする
export const fromComponent = (c) => ({
  compoundId: c.compound.id,
  name: c.compound.name ?? "",
  smiles: c.compound.smiles ?? "",
  role: c.role,
  equiv: c.equiv ?? "",
  density: c.compound.density ?? "",
  yield: c.yield_percent ?? "",
  ratio: c.solvent_ratio ?? "",
  measured: c.measured_mg ?? "",
  purity: c.purity_percent ?? "",
  molarity: c.solution_molarity ?? "",
});
