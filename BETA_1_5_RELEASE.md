# 3D Anatomy Atlas — Beta 1.5

## Interactive anatomical tree

Beta 1.5 adds a hierarchical navigation layer connecting skull regions, bones, canals, foramina and fissures.

### Main additions
- Anatomical tree with expandable sections.
- Neurocranium / viscerocranium grouping.
- Pathways grouped by bone/region.
- Selecting a tree node opens its existing anatomy card and focuses the 3D mesh when mapping exists.
- Passage records now carry an explicit `category: passage`.
- Hierarchy is stored separately in `data/hierarchy.json` for future expansion.

## Limitation
The tree expresses the curated educational database relationships; it does not claim that every listed structure is already mapped to the current external GLB asset.
