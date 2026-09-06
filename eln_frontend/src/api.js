// ===== API 呼び出し共通ヘルパー =====

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

/**
 * パスとパラメータから URL を組み立てる。
 * 値が空文字・null・undefined のパラメータは URL に載せない。
 * @param {string} path
 * @param {object} params
 * @returns {string}
 */
export function buildUrl(path, params = {}) {
  // URLSearchParams がエスケープを行うので、SMARTS の # や + も安全に送れる
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // != null は null と undefined の両方を弾く
    if (value != null && value !== "") {
      search.append(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `${API_BASE}${path}?${qs}` : `${API_BASE}${path}`;
}

/**
 * fetch して JSON を返す。失敗時は detail 付きの Error を投げる。
 * 表示方法は呼び出し側が決めるので、ここでは握りつぶさず投げるだけにする。
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchJson(url) {
  // await が Promise を剥がすので、res は Response オブジェクト
  const res = await fetch(url);

  // 404 や 422 でも通信自体は成功しており fetch は例外を投げない。
  // そのため自分でステータスを見て投げ直す必要がある
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.detail) {
        // FastAPI の自動バリデーションエラーでは detail が配列になる
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      // 本文が JSON でなければステータス文字列をそのまま使う
    }
    throw new Error(detail);
  }

  return res.json();
}
