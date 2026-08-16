import { useState } from "react";
import { Collapse, Button, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

function ReactionItem({ reaction, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", flex: 1 }}>
          <h3 style={{ margin: 0 }}>{open ? "▼" : "▶"} {reaction.exp_code}</h3>
        </div>
        <Button onClick={() => onEdit(reaction)}>Edit</Button>
        <Button color="error" onClick={() => onDelete(reaction.id)}>Delete</Button>
      </div>

      <Collapse in={open}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 2, overflowX: "auto" }}>
            <img
              src={`http://127.0.0.1:8000/reactions/${reaction.id}/scheme`}
              alt={`scheme of ${reaction.exp_code}`}
              style={{ height: 180 }}
            />
          </div>
          <div style={{ flex: 1, alignSelf: "flex-end" }}>
            Temperature : {reaction.temperature ?? "–"} °C<br />
            Time : {reaction.duration_h ?? "–"} h<br />
            Note: {reaction.note}
          </div>
        </div>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Role</TableCell><TableCell>Equiv</TableCell><TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reaction.components.map((comp) => (
              <TableRow key={comp.id}>
                <TableCell>{comp.compound.name}</TableCell>
                <TableCell>{comp.role}</TableCell>
                <TableCell>{comp.equiv ?? "-"} eq</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </div>
  );
}
export default ReactionItem;