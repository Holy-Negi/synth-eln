# ===== API =====
#   HTTPリクエスト（フロントエンド等からの要求）を受け取り、処理を実行して結果をJSONで返す
#
# エンドポイント一覧:
#   /health                            動作確認
#   /compounds        (GET/POST)       化合物の一覧取得・新規登録
#   /compounds/{id}   (GET/PUT/DELETE) 化合物1件の取得・更新・削除
#   /reactions        (GET/POST)       反応の一覧取得・新規登録
#   /reactions/{id}   (GET/PUT/DELETE) 反応1件の取得・更新・削除
#   /reactions/{id}/equivalents        当量計算
#   /functional-groups (GET)           官能基プリセット一覧
#
#   構造検索は /compounds と /reactions のクエリパラメータで行う:
#     ?substructure=<SMARTS または SMILES>   自由入力の部分構造
#     ?fg=<官能基プリセット名>                例: ?fg=carboxylic_acid
#     ?role=<reactant|product|...>           /reactions のみ。役割を限定して構造検索
#
#   @app.get("/パス", response_model=返すデータの型)
#   def 関数名(payload: 入力の型, db: Session = Depends(get_db)):
#       ...
#       return オブジェクト
from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models import Compound, Reaction, ReactionComponent, Role
from schemas import (
    CompoundCreate, CompoundRead, CompoundUpdate,
    ReactionRead, ReactionCreate, ReactionUpdate,
    EquivalentRow
)
from chemistry import (
    compute_properties, render_svg, render_reaction_svg,
    FUNCTIONAL_GROUPS
)
from search import SearchQueryError, resolve_patterns, filter_compounds, filter_reactions
from crud import get_or_create_compound
from stoichiometry import compute_equivalents
import pubchempy as pcp

app = FastAPI()

@app.exception_handler(SearchQueryError)
def handle_search_query_error(request: Request, exc: SearchQueryError):
    """search.py が投げた SearchQueryError を HTTP 422 に翻訳する"""
    return JSONResponse(status_code=422, content={"detail": str(exc)})

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/compounds", response_model=CompoundRead, status_code=201)
def create_compound(payload: CompoundCreate, db: Session = Depends(get_db)):
    compound, created = get_or_create_compound(db, payload.smiles, payload.name, payload.density)
    # 不正なSMILESのチェック
    if compound is None:
        raise HTTPException(status_code=422, detail="invalid SMILES")
    # inchikeyの重複チェック
    if not created:
        raise HTTPException(status_code=409, detail="compound already exists")
    db.commit()
    db.refresh(compound)
    return compound

@app.get("/functional-groups")
def list_functional_groups():
    """官能基プリセットの一覧を返す"""
    return FUNCTIONAL_GROUPS

@app.get("/compounds", response_model=list[CompoundRead])
def list_compound(q: str | None = None,
                  substructure: str | None = None,
                  fg: str | None = None,
                  db: Session = Depends(get_db)):
    """化合物を一覧する。q は名前の部分一致、substructure / fg は部分構造検索"""
    stmt = select(Compound)
    if q:
        # ilike は大文字小文字を区別しない部分一致
        stmt = stmt.where(Compound.name.ilike(f"%{q}%"))
    compounds = db.scalars(stmt).all()
    # substructure と fg は AND 条件
    patterns = resolve_patterns(substructure, fg)
    return filter_compounds(compounds, patterns)

@app.get("/compounds/{compound_id}", response_model=CompoundRead)
def get_compound(compound_id: int, db: Session = Depends(get_db)):
    obj = db.get(Compound, compound_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="compound not found")
    return obj

@app.put("/compounds/{compound_id}", response_model=CompoundRead)
def update_compound(compound_id: int, payload: CompoundUpdate, db: Session = Depends(get_db)):
    obj = db.get(Compound, compound_id)
    if obj is None:
        raise HTTPException(404, "compound not found")
    data = payload.model_dump(exclude_unset=True) # 送られた項目だけの辞書
    # obj.key = val <= setattr(obj, key, val)
    for key, val in data.items():
        setattr(obj, key, val)
    if "smiles" in data:
        props = compute_properties(data["smiles"])
        if props is None:
            raise HTTPException(422, "invalid SMILES")
        for key in ["smiles", "inchikey", "mw", "exact_mass", "logp"]:
            setattr(obj, key, props[key])
    db.commit()
    db.refresh(obj)
    return obj

@app.delete("/compounds/{compound_id}", status_code=204)
def delete_compound(compound_id: int, db: Session = Depends(get_db)):
    obj = db.get(Compound, compound_id)
    if obj is None:
        raise HTTPException(404, "compound not found")
    count = db.scalar(select(func.count()).select_from(ReactionComponent).where(ReactionComponent.compound_id == compound_id))
    if (count or 0) > 0:
        raise HTTPException(409, detail=f"compound is used in {count} reaction component(s)")
    db.delete(obj)
    db.commit()

@app.post("/reactions", response_model=ReactionRead, status_code=201)
def create_reaction(payload: ReactionCreate, db: Session = Depends(get_db)):
    reaction = Reaction(
        exp_code=payload.exp_code, title=payload.title, date=payload.date,
        scale=payload.scale, conc=payload.conc, temperature=payload.temperature, duration_h=payload.duration_h, note=payload.note,
    )
    for c in payload.components:
        compound, _ = get_or_create_compound(db, c.smiles, c.name, c.density)
        if compound is None:
            raise HTTPException(422, detail=f"invalid SMILES: {c.smiles}")
        # relationship経由でSQLAlchemyが自動的にcompoundsテーブルの外部キーを埋める
        reaction.components.append(
            ReactionComponent(
                compound=compound, role=c.role,
                equiv=c.equiv, yield_percent=c.yield_percent,
            )
        )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)
    return reaction

