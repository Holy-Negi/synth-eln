from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem import AllChem
from functools import lru_cache
import logging
import re

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

# --- 反応式の描画 ------------------------------------------------------------
# MolDraw2DSVG は中身をアスペクト比のままキャンバス中央に置く。
# 辺に -1 を渡すとその辺を中身に合わせて自動計算する

# 矢印の上に描く agent（reagent / catalyst / solvent）が収まる高さの倍率
AGENT_HEADROOM = 1.4
# 自動サイズが失敗したときの高さ。幅は自動計算のまま
FALLBACK_HEIGHT = 140
# 高さ固定でも失敗したときのサイズ
FALLBACK_SIZE = (450, 150)

# SVG ヘッダーの width='661px' height='66px' を取り出す
_SVG_SIZE_RE = re.compile(r"width='([\d.]+)px'\s+height='([\d.]+)px'")

logger = logging.getLogger(__name__)


def _draw_reaction(reaction_smiles: str, width: int, height: int) -> str:
    """指定サイズで反応式 SVG を描く。-1 を渡した辺は自動計算される。

    DrawReaction は反応オブジェクトに 2D 座標を書き込むため、毎回 SMILES から作り直す。
    """
    rxn = AllChem.ReactionFromSmarts(reaction_smiles, useSmiles=True)
    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    drawer.DrawReaction(rxn)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def render_reaction_svg(reaction_smiles: str) -> str | None:
    # ReactionFromSmarts は解釈できない文字列に対して None ではなく ValueError を投げる。
    # 呼び出し側が 422 に変換できるよう None に揃える
    try:
        if AllChem.ReactionFromSmarts(reaction_smiles, useSmiles=True) is None:
            return None
    except ValueError as e:
        logger.warning("反応式として解釈できません: %s (%s)", reaction_smiles, e)
        return None

    # 1 パス目: 中身に合うサイズの測定のみに使う（描画結果は捨てる）
    try:
        probe = _draw_reaction(reaction_smiles, -1, -1)
        size = _SVG_SIZE_RE.search(probe)
        if size is None:
            raise RuntimeError(f"SVG ヘッダーからサイズを読めません: {probe[:200]}")
        width = int(float(size.group(1)))
        height = int(float(size.group(2)) * AGENT_HEADROOM)
        if width <= 0 or height <= 0:
            raise RuntimeError(f"自動サイズが不正です: {width}x{height}")
        # 2 パス目: -1 指定では背景の白い矩形が width='-1' となり描かれないため、
        # 測ったサイズを明示して描き直す
        return _draw_reaction(reaction_smiles, width, height)
    except (RuntimeError, ValueError) as e:
        # 立体を持つ agent などでは自動サイズが RuntimeError
        # ("Cannot normalize a zero length vector") になる。高さ固定に切り替える
        logger.warning("反応式の自動サイズ描画に失敗したため高さ固定で描きます: %s", e)

    try:
        return _draw_reaction(reaction_smiles, -1, FALLBACK_HEIGHT)
    except (RuntimeError, ValueError) as e:
        logger.warning("高さ固定でも失敗したため固定サイズで描きます: %s", e)
        return _draw_reaction(reaction_smiles, *FALLBACK_SIZE)


def largest_fragment_smiles(smiles: str) -> str:
    """複数フラグメントを含む SMILES から、重原子数が最大のものだけを返す。

    水和物・対イオン（例: Na3PO4・12H2O）を除いた本体を得るための、描画用の処理。
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        # 解釈できない SMILES は描画側で弾かれるため、そのまま返す
        return smiles
    frags = Chem.GetMolFrags(mol, asMols=True, sanitizeFrags=False)
    if not frags:
        return smiles
    return Chem.MolToSmiles(max(frags, key=lambda f: f.GetNumHeavyAtoms()))


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
