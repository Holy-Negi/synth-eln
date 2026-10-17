![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# synthELN (organic-synthesis Electronic Lab Notebook: 有機合成電子実験ノート)

synthELNは、主に有機化学者が日々の実験記録を管理・運用するのを手助けする、SQLベースのツールです。
主な機能は[こちら](https://nice-spirit-26e.notion.site/synthELN-3d3294161c5180a6aa61fb3c766ba79e)をご覧ください。

## 全体構成

```
synth-eln/
├── eln_db/          バックエンド
├── eln_frontend/    フロントエンド
├── .gitignore
├── ER.svg           ER図
├── pyproject.toml   Pythonプロジェクト定義
├── uv.lock
├── run.bat          アプリ起動スクリプト (Windowsのみ)
├── LICENSE
├── README.md
└── SETUP.md         セットアップ方法
```

> 環境構築（PostgreSQL・依存インストール・マイグレーション・起動）の詳細な手順は [SETUP.md](./SETUP.md) を参照してください。

## 各ディレクトリの役割

### `eln_db/`

FastAPIによるAPIサーバーです。SMILESから物性を計算してそのデータをPostgreSQLに保存するなどの機能を提供しています。

| ファイル           | 役割                                             |
| ------------------ | ------------------------------------------------ |
| `main.py`          | APIエンドポイント定義                            |
| `models.py`        | DBテーブル定義 (SQLAlchemy ORM)                  |
| `schemas.py`       | 入出力のデータ形式 (Pydantic)                    |
| `crud.py`          | DBの操作を行う関数の定義                         |
| `chemistry.py`     | RDKitによる化学計算を提供する関数の定義          |
| `search.py`        | 部分構造検索機能の提供                           |
| `stoichiometry.py` | 反応スケールから必要試薬量を計算し、当量表を生成 |
| `database.py`      | DB接続設定                                       |
| `alembic/`         | DBマイグレーション管理                           |

**データモデル概要**

- `Compound`：化合物名・SMILES・InChIKey・物性値（分子量・正確質量・logP）・密度など
- `Reaction`：実験番号・実験日・反応スケール・濃度・メモなど
- `ReactionComponent`：`Compound`と`Reaction`を繋ぐ中間テーブル

**主なAPIエンドポイント**

| メソッド       | パス                          | 役割                                                                                                                        |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET            | `/health`                     | 稼働確認                                                                                                                    |
| GET/POST       | `/compounds`                  | 化合物の一覧取得（`?q=` で名前検索、`?substructure=` / `?fg=` で部分構造検索）／新規作成                                    |
| GET/PUT/DELETE | `/compounds/{id}`             | 化合物の取得／更新／削除                                                                                                    |
| GET/POST       | `/reactions`                  | 反応の一覧取得（`?q=` で実験番号・タイトル・メモ検索、`?substructure=` / `?fg=` / `?role=` で成分の部分構造検索）／新規作成 |
| GET/PUT/DELETE | `/reactions/{id}`             | 反応の取得／更新／削除                                                                                                      |
| GET            | `/reactions/{id}/equivalents` | 当量表の計算（`?scale=` でスケールを指定）                                                                                  |
| GET            | `/reactions/{id}/scheme`      | 反応スキームの SVG 画像を生成                                                                                               |
| GET            | `/functional-groups`          | 部分構造検索で使える官能基プリセットの一覧                                                                                  |
| GET            | `/depict`                     | `?smiles=` の構造式を SVG 画像で返す                                                                                        |
| GET            | `/resolve`                    | `?name=` の化合物名を PubChem で検索し、SMILES を返す                                                                       |

**起動方法**： `uv run uvicorn main:app --reload`（`eln_db/` ディレクトリで実行）

### `eln_frontend/`

ReactとMaterial-UIによるフロントエンドです。化合物や反応記録の一覧表示・構造検索・登録・編集・削除、当量計算などが可能です。

| ファイル                            | 役割                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| `main.jsx`                          | エントリポイント                                        |
| `App.jsx`                           | ヘッダーのナビゲーションタブと、URLごとの画面の割り当て |
| `CompoundTable.jsx`                 | Compounds画面                                           |
| `CompoundForm.jsx`                  | 化合物の新規登録フォーム                                |
| `CompoundEditDialog.jsx`            | 化合物の編集ダイアログ                                  |
| `ReactionTable.jsx`                 | Reactions画面                                           |
| `ReactionItem.jsx`                  | 反応1件の行                                             |
| `ReactionForm.jsx`                  | 反応の新規登録フォーム                                  |
| `ReactionEditDialog.jsx`            | 反応の編集ダイアログ                                    |
| `ComponentRowsEditor.jsx`           | 反応成分の入力行エディタ                                |
| `StoichiometricTable.jsx`           | Stoichiometry画面                                       |
| `StructureSearchBar.jsx`            | 名前・官能基プリセット・SMARTS / SMILES による検索バー  |
| `ConfirmDialog.jsx`                 | 削除など取り消せない操作の確認ダイアログ                |
| `ToastProvider.jsx` / `useToast.js` | 画面右下のエラー・成功通知                              |
| `api.js`                            | APIのURL組み立てとfetchの共通処理                       |
| `componentRows.js`                  | 反応成分の入力行とAPI送受信データの相互変換             |
| `reactionText.js`                   | 化学反応式テキストの生成                                |

**起動方法**： `npm install` → `npm run dev`（開発サーバ [http://localhost:5173](http://localhost:5173) ）

## 技術スタック

| 領域           | 技術                                   |
| -------------- | -------------------------------------- |
| 言語           | Python / JavaScript (ES Modules)       |
| バックエンド   | FastAPI, SQLAlchemy, Alembic, Pydantic |
| 化学計算       | RDKit, PubChemPy                       |
| DB             | PostgreSQL                             |
| フロントエンド | React 19, Vite, Material-UI (MUI)      |
| パッケージ管理 | uv（Python） / npm（JS）               |
