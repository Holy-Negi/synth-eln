from rdkit import Chem
from rdkit.Chem import Descriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem import AllChem

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