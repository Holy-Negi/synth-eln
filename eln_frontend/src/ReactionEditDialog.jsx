import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";
import ComponentRowsEditor from "./ComponentRowsEditor.jsx";

function ReactionEditDialog({ reaction, onClose, onUpdated }) {
  const [expCode, setExpCode] = useState("");
  const [date, setDate] = useState("");
  const [scale, setScale] = useState("");
  const [conc, setConc] = useState("");
  const [temperature, setTemperature] = useState("");
  const [durationH, setDurationH] = useState("");
  const [note, setNote] = useState("");
  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (reaction) {
      setExpCode(reaction.exp_code ?? "");
      setDate(reaction.date ? reaction.date.slice(0, 10) : "");   // ISO → yyyy-mm-dd
      setScale(reaction.scale ?? "");
      setConc(reaction.conc ?? "");
      setTemperature(reaction.temperature ?? "");
      setDurationH(reaction.duration_h ?? "");
      setNote(reaction.note ?? "");
      setComponents(reaction.components.map((c) => ({
        smiles: c.compound.smiles ?? "",   // ネストした化合物からSMILESを取得
        role: c.role,
        equiv: c.equiv ?? "",
      })));
    }
  }, [reaction]);

  const handleSubmit = async () => {
    try {
      const res = await fetch(`http://localhost:8000/reactions/${reaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exp_code: expCode,
          date: new Date(date).toISOString(),
          scale: Number(scale),
          conc: Number(conc),
          temperature: temperature === "" ? null : Number(temperature),
          duration_h: durationH === "" ? null : Number(durationH),
          note: note || null,
          components: components.map((c) => ({
            smiles: c.smiles, role: c.role,
            equiv: c.equiv === "" ? null : Number(c.equiv),
          })),
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err.detail)); }
      onUpdated();
      onClose();
    } catch (e) { alert(e.message); }
  };

  return (
    <Dialog open={!!reaction} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit reaction</DialogTitle>
      <DialogContent>
        <div style={{ display: "flex", gap: 8, margin: "8px 0", flexWrap: "wrap" }}>
          <TextField label="Exp code" size="small" value={expCode} onChange={(e) => setExpCode(e.target.value)} />
          <TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} />
          <TextField label="Scale (mmol)" size="small" value={scale} onChange={(e) => setScale(e.target.value)} />
          <TextField label="Conc (mol/L)" size="small" value={conc} onChange={(e) => setConc(e.target.value)} />
          <TextField label="Temperature (°C)" size="small" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          <TextField label="Time (h)" size="small" value={durationH} onChange={(e) => setDurationH(e.target.value)} />
          <TextField label="Note" size="small" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ComponentRowsEditor components={components} setComponents={setComponents} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
export default ReactionEditDialog;