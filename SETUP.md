# 環境構築手順

## ① 前提ソフトウェアのインストール

| ツール                | 用途                         | バージョン確認コマンド             |
| --------------------- | ---------------------------- | ---------------------------------- |
| **uv**                | Python本体とパッケージの管理 | `uv --version`                     |
| **PostgreSQL**        | データベース本体             | `psql --version`                   |
| **Node.js (npm同梱)** | フロントエンドのビルド・実行 | `node --version` / `npm --version` |

- **uv**

  uvはPythonのパッケージマネージャーです。必要なライブラリを一括でインストールするのに使用します。
インストールするにはターミナルで以下のコマンドを実行します。

  ```bash
  # Windows (Powershell)
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

  # macOS, Linux
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

- **PostgreSQL**

  PostgreSQLは、DBMS (データベースマネジメントサービス) の1つです。以下のコマンドでインストールするか、[公式サイト](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)からインストーラをダウンロードし、インストールします。

  ```bash
  # Windows
  winget install -e --id PostgreSQL.PostgreSQL

  # macOS
  brew install postgresql

  # Linux
  sudo apt update && sudo apt install postgresql postgresql-contrib
  ```

  セットアップ後は、パスワードを控えておいてください。

- **Node.js**

  Node.jsはJavaScriptの実行環境を提供します。以下のコマンドでインストールするか、[公式サイト](https://nodejs.org/ja/download)からインストーラをダウンロードし、インストールします。

  ```bash
  # Windows
  winget install -e --id OpenJS.NodeJS.LTS

  # macOS
  brew install node

  # Linux
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

全てのツールのインストールが済んだら、上記の表に示したバージョン確認コマンドで正しくインストールされたかを確認してください。

---

## ② データベースの準備 (PostgreSQL)

### 2-1. データベースを作成

ターミナルでPostgreSQLに接続します。インストール時に設定したパスワードを入力します。

```bash
psql -U postgres -p
```

接続できたら、以下を実行してデータベースを作成します。

```sql
CREATE DATABASE eln_db;
```

### 2-2. （任意）専用ユーザーを作る場合

専用ユーザーを作る場合は以下を実行します。

```sql
CREATE USER eln_user WITH PASSWORD 'ここに任意のパスワード';
GRANT ALL PRIVILEGES ON DATABASE eln_db TO eln_user;
```

ここで決めた**ユーザー名とパスワードを手順③の `.env` に書きます**。

---

## ③ バックエンドのセットアップ（`eln_db/`）

### 3-1. Python依存パッケージをインストール

ルートディレクトリで以下を実行します

```bash
uv sync
```

これにより、`pyproject.toml`と`uv.lock`に従ってPythonの仮想環境が作成され、必要なライブラリが一括で自動でインストールされます。

### 3-2. 接続情報（`.env`）を作成

`eln_db/.env.example`をもとに手順②で決めたユーザ名・パスワードを書き、ファイル名を`.env`に変換します。

```dotenv
SQL_USERNAME = ここにユーザ名
SQL_PASSWORD = ここにパスワード
```

### 3-4. テーブルを作成

`eln_db/` ディレクトリへ移動し、以下を実行します。

```bash
cd eln_db
uv run alembic upgrade head
```

これにより、 `compounds`, `reactions`, `reaction_components`の3テーブルが`eln_db`に作成されます。

> 確認：`uv run alembic current`で現在のリビジョンが表示されればOKです。

### 3-5. バックエンドAPIサーバを起動

`eln_db/` ディレクトリで以下を実行します。

```bash
uv run uvicorn main:app --reload
```

> - 既定で `http://127.0.0.1:8000` で起動します。
> - 動作確認：ブラウザで `http://127.0.0.1:8000/docs` を開くと、FastAPIの自動APIドキュメント (Swagger UI) が表示されます。
> - ターミナルで以下を実行し、OKが返ってきたら動作は問題ありません。
>
> ```bash
> curl http://127.0.0.1:8000/health
> ```

---

## ④ フロントエンドのセットアップ（`eln_frontend/`）

別のターミナルを開き、`eln_frontend/` ディレクトリで以下を実行します。

```bash
cd eln_frontend
npm install      # package.json に従い依存をインストール
npm run dev      # 開発サーバを起動
```

> - 開発サーバは `http://localhost:5173` で起動します。
> - **バックエンド（手順③）が起動していないとデータを取得できない**ので、両方を同時に起動しておくようにしてください。

---

## ⑤ 2回目以降の起動方法

一度セットアップが済めば、日常的に動かすのは次の2つのターミナルです。

```bash
# ターミナル1: バックエンド
cd eln_db
uv run uvicorn main:app --reload

# ターミナル2: フロントエンド
cd eln_frontend
npm run dev
```

その上でブラウザで `http://localhost:5173` を開いてください。