@app.get("/reactions", response_model=list[ReactionRead])
def list_reaction(q: str | None = None,
                  substructure: str | None = None,
                  fg: str | None = None,
                  role: Role | None = None,
                  db: Session = Depends(get_db)):
    """反応を一覧する

    q は exp_code / title / note の部分一致。substructure / fg は成分の部分構造検索で、
    role を指定すると判定対象の成分をその役割に限定する。
    """
    # components とその compound を先読みし、フィルタ時の N+1 クエリを避ける
    stmt = (
        select(Reaction)
        .options(
            selectinload(Reaction.components).selectinload(ReactionComponent.compound)
        )
        # 新しい実験が上。同日は id の降順で安定させる
        .order_by(Reaction.date.desc(), Reaction.id.desc())
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            Reaction.exp_code.ilike(like),
            Reaction.title.ilike(like),
            Reaction.note.ilike(like),
        ))
    reactions = db.scalars(stmt).all()
    # substructure と fg は AND 条件
    patterns = resolve_patterns(substructure, fg)
    return filter_reactions(reactions, patterns, role)

@app.get("/reactions/{reaction_id}", response_model=ReactionRead)
def get_reaction(reaction_id: int, db: Session = Depends(get_db)):
    obj = db.get(Reaction, reaction_id)
    if obj is None:
        raise HTTPException(404, "reaction not found")
    return obj

@app.put("/reactions/{reaction_id}", response_model=ReactionRead)
def update_reaction(reaction_id: int, payload: ReactionUpdate, db: Session = Depends(get_db)):
    reaction = db.get(Reaction, reaction_id)
    if reaction is None:
        raise HTTPException(404, "reaction not found")

    # 単一値の更新
    reaction.exp_code = payload.exp_code
    reaction.title = payload.title
    reaction.date = payload.date
    reaction.scale = payload.scale
    reaction.conc = payload.conc
    reaction.temperature = payload.temperature
    reaction.duration_h = payload.duration_h
    reaction.note = payload.note

    # 成分は全消し→作り直し（cascade delete-orphan が古い行を削除）
    reaction.components.clear()
    for c in payload.components:
        compound, _ = get_or_create_compound(db, c.smiles)
        if compound is None:
            raise HTTPException(422, detail=f"invalid SMILES: {c.smiles}")
        reaction.components.append(
            ReactionComponent(compound=compound, role=c.role,
                              equiv=c.equiv, yield_percent=c.yield_percent)
        )
    db.commit()
    db.refresh(reaction)
    return reaction

@app.delete("/reactions/{reaction_id}", status_code=204)
def delete_reaction(reaction_id: int, db: Session = Depends(get_db)):
    reaction = db.get(Reaction, reaction_id)
    if reaction is None:
        raise HTTPException(404, "reaction not found")
    db.delete(reaction)
    db.commit()

@app.get("/reactions/{reaction_id}/equivalents", response_model=list[EquivalentRow])
def reaction_equivalents(reaction_id: int, scale: float | None = None,
                         db: Session = Depends(get_db)):
    reaction = db.get(Reaction, reaction_id)
    if reaction is None:
        raise HTTPException(404, "reaction not found")
    s = scale if scale is not None else reaction.scale   # 未指定なら保存値を使う
    return compute_equivalents(reaction, s)

@app.get("/resolve")
def resolve_name(name: str):
    compounds = pcp.get_compounds(name, 'name')
    if not compounds:
        raise HTTPException(404, "compounds not found")
    smiles = {"name": compounds[0].iupac_name, "smiles": compounds[0].isomeric_smiles}
    return smiles

@app.get("/depict")
def depict(smiles: str):
    svg = render_svg(smiles)
    if svg is None:
        raise HTTPException(422, "invalid SMILES")
    return Response(content=svg, media_type="image/svg+xml")

@app.get("/reactions/{reaction_id}/scheme")
def reaction_scheme(reaction_id: int, db: Session=Depends(get_db)):
    reaction = db.get(Reaction, reaction_id)
    if reaction is None:
        raise HTTPException(404, "reaction not found")
    left = []
    agents = []
    right = []
    agents_roles = [Role.reagent, Role.catalyst, Role.solvent]
    for c in reaction.components:
        if c.role == Role.reactant:
            left.append(c.compound.smiles)
        elif c.role in agents_roles:
            agents.append(c.compound.smiles)
        elif c.role == Role.product:
            right.append(c.compound.smiles)
    reaction_smiles = f"{'.'.join(left)}>{'.'.join(agents)}>{'.'.join(right)}"
    svg = render_reaction_svg(reaction_smiles)
    if svg is None:
        raise HTTPException(422, "invalid SMILES")
    return Response(content=svg, media_type="image/svg+xml")

# リクエストを許可するオリジン・メソッド・ヘッダー
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Viteの開発サーバのオリジン
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pythonコード               SQL文
# ─────────────────────────────────────────
# db.add(obj)        →   INSERT INTO ... （flush/commitのタイミングで実行）
# db.delete(obj)     →   DELETE FROM ... （同上）
# db.get(Compound,1) →   SELECT * FROM compounds WHERE id = 1
# db.scalar(select…) →   SELECT ...
# db.scalars(select…)→   SELECT ...

# db.commit()        →   COMMIT          （トランザクション制御）
# db.rollback()      →   ROLLBACK        （トランザクション制御）
# db.flush()         →   SQL送信するがCOMMITしない（SQLに直接対応する文はない）
# db.refresh(obj)    →   SELECT ...      （内部的に再取得のSELECTが走る）
# db.close()         →   接続を閉じる（SQLではなくドライバレベルの操作）
