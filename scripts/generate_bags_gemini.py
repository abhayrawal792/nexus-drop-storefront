import os
from pathlib import Path
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
out = Path("/home/ubuntu/webdev-static-assets/nexus-drop")
out.mkdir(parents=True, exist_ok=True)

items = [
    ("metro-crossbody-bag.png", "compact black nylon metro crossbody messenger bag with a horizontal zip front pocket and wide adjustable strap"),
    ("utility-chest-pack.png", "black tactical utility chest pack with multiple compact zip compartments and visible webbing details"),
    ("shadow-daypack.png", "medium black minimalist daypack backpack with curved top zipper, front vertical pocket and padded straps"),
    ("mini-tech-pouch.png", "small black rectangular mini tech pouch with a short carry loop, zip closure and one subtle utility tab"),
    ("axis-duffel-bag.png", "black compact weekend duffel bag with structured body, top handles and a detachable shoulder strap"),
]

for filename, subject in items:
    prompt = f"""Create one exact premium ecommerce product photograph. The only product in the image must be: {subject}. Do not include jewelry, watches, sunglasses, people, hands, extra products, text, logos, or watermarks. Use a dark cyber-streetwear catalog style with an obsidian black studio background, low charcoal stone plinth, controlled electric-cyan rim lighting, realistic black material texture, centered composition, square 1:1 framing, clean commercial lighting, and enough margin around the entire product."""
    response = client.models.generate_content(model="models/gemini-3.1-flash-image", contents=prompt)
    saved = False
    for part in response.parts:
        if getattr(part, "inline_data", None):
            part.inline_data.data and Path(out / filename).write_bytes(part.inline_data.data)
            saved = True
            break
    if not saved:
        raise RuntimeError(f"Gemini returned no image for {filename}")
    print(f"saved {out / filename}")
