"""Extract Grok image sheets; keep pale enclosed highlights, remove neutral backgrounds."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'assets/resources/art-packs/qinghe'
manifest_path = PACK / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
names = ['basket','market','book','lotus','calendar','list','rest','settings','food','coin','pressure','sun','hoe','water','target','info']
icons = []
farm_names = ['crop-wheat','crop-soy','crop-flax','crop-rice','crop-millet','crop-adzuki','crop-mallow','crop-mustard','seed','sickle','compost','spade','wood','clay','flour','straw']
for filename, grid, labels in [('painted-ui-icons.jpg',4,names),('painted-weather-icons.jpg',2,['rain','snow','wind','cloud']),('painted-farm-icons.jpg',4,farm_names)]:
    sheet = Image.open(ROOT / 'art/grok-qinghe/sources' / filename).convert('RGB')
    for i, name in enumerate(labels):
        w,h = sheet.size; x,y = i%grid*w//grid,i//grid*h//grid
        rgb = np.asarray(sheet.crop((x,y,x+w//grid,y+h//grid))).astype(float)
        lo,hi = rgb.min(2),rgb.max(2)
        neutral = (lo>180)&((hi-lo)<19)
        outside = ndimage.binary_propagation(np.pad(np.ones((rgb.shape[0]-2,rgb.shape[1]-2),bool),1)==False, mask=neutral)
        mask = ~outside
        components,n = ndimage.label(mask)
        sizes = np.bincount(components.ravel()); sizes[0]=0
        mask = sizes[components]>24
        alpha = ndimage.gaussian_filter(mask.astype(float),.45)
        rgba = np.dstack([rgb,np.uint8(alpha*255)]).astype('uint8')
        im = Image.fromarray(rgba); bbox=Image.fromarray(np.uint8(mask*255)).getbbox()
        im=im.crop(bbox); im.thumbnail((220,220),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(im,((256-im.width)//2,(256-im.height)//2))
        canvas.save(PACK / f'painted-{name}.png')
        manifest['images']['icon.'+name]={'file':f'painted-{name}.png','width':64,'height':64}
        icons.append((name,canvas))
# Optional symbols used by secondary panels share generated source images.
for alias,original in [('leaf','hoe'),('more','settings'),('home','market')]:
    manifest['images']['icon.'+alias]=manifest['images']['icon.'+original].copy()
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
preview=Image.new('RGB',(1000,((len(icons)+4)//5)*150),'#dfdcc9');draw=ImageDraw.Draw(preview)
for i,(name,im) in enumerate(icons):
    x,y=i%5*200,i//5*150
    thumb=im.resize((128,128),Image.Resampling.LANCZOS)
    preview.paste(thumb,(x+36,y),thumb);draw.text((x+65,y+128),name,fill='#374b40')
preview.save(ROOT / 'art/grok-qinghe/painted-icons-contact.png')
