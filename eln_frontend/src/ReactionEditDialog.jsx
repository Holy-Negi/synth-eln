import { useState, useEffect } from "react";
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";
import ComponentRowsEditor from "./ComponentRowsEditor.jsx";
import { useToast } from "./useToast.js";
import { API_BASE } from "./api.js";

const NUMBER_INPUT = { step: "any" };

function ReactionEditDialog({ reaction, onClose, onUpdated }) {
  const { showError } = useToast();
  const [expCode, setExpCode] = useState("");
  const [title, setTitle] = useState("");
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
      setTitle(reaction.title ?? "");
      setDate(reaction.date ? reaction.date.slice(0, 10) : "");   // ISO → yyyy-mm-dd
      setScale(reaction.scale ?? "");
      setConc(reaction.conc ?? "");
      setTemperature(reaction.temperature ?? "");
      setDurationH(reaction.duration_h ?? "");
      setNote(reaction.note ?? "");
      // 更新は成分を全消し→作り直しするため、name と yield も読み戻さないと保存時に失われる
      setComponents(reaction.components.map((c) => ({
        name: c.compound.name ?? "",
        smiles: c.compound.smiles ?? "",   // ネストした化合物からSMILESを取得
        role: c.role,
        equiv: c.equiv ?? "",
        density: c.compound.density ?? "",
        yield: c.yield_percent ?? "",
      })));
    }
  }, [reaction]);

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/reactions/${reaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exp_code: expCode,
          title: title || null,
          date: new Date(date).toISOString(),
          scale: Number(scale),
          conc: Number(conc),
          temperature: temperature === "" ? null : Number(temperature),
          duration_h: durationH === "" ? null : Number(durationH),
          note: note || null,
          components: components.map((c) => ({
            name: c.name || null,
            smiles: c.smiles,
            role: c.role,
            equiv: c.equiv === "" ? null : Number(c.equiv),
            density: c.density === "" ? null : Number(c.density),
            yield_percent: c.yield === "" ? null : Number(c.yield),
          })),
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(JSON.stringify(err.detail)); }
      onUpdated();
      onClose();
    } catch (e) { showError(e.message); }
  };

  return (
    <Dialog open={!!reaction} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Edit reaction</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 1, pb: 2 }}>
          <TextField label="Exp code" value={expCode} onChange={(e) => setExpCode(e.target.value)} />
          <TextField label="Title" sx={{ minWidth: 260, flexGrow: 1 }} value={title} onChange={(e) => setTitle(e.target.value)} />
          {/* type="date" はラベルが値と重なるので shrink を固定する */}
          <TextField label="Date" type="date" slotProps={{ inputLabel: { shrink: true } }}
            value={date} onChange={(e) => setDate(e.target.value)} />
          <TextField label="Scale (mmol)" type="number" slotProps={{ htmlInput: { step: "any", min: 0 } }}
            sx={{ width: 130 }} value={scale} onChange={(e) => setScale(e.target.value)} />
          <TextField label="Conc (mol/L)" type="number" slotProps={{ htmlInput: { step: "any", min: 0 } }}
            sx={{ width: 130 }} value={conc} onChange={(e) => setConc(e.target.value)} />
          {/* 温度は氷冷・ドライアイス条件で負になるため min を付けない */}
          <TextField label="Temperature (°C)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
            sx={{ width: 150 }} value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          <TextField label="Time (h)" type="number" slotProps={{ htmlInput: { step: "any", min: 0 } }}
            sx={{ width: 110 }} value={durationH} onChange={(e) => setDurationH(e.target.value)} />
          <TextField label="Note" multiline value={note} sx={{ width: "100%" }} onChange={(e) => setNote(e.target.value)} />
        </Box>
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
