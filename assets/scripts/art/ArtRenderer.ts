import { Color, Graphics, Node, Sprite, UITransform } from 'cc';
import { ArtPack } from './ArtPack';

export const tint=(hex:string,alpha=255)=>{const c=new Color().fromHEX(hex);c.a=alpha;return c;};
export function visualNode(name:string,parent:Node,x=0,y=0,w=0,h=0){const n=new Node(name);n.layer=parent.layer;n.parent=parent;n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);return n;}

/** Owns images and fallback UI surfaces; contains no gameplay or action handlers. */
export class ArtRenderer {
  constructor(public pack:ArtPack){}
  get palette(){return this.pack.manifest.palette;}
  image(slot:string,parent:Node,x=0,y=0,width?:number,height?:number):Node|null {
    const spec=this.pack.manifest.images[slot],frame=this.pack.frames.get(slot);
    if(!spec||!frame)return null;
    let w=width??spec.width,h=height??spec.height;
    if(spec.fit==='contain'){const scale=Math.min(w/frame.rect.width,h/frame.rect.height);w=frame.rect.width*scale;h=frame.rect.height*scale;}
    const n=visualNode(slot,parent,x+(spec.x??0),y+(spec.y??0),w,h);
    const sp=n.addComponent(Sprite);sp.spriteFrame=frame;sp.sizeMode=Sprite.SizeMode.CUSTOM;
    sp.type=spec.borders?Sprite.Type.SLICED:Sprite.Type.SIMPLE;
    // Assigning a SpriteFrame may reset the transform to its source size.
    n.getComponent(UITransform)!.setContentSize(w,h);
    return n;
  }
  /** Image slots can override each surface; palette-based shapes remain a safe text-friendly fallback. */
  surface(n:Node,w:number,h:number,fill:string,r=18,stroke?:string,slot?:string){
    const C=this.palette;
    const role=slot??(fill===C.green?'ui.primary':fill===C.cream?'ui.card':fill===C.disabled?'ui.disabled':fill===C.status?'ui.status':'ui.panel');
    if(this.image(role,n,0,0,w,h))return;
    const g=n.addComponent(Graphics);g.fillColor=tint(fill);g.roundRect(-w/2,-h/2,w,h,r);g.fill();if(stroke){g.strokeColor=tint(stroke);g.lineWidth=2;g.stroke();}
  }
  shade(n:Node,w:number,h:number){const g=n.addComponent(Graphics);g.fillColor=tint(this.palette.shade,130);g.rect(-w/2,-h/2,w,h);g.fill();}
}
