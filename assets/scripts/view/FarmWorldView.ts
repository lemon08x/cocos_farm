import { Node, tween, Vec3, Tween, Graphics, Label, UITransform } from 'cc';
import { ArtRenderer, visualNode, tint } from '../art/ArtRenderer';
import { plotName } from './FarmPresentation';

/** Geometry is a UI concern, independent of replacement image bounds. */
export const MAP_LAYOUT={stepX:58,stepY:31,originY:130,hitX:58,hitY:30};
export class FarmWorldView {
  private plots=new Map<string,{node:Node;key:string;x:number;y:number}>();
  private clouds:Node[]=[];
  constructor(private base:Node,private map:Node,private art:ArtRenderer){}
  get continuous(){return this.art.pack.manifest.groundMode==='continuous';}
  get panLimits(){return this.continuous?{x:72,y:110}:{x:800,y:700};}
  setArt(art:ArtRenderer){this.art=art;this.background();for(const p of Array.from(this.plots.values()))p.key='';}
  background(){
    for(const n of this.clouds)Tween.stopAllByTarget(n);this.clouds=[];
    this.clear(this.base);
    const height=this.base.getComponent(UITransform)!.height;
    const backdrop=visualNode('Backdrop',this.base,0,0,720,height),g=backdrop.addComponent(Graphics);
    g.fillColor=tint(this.art.palette.base);g.rect(-360,-height/2,720,height);g.fill();
    for(const l of this.art.pack.manifest.scene){
      const spec=this.art.pack.manifest.images[l.slot];
      const scale=this.continuous&&l.slot==='landscape'?Math.max(1,(height+220)/(l.height??spec.height)):1;
      this.art.image(l.slot,this.base,l.x,l.y,(l.width??spec.width)*scale,(l.height??spec.height)*scale);
    }
    if(this.art.pack.manifest.clouds)for(let i=0;i<3;i++){
      const n=this.art.image('cloud',this.base,-230+i*240,330-i*45);
      if(n){this.clouds.push(n);tween(n).by(16+i*5,{position:new Vec3(35,0,0)}).by(16+i*5,{position:new Vec3(-35,0,0)}).union().repeatForever().start();}
    }
  }
  render(observedPlots:any[],selected:string,panX:number,panY:number){
    // In a continuous scene the backdrop and invisible plot regions share the same camera.
    this.base.setPosition(this.continuous?panX:0,this.continuous?panY:0,0);
    const visible=observedPlots.filter(p=>p.kind!=='unknown'||p.reachable).sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    const ids=new Set(visible.map(p=>p.id));
    for(const [id,e]of Array.from(this.plots)){if(!ids.has(id)){Tween.stopAllByTarget(e.node);e.node.destroy();this.plots.delete(id);}}
    visible.forEach((p,index)=>{
      const x=(p.x-p.y)*MAP_LAYOUT.stepX+panX,y=(this.continuous?0:MAP_LAYOUT.originY)-(p.x+p.y-2)*MAP_LAYOUT.stepY+panY;
      const key=JSON.stringify([p.kind,p.field,p.land?.water,p.maturity?.days<=0,p.id===selected]);
      let e=this.plots.get(p.id);
      if(!e){e={node:visualNode('Plot '+p.id,this.map,x,y,116,62),key:'',x,y};this.plots.set(p.id,e);}
      e.x=x;e.y=y;e.node.setPosition(x,y);e.node.setSiblingIndex(index);
      if(e.key===key)return;e.key=key;this.clear(e.node);
      let terrain=p.kind==='field'?(p.land?.water>=2?'fieldWet':'fieldDry'):p.kind;
      if(!this.art.pack.manifest.images['terrain.'+terrain])terrain='wild';
      if(this.continuous){this.art.image('surface.'+terrain,e.node);}
      else this.art.image('terrain.'+terrain,e.node);
      if(p.field?.crop){const stage=(p.maturity?.days??999)<=0?'mature':'growing';const specific=`crop.${p.field.crop}.${stage}`;this.art.image(this.art.pack.frames.has(specific)?specific:`crop.default.${stage}`,e.node);}
      if(p.kind==='field'||p.id===selected){
        const outline=visualNode('Field boundary',e.node),g=outline.addComponent(Graphics);
        g.strokeColor=tint(p.id===selected?this.art.palette.green:this.art.palette.caption,p.id===selected?255:150);
        g.lineWidth=p.id===selected?5:2;
        g.moveTo(-57,0);g.lineTo(0,30);g.lineTo(57,0);g.lineTo(0,-30);g.close();g.stroke();
      }
      if(p.id===selected){
        const marker=visualNode('Selected field name',e.node,0,61,184,46);this.art.surface(marker,184,46,this.art.palette.paper,12);
        const caption=visualNode('Name',marker,0,0,180,42),label=caption.addComponent(Label);label.string=plotName(p.id);label.fontSize=25;label.lineHeight=32;label.color=tint(this.art.palette.ink);
      }
      if(p.field?.crop&&(p.maturity?.days??1)<=0)this.art.image('icon.sickle',e.node,44,31,38,38);
    });
  }
  hit(x:number,y:number):string|null{let selected=null;for(const[id,p]of Array.from(this.plots))if(Math.abs(x-p.x)/MAP_LAYOUT.hitX+Math.abs(y-p.y)/MAP_LAYOUT.hitY<=1)selected=id;return selected;}
  pulse(id:string){const e=this.plots.get(id);if(!e)return;Tween.stopAllByTarget(e.node);e.node.setScale(1,1,1);tween(e.node).to(.15,{scale:new Vec3(1.06,1.06,1)}).to(.25,{scale:new Vec3(1,1,1)}).start();}
  private clear(parent:Node){for(const n of [...parent.children]){n.active=false;n.destroy();}}
  destroy(){for(const n of this.clouds)Tween.stopAllByTarget(n);for(const e of Array.from(this.plots.values()))Tween.stopAllByTarget(e.node);}
}
