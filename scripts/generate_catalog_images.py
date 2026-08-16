"""Generate distinct, product-matched Nexus Drop catalog images with Gemini.

Run from the project root:
    python3 scripts/generate_catalog_images.py --limit 1

The script is resumable: existing image files are preserved, so a later run
only attempts missing assets. Images are intentionally stored outside the
project in the managed webdev-static-assets directory.
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

from google import genai
from google.genai import types


ASSET_DIR = Path("/home/ubuntu/webdev-static-assets/nexus-drop-catalog")

PRODUCTS = [
    ("cuban-chain", "a polished stainless-steel Cuban link chain necklace with a box clasp"),
    ("signet-ring", "a vintage silver-tone rectangular signet ring with a smooth sculpted face"),
    ("iced-tennis-bracelet", "a slim silver-tone tennis bracelet with small clear cubic-zirconia stones"),
    ("razor-pendant", "a brushed steel razor-blade pendant hanging from a fine curb chain"),
    ("curb-link-bracelet", "a chunky stainless-steel curb-link bracelet with a secure clasp"),
    ("steel-ear-cuff", "a single polished steel ear cuff with a clean open hoop silhouette"),
    ("chrono-watch", "a black stainless-steel chronograph wristwatch with three subdials and a black link bracelet"),
    ("minimal-square-watch", "a minimalist square-faced black wristwatch with a black leather strap"),
    ("blackout-field-watch", "a matte-black field wristwatch with a legible black dial and nylon NATO strap"),
    ("digital-sport-watch", "a black digital sport wristwatch with a rugged resin case and silicone strap"),
    ("steel-mesh-watch", "a slim black dress wristwatch with a matte black dial and dark steel mesh strap"),
    ("skeleton-dial-watch", "a black mechanical skeleton wristwatch with a visible open-work dial and steel bracelet"),
    ("cyberpunk-sunglasses", "angular wraparound black sunglasses with a narrow smoke visor lens"),
    ("smoke-oval-sunglasses", "small smoke-gray oval sunglasses with thin dark metal frames"),
    ("polarized-sport-wraps", "matte-black polarized sport wrap sunglasses with a curved single lens"),
    ("clear-frame-glasses", "transparent clear-frame fashion glasses with lightly tinted gray lenses"),
    ("matte-black-wayfarers", "matte-black wayfarer sunglasses with dark rectangular lenses"),
    ("chrome-shield-sunglasses", "futuristic chrome-framed shield sunglasses with one dark mirrored lens"),
    ("sling-bag", "a compact black nylon sling bag with an adjustable strap and front zip pocket"),
    ("tech-utility-crossbody", "a structured black technical crossbody bag with modular zip pockets and webbing details"),
    ("mini-messenger-bag", "a small charcoal canvas messenger bag with a flap closure and adjustable shoulder strap"),
    ("black-roll-top-backpack", "a compact black roll-top urban backpack with a buckle closure and padded shoulder straps"),
    ("canvas-tote-bag", "a sturdy black canvas tote bag with two short handles and one minimal exterior pocket"),
    ("compact-waist-pack", "a compact black waist pack with a curved shape, front zipper, and adjustable webbing belt"),
]


def prompt_for(subject: str) -> str:
    return f"""Create a premium e-commerce product photograph for Nexus Drop, a dark Gen-Z streetwear and accessories shop in Nepal.
Subject: exactly one product: {subject}. The product must be clearly recognizable from the description and physically plausible.
Composition: a square 1:1 product-card image. Place the product centered on a matte obsidian-black studio surface, with a three-quarter catalog photography angle, clear silhouette, sharp texture, and generous negative space around the object.
Style: realistic high-end studio product photography; soft controlled key light; a subtle electric-cyan rim accent at the far edge; deep charcoal background and natural contact shadow. The image must be directly usable in a premium online shop grid.
Text/content to render: no text.
Constraints: no people, no hands, no models, no packaging, no brand logos, no labels, no watermark, no additional products, no duplicate items, no unrelated accessories, no neon signs.
Avoid: blurry object, collage, busy background, distorted hardware, impossible straps or clasps, oversized product, typography, iconography."""


def write_image(response: object, destination: Path) -> bool:
    candidates = getattr(response, "candidates", []) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", []) if content else []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and getattr(inline_data, "data", None):
                destination.write_bytes(inline_data.data)
                return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Generate at most this many missing images; 0 generates all.")
    parser.add_argument("--model", default="gemini-2.5-flash-image", help="Gemini image model to use.")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=api_key)

    generated = 0
    for slug, subject in PRODUCTS:
        destination = ASSET_DIR / f"{slug}.png"
        if destination.exists() and destination.stat().st_size > 10_000:
            print(f"skip {slug}: already exists")
            continue
        if args.limit and generated >= args.limit:
            break
        print(f"generate {slug}")
        response = client.models.generate_content(
            model=args.model,
            contents=prompt_for(subject),
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
        if not write_image(response, destination):
            text = "".join(getattr(part, "text", "") or "" for candidate in (getattr(response, "candidates", []) or []) for part in (getattr(getattr(candidate, "content", None), "parts", []) or []))
            raise RuntimeError(f"Gemini returned no image for {slug}. Response text: {text[:500]}")
        generated += 1
        time.sleep(2)
        print(f"saved {destination}")
    print(f"completed {generated} generated image(s)")


if __name__ == "__main__":
    main()
