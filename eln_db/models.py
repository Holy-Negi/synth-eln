import enum
from datetime import datetime
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Compound(Base):
    __tablename__ = "compounds"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    smiles: Mapped[str]
    inchikey: Mapped[str] = mapped_column(unique=True)
    mw: Mapped[float | None]
    exact_mass: Mapped[float | None] 
    density: Mapped[float | None]
    logp: Mapped[float | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    components: Mapped[list["ReactionComponent"]] = relationship(back_populates="compound")
    
class Role(enum.Enum):
    reactant = "reactant"; reagent = "reagent"; solvent = "solvent"
    catalyst = "catalyst"; product = "product"

class ReactionComponent(Base):
    __tablename__ = "reaction_components"
    id: Mapped[int] = mapped_column(primary_key=True)
    reaction_id: Mapped[int] = mapped_column(ForeignKey("reactions.id"))
    compound_id: Mapped[int] = mapped_column(ForeignKey("compounds.id"))
    role: Mapped[Role]
    equiv: Mapped[float | None]
    yield_percent: Mapped[float | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    compound: Mapped["Compound"] = relationship(back_populates="components")
    reaction: Mapped["Reaction"] = relationship(back_populates="components")
    
class Reaction(Base):
    __tablename__ = "reactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    exp_code: Mapped[str] = mapped_column(unique=True)
    title: Mapped[str | None]   # 人間が覚えている名前（例: "鈴木カップリング 条件検討3"）
    date: Mapped[datetime]
    scale: Mapped[float]
    conc: Mapped[float]
    temperature: Mapped[float | None]
    duration_h: Mapped[float | None]
    note: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    components: Mapped[list["ReactionComponent"]] = relationship(
      back_populates="reaction",
      cascade="all, delete-orphan",
    )