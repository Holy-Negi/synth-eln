import { useState, useEffect } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import StructureSearchBar from "./StructureSearchBar.jsx";
import { API_BASE, buildUrl, fetchJson } from "./api.js";
import { useToast } from "./useToast.js";
import { fromComponent, toComponentPayload } from "./componentRows.js";
import { schemeText } from "./reactionText.js";

// ── 数値の整形。null は "–" ──
// 有効数字 4 桁（桁区切りあり）
const sig4 = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });
// 小数点以下 d 桁
const fixed = (d) => (v) => (v == null ? "–" : v.toFixed(d));
// v は大きい単位（g / mL）の値。1 未満なら 1000 倍して小さい単位（mg / µL）で表示する
const withUnit = (big, small) => (v) =>
  v == null ? "–" : v >= 1 ? `${sig4.format(v)} ${big}` : `${sig4.format(v * 1000)} ${small}`;

const POSITIVE_INPUT = { step: "any", min: 0 };

const ROLE_COLOR = {
  reactant: "primary",
  reagent: "info",
  catalyst: "warning",
  product: "success",
  solvent: "default",
};

// 当量表の列定義。key は API（EquivalentRow）のフィールド名、format は表示用の整形関数
const COLUMNS = [
  { key: "mw", label: "MW", format: fixed(2) },
  { key: "equiv", label: "Equiv", format: fixed(2) },
  { key: "mmol", label: "mmol", format: (v) => (v == null ? "–" : sig4.format(v)) },
  { key: "mass_g", label: "Mass", format: withUnit("g", "mg") },
  { key: "volume_ml", label: "Volume", format: withUnit("mL", "µL") },
  { key: "yield_percent", label: "Yield (%)", format: fixed(1) },
  { key: "expected_mass_g", label: "Expected", format: withUnit("g", "mg") },
];

// 名前の下に添える補足（純度・溶液濃度）
const reagentNote = (row) =>
  [
    row.purity_percent != null && row.purity_percent < 100 && `${row.purity_percent}%`,
    row.solution_molarity != null && `${row.solution_molarity} M soln`,
  ]
    .filter(Boolean)
    .join(", ");

