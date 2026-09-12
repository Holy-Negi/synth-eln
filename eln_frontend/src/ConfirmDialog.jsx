import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

/**
 * 削除など取り消せない操作の確認ダイアログ。
 * window.confirm と違いテーマが効き、画面の外観から浮かない。
 *
 * 呼び出し側は「確認待ちの対象」を state に持ち、その有無を open に渡す。
 */
function ConfirmDialog({
  open,
  title = "確認",
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;
