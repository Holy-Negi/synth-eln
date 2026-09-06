import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  Container,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CompoundTable from "./CompoundTable.jsx";
import ReactionTable from "./ReactionTable.jsx";
import StoichiometricTable from "./StoichiometricTable.jsx";

const NAV = [
  { label: "Compounds", path: "/compounds" },
  { label: "Reactions", path: "/reactions" },
  { label: "Stoichiometry", path: "/stoichiometry" },
];

function App() {
  // 分割代入で pathname だけ取り出す
  const { pathname } = useLocation();
  // 一致する Tab が無ければ false（どのタブも未選択）を渡す
  const current = NAV.find((n) => pathname.startsWith(n.path))?.path ?? false;

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.72),
          backdropFilter: "blur(8px)",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar variant="dense">
          <Typography
            variant="h6"
            component={Link}
            to={NAV[0].path}
            sx={{
              mr: 4,
              letterSpacing: "-0.01em",
              color: "inherit",
              textDecoration: "none",
              "&:hover": { opacity: 0.8 },
            }}
          >
            synth
            <Box component="span" sx={{ color: "primary.main" }}>
              ELN
            </Box>
          </Typography>

          <Tabs
            value={current}
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              alignSelf: "stretch",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                minWidth: "auto",
                px: 2,
              },
            }}
          >
            {NAV.map((n) => (
              <Tab
                key={n.path}
                label={n.label}
                value={n.path}
                component={Link}
                to={n.path}
              />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Routes>
          <Route path="/compounds" element={<CompoundTable />} />
          <Route path="/reactions" element={<ReactionTable />} />
          <Route path="/stoichiometry" element={<StoichiometricTable />} />
          <Route path="/" element={<Navigate to="/compounds" />} />
        </Routes>
      </Container>
    </>
  );
}
export default App;
