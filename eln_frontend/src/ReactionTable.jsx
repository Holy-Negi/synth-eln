import { useState, useEffect } from "react";
import { TextField } from "@mui/material";
import ReactionItem from "./ReactionItem.jsx";
import ReactionForm from "./ReactionForm.jsx";
import ReactionEditDialog from "./ReactionEditDialog.jsx";

function ReactionTable() {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const fetchReactions = async () => {
    const url = query
      ? `http://localhost:8000/reactions?q=${encodeURIComponent(query)}`
      : "http://localhost:8000/reactions";
    const res = await fetch(url);
    setReactions(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchReactions(); }, [query]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reaction?")) return;
    try {
      const res = await fetch(`http://localhost:8000/reactions/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
      await fetchReactions();
    } catch (e) { alert(e.message); }
  };

  return (
    <>
      <ReactionForm onCreated={fetchReactions} />
      {/* サーバ側で exp_code / title / note を横断検索する */}
      <TextField label="Search (code / title / note)" size="small" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      {loading ? <p>Loading...</p> : (
        reactions.map((r) => (
          <ReactionItem key={r.id} reaction={r} onEdit={setEditing} onDelete={handleDelete} />
        ))
      )}
      <ReactionEditDialog reaction={editing} onClose={() => setEditing(null)} onUpdated={fetchReactions} />
    </>
  );
}
export default ReactionTable;