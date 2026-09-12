import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button
} from '@mui/material';
import { useToast } from "./useToast.js";
import { API_BASE } from "./api.js";

function CompoundEditDialog({ compound, onClose, onUpdated }) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [density, setDensity] = useState("");

  useEffect(() => {
    if (compound) {
      // compound.xxxがnullまたはundefinedのとき""をわたす
      setName(compound.name ?? "");
      setDensity(compound.density ?? "");
    }
  }, [compound]);

  const handleSubmit = async () => {
    try {
      const payload = {
        name,
        density: density === "" ? null : Number(density)
      };
      // バッククウォートで囲んで、${...}とすることで変数や式を文字列に埋め込む
      const res = await fetch(`${API_BASE}/compounds/${compound.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json"},
        // {"density": 1.23}の形にする
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }
      // 親コンポーネントで定義された関数onClose, onUpdated
      onUpdated();
      onClose();
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    // !!で型をbooleanに変換（!は否定演算子）。compoundオブジェクトがnullでないときのみDialogを開く
    <Dialog open={!!compound} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit compound</DialogTitle>
      <DialogContent>
        {/* Stack の spacing で入力欄の間隔を確保する。
            pt がないと浮き上がったラベルが DialogTitle 側に切れて重なる */}
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Density (g/mL)"
            type="number"
            // step: "any" で小数入力をブラウザの検証に弾かせない
            slotProps={{ htmlInput: { step: "any", min: 0 } }}
            value={density}
            onChange={(e) => setDensity(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CompoundEditDialog;
