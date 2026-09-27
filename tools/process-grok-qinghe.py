"""Reproduce the Qinghe art pack from preserved Grok JPEGs; no generation/API calls.
Requires Pillow, numpy, scipy. Only writes the dedicated qinghe pack and its art previews.
"""
from pathlib import Path
import json
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'art/grok-qinghe/sources'
OUTPUT = ROOT / 'assets/resources/art-packs/qinghe'
OUTPUT.mkdir(parents=True, exist_ok=True)
PAPER = ROOT / 'assets/resources/art-packs/paper'
manifest = json.loads((PAPER / 'manifest.json').read_text(encoding='utf-8'))
for entry in manifest['images'].values():
    shutil.copyfile(PAPER / entry['file'], OUTPUT / entry['file'])
manifest.update(id='qinghe', name='清和田院 · Grok 水彩', clouds=False)
palette = dict(ink='#374b40', muted='#72765f', paper='#f2ead5', cream='#fff9e9', green='#496753', gold='#b69555', line='#d7caaa', status='#e7e7cd', caption='#536953', disabled='#dedbcb', warning='#936244', shade='#25392f', base='#c3cba8')
manifest['palette'] = palette

def cutout(image):
    """Remove near-white neutral matte; keep interior light-colored object surfaces.
    Alpha is estimated from edge color strength, then white contamination is removed.
    """
    rgb = np.asarray(image.convert('RGB')).astype(np.float32)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    strength = np.maximum((233-lo)/27, (hi-lo-5)/18)
    alpha = np.clip(strength, 0, 1)
    labels, count = ndimage.label(alpha > .12)
    sizes = np.bincount(labels.ravel())
    keep = sizes >= 18
    keep[0] = False
    alpha *= keep[labels]
    # A narrow partly transparent edge avoids a white halo against the darker meadow.
    edge = (alpha > .01) & (alpha < .98)
    unmatte = (rgb-248*(1-alpha[..., None])) / np.maximum(alpha[..., None], .1)
    rgb[edge] = np.clip(unmatte[edge], 0, 255)
    return Image.fromarray(np.dstack((rgb.clip(0,255),alpha*255)).astype('uint8'))

def trim(im, threshold=15):
    a = np.asarray(im.getchannel('A'))
    ys, xs = np.where(a > threshold)
    if not len(xs):
        raise ValueError('Empty extracted sprite')
    return im.crop((max(0,int(xs.min())-2),max(0,int(ys.min())-2),min(im.width,int(xs.max())+3),min(im.height,int(ys.max())+3)))

def save(im, name):
    im.save(OUTPUT / name, optimize=True)

