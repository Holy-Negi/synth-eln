import { useEffect, useState } from "react";
import { Autocomplete, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useToast } from "./useToast.js";
import { buildUrl, fetchJson } from "./api.js";
import { EMPTY_ROW } from "./componentRows.js";

const ROLES = ["reactant", "reagent", "solvent", "catalyst", "product"];

// 小数を許す数値入力欄に共通で渡す設定
const NUMBER_INPUT = { step: "any", min: 0 };

function ComponentRowsEditor({ components, setComponents }) {
  const { showError } = useToast();
  // 成分の Name 欄に候補として出す登録済み化合物
  const [compounds, setCompounds] = useState([]);

  // マウント時に1回だけ取得する。アンマウント後に setState しないよう取り消しフラグを持つ
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson(buildUrl("/compounds"));
        if (!cancelled) setCompounds(data);
      } catch (e) {
        if (!cancelled) showError(`化合物候補を取得できません: ${e.message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  // [...配列, 新しい要素]：配列の末尾に要素を追加した新しい配列を作る
  // componentsを更新することでReactに再描画させる
  const addRow = () => setComponents([...components, { ...EMPTY_ROW }]);

  // i番目の行に patch（{ key: value, ... }）をまとめて上書きする。
  // 1回の setComponents で複数項目を更新するので、続けて呼んだときの上書き消失が起きない
  const updateRow = (i, patch) =>
    setComponents(components.map((row, idx) =>
      idx === i ? { ...row, ...patch } : row));

  // i番目の行を削除（filter で i 以外を残す）
  const removeRow = (i) =>
    setComponents(components.filter((_, idx) => idx !== i));

  // 登録済み化合物を選んだ行は、構造と density をマスタの値で埋める
  const selectCompound = (i, c) =>
    updateRow(i, { compoundId: c.id, name: c.name, smiles: c.smiles, density: c.density ?? "" });

  const handleResolve = async (i) => {
    try {
      const data = await fetchJson(buildUrl("/resolve", { name: components[i].name }));
      // PubChem から得た構造は登録済み化合物とは限らないので compoundId を外す
      updateRow(i, { smiles: data.smiles, compoundId: null });
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <Stack spacing={1}>
      {components.map((row, i) => {
        const isSolvent = row.role === "solvent";
        const isProduct = row.role === "product";
        const isRegistered = row.compoundId != null;
        const yieldIsAuto = isProduct && row.measured !== "";
        return (
          // 行ごとに枠で囲み、画面幅が足りないときは中の入力欄が折り返す
          <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}>
              {/* freeSolo: 候補に無い名前も自由入力できる Autocomplete */}
              <Autocomplete
                freeSolo
                options={compounds}
                // freeSolo では自由入力の文字列が渡ることもある
                getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
                value={null}
                inputValue={row.name}
                // "reset" は候補選択後に MUI が入力欄を書き換える通知。name は selectCompound で入れるので無視する
                onInputChange={(e, v, reason) => {
                  if (reason !== "reset") updateRow(i, { name: v });
                }}
                onChange={(e, v) => {
                  if (v && typeof v === "object") selectCompound(i, v);
                }}
                renderOption={(props, c) => {
                  const { key, ...rest } = props; // MUI は props に key を含むので分けて渡す
                  return (
                    <li key={key} {...rest}>
                      <Box sx={{ flexGrow: 1 }}>{c.name}</Box>
                      <Typography variant="body2" color="text.secondary">
                        {c.mw?.toFixed(2)}
                      </Typography>
                    </li>
                  );
                }}
                renderInput={(params) => <TextField {...params} label="Name" />}
                sx={{ width: 220 }}
              />
              <Button onClick={() => handleResolve(i)} sx={{ mt: 0.5 }}>Get SMILES</Button>
              {/* flexGrow: 1 で余った横幅を SMILES 欄に割り当てる。手で書き換えたら登録済み扱いを外す */}
              <TextField label="SMILES" value={row.smiles} sx={{ flexGrow: 1, minWidth: 220 }}
                onChange={(e) => updateRow(i, { smiles: e.target.value, compoundId: null })} />
              {/* select を付けると TextField が Select になり、ラベルも付く */}
              <TextField select label="Role" value={row.role} sx={{ width: 130 }}
                onChange={(e) => updateRow(i, { role: e.target.value })}>
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              {!isSolvent && (
                <TextField label="Equiv" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
                  value={row.equiv} sx={{ width: 100 }}
                  onChange={(e) => updateRow(i, { equiv: e.target.value })} />
              )}
              {/* 登録済み化合物の density は化合物マスタの値。ここでは編集させない */}
              <TextField label="Density (g/mL)" type="number"
                slotProps={{ htmlInput: { ...NUMBER_INPUT, readOnly: isRegistered } }}
                helperText={isRegistered ? "edit in Compounds" : undefined}
                value={row.density} sx={{ width: 130 }}
                onChange={(e) => updateRow(i, { density: e.target.value })} />
              {/* 混合溶媒の体積比。未入力の溶媒は 1 として等分される */}
              {isSolvent && (
                <TextField label="Ratio (v/v)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
                  value={row.ratio} sx={{ width: 110 }}
                  onChange={(e) => updateRow(i, { ratio: e.target.value })} />
              )}
              {!isSolvent && !isProduct && (
                <>
                  <TextField label="Purity (%)" type="number"
                    slotProps={{ htmlInput: { ...NUMBER_INPUT, max: 100 } }}
                    value={row.purity} sx={{ width: 110 }}
                    onChange={(e) => updateRow(i, { purity: e.target.value })} />
                  {/* 溶液試薬の濃度。入力すると当量表は体積で表示される */}
                  <TextField label="Soln (M)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
                    value={row.molarity} sx={{ width: 100 }}
                    onChange={(e) => updateRow(i, { molarity: e.target.value })} />
                </>
              )}
              {!isSolvent && (
                <TextField label={isProduct ? "Isolated (mg)" : "Weighed (mg)"} type="number"
                  slotProps={{ htmlInput: NUMBER_INPUT }}
                  value={row.measured} sx={{ width: 130 }}
                  onChange={(e) => updateRow(i, { measured: e.target.value })} />
              )}
              {/* 単離質量があれば収率はサーバが計算するので、手入力を止める */}
              {isProduct && (
                <TextField label="Yield (%)" type="number" slotProps={{ htmlInput: NUMBER_INPUT }}
                  disabled={yieldIsAuto}
                  helperText={yieldIsAuto ? "auto from isolated" : undefined}
                  value={row.yield} sx={{ width: 120 }}
                  onChange={(e) => updateRow(i, { yield: e.target.value })} />
              )}

              {row.smiles && (
                // 構造式 SVG は背景が透明なので、白い板に載せる
                <Box sx={{ bgcolor: "#fff", borderRadius: 1, p: 0.5, width: 96, display: "flex" }}>
                  <img
                    src={buildUrl("/depict", { smiles: row.smiles })}
                    alt="structure"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </Box>
              )}

              {/* marginLeft: auto で削除ボタンだけ右端に寄せる */}
              <Button color="error" sx={{ ml: "auto", mt: 0.5 }} onClick={() => removeRow(i)}>
                Remove
              </Button>
            </Box>
          </Paper>
        );
      })}

      <Box>
        <Button onClick={addRow}>+ Add component</Button>
      </Box>
    </Stack>
  );
}
export default ComponentRowsEditor;
