import { useCallback, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { ToastContext } from "./useToast.js";

function ToastProvider({ children }) {
  // 表示中の通知1件。null は非表示
  const [toast, setToast] = useState(null);

  // useCallback / useMemo は再レンダーをまたいで同じオブジェクトを返す。
  // 受け取り側が依存配列に入れても再実行されない
  const show = useCallback(
    (message, severity) => setToast({ message, severity }),
    [],
  );
  const value = useMemo(
    () => ({
      showError: (message) => show(String(message), "error"),
      showSuccess: (message) => show(String(message), "success"),
    }),
    [show],
  );

  const handleClose = (_event, reason) => {
    // clickaway = 画面の他の場所をクリック。この場合は閉じない
    if (reason === "clickaway") return;
    setToast(null);
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {/* 閉じている間も子要素は評価されるため、
            ?. と ?? で toast が null のときの参照を防ぐ */}
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity ?? "info"}
          variant="filled"
          sx={{ maxWidth: 480 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
export default ToastProvider;
