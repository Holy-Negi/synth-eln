from sqlalchemy import create_engine, text
import os

from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv

# .envファイルから認証情報を読みこむ
load_dotenv()

username = os.getenv("SQL_USERNAME")
password = os.getenv("SQL_PASSWORD")
host = os.getenv("SQL_HOST", "localhost")
port = os.getenv("SQL_PORT", "5432")
dbname = os.getenv("SQL_DATABASE", "eln_db")
echo = os.getenv("SQL_ECHO", "0") == "1"

engine = create_engine(
    f"postgresql://{username}:{password}@{host}:{port}/{dbname}",
    echo=echo,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False)

class Base(DeclarativeBase): pass

with engine.connect() as conn:
    print(conn.execute(text("SELECT version()")).scalar()) # .scalar(): 実行結果の最初の行の最初の列だけを取り出す

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()