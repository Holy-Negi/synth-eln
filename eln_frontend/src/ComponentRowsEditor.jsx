import { Box, Button, MenuItem, Paper, Stack, TextField } from "@mui/material";
import { useToast } from "./useToast.js";
import { API_BASE } from "./api.js";

const ROLES = ["reactant", "reagent", "solvent", "catalyst", "product"];

// 小数を許す数値入力欄に共通で渡す設定
const NUMBER_INPUT = { step: "any", min: 0 };

function ComponentRowsEditor({ components, setComponents }) {
  const { showError } = useToast();
  // [...配列, 新しい配列]：配列に新しい配列を末尾に追加する
  // componentsを更新することでReactに再描画させる
  const addRow = () =>
    setComponents([...components, { name: "", smiles: "", role: "reactant", equiv: "", density: "", yield: "" }]);

  // i番目の行の key フィールドだけ更新（map で新配列を作る）
  const updateRow = (i, key, value) =>
    setComponents(components.map((row, idx) =>
      idx === i ? { ...row, [key]: value } : row));

  // i番目の行を削除（filter で i 以外を残す）
  const removeRow = (i) =>
    setComponents(components.filter((_, idx) => idx !== i));

  const handleResolve = async (i) => {
    try {
      const name = components[i].name
      const res = await fetch(`${API_BASE}/resolve?name=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail)
      };
      const data = await res.json();
      const smiles = await data.smiles;
      updateRow(i, 'smiles', smiles);
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <Stack spacing={1}>
      {components.map((row, i) => (
        // 行ごとに枠で囲み、画面幅が足りないときは中の入力欄が折り返す
        <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}>
            <TextField label="Name" value={row.name} sx={{ width: 180 }}
              onChange={(e) => updateRow(i, "name", e.target.value)} />
            <Button onClick={() => handleResolve(i)} sx={{ mt: 0.5 }}>Get SMILES</Button>
            {/* flexGrow: 1 で余った横幅を SMILES 欄に割り当てる */}
            <TextField label="SMILES" value={row.smiles} sx={{ flexGrow: 1, minWidth: 220 }}
              onChange={(e) => updateRow(i, "smiles", e.target.value)} />
            {/* select を付けると TextField が Select になり、ラベルも付く */}
            <TextField select label="Role" value={row.role} sx={{ width: 130 }}
              onChange={(e) => updateRow(i, "role", e.target.value)}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField label="Equiv" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
              value={row.equiv} sx={{ width: 100 }}
              onChange={(e) => updateRow(i, "equiv", e.target.value)} />
            <TextField label="Density (g/mL)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
              value={row.density} sx={{ width: 130 }}
              onChange={(e) => updateRow(i, "density", e.target.value)} />
            <TextField label="Yield (%)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
              value={row.yield} sx={{ width: 110 }}
              onChange={(e) => updateRow(i, "yield", e.target.value)} />

            {row.smiles && (
              // 構造式 SVG は背景が透明なので、白い板に載せる
              <Box sx={{ bgcolor: "#fff", borderRadius: 1, p: 0.5, width: 96, display: "flex" }}>
                <img
                  src={`${API_BASE}/depict?smiles=${encodeURIComponent(row.smiles)}`}
                  alt="structure"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
            )}

            {/* marginLeft: auto で削除ボタンだけ右端に寄せる */}
            <Button color="error" sx={{ ml: "auto", mt: 0.5 }} onClick={() => removeRow(i)}>
              Remove
            </Button>
          </Box>
        </Paper>
      ))}

      <Box>
        <Button onClick={addRow}>+ Add component</Button>
      </Box>
    </Stack>
  );
}
export default ComponentRowsEditor;
