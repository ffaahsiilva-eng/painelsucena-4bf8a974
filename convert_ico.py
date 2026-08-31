import os
from PIL import Image

ico_path = 'Sucenaicon/icon.ico'
os.makedirs('assets', exist_ok=True)

img = Image.open(ico_path)
img.save('assets/icon.png')
# Copia o icone como splash tambem caso necessario (geralmente capacitor-assets usa icon.png pra splash se splash não existir ou usa o próprio)
img.save('assets/splash.png')

print('Icon converted and saved to assets/')
