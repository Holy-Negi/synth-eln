from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem import AllChem
from functools import lru_cache

# RDKitでSMILESからINCHIKeyやMolWtなどの物性情報を取得

def compute_properties(smiles: str) -> dict | None: # ->: 戻り値の型アノテーション
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    return {
        "smiles": Chem.MolToSmiles(mol),
        "inchikey": Chem.MolToInchiKey(mol),
        "mw": Descriptors.MolWt(mol),
        "exact_mass": Descriptors.ExactMolWt(mol),
        "logp": Descriptors.MolLogP(mol)
    }

def render_svg(smiles: str) -> str | None:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    drawer = rdMolDraw2D.MolDraw2DSVG(300, 300)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()
    return svg

def render_reaction_svg(reaction_smiles: str) -> str | None:
    rxn = AllChem.ReactionFromSmarts(reaction_smiles, useSmiles=True)
    if rxn is None:
        return None
    total_heavy = 0
    for mol in list(rxn.GetReactants()) + list(rxn.GetAgents()) + list(rxn.GetProducts()):
        total_heavy += mol.GetNumHeavyAtoms()
    width = max(450, 25 * total_heavy)
    drawer = rdMolDraw2D.MolDraw2DSVG(width, 150)
    drawer.DrawReaction(rxn)
    drawer.FinishDrawing()
    svg_string = drawer.GetDrawingText()
    return svg_string

# 部分構造検索（substructure search）
FUNCTIONAL_GROUPS: list[dict[str, str]] = [
    {"name": "carboxylic_acid", "label": "カルボン酸",       "smarts": "[CX3](=[OX1])[OX2H1]"},
    {"name": "ester",           "label": "エステル",         "smarts": "[#6][CX3](=[OX1])[OX2H0][#6]"},
    {"name": "amide",           "label": "アミド",           "smarts": "[NX3][CX3](=[OX1])[#6]"},
    {"name": "ketone",          "label": "ケトン",           "smarts": "[#6][CX3](=[OX1])[#6]"},
    {"name": "aldehyde",        "label": "アルデヒド",       "smarts": "[CX3H1](=[OX1])[#6]"},
    {"name": "alcohol",         "label": "アルコール",       "smarts": "[CX4][OX2H]"},
    {"name": "phenol",          "label": "フェノール",       "smarts": "[c][OX2H]"},
    {"name": "amine",           "label": "アミン",           "smarts": "[NX3;!$(NC=[O,S,N]);!$(N=*);!$([N+][O-]);!$(N[!#6;!#1])]"},
    {"name": "nitrile",         "label": "ニトリル",         "smarts": "[NX1]#[CX2]"},
    {"name": "nitro",           "label": "ニトロ",           "smarts": "[$([NX3](=[OX1])=[OX1]),$([NX3+](=[OX1])[O-])]"},
    {"name": "ether",           "label": "エーテル",         "smarts": "[OD2]([#6;!$(C=[O,N,S])])[#6;!$(C=[O,N,S])]"},
    {"name": "aryl_halide",     "label": "ハロゲン化アリール", "smarts": "[c][F,Cl,Br,I]"},
    {"name": "alkyl_halide",    "label": "ハロゲン化アルキル", "smarts": "[CX4][F,Cl,Br,I]"},
    {"name": "alkene",          "label": "アルケン",         "smarts": "[CX3]=[CX3]"},
    {"name": "alkyne",          "label": "アルキン",         "smarts": "[CX2]#[CX2]"},
    {"name": "boron",           "label": "ボロン酸 (エステル)", "smarts": "[#6][BX3]([OX2])[OX2]"},
    {"name": "sulfonamide",     "label": "スルホンアミド",   "smarts": "[SX4](=[OX1])(=[OX1])[NX3]"},
    {"name": "sulfonate_ester", "label": "スルホン酸エステル", "smarts": "[#6][OX2][SX4](=[OX1])(=[OX1])[#6]"},
    {"name": "boc",             "label": "Boc保護アミン",   "smarts": "[CX4]([CH3])([CH3])([CH3])[OX2][CX3](=[OX1])[NX3]"},
    {"name": "azide",           "label": "アジド",           "smarts": "[$([NX2-][NX2+]#[NX1]),$([NX2]=[NX2+]=[NX1-])]"},
]

FG_SMARTS: dict[str, str] = {g["name"]: g["smarts"] for g in FUNCTIONAL_GROUPS}

# 同じ SMILES を何度もパースしないようキャッシュする
@lru_cache(maxsize=4096)
def mol_from_smiles_cached(smiles: str):
    """SMILES から Mol を返す。解釈できなければ None"""
    return Chem.MolFromSmiles(smiles)

def parse_pattern(text: str):
    """検索クエリを部分構造マッチ用の Mol に変換する。解釈できなければ None

    SMARTS として読めなければ SMILES として読み直す。
    SMILES から作った Mol もパターンとして使える。
    """
    mol = Chem.MolFromSmarts(text)
    if mol is not None:
        return mol
    return Chem.MolFromSmiles(text)

def matches_substructure(smiles: str | None, pattern) -> bool:
    """smiles が pattern を部分構造として含むか判定する"""
    if smiles is None:
        return False
    mol = mol_from_smiles_cached(smiles)
    if mol is None:
        return False
    return mol.HasSubstructMatch(pattern)
