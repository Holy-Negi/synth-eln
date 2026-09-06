import { createContext, useContext } from "react";

// props を経由せず値を配る入れ物。値は ToastProvider が入れる
export const ToastContext = createContext(null);

/** 通知を出す関数 { showError, showSuccess } を返すフック */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error("useToast は ToastProvider の内側で呼んでください");
  }
  return ctx;
}
