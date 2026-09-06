import { useState, useEffect, useCallback } from "react";
import CompoundEditDialog from "./CompoundEditDialog.jsx";
import CompoundForm from "./CompoundForm.jsx";
import StructureSearchBar from "./StructureSearchBar.jsx";
import { buildUrl, fetchJson } from "./api.js";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

function CompoundTable() {
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
      alert(e.message);
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
      const res = await fetch(`http://localhost:8000/compounds/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }
      await fetchCompounds();
    } catch (e) {
      alert(e.message);
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
        <p>Loading...</p>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Molecular Weight</TableCell>
                <TableCell>LogP</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compounds.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.smiles && (
                      <img
                        src={`http://localhost:8000/depict?smiles=${encodeURIComponent(c.smiles)}`}
                        alt="structure"
                        style={{
                          width: 80,
                          maxWidth: "100%",
                          height: "auto",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.mw?.toFixed(2)}</TableCell>
                  <TableCell>{c.logp?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button onClick={() => setEditing(c)}>Edit</Button>
                  </TableCell>
                  <TableCell>
                    <Button color="error" onClick={() => handleDelete(c.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
