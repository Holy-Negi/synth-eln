// ===== 反応の文字表現 =====

// 指定した role の化合物名だけを取り出す
export const namesOf = (r, role) =>
  r.components
    .filter((c) => c.role === role)
    .map((c) => c.compound.name)
    .filter(Boolean);

// "A + B → C" 形式の反応式
export const schemeText = (r) => {
  const left = namesOf(r, "reactant").join(" + ");
  const right = namesOf(r, "product").join(" + ");
  return (
    [left, right].filter(Boolean).join(" → ") || "(reactant / product 未登録)"
  );
};
