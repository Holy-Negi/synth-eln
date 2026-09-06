import { TextField, Select, MenuItem, Button } from "@mui/material";
import { useToast } from "./useToast.js";
import { API_BASE } from "./api.js";

const ROLES = ["reactant", "reagent", "solvent", "catalyst", "product"];

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
    <div>
      {components.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <TextField label="name" size="small" value={row.name}
            onChange={(e) => updateRow(i, "name", e.target.value)} />
          <Button onClick={() => handleResolve(i)}>Get SMILES</Button>
          <TextField label="SMILES" size="small" value={row.smiles}
            onChange={(e) => updateRow(i, "smiles", e.target.value)} />
          <Select size="small" value={row.role}
            onChange={(e) => updateRow(i, "role", e.target.value)}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </Select>
          <TextField label="equiv" size="small" value={row.equiv} style={{ width: 90 }}
            onChange={(e) => updateRow(i, "equiv", e.target.value)} />
          <TextField label="density (new only)" size="small" value={row.density} style={{ width: 90 }}
            onChange={(e) => updateRow(i, "density", e.target.value)} />
          <TextField label="yield (%)" size="small" value={row.yield} style={{ width: 90 }}
            onChange={(e) => updateRow(i, "yield", e.target.value)} />
          <Button color="error" onClick={() => removeRow(i)}>×</Button>
          {row.smiles && (
            <img
              src={`${API_BASE}/depict?smiles=${encodeURIComponent(row.smiles)}`}
              alt='structure'
              style={{ height: 40, width: 'auto', maxWidth: '100%'}}
            />
          )}
        </div>
      ))}
      <Button onClick={addRow}>+ Add component</Button>
    </div>
  );
}
export default ComponentRowsEditor;