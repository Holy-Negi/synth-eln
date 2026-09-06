import { useState, useEffect } from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";
import StructureSearchBar from "./StructureSearchBar.jsx";
import { API_BASE, buildUrl, fetchJson } from "./api.js";
import ReactionItem from "./ReactionItem.jsx";
import ReactionForm from "./ReactionForm.jsx";
import ReactionEditDialog from "./ReactionEditDialog.jsx";
import { useToast } from "./useToast.js";

function ReactionTable() {
  const { showError } = useToast();
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({
    q: "",
    substructure: "",
    fg: "",
    role: "",
  });
  const [editing, setEditing] = useState(null);

  const fetchReactions = async () => {
    setLoading(true);
    const url = buildUrl("/reactions", search);
    try {
      const data = await fetchJson(url);
      setReactions(data);
    } catch (e) {
      showError(e.message);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [search.q, search.substructure, search.fg, search.role]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reaction?")) return;
    try {
      const res = await fetch(`${API_BASE}/reactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }
      await fetchReactions();
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <>
      <ReactionForm onCreated={fetchReactions} />
      {/* テキストは exp_code / title / note を横断検索。
          構造検索は成分のいずれかがその部分構造を持つ反応を返し、
          role で判定対象の成分を限定できる */}
      <StructureSearchBar
        value={search}
        onChange={setSearch}
        showRole
        textLabel="Search (code / title / note)"
      />
      {loading ? (
        <Stack sx={{ alignItems: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : reactions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: "center" }}>
          該当する反応がありません
        </Typography>
      ) : (
        reactions.map((r) => (
          <ReactionItem
            key={r.id}
            reaction={r}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ))
      )}
      <ReactionEditDialog
        reaction={editing}
        onClose={() => setEditing(null)}
        onUpdated={fetchReactions}
      />
    </>
  );
}
export default ReactionTable;