background = Image.open(SOURCE / 'background.jpg').convert('RGB').resize((720,1280),Image.Resampling.LANCZOS)
save(background,'landscape.png')
house = trim(cutout(Image.open(SOURCE / 'cottage.jpg')))
house.thumbnail((570,515),Image.Resampling.LANCZOS)
house_canvas = Image.new('RGBA',(620,544))
house_canvas.alpha_composite(house,((620-house.width)//2,544-house.height-10))
save(house_canvas,'cottage.png')
shadow=Image.new('RGBA',(480,100));sd=ImageDraw.Draw(shadow)
sd.ellipse((32,25,448,70),fill='#35482f48');shadow=shadow.filter(ImageFilter.GaussianBlur(12))
save(shadow,'cottage-shadow.png')
manifest['images']['cottage.shadow']=dict(file='cottage-shadow.png',width=240,height=50)
manifest['scene'] = [dict(slot='landscape',x=0,y=0,width=720,height=1280),dict(slot='cottage.shadow',x=130,y=20),dict(slot='cottage',x=130,y=142,width=285,height=250)]

# Grok improved the wide-diamond projection, but exact grid dimensions still need normalization.
atlas = Image.open(SOURCE / 'terrain-corrected.jpg').convert('RGB')
cell_w, cell_h = atlas.width//3, atlas.height//2
tile_names = ['wild','fieldDry','fieldWet','water','tree','rock']
for i,name in enumerate(tile_names):
    row, col = divmod(i,3)
    tile = cutout(atlas.crop((col*cell_w,row*cell_h,(col+1)*cell_w,(row+1)*cell_h)))
    # Coordinates were inspected on this preserved 1248x832 source; scale proportionally if resized.
    x0, x1 = 7*cell_w/416, 409*cell_w/416
    top = (82 if row==0 else 70)*cell_h/416
    face_h = 260*cell_h/416
    height, extra = (200,56) if name=='tree' else (144,0)
    sx,sy = (x1-x0)/224,face_h/112
    result = tile.transform((232,height),Image.Transform.AFFINE,(sx,0,x0-4*sx,0,sy,top-(16+extra)*sy),resample=Image.Resampling.BICUBIC)
    save(result,f'terrain-{name}.png')
    manifest['images']['terrain.'+name] = dict(file=f'terrain-{name}.png',width=116,height=height/2,**({'y':14} if name=='tree' else {}))

wild = Image.open(OUTPUT/'terrain-wild.png').convert('RGBA')
unknown = ImageEnhance.Color(wild).enhance(.35)
unknown.putalpha(unknown.getchannel('A').point(lambda a:round(a*.6)))
d=ImageDraw.Draw(unknown)
for x in [94,116,138]:d.ellipse((x-3,70,x+3,76),fill='#f9f3dd')
save(unknown,'terrain-unknown.png')
story=wild.copy();d=ImageDraw.Draw(story);d.ellipse((109,44,123,58),fill=palette['gold'],outline=palette['cream'],width=2)
save(story,'terrain-story.png')
selection=Image.new('RGBA',(232,128));d=ImageDraw.Draw(selection)
d.line([(116,4),(228,64),(116,124),(4,64),(116,4)],fill='#fff1b8',width=5,joint='curve')
save(selection,'selection.png')

seedling=trim(cutout(Image.open(SOURCE/'seedling-corrected.jpg')))
crops=Image.open(SOURCE/'crops.jpg')
mature=trim(cutout(crops.crop((crops.width//2,0,crops.width,crops.height))))
for stage,plant,target in [('growing',seedling,(40,46)),('mature',mature,(49,78))]:
    plant.thumbnail(target,Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(232,200))
    # Three plants sit on the same field plane; imagery never invents a new growth rule.
    for x,y in [(78,148),(151,139),(116,162)]:
        canvas.alpha_composite(plant,(x-plant.width//2,y-plant.height))
    file=f'crop-wheat-{stage}.png';save(canvas,file)
    manifest['images'][f'crop.wheat.{stage}']=dict(file=file,width=116,height=100,y=20)

# UI chrome stays code-designed for predictable legibility. Texture is sampled from the AI sky.
texture=background.crop((210,5,510,205)).resize((128,128),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(1))
for role,fill in [('panel',palette['paper']),('card',palette['cream']),('primary',palette['green']),('disabled',palette['disabled']),('status',palette['status'])]:
    solid=Image.new('RGB',(128,128),fill)
    img=Image.blend(solid,texture,.12 if role!='primary' else .035).convert('RGBA')
    mask=Image.new('L',(128,128));md=ImageDraw.Draw(mask);md.rounded_rectangle((2,2,125,125),radius=23,fill=255)
    img.putalpha(mask);d=ImageDraw.Draw(img);d.rounded_rectangle((2,2,125,125),radius=23,outline=palette['line'] if role!='primary' else '#6e8464',width=2)
    save(img,'ui-'+role+'.png')
    manifest['images']['ui.'+role]=dict(file='ui-'+role+'.png',width=128,height=128,borders=[26,26,26,26])

# Retain the recognizable vector icons, recolor them to the new palette; they are not AI outputs.
for name in ['calendar','book','basket','leaf','rest','home','more']:
    icon=Image.open(PAPER/f'icon-{name}.png').convert('RGBA')
    colored=Image.new('RGBA',icon.size,palette['green']);colored.putalpha(icon.getchannel('A'))
    save(colored,f'icon-{name}.png')
icon_base=Image.new('RGBA',(152,152));d=ImageDraw.Draw(icon_base)
d.ellipse((6,12,146,151),fill='#344c3922');d.ellipse((6,4,146,144),fill=palette['paper'],outline=palette['gold'],width=2)
save(icon_base,'icon-background.png')

(OUTPUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
index_path=OUTPUT.parent/'index.json'
index=json.loads(index_path.read_text(encoding='utf-8'))
index['packs']=[dict(id='qinghe',name=manifest['name'])]+[p for p in index['packs'] if p['id']!='qinghe']
index_path.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# A contact sheet is an asset-delivery reference, not a gameplay screenshot.
sheet=Image.new('RGB',(1100,720),'#e7e4d5')
for i,name in enumerate(['cottage.png','terrain-wild.png','terrain-fieldDry.png','terrain-fieldWet.png','terrain-water.png','terrain-tree.png','terrain-rock.png','crop-wheat-growing.png','crop-wheat-mature.png']):
    im=Image.open(OUTPUT/name).convert('RGBA');im.thumbnail((290,210),Image.Resampling.LANCZOS)
    x=(i%3)*366+(366-im.width)//2;y=(i//3)*240+(240-im.height)//2
    sheet.paste(im,(x,y),im)
sheet.save(ROOT/'art/grok-qinghe/asset-contact-sheet.png')
print('Qinghe pack ready:',OUTPUT)
for file in SOURCE.glob('*.jpg'):
    with Image.open(file) as im:print(file.name,im.size)
