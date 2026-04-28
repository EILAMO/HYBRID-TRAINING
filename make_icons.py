from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('/home/claude/apex-app/icons', exist_ok=True)

for size in [192, 512]:
    img = Image.new('RGB', (size, size), '#080808')
    draw = ImageDraw.Draw(img)
    # Gold border
    bw = max(2, size // 64)
    draw.rectangle([bw, bw, size-bw, size-bw], outline='#c8a96a', width=bw)
    # Text APEX
    fs = size // 4
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', fs)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0,0), 'APEX', font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    draw.text(((size-tw)//2, (size-th)//2), 'APEX', fill='#c8a96a', font=font)
    img.save(f'/home/claude/apex-app/icons/icon-{size}.png')
    print(f'Created icon-{size}.png')

print('Icons done')
