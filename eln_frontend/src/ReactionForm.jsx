import { useState } from "react";
import { Button, Paper, TextField, Typography } from "@mui/material";
import ComponentRowsEditor from "./ComponentRowsEditor.jsx";
import { useToast } from "./useToast.js";
import { API_BASE } from "./api.js";

function ReactionForm({ onCreated }) {
  const { showError } = useToast();
  const [expCode, setExpCode] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [scale, setScale] = useState("");
  const [conc, setConc] = useState("");
  const [temperature, setTemperature] = useState("");
  const [durationH, setDurationH] = useState("");
  const [note, setNote] = useState("");
  const [components, setComponents] = useState([{ name: "", smiles: "", role: "reactant", equiv: "", density: "", yield: "" }]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exp_code: expCode,
          title: title || null,
          date: new Date(date).toISOString(),   // yyyy-mm-dd → ISO日時
          scale: Number(scale),                 // 文字列→数値
          conc: Number(conc),
          temperature: temperature === "" ? null : Number(temperature),
          duration_h: durationH === "" ? null : Number(durationH),
          note: note || null,
          components: components.map((c) => ({
            name: c.name,
            smiles: c.smiles,
            role: c.role,
            equiv: c.equiv === "" ? null : Number(c.equiv),
            density: c.density === "" ? null : Number(c.density),
            yield_percent: c.yield === "" ? null : Number(c.yield)
          })),
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err.detail)); }
      // フォームを初期化
      setExpCode(""); setTitle(""); setDate(""); setScale(""); setConc("");
      setTemperature(""); setDurationH(""); setNote("");
      setComponents([{ name: "", smiles: "", role: "reactant", equiv: "", density: "", yield: "" }]);
      onCreated();
    } catch (e) { showError(e.message); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        New reaction
      </Typography>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <TextField label="Exp code" size="small" value={expCode} onChange={(e) => setExpCode(e.target.value)} />
        {/* title は検索の主キーになるので、反応名や条件を自由に書いておく */}
        <TextField label="Title" size="small" style={{ minWidth: 260 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Scale (mmol)" size="small" value={scale} onChange={(e) => setScale(e.target.value)} />
        <TextField label="Conc (mol/L)" size="small" value={conc} onChange={(e) => setConc(e.target.value)} />
        <TextField label="Temperature (°C)" size="small" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        <TextField label="Time (h)" size="small" value={durationH} onChange={(e) => setDurationH(e.target.value)} />
        <TextField label="Note" size="small" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <ComponentRowsEditor components={components} setComponents={setComponents} />
      <Button variant="contained" onClick={handleCreate} sx={{ mt: 1 }}>Register</Button>
    </Paper>
  );
}
export default ReactionForm;