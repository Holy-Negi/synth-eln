import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { API_BASE } from "./api.js";
import { schemeText } from "./reactionText.js";

const ROLE_COLOR = {
  reactant: "primary",
  reagent: "info",
  catalyst: "warning",
  product: "success",
  solvent: "default",
};

// 成分名の下に添える補足（純度・溶液濃度・溶媒比）
const componentNote = (c) =>
  [
    c.purity_percent != null && `${c.purity_percent}%`,
    c.solution_molarity != null && `${c.solution_molarity} M soln`,
    c.solvent_ratio != null && `ratio ${c.solvent_ratio}`,
  ]
    .filter(Boolean)
    .join(", ");

function ReactionItem({ reaction, onEdit, onDelete }) {
  const conditions = [
    reaction.date?.slice(0, 10),                        // ISO日時 → yyyy-mm-dd
    reaction.scale != null && `${reaction.scale} mmol`,
    reaction.temperature != null && `${reaction.temperature} °C`,
    reaction.duration_h != null && `${reaction.duration_h} h`,
  ].filter(Boolean); // && が返す false を除き、値のある条件だけ残す

  const summary = reaction.title || schemeText(reaction);

  // 収率は product 成分に記録されている。生成物が複数あればすべて並べる
  const yields = reaction.components.filter(
    (c) => c.role === "product" && c.yield_percent != null,
  );

  // Summary 内のクリックが親に伝わると開閉も動くため、伝播を止めてから実行する
  const withoutToggle = (action) => (e) => {
    e.stopPropagation();
    action();
  };

  return (
    <Accordion>
      <AccordionSummary
        // ルート要素を div にする（既定の button のままだと中の Button が入れ子になる）
        component="div"
        expandIcon={<Box sx={{ fontSize: 12 }}>▾</Box>}
        sx={{
          "& .MuiAccordionSummary-content": {
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ flexShrink: 0 }}>
          {reaction.exp_code}
        </Typography>

        {/* Title が空なら反応式の文字列で代用する。noWrap で切れた分は title 属性でホバー表示 */}
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          title={summary}
          sx={{ minWidth: 0, fontStyle: reaction.title ? "normal" : "italic" }}
        >
          {summary}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* 収率は畳んだ状態で最も見たい値なので、条件チップより前に置く */}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {yields.map((c) => (
            <Chip
              key={c.id}
              size="small"
              color="success"
              variant="filled"
              label={`${c.yield_percent.toFixed(0)}%`}
              title={c.compound.name}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {conditions.map((c) => (
            <Chip key={c} label={c} size="small" variant="outlined" />
          ))}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Button onClick={withoutToggle(() => onEdit(reaction))}>Edit</Button>
          <Button
            color="error"
            onClick={withoutToggle(() => onDelete(reaction))}
          >
            Delete
          </Button>
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: "#fff",
              p: 1.5,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={`${API_BASE}/reactions/${reaction.id}/scheme`}
              alt={`scheme of ${reaction.exp_code}`}
              style={{ maxWidth: "100%", height: "auto", display: "block" }}
            />
          </Paper>

          {reaction.note && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {reaction.note}
            </Typography>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Equiv</TableCell>
                {/* product は単離質量、それ以外は秤量値 */}
                <TableCell align="right">Measured (mg)</TableCell>
                <TableCell align="right">Yield (%)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reaction.components.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>
                    {comp.compound.name}
                    {componentNote(comp) && (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {componentNote(comp)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={comp.role}
                      color={ROLE_COLOR[comp.role] ?? "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {comp.equiv != null ? comp.equiv.toFixed(2) : "–"}
                  </TableCell>
                  <TableCell align="right">
                    {comp.measured_mg != null ? comp.measured_mg.toFixed(1) : "–"}
                  </TableCell>
                  <TableCell align="right">
                    {comp.yield_percent != null ? comp.yield_percent.toFixed(1) : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
export default ReactionItem;
