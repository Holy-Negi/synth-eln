from sqlalchemy import select
from models import Compound
from chemistry import compute_properties

def get_or_create_compound(db, smiles, name=None, density=None):
    props = compute_properties(smiles)
    if props is None:
        return None, False
    existing = db.scalar(select(Compound).where(Compound.inchikey == props["inchikey"])) # SELECT * FROM compounds WHERE inchikey = '...'
    if existing is not None:
        # 既存化合物は上書きしない。density が未登録のときだけ入力値で埋める
        if existing.density is None and density is not None:
            existing.density = density
        return existing, False
    obj = Compound(name=name or props["smiles"], **props, density=density)
    # name == Noneのとき name = props["smiles"] を代入する
    # **props: 辞書propsをキーワード引数に展開する
    db.add(obj)
    # 最後にまとめてcommitするためflushで一時的に採番を保存
    db.flush()
    return obj, True