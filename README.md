![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# synthELN (organic-synthesis Electronic Lab Notebook: 有機合成電子実験ノート)

synthELNは、主に有機化学者が日々の実験記録を管理・運用するのを手助けする、SQLベースのツールです。
主な機能は[こちら](https://nice-spirit-26e.notion.site/synthELN-3d3294161c5180a6aa61fb3c766ba79e)をご覧ください。

## 全体構成

```
Chemoinfomatics/
├── eln_db/          バックエンド
├── eln_frontend/    フロントエンド
├── ER.svg           ER図（テーブル設計図）
├── SETUP.md         セットアップ方法
└── pyproject.toml   Pythonプロジェクト定義（uv管理）
```

> 環境構築（PostgreSQL・依存インストール・マイグレーション・起動）の詳細な手順は `[SETUP.md](./SETUP.md)` を参照。

## 各ディレクトリの役割

### `eln_db/`

FastAPI 製の API サーバー。SMILES を受け取り RDKit で物性を計算して PostgreSQL に保存する。

| ファイル           | 役割                                             |
| ------------------ | ------------------------------------------------ |
| `main.py`          | APIエンドポイント定義                            |
| `models.py`        | DBテーブル定義（SQLAlchemy ORM）                 |
| `schemas.py`       | 入出力のデータ形式（Pydantic)                    |
| `crud.py`          | DBの操作を行う関数の定義                         |
| `chemistry.py`     | RDKitでSMILESから物性情報を計算                  |
| `stoichiometry.py` | 反応スケールから必要試薬量を計算し、当量表を生成 |
| `database.py`      | DB接続設定                                       |
| `alembic/`         | DBマイグレーション管理                           |

**データモデル概要**

- `Compound`：化合物名・SMILES・InChIKey・物性値（分子量・正確質量・logP）・密度
- `Reaction`：実験番号・実験日・反応スケール・濃度・メモ
- `ReactionComponent`：`Compound`と`Reaction`を繋ぐ中間テーブル

**主なAPIエンドポイント**

| メソッド       | パス                          | 役割                                             |
| -------------- | ----------------------------- | ------------------------------------------------ |
| GET            | `/health`                     | 稼働確認                                         |
| GET/POST       | `/compounds`                  | 化合物の一覧取得（`?q=` で名前検索）／新規作成   |
| GET/PUT/DELETE | `/compounds/{id}`             | 化合物の取得／更新／削除                         |
| GET/POST       | `/reactions`                  | 反応の一覧取得（`?q=` で実験番号検索）／新規作成 |
| GET/PUT/DELETE | `/reactions/{id}`             | 反応の取得／更新／削除                           |
| GET            | `/reactions/{id}/equivalents` | 当量計算（`?scale=` でスケールを指定）           |

起動: `uv run uvicorn main:app --reload`（`eln_db/` ディレクトリで実行）

### `eln_frontend/`

React 19 + Vite + Material-UIによるフロントエンド。化合物・反応を一覧表示し、フォーム／ダイアログから登録・編集・削除できる。

| ファイル                  | 役割                                                 |
| ------------------------- | ---------------------------------------------------- |
| `App.jsx`                 | 画面全体の組み立て                                   |
| `CompoundTable.jsx`       | 化合物一覧の表示・検索・削除                         |
| `CompoundForm.jsx`        | 化合物の新規登録フォーム                             |
| `CompoundEditDialog.jsx`  | 化合物の編集ダイアログ                               |
| `ReactionTable.jsx`       | 反応一覧の表示・検索                                 |
| `ReactionItem.jsx`        | 反応1件の行（展開で成分を表示）                      |
| `ReactionForm.jsx`        | 反応の新規登録フォーム                               |
| `ReactionEditDialog.jsx`  | 反応の編集ダイアログ                                 |
| `ComponentRowsEditor.jsx` | 反応成分（化合物・役割・当量・収率）の入力行エディタ |
| `StoichiometricTable.jsx` | 反応のスケールを入力して当量計算結果を表示           |

起動: `npm install` → `npm run dev`（開発サーバ [http://localhost:5173](http://localhost:5173) ）

## 技術スタック

| 領域           | 技術                                   |
| -------------- | -------------------------------------- |
| 言語           | Python 3.14 / JavaScript (ES Modules)  |
| バックエンド   | FastAPI, SQLAlchemy, Alembic, Pydantic |
| 化学計算       | RDKit, PubChemPy                       |
| DB             | PostgreSQL                             |
| フロントエンド | React 19, Vite, Material-UI (MUI)      |
| パッケージ管理 | uv（Python） / npm（JS）               |
