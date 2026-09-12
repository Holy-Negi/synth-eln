from pydantic import BaseModel
from datetime import datetime
from models import Role

# PydanticのBaseModelクラスを継承すると，
# "name: str"のような注釈付き変数を認識して自動的に__init__を実行する
# つまり内部的には以下のような初期化が行われている
# def __init__(self, name: str, smiles: str, ...):
#     self.name = name

class CompoundCreate(BaseModel):
    name: str
    smiles: str
    density: float | None = None # =の右側はデフォルト値

class CompoundUpdate(BaseModel):
    name: str | None = None
    smiles: str | None = None
    density: float | None = None

class CompoundRead(BaseModel):
    id: int
    name: str
    smiles: str | None
    inchikey: str
    mw: float | None
    exact_mass: float | None
    density: float | None
    logp: float | None
    created_at: datetime
    model_config = {"from_attributes": True}

# "from_attributes": True
#   オブジェクトの属性からPydanticオブジェクトを作れるようにする

class ReactionComponentCreate(BaseModel):
    smiles: str
    name: str | None = None
    role: Role
    equiv: float | None = None
    density: float | None = None
    yield_percent: float | None = None
    
class ReactionCreate(BaseModel):
    exp_code: str
    title: str | None = None
    date: datetime
    scale: float
    conc: float
    temperature: float | None = None
    duration_h: float | None = None
    note: str | None = None
    components: list[ReactionComponentCreate]
    # ネスト（入れ子）構造
    
class ReactionComponentRead(BaseModel):
    id: int
    compound_id: int
    compound: CompoundRead
    role: Role
    equiv: float | None
    yield_percent: float | None
    model_config = {"from_attributes": True}

class ReactionRead(BaseModel):
    id: int
    exp_code: str
    title: str | None = None
    date: datetime
    scale: float
    conc: float
    temperature: float | None = None
    duration_h: float | None = None
    note: str | None
    components: list[ReactionComponentRead]
    model_config = {"from_attributes": True}

class ReactionUpdate(BaseModel):
    exp_code: str
    title: str | None = None
    date: datetime
    scale: float
    conc: float
    temperature: float | None = None
    duration_h: float | None = None
    note: str | None = None
    components: list[ReactionComponentCreate]

class EquivalentRow(BaseModel):
    name: str
    mw: float | None
    role: str
    equiv: float | None
    mmol: float | None
    mass_g: float | None
    volume_ml: float | None
    yield_percent: float | None = None   # product のみ（保存済みの実測収率）
    actual_mass_g: float | None = None   # 理論収量 × 収率