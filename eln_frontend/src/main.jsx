import { BrowserRouter } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App.jsx";
import ToastProvider from "./ToastProvider.jsx";

const BORDER = "rgba(255, 255, 255, 0.09)";
const HOVER = "rgba(255, 255, 255, 0.04)";
const TEXT_DIM = "rgba(232, 234, 237, 0.62)";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0E1116",
      paper: "#161A21",
    },
    text: {
      primary: "#E8EAED",
      secondary: TEXT_DIM,
    },
    primary: { main: "#7DD3FC", contrastText: "#08151E" },
    // 差し色
    secondary: { main: "#FCD34D", contrastText: "#1A1400" },
    // role 表示の Chip に渡す色
    success: { main: "#6EE7B7" }, // product
    warning: { main: "#FBBF24" }, // catalyst
    info: { main: "#93C5FD" }, // reagent
    error: { main: "#FCA5A5" },
    divider: BORDER,
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: [
      "Inter",
      '"Segoe UI Variable Text"',
      '"Segoe UI"',
      "system-ui",
      '"Yu Gothic UI"',
      '"Hiragino Sans"',
      '"Noto Sans JP"',
      "Meiryo",
      "sans-serif",
    ].join(","),
    fontSize: 14,
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(255,255,255,0.16)",
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },

    MuiButton: {
      defaultProps: { size: "small", disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },

    MuiTextField: { defaultProps: { size: "small" } },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: BORDER },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: BORDER,
          fontVariantNumeric: "tabular-nums",
        },
        head: {
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: TEXT_DIM,
        },
      },
    },

    MuiTableBody: {
      styleOverrides: {
        root: { "& .MuiTableRow-root:hover": { backgroundColor: HOVER } },
      },
    },

    // ReactionItem の Accordion / Chip に効く既定スタイル
    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          marginBottom: 12,
          "&::before": { display: "none" },
          "&.Mui-expanded": { marginBottom: 12 },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        sizeSmall: { height: 22 },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* 通知は画面遷移の外側で保持する */}
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);

/*
全体の流れ
index.html に <div id="root"></div>（空の入れ物）がある
        │
main.jsx が実行される
        │
① App.jsx から App コンポーネントを import
② createRoot で id="root" の要素を描画先に設定
③ .render(<App />) で App を root に描画
        │
        ▼
ブラウザに化合物テーブルが表示される
*/