// Autocomplete の絞り込みに使う文字列
const searchText = (r) =>
  [
    r.exp_code,
    r.title,
    r.date?.slice(0, 10),
    r.note,
    ...r.components.map((c) => c.compound.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

// ── 当量表の内容から「新しい反応」として複製登録するダイアログ ──
function RegisterFromEquivalents({
  open,
  onClose,
  sourceReaction,
  scale,
  onRegistered,
}) {
  const { showError, showSuccess } = useToast();
  const [expCode, setExpCode] = useState("");
  const [title, setTitle] = useState("");
  const [yieldP, setYieldP] = useState("");
  const [date, setDate] = useState("");

  // 開くたびに入力欄を初期化する。日付は今日、title は元反応を引き継ぐ
  useEffect(() => {
    if (open) {
      setExpCode("");
      setTitle(sourceReaction?.title ?? "");
      setYieldP("");
      setDate(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
    }
  }, [open, sourceReaction]);

  const handleRegister = async () => {
    try {
      // 元反応の成分（SMILES・role・equiv）を土台に、scale だけ当量表の値に差し替える
      const body = {
        exp_code: expCode,
        title: title || null,
        date: new Date(date).toISOString(),
        scale: Number(scale), // 当量表で入力したスケール
        conc: sourceReaction.conc, // 濃度は元反応を引き継ぐ
        // API の値（数値 or null）をそのまま引き継ぐ
        temperature: sourceReaction.temperature,
        duration_h: sourceReaction.duration_h,
        note: `Cloned from ${sourceReaction.exp_code}`,
        // 条件（equiv・純度・溶液濃度・溶媒比）は引き継ぎ、実測値は新しい実験なので空にする。
        // yield は product にだけ送られる
        components: sourceReaction.components.map((c) =>
          toComponentPayload({ ...fromComponent(c), measured: "", yield: yieldP }),
        ),
      };

      const res = await fetch(`${API_BASE}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
      }
      onRegistered(); // 親に一覧を再取得させる
      onClose();
      showSuccess("登録しました");
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Register this content as a new reaction</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          元反応: {sourceReaction?.exp_code} / scale: {scale} mmol / conc:{" "}
          {sourceReaction?.conc} mol/L
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 2 }}>
          <TextField
            label="New exp code"
            value={expCode}
            onChange={(e) => setExpCode(e.target.value)}
          />
          <TextField
            label="Title"
            value={title}
            sx={{ minWidth: 220, flexGrow: 1 }}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Yield (%)"
            type="number"
            slotProps={{ htmlInput: POSITIVE_INPUT }}
            sx={{ width: 120 }}
            value={yieldP}
            onChange={(e) => setYieldP(e.target.value)}
          />
          {/* type="date" はラベルが値と重なるので shrink を固定する */}
          <TextField
            label="Date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleRegister}
          disabled={!expCode || !date || !scale}
        >
          Register
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── 当量表本体 ──
function StoichiometricTable() {
  const { showError } = useToast();
  const [reactions, setReactions] = useState([]);
  const [selectedReaction, setSelectedReaction] = useState(null); // id ではなく反応オブジェクトを保持
  const [scale, setScale] = useState("");
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  // 当量表を作りたい反応を、構造で絞り込んでから Autocomplete に流す
  const [search, setSearch] = useState({
    q: "",
    substructure: "",
    fg: "",
    role: "",
  });

  const fetchReactions = async () => {
    try {
      const data = await fetchJson(buildUrl("/reactions", search));
      setReactions(data);
    } catch (e) {
      showError(e.message);
      // 古い候補が残って誤選択されないよう空にする
      setReactions([]);
    }
  };

  // 絞り込みで選択中の反応が候補から消えることがあるが、
  // 当量表は id で計算しているため選択は残しておいてよい
  useEffect(() => {
    fetchReactions();
  }, [search.q, search.substructure, search.fg, search.role]);

  // 反応を選んだとき: 前の計算結果を消し、scale 未入力なら元反応の値を初期値として入れる
  const handleSelect = (reaction) => {
    setSelectedReaction(reaction);
    setRows([]);
    if (reaction && scale === "") setScale(String(reaction.scale));
  };

  // scale を変えたら古い計算結果を消す（表示中の表と複製登録の scale を一致させるため）
  const handleScaleChange = (value) => {
    setScale(value);
    setRows([]);
  };

  const canCompute = Boolean(selectedReaction && scale);

  const handleCompute = async () => {
    try {
      const url = `${API_BASE}/reactions/${selectedReaction.id}/equivalents?scale=${encodeURIComponent(scale)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err.detail));
      }
      setRows(await res.json());
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Stoichiometric table
        </Typography>

        {/* 2段構えの絞り込み。ここでサーバ側が構造で候補を絞り、
            下の Autocomplete がその中を文字列で検索する */}
        <StructureSearchBar
          value={search}
          onChange={setSearch}
          showRole
          textLabel="Filter reactions (code / title / note)"
        />

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <Autocomplete
            options={reactions}
            value={selectedReaction}
            onChange={(e, v) => handleSelect(v)}
            // 選択後に入力欄へ表示される文字列
            getOptionLabel={(r) =>
              `${r.exp_code}${r.title ? ` — ${r.title}` : ""}`
            }
            // 再取得でオブジェクトが変わるため id で同一判定する
            isOptionEqualToValue={(a, b) => a.id === b.id}
            // 空白区切りの AND 検索。"suzuki 08-" のように複数語で絞り込める
            filterOptions={(opts, { inputValue }) => {
              const terms = inputValue
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean);
              if (terms.length === 0) return opts;
              return opts.filter((r) => {
                const hay = searchText(r);
                return terms.every((t) => hay.includes(t));
              });
            }}
            // 候補1件の見た目: 見出し + 反応式の文字要約 + 反応式SVGサムネイル
            renderOption={(props, r) => {
              const { key, ...rest } = props; // MUI v9 は props に key を含むので分けて渡す
              return (
                <li key={key} {...rest}>
                  {/* li は MUI により flex なので、唯一の子として幅いっぱいに広げる */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {/* 見出し行: コード・タイトル | 空き箱 | 日付 */}
                    <Box
                      sx={{ display: "flex", alignItems: "baseline", gap: 1 }}
                    >
                      <Typography variant="subtitle2">
                        {r.exp_code}
                        {r.title ? ` — ${r.title}` : ""}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {r.date?.slice(0, 10)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {schemeText(r)}
                    </Typography>
                    <img
                      src={`${API_BASE}/reactions/${r.id}/scheme`}
                      alt={`scheme of ${r.exp_code}`}
                      loading="lazy" // 表示された候補の分だけ取得する
                      style={{
                        display: "block",
                        height: 64,
                        marginTop: 4,
                        background: "#fff",
                        borderRadius: 4,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }} // 描画失敗時は隠す
                    />
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Reaction (code / title / compound)"
              />
            )}
            sx={{ minWidth: 420, flexGrow: 1 }}
            slotProps={{ listbox: { style: { maxHeight: 420 } } }}
          />
          <TextField
            label="Scale (mmol)"
            type="number"
            slotProps={{ htmlInput: POSITIVE_INPUT }}
            sx={{ width: 130 }}
            value={scale}
            onChange={(e) => handleScaleChange(e.target.value)}
            onFocus={(e) => e.currentTarget.select()} // フォーカス時に全選択
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCompute) handleCompute();
            }}
          />
          <Button
            variant="contained"
            onClick={handleCompute}
            disabled={!canCompute}
            sx={{ mt: 0.5 }}
          >
            Compute
          </Button>
        </Box>
      </Paper>

      {rows.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  {COLUMNS.map((col) => (
                    <TableCell key={col.key} align="right">
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {row.name}
                      {reagentNote(row) && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {reagentNote(row)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={row.role}
                        color={ROLE_COLOR[row.role] ?? "default"}
                      />
                    </TableCell>
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} align="right">
                        {col.format(row[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box>
            <Button variant="outlined" onClick={() => setDialogOpen(true)}>
              Register this content as a new reaction
            </Button>
          </Box>
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
    </Stack>
  );
}

export default StoichiometricTable;
