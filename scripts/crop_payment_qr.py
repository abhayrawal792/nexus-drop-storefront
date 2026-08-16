from pathlib import Path
from PIL import Image

asset_dir = Path('/home/ubuntu/webdev-static-assets/nexus-drop')

# Keep the QR and the identifying provider/receiver text; remove excess empty margins.
crops = {
    'esewa-qr.png': ((105, 105, 890, 1240), 'esewa-qr-cropped.png'),
    'global-ime-bank-qr.jpeg': ((170, 300, 835, 1435), 'global-ime-bank-qr-cropped.jpeg'),
}
for source_name, (box, output_name) in crops.items():
    source = Image.open(asset_dir / source_name)
    cropped = source.crop(box)
    cropped.save(asset_dir / output_name, optimize=True)
    print(f'{source_name} -> {output_name}: {cropped.size}')
