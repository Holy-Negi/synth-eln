import { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import StructureSearchBar from "./StructureSearchBar.jsx";
import { buildUrl, fetchJson } from "./api.js";

const fmt = (v, d) => (v == null ? "-" : v.toFixed(d)); // null は "-"、数値は桁数指定

// 指定した role の化合物名だけを取り出す
const namesOf = (r, role) =>
  r.components
    .filter((c) => c.role === role)
    .map((c) => c.compound.name)
    .filter(Boolean);

// 反応式の生成
const schemeText = (r) => {
  const left = namesOf(r, "reactant").join(" + ");
  const right = namesOf(r, "product").join(" + ");
  return (
    [left, right].filter(Boolean).join(" → ") || "(reactant / product 未登録)"
  );
};

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
        temperature:
          sourceReaction.temperature === ""
            ? null
            : Number(sourceReaction.temperature),
        duration_h:
          sourceReaction.duration_h === ""
            ? null
            : Number(sourceReaction.duration_h),
        note: `Cloned from ${sourceReaction.exp_code}`,
        components: sourceReaction.components.map((c) => {
          const isProduct = c.role === "product";
          return {
            smiles: c.compound.smiles, // ネストした化合物から SMILES を取得
            role: c.role,
            equiv: c.equiv,
            yield_percent: isProduct
              ? yieldP === ""
                ? null
                : Number(yieldP)
              : null,
          };
        }),
      };

      const res = await fetch("http://localhost:8000/reactions", {
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
          元反応: {sourceReaction?.exp_code} / scale: {scale} mmol / conc:{" "}
          {sourceReaction?.conc} mol/L
        </p>
        <div
          style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}
        >
          <TextField
            label="New exp code"
            size="small"
            value={expCode}
            onChange={(e) => setExpCode(e.target.value)}
          />
          <TextField
            label="Title"
            size="small"
            value={title}
            style={{ minWidth: 220 }}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Yield (%)"
            size="small"
            value={yieldP}
            onChange={(e) => setYieldP(e.target.value)}
          />
          <TextField
            type="date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
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
      alert(e.message);
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

  const handleCompute = async () => {
    try {
      const url = `http://localhost:8000/reactions/${selectedReaction.id}/equivalents?scale=${encodeURIComponent(scale)}`;
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

      {/* 2段構えの絞り込み。ここでサーバ側が構造で候補を絞り、
          下の Autocomplete がその中を文字列で検索する */}
      <StructureSearchBar
        value={search}
        onChange={setSearch}
        showRole
        textLabel="Filter reactions (code / title / note)"
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
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
              <li
                key={key}
                {...rest}
                style={{ display: "block", padding: "8px 12px" }}
              >
                <div style={{ fontWeight: 600 }}>
                  {r.exp_code}
                  {r.title ? ` — ${r.title}` : ""}
                  <span
                    style={{ float: "right", opacity: 0.6, fontWeight: 400 }}
                  >
                    {r.date?.slice(0, 10)}
                  </span>
                </div>
                <div style={{ fontSize: "0.85em", opacity: 0.8 }}>
                  {schemeText(r)}
                </div>
                <img
                  src={`http://localhost:8000/reactions/${r.id}/scheme`}
                  alt={`scheme of ${r.exp_code}`}
                  loading="lazy" // 表示された候補の分だけ取得する
                  style={{
                    height: 64,
                    marginTop: 4,
                    background: "#fff",
                    borderRadius: 4,
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }} // 描画失敗時は隠す
                />
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Reaction (code / title / compound)"
              size="small"
            />
          )}
          sx={{ minWidth: 420 }}
          slotProps={{ listbox: { style: { maxHeight: 420 } } }}
        />
        <TextField
          label="Scale (mmol)"
          size="small"
          value={scale}
          onChange={(e) => setScale(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={handleCompute}
          disabled={!selectedReaction || !scale}
        >
          Compute
        </Button>
      </div>

      {rows.length > 0 && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>MW</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Equiv</TableCell>
                <TableCell>mmol</TableCell>
                <TableCell>Mass (g)</TableCell>
                <TableCell>Volume (mL)</TableCell>
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

          <Button
            variant="outlined"
            style={{ marginTop: 12 }}
            onClick={() => setDialogOpen(true)}
          >
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
