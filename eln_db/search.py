# ===== 構造検索 =====
#   HTTP からも DB からも独立させ、検索の組み立てだけを担当する。
#   SQL で絞り込んだ結果を受け取り、RDKit で部分構造マッチをかける。
from collections.abc import Sequence

from models import Compound, Reaction, Role
from chemistry import FG_SMARTS, parse_pattern, matches_substructure


class SearchQueryError(ValueError):
    """検索クエリが解釈できないときに投げる例外"""


def resolve_patterns(substructure: str | None, fg: str | None) -> list:
    """検索クエリを RDKit のパターン (Mol) のリストに変換する

    Args:
        substructure: 手入力の SMARTS または SMILES
        fg: FUNCTIONAL_GROUPS の name
    Returns:
        パターンのリスト。どちらも未指定なら空リスト
    Raises:
        SearchQueryError: プリセット名が未知、またはクエリを解釈できないとき
    """
    queries: list[str] = []
    if fg:
        if fg not in FG_SMARTS:
            raise SearchQueryError(f"unknown functional group: {fg}")
        queries.append(FG_SMARTS[fg])
    if substructure and substructure.strip():
        queries.append(substructure.strip())

    patterns = []
    for q in queries:
        mol = parse_pattern(q)
        if mol is None:
            raise SearchQueryError(f"invalid substructure query: {q}")
        patterns.append(mol)
    return patterns


def filter_compounds(compounds: Sequence[Compound], patterns: list) -> list[Compound]:
    """すべてのパターンを部分構造として含む化合物だけを残す"""
    if not patterns:
        return list(compounds)
    return [
        c for c in compounds
        if all(matches_substructure(c.smiles, p) for p in patterns)
    ]


def filter_reactions(reactions: Sequence[Reaction], patterns: list,
                     role: Role | None = None) -> list[Reaction]:
    """すべてのパターンを満たす反応だけを残す

    パターンごとに「いずれかの成分が一致すればよい」判定なので、
    別々の成分が別々のパターンを満たしてもよい。
    fg=boron と substructure=aryl halide で Suzuki カップリングが引ける。

    Args:
        role: 指定するとその役割の成分だけを判定対象にする
    """
    if not patterns:
        return list(reactions)

    def hits(reaction: Reaction) -> bool:
        targets = reaction.components
        if role is not None:
            targets = [c for c in targets if c.role == role]
        return all(
            any(matches_substructure(c.compound.smiles, p) for c in targets)
            for p in patterns
        )

    return [r for r in reactions if hits(r)]
