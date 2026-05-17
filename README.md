# Tierra — Browser-based Artificial Life

A single-file, browser-based artificial life simulator inspired by **Tierra**, the seminal digital evolution system created by Thomas Ray in the early 1990s. Self-replicating programs written in a 32-instruction virtual machine compete for CPU time and memory; bit-flip mutations and natural selection drive open-ended evolution — parasites, hyper-parasites, and degenerate replicators all emerge unprompted.

**🔗 Live demo:** [asari-mtr.github.io/tierra](https://asari-mtr.github.io/tierra/)

**🌐 [日本語版 README](./README.ja.md)**

---

## Background

Tierra was originally designed by Thomas S. Ray to study Darwinian evolution in a digital substrate. A 61-byte ancestor placed in a shared memory "soup" replicates by finding its own code, allocating memory, and copying itself. Random bit flips during copying and "cosmic ray" noise in idle memory provide variation; the Reaper culls older, error-prone creatures when memory fills up.

References:
- Ray, T. S. (1991). [*An Approach to the Synthesis of Life*](https://tomray.me/pubs/zen/Approach.pdf). *Artificial Life II*, SFI Studies in the Sciences of Complexity, 11, pp. 371–408.
- [Tomray.me — Tierra publications](https://tomray.me/tierra-pubs)
- [Wikipedia — Tierra (computer simulation)](https://en.wikipedia.org/wiki/Tierra_(computer_simulation))

## Differences from the original Tierra

This implementation faithfully reproduces the core dynamics (template-based addressing, the Slicer for proportional CPU time, the Reaper, parasitism via host copy machinery) but is **deliberately simplified for visualization and accessibility**, not for research. Notable differences:

| Aspect | Original Tierra | This implementation |
| --- | --- | --- |
| Instruction set | 32 ops, addressed by 5-bit templates | Same — 32 ops, 4-bit templates (NOP0/NOP1 pairs) |
| Memory size | Configurable (typ. 60k+ bytes) | Fixed 144 × 128 = 18,432 bytes (toroidal) |
| Mutation | Copy bit-flips + cosmic rays + flaws | Copy bit-flips + cosmic rays only |
| Viability check | Implicit | Daughter must contain at least one `DIVIDE` (prevents trivial degenerates) |
| Genebank | Disk-based archive of long-lived genomes | In-browser localStorage "Hall of Fame" |
| UI | Custom analyzer (`x11` clients) | Single-page HTML with canvas + DOM panels |
| Stagnation rescue | None | Auto-cull + ancestor re-injection if no births for N ticks |
| Comparison view | None | Side-by-side LCS-diff between any two genomes |
| Distribution | Compiled C, multi-process | Single `index.html`, runs entirely client-side |

## Features

- **Live memory visualization** — every byte of the soup is rendered as one pixel, colored by instruction. Owned regions are bright, unowned (free) regions are dimmed. Click any pixel to inspect the creature occupying that cell.
- **Hue-shifting palette** — the instruction color palette slowly rotates over time, just for visual flavor.
- **Creature list** — grouped by genome and category (self-replicator / parasite / degenerate), sorted by population.
- **Inspector panel** — selected creature shows category, parasitism ratio (cycles spent reading memory outside its own region), full register state, IP, lineage (child → ancestor), and disassembled genome.
- **Genome comparison** — click rows in the lineage list to add them to a side-by-side comparison view; for two genomes, an LCS-based diff highlights insertions, deletions, and substitutions in `git diff` style.
- **Hall of Fame** — auto-records long-lived, prolific genomes (lifespan ≥ 300 ticks, reproductions ≥ 5, length ≤ 55) to `localStorage`. Re-inject them into a fresh soup at any time. Export/import as JSON.
- **Custom genome injection** — paste a JSON array or comma-separated OP-name list to add your own organism, or seed a fresh simulation with a single custom genome.
- **Adjustable rates** — copy-error rate, cosmic-ray rate, and execution speed are all live sliders.
- **Bilingual UI** — switch between English and 日本語 from the header.

## Instruction set

Each cell stores a 5-bit opcode (0–31). Template-based addressing uses `NOP0`/`NOP1` pairs as bit patterns that other instructions search for. All arithmetic uses three integer registers (`ax`, `bx`, `cx`), a destination register (`dx`), and a small operand stack.

| Code | Mnemonic | Effect |
| ---: | --- | --- |
| 0 | `NOP0` | No-op, also acts as template bit `0` |
| 1 | `NOP1` | No-op, template bit `1` |
| 2 | `ZERO` | `cx = 0` |
| 3 | `OR1` | `cx |= 1` |
| 4 | `SHL` | `cx <<= 1` (shift left, single-bit constant builder) |
| 5 | `INC_A` | `ax++` |
| 6 | `INC_B` | `bx++` |
| 7 | `INC_C` | `cx++` |
| 8 | `DEC_C` | `cx--` |
| 9 | `IFZ` | execute next instruction only if `cx == 0` |
| 10 | `IFNZ` | execute next instruction only if `cx != 0` |
| 11 | `SUB_BA` | `cx = bx - ax` |
| 12 | `MOV_AB` | `mem[bx] = mem[ax]` — **the copy primitive**, subject to bit-flip mutation |
| 13–16 | `PUSH_A/B/C/D` | push register onto stack |
| 17–20 | `POP_A/B/C/D` | pop stack into register |
| 21 | `JMP_F` | search forward for a complementary template, jump there |
| 22 | `JMP_B` | search backward for a complementary template, jump there |
| 23 | `CALL` | push return address, jump (template-addressed) |
| 24 | `RET` | pop return address, jump to it |
| 25 | `ADR_F` | search forward, write template position to `ax` |
| 26 | `ADR_B` | search backward, write template position to `ax` |
| 27 | `MAL` | allocate `cx` bytes of free memory, write start to `dx` |
| 28 | `DIVIDE` | release allocated region as a new creature |
| 29–31 | `NOP_X1/X2/X3` | reserved no-ops (mutation absorbers) |

Templates are short `NOP0`/`NOP1` sequences; the search instructions (`JMP_*`, `ADR_*`, `CALL`) look for the *complementary* template, so a creature can find references inside its own code by reading the local template pattern.

## Running locally

No build step, no dependencies. Just open `index.html` in any modern browser, or:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## License

MIT — see [LICENSE](./LICENSE). Use it, fork it, mutate it.

## Acknowledgments

- Thomas S. Ray for inventing Tierra and publishing it openly.
- Built collaboratively with [Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4) via [Claude Code](https://www.anthropic.com/claude-code).
