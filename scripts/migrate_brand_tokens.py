#!/usr/bin/env python3
"""Phase 1 — Brand-token migration for Avito-to-Бартер refactor.

Strips dark: variants (handled by CSS vars via @theme inline),
replaces zinc/sky/cyan/emerald/amber/red/violet/slate legacy colors
with semantic shadcn tokens bound to Avito palette:
  - primary   → #00AAFF
  - secondary → #009F44
  - accent    → #FF6D00
  - destructive → red
  - muted / foreground / border / card / background
"""

from __future__ import annotations
import re
import sys
from pathlib import Path


def migrate(src: str) -> str:
    # 1) Strip dark: variants — CSS variables handle dark mode via @theme inline
    src = re.sub(r"\sdark:[A-Za-z0-9_:/\[\]\-.#]+", "", src)

    # 2) Collapse gradients to solid primary
    src = re.sub(r"bg-gradient-to-[brtl]+", "bg-primary", src)
    src = re.sub(r"\sfrom-(?:sky|cyan|slate|zinc|indigo|teal)-[0-9]+(?:/[0-9]+)?", "", src)
    src = re.sub(r"\sto-(?:sky|cyan|slate|zinc|indigo|teal)-[0-9]+(?:/[0-9]+)?", "", src)
    src = re.sub(r"\svia-(?:sky|cyan|slate|zinc|indigo|teal)-[0-9]+(?:/[0-9]+)?", "", src)

    # Arbitrary [#hex] gradient stops
    src = re.sub(r"\sfrom-\[#[0-9A-Fa-f]+\]", "", src)
    src = re.sub(r"\sto-\[#[0-9A-Fa-f]+\]", "", src)
    # Restrict class chars so we don't eat the closing `"` of the className attr
    _cls = r"[A-Za-z0-9_:/\[\]\-.#]+"
    src = re.sub(rf"\shover:from-{_cls}", "", src)
    src = re.sub(rf"\shover:to-{_cls}", "", src)
    src = re.sub(rf"\shover:via-{_cls}", "", src)
    src = re.sub(rf"\shover:bg-gradient-{_cls}", "", src)

    # 3) zinc → semantic
    zinc_pairs = [
        (r"\bbg-zinc-50(?:/[0-9]+)?\b", "bg-muted/50"),
        (r"\bbg-zinc-100(?:/[0-9]+)?\b", "bg-muted"),
        (r"\bbg-zinc-200(?:/[0-9]+)?\b", "bg-muted"),
        (r"\bbg-zinc-300(?:/[0-9]+)?\b", "bg-muted-foreground/30"),
        (r"\bbg-zinc-600(?:/[0-9]+)?\b", "bg-muted-foreground/40"),
        (r"\bbg-zinc-700(?:/[0-9]+)?\b", "bg-muted"),
        (r"\bbg-zinc-800(?:/[0-9]+)?\b", "bg-card"),
        (r"\bbg-zinc-900(?:/[0-9]+)?\b", "bg-card"),
        (r"\bbg-zinc-950(?:/[0-9]+)?\b", "bg-background"),
        (r"\bborder-zinc-100(?:/[0-9]+)?\b", "border-border"),
        (r"\bborder-zinc-200(?:/[0-9]+)?\b", "border-border"),
        (r"\bborder-zinc-300(?:/[0-9]+)?\b", "border-border"),
        (r"\bborder-zinc-600(?:/[0-9]+)?\b", "border-border"),
        (r"\bborder-zinc-700(?:/[0-9]+)?\b", "border-border"),
        (r"\bborder-zinc-800(?:/[0-9]+)?\b", "border-border"),
        (r"\bring-zinc-[0-9]+(?:/[0-9]+)?\b", "ring-border"),
        (r"\btext-zinc-100\b", "text-foreground"),
        (r"\btext-zinc-200\b", "text-foreground"),
        (r"\btext-zinc-300\b", "text-foreground"),
        (r"\btext-zinc-400\b", "text-muted-foreground"),
        (r"\btext-zinc-500\b", "text-muted-foreground"),
        (r"\btext-zinc-600\b", "text-muted-foreground"),
        (r"\btext-zinc-700\b", "text-foreground"),
        (r"\btext-zinc-800\b", "text-foreground"),
        (r"\btext-zinc-900\b", "text-foreground"),
        (r"\btext-zinc-950\b", "text-foreground"),
        (r"\bhover:bg-zinc-50(?:/[0-9]+)?\b", "hover:bg-muted/60"),
        (r"\bhover:bg-zinc-100(?:/[0-9]+)?\b", "hover:bg-muted"),
        (r"\bhover:bg-zinc-800(?:/[0-9]+)?\b", "hover:bg-muted"),
        (r"\bhover:border-zinc-[0-9]+(?:/[0-9]+)?\b", "hover:border-border"),
        (r"\bhover:text-zinc-[0-9]+\b", "hover:text-foreground"),
        (r"\bdivide-zinc-[0-9]+(?:/[0-9]+)?\b", "divide-border"),
        (r"\bplaceholder-zinc-[0-9]+(?:/[0-9]+)?\b", "placeholder:text-muted-foreground"),
        (r"\bplaceholder:text-zinc-[0-9]+\b", "placeholder:text-muted-foreground"),
    ]
    for pat, rep in zinc_pairs:
        src = re.sub(pat, rep, src)

    # 4) slate → semantic
    slate_pairs = [
        (r"\bbg-slate-50(?:/[0-9]+)?\b", "bg-muted/50"),
        (r"\bbg-slate-100(?:/[0-9]+)?\b", "bg-muted"),
        (r"\bborder-slate-[0-9]+(?:/[0-9]+)?\b", "border-border"),
        (r"\btext-slate-[0-9]+\b", "text-muted-foreground"),
        (r"\bhover:bg-slate-[0-9]+(?:/[0-9]+)?\b", "hover:bg-muted/60"),
    ]
    for pat, rep in slate_pairs:
        src = re.sub(pat, rep, src)

    # 5) sky / cyan → primary
    sky_pairs = [
        (r"\bbg-sky-(?:100|500|600|700)\b", "bg-primary"),
        (r"\bbg-sky-(?:50|100)/[0-9]+\b", "bg-primary/10"),
        (r"\bbg-sky-50\b", "bg-primary/10"),
        (r"\bbg-sky-950(?:/[0-9]+)?\b", "bg-primary/10"),
        (r"\bbg-cyan-(?:500|600|700)\b", "bg-primary"),
        (r"\bbg-cyan-[0-9]+(?:/[0-9]+)?\b", "bg-primary/10"),
        (r"\bborder-sky-[0-9]+(?:/[0-9]+)?\b", "border-primary/30"),
        (r"\bborder-cyan-[0-9]+(?:/[0-9]+)?\b", "border-primary/30"),
        (r"\bring-sky-[0-9]+(?:/[0-9]+)?\b", "ring-primary/30"),
        (r"\btext-sky-[0-9]+(?:/[0-9]+)?\b", "text-primary"),
        (r"\btext-cyan-[0-9]+\b", "text-primary"),
        (r"\bfocus:border-sky-[0-9]+\b", "focus:border-primary"),
        (r"\bfocus:ring-sky-[0-9]+/[0-9]+\b", "focus:ring-primary/20"),
        (r"\bfocus-visible:ring-sky-[0-9]+(?:/[0-9]+)?\b", "focus-visible:ring-primary/40"),
        (r"\bhover:border-sky-[0-9]+\b", "hover:border-primary/40"),
        (r"\bhover:bg-sky-[0-9]+(?:/[0-9]+)?\b", "hover:bg-primary/10"),
        (r"\bhover:bg-cyan-[0-9]+(?:/[0-9]+)?\b", "hover:bg-primary/10"),
        (r"\bhover:text-sky-[0-9]+\b", "hover:text-primary"),
        (r"\bshadow-sky-[0-9]+(?:/[0-9]+)?\b", "shadow-primary/20"),
    ]
    for pat, rep in sky_pairs:
        src = re.sub(pat, rep, src)

    # 6) red → destructive
    red_pairs = [
        (r"\bborder-red-[0-9]+(?:/[0-9]+)?\b", "border-destructive/30"),
        (r"\bbg-red-[0-9]+(?:/[0-9]+)?\b", "bg-destructive/10"),
        (r"\btext-red-[0-9]+\b", "text-destructive"),
        (r"\bhover:bg-red-[0-9]+(?:/[0-9]+)?\b", "hover:bg-destructive/15"),
        (r"\bhover:text-red-[0-9]+\b", "hover:text-destructive"),
        (r"\bhover:border-red-[0-9]+(?:/[0-9]+)?\b", "hover:border-destructive/50"),
    ]
    for pat, rep in red_pairs:
        src = re.sub(pat, rep, src)

    # 7) emerald → secondary
    em_pairs = [
        (r"\bborder-emerald-[0-9]+(?:/[0-9]+)?\b", "border-secondary/30"),
        (r"\bbg-emerald-[0-9]+(?:/[0-9]+)?\b", "bg-secondary/10"),
        (r"\btext-emerald-[0-9]+(?:/[0-9]+)?\b", "text-secondary"),
        (r"\bring-emerald-[0-9]+(?:/[0-9]+)?\b", "ring-secondary/30"),
        (r"\bhover:bg-emerald-[0-9]+(?:/[0-9]+)?\b", "hover:bg-secondary/15"),
        (r"\bhover:text-emerald-[0-9]+\b", "hover:text-secondary"),
    ]
    for pat, rep in em_pairs:
        src = re.sub(pat, rep, src)

    # 8) amber → accent (warning)
    am_pairs = [
        (r"\bborder-amber-[0-9]+(?:/[0-9]+)?\b", "border-accent/30"),
        (r"\bbg-amber-[0-9]+(?:/[0-9]+)?\b", "bg-accent/10"),
        (r"\btext-amber-[0-9]+(?:/[0-9]+)?\b", "text-accent"),
    ]
    for pat, rep in am_pairs:
        src = re.sub(pat, rep, src)

    # 9) violet / indigo → accent
    v_pairs = [
        (r"\bborder-(?:violet|indigo|fuchsia)-[0-9]+(?:/[0-9]+)?\b", "border-accent/30"),
        (r"\bbg-(?:violet|indigo|fuchsia)-[0-9]+(?:/[0-9]+)?\b", "bg-accent/10"),
        (r"\btext-(?:violet|indigo|fuchsia)-[0-9]+\b", "text-accent"),
        (r"\bfocus:border-(?:violet|indigo|fuchsia)-[0-9]+\b", "focus:border-accent"),
        (r"\bfocus:ring-(?:violet|indigo|fuchsia)-[0-9]+/[0-9]+\b", "focus:ring-accent/20"),
        (r"\bring-(?:violet|indigo|fuchsia)-[0-9]+(?:/[0-9]+)?\b", "ring-accent/30"),
    ]
    for pat, rep in v_pairs:
        src = re.sub(pat, rep, src)

    # 10) misc cleanup — bg-white → bg-card, text-white stays (used on primary/accent bg)
    src = re.sub(r"\bbg-white\b", "bg-card", src)
    # But NOT inside gradients or badges; this is safe for settings-like pages

    # 11) Normalize className whitespace
    def _clean(m: re.Match[str]) -> str:
        inner = re.sub(r"\s+", " ", m.group(1)).strip()
        return f'className="{inner}"'

    src = re.sub(r'className="([^"]*)"', _clean, src)
    # template-literal className
    src = re.sub(r"className=\{`([^`]*)`\}", lambda m: "className={`" + re.sub(r"[ \t]+", " ", m.group(1)) + "`}", src)

    return src


def main(paths: list[str]) -> int:
    for p in paths:
        path = Path(p)
        if not path.is_file():
            print(f"skip (not a file): {p}", file=sys.stderr)
            continue
        orig = path.read_text()
        new = migrate(orig)
        if new == orig:
            print(f"= {p}")
            continue
        path.write_text(new)
        print(f"+ {p}  ({len(orig)-len(new):+d} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
