import os
from pathlib import Path
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
result = client.models.generate_images(
    model="imagen-4.0-fast-generate-001",
    prompt="One premium ecommerce product photograph: a compact black nylon metro crossbody messenger bag with horizontal zip pocket and wide adjustable strap, alone on a charcoal stone plinth, obsidian black background, subtle electric cyan rim lighting, realistic material, centered square composition, no people, no hands, no text, no logos, no watermark.",
    config={"number_of_images": 1, "output_mime_type": "image/png"},
)
image = result.generated_images[0].image
Path("/home/ubuntu/webdev-static-assets/nexus-drop/metro-crossbody-bag.png").write_bytes(image.image_bytes)
print("saved")
