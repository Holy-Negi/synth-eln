import { useState, useEffect } from "react";
import {
  Select, MenuItem, TextField, Button,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";

const fmt = (v, d) => (v == null ? "-" : v.toFixed(d));   // null は "-"、数値は桁数指定

// ── 当量表の内容から「新しい反応」として複製登録するダイアログ ──
function RegisterFromEquivalents({ open, onClose, sourceReaction, scale, onRegistered }) {
  const [expCode, setExpCode] = useState("");
  const [yieldP, setYieldP] = useState("")
  const [date, setDate] = useState("");

  // ダイアログを開くたびに入力欄を初期化（日付は今日）
  useEffect(() => {
    if (open) {
      setExpCode("");
      setYieldP("");
      setDate(new Date().toISOString().slice(0, 10));   // yyyy-mm-dd
    }
  }, [open]);

  const handleRegister = async () => {
    try {
      // 元反応の成分（SMILES・role・equiv）を土台に、scale だけ当量表の値に差し替える
      const body = {
        exp_code: expCode,
        date: new Date(date).toISOString(),
        scale: Number(scale),                 // 当量表で入力したスケール
        conc: sourceReaction.conc,            // 濃度は元反応を引き継ぐ
        temperature: sourceReaction.temperature === "" ? null : Number(sourceReaction.temperature),
        duration_h: sourceReaction.duration_h === "" ? null : Number(sourceReaction.duration_h),
        note: `Cloned from ${sourceReaction.exp_code}`,
        components: sourceReaction.components.map((c) => {
          const isProduct = c.role === "product";
          return {
            smiles: c.compound.smiles,          // ネストした化合物から SMILES を取得
            role: c.role,
            equiv: c.equiv,
            yield_percent: isProduct ? (yieldP === "" ? null : Number(yieldP)) : null,
          };
        })};

      const res = await fetch("http://localhost:8000/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
      }
      onRegistered();   // 一覧などを再取得させたいとき用
      onClose();
      alert("登録しました");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Register this content as a new reaction</DialogTitle>
      <DialogContent>
        <p style={{ margin: "4px 0", opacity: 0.8 }}>
          元反応: {sourceReaction?.exp_code} / scale: {scale} mmol / conc: {sourceReaction?.conc} mol/L
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <TextField label="New exp code" size="small" value={expCode}
            onChange={(e) => setExpCode(e.target.value)} />
          <TextField label="Yield (%)" size="small" value={yieldP}
            onChange={(e) => setYieldP(e.target.value)} />
          <TextField type="date" size="small" value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleRegister}
          disabled={!expCode || !date || !scale}>Register</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── 当量表本体 ──
function StoichiometricTable() {
  const [reactions, setReactions] = useState([]);
  const [reactionId, setReactionId] = useState("");
  const [scale, setScale] = useState("");
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchReactions = async () => {
    const res = await fetch("http://localhost:8000/reactions");
    setReactions(await res.json());
  };

  useEffect(() => { fetchReactions(); }, []);

  // 選択中の反応オブジェクト（成分の SMILES を持っている）
  const selectedReaction = reactions.find((r) => r.id === reactionId) || null;

  const handleCompute = async () => {
    try {
      const url = `http://localhost:8000/reactions/${reactionId}/equivalents?scale=${encodeURIComponent(scale)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
      }
      setRows(await res.json());
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 12, marginTop: 24 }}>
      <h2>Stoichiometric table</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <Select size="small" value={reactionId} displayEmpty
          onChange={(e) => setReactionId(e.target.value)} style={{ minWidth: 160 }}>
          <MenuItem value="" disabled>Select reaction</MenuItem>
          {reactions.map((r) => <MenuItem key={r.id} value={r.id}>{r.exp_code}</MenuItem>)}
        </Select>
        <TextField label="Scale (mmol)" size="small" value={scale}
          onChange={(e) => setScale(e.target.value)} />
        <Button variant="contained" onClick={handleCompute}
          disabled={!reactionId || !scale}>Compute</Button>
      </div>

      {rows.length > 0 && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>MW</TableCell><TableCell>Role</TableCell><TableCell>Equiv</TableCell>
                <TableCell>mmol</TableCell><TableCell>Mass (g)</TableCell><TableCell>Volume (mL)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{fmt(row.mw, 2)}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{fmt(row.equiv, 2)}</TableCell>
                  <TableCell>{fmt(row.mmol, 3)}</TableCell>
                  <TableCell>{fmt(row.mass_g, 4)}</TableCell>
                  <TableCell>{fmt(row.volume_ml, 3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button variant="outlined" style={{ marginTop: 12 }}
            onClick={() => setDialogOpen(true)}>
            Register this content as a new reaction
          </Button>
        </>
      )}

      {selectedReaction && (
        <RegisterFromEquivalents
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          sourceReaction={selectedReaction}
          scale={scale}
          onRegistered={fetchReactions}
        />
      )}
    </div>
  );
}

export default StoichiometricTable;