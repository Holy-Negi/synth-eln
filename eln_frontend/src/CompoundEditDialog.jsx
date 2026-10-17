import { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button
} from '@mui/material';
import ConfirmDialog from "./ConfirmDialog.jsx";
import { useToast } from "./useToast.js";
import { API_BASE, buildUrl } from "./api.js";

function CompoundEditDialog({ compound, onClose, onUpdated }) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [smiles, setSmiles] = useState("");
  const [density, setDensity] = useState("");
  // SMILES 変更時の確認ダイアログの開閉
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (compound) {
      // compound.xxxがnullまたはundefinedのとき""をわたす
      setName(compound.name ?? "");
      setSmiles(compound.smiles ?? "");
      setDensity(compound.density ?? "");
    }
  }, [compound]);

  const smilesChanged = compound != null && smiles !== (compound.smiles ?? "");

  const submit = async () => {
    setConfirming(false);
    try {
      const payload = {
        name,
        density: density === "" ? null : Number(density)
      };
      // SMILES は変わったときだけ送る（物性と InChIKey の再計算はサーバ側）
      if (smilesChanged) payload.smiles = smiles;
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

  // 構造の変更はこの化合物を使う全反応に及ぶので、保存前に確認する
  const handleSave = () => (smilesChanged ? setConfirming(true) : submit());

  return (
    <>
      {/* !!で型をbooleanに変換（!は否定演算子）。compoundオブジェクトがnullでないときのみDialogを開く */}
      <Dialog open={!!compound} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit compound</DialogTitle>
        <DialogContent>
          {/* Stack の spacing で入力欄の間隔を確保する。
              pt がないと浮き上がったラベルが DialogTitle 側に切れて重なる */}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="SMILES" value={smiles} onChange={(e) => setSmiles(e.target.value)} />
            {smiles && (
              // 構造式 SVG は背景が透明なので、白い板に載せる
              <Box sx={{ bgcolor: "#fff", borderRadius: 1, p: 1, width: 180, alignSelf: "center" }}>
                <img
                  // key を URL と揃え、無効→有効に戻ったとき display:none が残らないようにする
                  key={smiles}
                  src={buildUrl("/depict", { smiles })}
                  alt="structure"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Box>
            )}
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
          <Button variant="contained" onClick={handleSave} disabled={!smiles}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        title="Change structure"
        message={`「${compound?.name ?? ""}」の構造を変更します。この化合物を使うすべての反応に反映されます。`}
        confirmLabel="Change"
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      />
    </>
  );
}

export default CompoundEditDialog;
