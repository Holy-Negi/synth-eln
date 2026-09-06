import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
    <Dialog open={!!compound} onClose={onClose}>
      <DialogTitle>Edit compound</DialogTitle>
      <DialogContent>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Density" value={density} onChange={(e) => setDensity(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CompoundEditDialog;