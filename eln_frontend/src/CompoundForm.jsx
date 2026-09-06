import { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { API_BASE } from "./api.js";
import { useToast } from "./useToast.js";

function CompoundForm({ onCreated }) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [smiles, setSmiles] = useState("");
  const [density, setDensity] = useState("");
  const [valid, setValid] = useState(null);

  const handleCreate = async () => {
    try {
      const payload = {
        name,
        smiles,
        density: density === "" ? null : Number(density)
      };
      const res = await fetch(`${API_BASE}/compounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }
      setName("");
      setSmiles("");
      setDensity("");
      onCreated();
    } catch (e) {
      showError(e.message);
    }
  };

  const handleResolve = async () => {
    try {
      const res = await fetch(`${API_BASE}/resolve?name=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail)
      };
      const data = await res.json();
      const smiles = data.smiles
      setSmiles(smiles);
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        New compound
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* spacing で各 TextField の間隔をまとめて指定する */}
        <Stack spacing={1.5} sx={{ flex: 1, minWidth: 260 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="SMILES"
            value={smiles}
            onChange={(e) => { setSmiles(e.target.value); setValid(null); }}
          />
          <TextField label="Density" value={density} onChange={(e) => setDensity(e.target.value)} />
          <Stack direction="row" spacing={1}>
            <Button onClick={handleResolve}>Get SMILES</Button>
            <Button variant="contained" onClick={handleCreate}>Register</Button>
          </Stack>
        </Stack>

        <Box sx={{ width: 220, flexShrink: 0 }}>
          {smiles && (
            <Box sx={{ bgcolor: "#fff", borderRadius: 1, p: 1 }}>
              <img
                src={`${API_BASE}/depict?smiles=${encodeURIComponent(smiles)}`}
                alt="structure"
                onLoad={() => setValid(true)}
                onError={() => setValid(false)}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </Box>
          )}
          {valid !== null && (
            // 色はテーマの success / error を参照する
            <Typography
              variant="body2"
              sx={{ mt: 1, color: valid ? "success.main" : "error.main" }}
            >
              {valid ? "✓ valid" : "✗ invalid"}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export default CompoundForm;