import { useState, useEffect } from "react";
import CompoundEditDialog from "./CompoundEditDialog.jsx";
import CompoundForm from "./CompoundForm.jsx";
import StructureSearchBar from "./StructureSearchBar.jsx";
import { API_BASE, buildUrl, fetchJson } from "./api.js";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useToast } from "./useToast.js";

function CompoundTable() {
  const { showError } = useToast();
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  // 検索条件は1つの state にまとめる
  const [search, setSearch] = useState({ q: "", substructure: "", fg: "" });
  const [editing, setEditing] = useState(null);

  const fetchCompounds = async () => {
    setLoading(true);
    const url = buildUrl("/compounds", search);
    try {
      const data = await fetchJson(url);
      setCompounds(data);
    } catch (e) {
      showError(e.message);
      setCompounds([]);
    } finally {
      setLoading(false);
    }
  };

  // 依存配列には search の中身を個別に並べる。
  // オブジェクトのまま置くと毎レンダー別物と判定されて無限ループになる
  useEffect(() => {
    fetchCompounds();
  }, [search.q, search.substructure, search.fg]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete the data?")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/compounds/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }
      await fetchCompounds();
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <>
      <CompoundForm onCreated={fetchCompounds} />
      <StructureSearchBar
        value={search}
        onChange={setSearch}
        textLabel="Search compounds (name)"
      />
      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                {/* 構造式の列。幅を固定して行の高さを揃える */}
                <TableCell sx={{ width: 104 }} />
                <TableCell>Name</TableCell>
                {/* 数値列は右寄せ。等幅数字はテーマ側で指定済み */}
                <TableCell align="right">MW</TableCell>
                <TableCell align="right">LogP</TableCell>
                {/* Edit / Delete をまとめる列 */}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compounds.length === 0 ? (
                // 0 件のときの表示
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      該当する化合物がありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                compounds.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.smiles && (
                        // 構造式 SVG の背景は白。白い板に載せて表示する
                        <Box
                          sx={{
                            bgcolor: "#fff",
                            borderRadius: 1,
                            p: 0.5,
                            width: 88,
                            display: "flex",
                          }}
                        >
                          <img
                            src={`${API_BASE}/depict?smiles=${encodeURIComponent(c.smiles)}`}
                            alt={`structure of ${c.name}`}
                            style={{ width: "100%", height: "auto", display: "block" }}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.mw?.toFixed(2) ?? "–"}</TableCell>
                    <TableCell align="right">{c.logp?.toFixed(2) ?? "–"}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <Button onClick={() => setEditing(c)}>Edit</Button>
                        <Button color="error" onClick={() => handleDelete(c.id)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <CompoundEditDialog
        compound={editing}
        onClose={() => setEditing(null)}
        onUpdated={fetchCompounds}
      />
    </>
  );
}

export default CompoundTable;
