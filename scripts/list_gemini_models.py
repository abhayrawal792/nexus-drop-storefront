import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
for model in client.models.list():
    name = getattr(model, "name", "")
    methods = getattr(model, "supported_generation_methods", None)
    if "image" in name.lower() or (methods and any("image" in str(method).lower() for method in methods)):
        print(name, methods)
