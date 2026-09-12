import { useState, useEffect, useMemo } from "react";
import CompoundEditDialog from "./CompoundEditDialog.jsx";
import CompoundForm from "./CompoundForm.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
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
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useToast } from "./useToast.js";

// 表示する列の定義。digits を持つ列は数値としてソート・整形する
const COLUMNS = [
  { key: "name", label: "Name", align: "left" },
  { key: "mw", label: "MW", align: "right", digits: 2 },
  { key: "density", label: "Density (g/mL)", align: "right", digits: 3 },
  { key: "logp", label: "LogP", align: "right", digits: 2 },
];

function CompoundTable() {
  const { showError } = useToast();
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  // 検索条件は1つの state にまとめる
  const [search, setSearch] = useState({ q: "", substructure: "", fg: "" });
  const [editing, setEditing] = useState(null);
  // 削除確認ダイアログの対象。null なら閉じている
  const [deleting, setDeleting] = useState(null);
  // 並べ替えの状態。key は COLUMNS の key、dir は昇順/降順
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

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

  // 同じ列を再度押したら昇順・降順を反転、別の列なら昇順から始める
  const handleSort = (key) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  // 並べ替えは取得し直さずクライアント側で行う。
  // useMemo は依存が変わったときだけ再計算する（毎レンダーのソートを避ける）
  const sorted = useMemo(() => {
    return [...compounds].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      // 未入力（null）は昇順・降順にかかわらず常に末尾へ送る
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const diff = typeof x === "string" ? x.localeCompare(y) : x - y;
      return sort.dir === "asc" ? diff : -diff;
    });
  }, [compounds, sort]);

  const handleDelete = async () => {
    const id = deleting.id;
    setDeleting(null);
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
                {COLUMNS.map((col) => (
                  // 数値列は右寄せ。等幅数字はテーマ側で指定済み
                  <TableCell
                    key={col.key}
                    align={col.align}
                    sortDirection={sort.key === col.key ? sort.dir : false}
                  >
                    <TableSortLabel
                      active={sort.key === col.key}
                      direction={sort.key === col.key ? sort.dir : "asc"}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                {/* Edit / Delete をまとめる列 */}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.length === 0 ? (
                // 0 件のときの表示
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} align="center" sx={{ py: 5 }}>
                    <Typography variant="body2" color="text.secondary">
                      該当する化合物がありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((c) => (
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
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} align={col.align}>
                        {col.digits == null
                          ? c[col.key]
                          : (c[col.key]?.toFixed(col.digits) ?? "–")}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                        <Button onClick={() => setEditing(c)}>Edit</Button>
                        <Button color="error" onClick={() => setDeleting(c)}>
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
      <ConfirmDialog
        open={!!deleting}
        title="Delete compound"
        message={`「${deleting?.name ?? ""}」を削除します。この操作は取り消せません。`}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default CompoundTable;
