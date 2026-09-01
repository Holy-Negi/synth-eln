# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## プロジェクト概要

ケモインフォマティクス学習用の ELN（Electronic Lab Notebook）。  
データの流れ: **SMILES入力 → RDKitで物性計算 → PostgreSQL保存 → FastAPI提供 → React表示**

## よく使うコマンド

### Python（ルート / `eln_db/`）

```powershell
# 依存パッケージのインストール（ルート）
uv sync

# バックエンド起動（eln_db/ ディレクトリで実行）
uv run uvicorn main:app --reload   # http://127.0.0.1:8000/docs で Swagger UI

# スクリプト実行例
uv run PubChem/pubchem.py
```

> 仮想環境内のツール（uvicorn / alembic）は必ず `uv run` を前置して呼ぶ。
> 付けないと `not recognized` になる（`uv sync` で導入済み）。

### フロントエンド（`eln_frontend/`）

```powershell
npm install
npm run dev      # 開発サーバ http://localhost:5173
npm run lint
npm run build
```

### DB マイグレーション（`eln_db/`）

```powershell
uv run alembic upgrade head         # 生成されたマイグレーションを実際のDBに適用する
uv run alembic revision --autogenerate -m "変更内容"  # models.py の変更を検知して、マイグレーションファイルを自動生成する
```

#### 補足

  典型的な流れ:

  1. models.py を編集（例: 列を追加）
  2. alembic revision --autogenerate -m "compoundsに沸点を追加" →
  eln_db/alembic/versions/ に変更内容を記述したPythonファイルが生成される
  3. 中身を確認
  4. alembic upgrade head で実際のPostgreSQLに反映

  head は「最新バージョンまで全部適用する」という意味です。逆に alembic downgrade  
  で1つ前に戻すこともできます。

## 重要な前提（ハマりどころ）

- `database.py` は **import された時点で即座に PostgreSQL へ接続**して疎通確認する
  副作用を持つ（19-20行目の `SELECT version()`）。そのため **DB と `.env` が正しく
  ないと、サーバ起動もマイグレーションも import 段階で失敗する**。
- 接続先は `database.py` に **ハードコード**：`localhost:5432` の **`eln_db`** データ
  ベース（ドライバは psycopg2、URL は `postgresql://`）。DBは事前に `CREATE DATABASE
  eln_db;` で作っておく必要がある。
- 詳しい構築順序は [SETUP.md](./SETUP.md) を参照。

## アーキテクチャ

```
eln_db/
├── main.py          APIエンドポイント（compounds / reactions の CRUD + 検索、
│                    /reactions/{id}/equivalents 当量表、/health）
├── models.py        SQLAlchemy ORM（Compound / Reaction / ReactionComponent / Role enum）
├── schemas.py       Pydantic 入出力スキーマ（Create / Read / Update / EquivalentRow）
├── crud.py          get_or_create_compound（InChIKey で重複検知、flush で採番）
├── chemistry.py     RDKit で SMILES → 物性値（MW, 正確質量, LogP, InChIKey）計算
├── stoichiometry.py 当量表の計算エンジン（compute_equivalents。scale と equiv から質量・体積）
├── database.py      DB接続（.env 読み込み / import時に接続確認 / get_db）
├── alembic.ini      Alembic設定（このディレクトリで alembic を実行）
└── alembic/         マイグレーション履歴

eln_frontend/src/    React コンポーネント群（App.jsx が全体を配置）
├── CompoundTable / CompoundForm / CompoundEditDialog    化合物の一覧・登録・編集
├── ReactionTable / ReactionForm / ReactionItem /        反応の一覧・登録・表示・編集
│   ReactionEditDialog / ComponentRowsEditor
├── StoichiometricTable.jsx   反応を選び scale から当量表を計算・表示・複製登録
└── main.jsx         StrictMode + MUI ThemeProvider(dark) + CssBaseline

PubChem/pubchem.py   PubChemPy で外部DBから化合物情報を取得する実験スクリプト
```

**3テーブル構成:**

- `compounds` — SMILES・InChIKey・物性値（InChIKey に一意制約）
- `reactions` — 実験コード・日付・スケール・メモ
- `reaction_components` — 反応と化合物の中間テーブル（役割: reactant / reagent / solvent / catalyst / product、当量・収率）。
  **equiv = 1.00 の成分を律速試薬とみなす規約**で運用（is_limiting フラグは持たない）。
  溶媒は equiv でなく conc から体積を逆算、触媒の mol% は equiv に正規化（10 mol% = 0.1 equiv）。

## 環境変数

`eln_db/.env` に PostgreSQL 接続情報を記載:

```
SQL_USERNAME = ...
SQL_PASSWORD = ...
```

## 技術スタック

| 領域                | 技術                                   |
| ------------------- | -------------------------------------- |
| Python バックエンド | FastAPI, SQLAlchemy, Alembic, Pydantic |
| 化学計算            | RDKit, PubChemPy                       |
| DB                  | PostgreSQL                             |
| フロントエンド      | React 19, Vite, Material UI（darkテーマ）|
| パッケージ管理      | uv（Python）/ npm（JS）                |

## その他

プロジェクトの背景については[ELN_handoff.md](./ELN_handoff.md)を必ず参照のこと。
