"""Second art iteration: one continuous landscape, with state-only feathered decals."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parent.parent
PACK=ROOT/'assets/resources/art-packs/qinghe'
SOURCE=ROOT/'art/grok-qinghe/sources/integrated-scene.jpg'
m=json.loads((PACK/'manifest.json').read_text(encoding='utf-8'))
Image.open(SOURCE).convert('RGB').save(PACK/'landscape-continuous.png',optimize=True)
m['images']['landscape']=dict(file='landscape-continuous.png',width=864,height=1536)
m['groundMode']='continuous'
m['scene']=[dict(slot='landscape',x=0,y=0,width=864,height=1536)]
m['clouds']=False
m['name']='清和田院 · 连续场景'

# Only changed ground is overlaid. No wild/unknown diamond slabs or permanent tile grid.
# Inner texture survives; the raised border is removed, edges fade into the common landscape.
for name in ['fieldDry','fieldWet','water','story','rock','tree']:
    im=Image.open(PACK/f'terrain-{name}.png').convert('RGBA')
    data=np.array(im)
    h,w=data.shape[:2]
    yy,xx=np.mgrid[0:h,0:w]
    cy=128 if name=='tree' else 72
    radius=((xx-w/2)/(w*.47))**2+((yy-cy)/51)**2
    feather=np.clip((1-radius)/.48,0,1)
    # Keep a tree's upper silhouette while softly merging the surrounding ground.
    if name=='tree':feather=np.maximum(feather,np.clip((cy-yy-18)/30,0,1))
    alpha=np.minimum(data[:,:,3].astype(float),feather*255)
    if name.startswith('field'):
        # Preserve only the furrow strokes, not the rectangular/diamond soil slab.
        gray=np.array(im.convert('L')).astype(float)
        smooth=np.array(im.convert('L').filter(ImageFilter.GaussianBlur(3))).astype(float)
        ink=np.clip((smooth-gray-1)/14,0,1)
        alpha*=ink*.88
        data[:,:,:3]=[119,93,60] if name=='fieldDry' else [92,80,61]
    elif name=='story':
        # A small event pin has no ground texture underneath it.
        alpha[:]=0
    else:
        alpha*=.72
    data[:,:,3]=alpha.astype('uint8')
    file=f'surface-{name}.png';Image.fromarray(data).save(PACK/file,optimize=True)
    m['images']['surface.'+name]=dict(file=file,width=116,height=h/2,**({'y':14} if name=='tree' else {}))

pin=Image.new('RGBA',(40,48));d=ImageDraw.Draw(pin)
d.ellipse((12,9,28,25),fill='#d0b276',outline='#f7efd4',width=2)
d.line((20,25,20,37),fill='#8b805b',width=2)
pin.save(PACK/'surface-story.png',optimize=True)
m['images']['surface.story']=dict(file='surface-story.png',width=20,height=24,y=9)

# A small ground cursor replaces the full yellow diamond outline.
ring=Image.new('RGBA',(232,128));d=ImageDraw.Draw(ring)
for start,end in [(12,78),(102,168),(192,258),(282,348)]:
    d.arc((67,39,165,89),start,end,fill='#fff4cd',width=4)
    d.arc((65,37,167,91),start,end,fill='#af9258',width=2)
ring.save(PACK/'selection-continuous.png',optimize=True)
m['images']['selection']=dict(file='selection-continuous.png',width=116,height=64)
(PACK/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index=PACK.parent/'index.json';catalog=json.loads(index.read_text(encoding='utf-8'))
for entry in catalog['packs']:
    if entry['id']=='qinghe':entry['name']=m['name']
index.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Continuous Qinghe scene exported.')
