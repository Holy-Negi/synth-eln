import { useState, useEffect } from "react";
import { TextField, MenuItem, Box } from "@mui/material";
import { buildUrl, fetchJson } from "./api.js";
import { useToast } from "./useToast.js";

const ROLES = ["reactant", "reagent", "solvent", "catalyst", "product"];

/**
 * @param {object} props
 * @param {{q?: string, substructure?: string, fg?: string, role?: string}} props.value
 * @param {(next: object) => void} props.onChange
 * @param {boolean} [props.showRole]
 * @param {string} [props.textLabel]
 */
function StructureSearchBar({
  value,
  onChange,
  showRole = false,
  textLabel = "Search",
}) {
  const { showError } = useToast();
  const [groups, setGroups] = useState([]);
  const [smartsInput, setSmartsInput] = useState(value.substructure ?? "");

  // ── 官能基プリセットの取得 ──────────────────────────────
  // マウント時に取得する。showError は再レンダーをまたいで同じ関数なので再実行されない
  useEffect(() => {
    // アンマウント後に setState しないための取り消しフラグ
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson(buildUrl("/functional-groups"));
        if (!cancelled) setGroups(data);
      } catch (e) {
        if (!cancelled) {
          showError(e.message);
          setGroups([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  // ── SMARTS 入力のデバウンス ──────────────────────────
  // 入力が止まってから 400ms 後に、最後の1回だけ親へ通知する
  useEffect(() => {
    // 親が既に同じ値を持つなら通知しない。value を依存配列に入れても無限ループしない
    if (smartsInput === (value.substructure ?? "")) return;
    const timer = setTimeout(() => {
      onChange({ ...value, substructure: smartsInput });
    }, 400);
    // 次の打鍵で前のタイマーを取り消す。これが無いとデバウンスにならない
    return () => clearTimeout(timer);
  }, [smartsInput, value, onChange]);

  // 1項目だけ差し替えて親に通知するショートカット
  const set = (key, v) => onChange({ ...value, [key]: v });
  const previewUrl = value.substructure
    ? buildUrl("/depict", { smiles: value.substructure })
    : null;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        flexWrap: "wrap",
        alignItems: "center",
        my: 2,
      }}
    >
      <TextField
        label={textLabel}
        size="small"
        value={value.q ?? ""}
        onChange={(e) => set("q", e.target.value)}
      />

      {/* ── 官能基プリセット ── */}
      <TextField
        select
        label="Functional group"
        size="small"
        sx={{ minWidth: 200 }}
        value={value.fg ?? ""}
        onChange={(e) => set("fg", e.target.value)}
      >
        <MenuItem value="">(none)</MenuItem>
        {groups.map((g) => (
          <MenuItem key={g.name} value={g.name}>
            {g.label}
          </MenuItem>
        ))}
      </TextField>

      {/* ── 役割フィルタ（反応検索のときだけ表示） ── */}
      {showRole && (
        <TextField
          select
          label="Role"
          size="small"
          sx={{ minWidth: 140 }}
          value={value.role ?? ""}
          onChange={(e) => set("role", e.target.value)}
        >
          <MenuItem value="">(any)</MenuItem>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
      )}

      {/* ── SMARTS / SMILES 自由入力 ── */}
      <TextField
        label="Substructure (SMARTS / SMILES)"
        size="small"
        sx={{ minWidth: 260 }}
        placeholder="c1ccccc1 / [CX3](=O)[OX2H1]"
        value={smartsInput}
        onChange={(e) => setSmartsInput(e.target.value)}
      />

      {/* ── クエリ構造のプレビュー ──
          /depict は MolFromSmiles なので SMARTS 記法では 422 になる。
          その場合は onError で隠し、key を URL と揃えて
          次に有効な構造を入れたとき display:none が残らないようにする */}
      {value.substructure && (
        <img
          key={previewUrl}
          src={previewUrl}
          alt="query structure"
          style={{ height: 60, width: "auto" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </Box>
  );
}

export default StructureSearchBar;
