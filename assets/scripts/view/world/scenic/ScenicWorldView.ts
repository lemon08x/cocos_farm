import {sceneHitTest} from '../../../FarmCore';
import {Graphics,Label,Node,Sprite,UITransform,director,Director} from 'cc';
import {tint,visualNode} from '../../../art/ArtRenderer';
import {plotTitle} from '../../../presentation/FarmViewModel';
import {plotName} from '../../FarmPresentation';
import type {FarmWorldViewContract,SceneRegion,WorldRenderModel,WorldCamera,WorldPoint,WorldViewport,DistrictId,PlotRenderModel} from '../FarmWorldViewContract';
import type {WorldViewRegistry} from '../WorldViewRegistry';
import type {WorldViewHost} from '../current/CurrentWorldView';
import {DEFAULT_CAMERA,CAMERA_LIFT} from './ScenicLayout';
import {ScenicArtPack} from './ScenicArtPack';

export function registerScenicWorldView(registry:WorldViewRegistry<WorldViewHost>){
  registry.register({id:'scenic',name:'田园场景',create:async host=>new ScenicWorldView(host.base,host.map,await ScenicArtPack.loadPreferred())});
}
interface Entry {node:Node;standing:Node[];key:string}
/** All ground, picking and navigation use FarmCore's materialized scene cells.
 * Viewport culling changes node lifetime only; it never generates topology. */
export class ScenicWorldView implements FarmWorldViewContract {
  private camera:WorldCamera={...DEFAULT_CAMERA};
  private viewport:WorldViewport={width:720,height:1280};
  private model:WorldRenderModel|null=null;
  private ground:Node;private objects:Node;private fog:Node;private overlay:Node;
  private cells=new Map<string,Entry>();
  private props=new Map<string,Node>();
  private depth=new Map<Node,number>();
  private disposed=false;
  constructor(private base:Node,private map:Node,private pack:ScenicArtPack){}
  get images(){return this.pack;}
  async switchStyle(id:string){
    const next=await ScenicArtPack.load(id);
    if(this.disposed){next.dispose();throw new Error('场景已关闭');}
    const staging=new Node('Pending scene style');staging.layer=this.map.layer;
    const candidate=new ScenicWorldView(this.base,staging,next);
    try{candidate.resize(this.viewport);candidate.setCamera(this.camera);if(!this.model)throw new Error('场景数据尚未就绪');candidate.render({...this.model,camera:this.camera});}
    catch(error){candidate.dispose();staging.destroy();throw error;}
    // Commit only after a complete replacement has rendered off-scene successfully.
    const previous=this.pack;
    for(const n of [this.ground,this.objects,this.fog,this.overlay])if(n){n.active=false;n.destroy();}
    this.ground=candidate.ground;this.objects=candidate.objects;this.fog=candidate.fog;this.overlay=candidate.overlay;
    this.cells=candidate.cells;this.props=candidate.props;this.depth=candidate.depth;this.pack=next;
    for(const n of [this.ground,this.objects,this.fog,this.overlay])n.setParent(this.map);
    staging.destroy();director.once(Director.EVENT_AFTER_DRAW,()=>previous.dispose());
  }
  render(model:WorldRenderModel){this.model=model;if(model.camera)this.camera={...model.camera};this.applyCamera();this.refresh();}
  hitTest(point:WorldPoint){return this.model?.scene?sceneHitTest(point,this.model.scene,new Set(this.model.plots.map(p=>p.id))):null;}
  focusPlot(id:string):WorldCamera|null {const r=this.model?.scene?.regions.find(r=>r.plotId===id);return r?{x:r.center.x,y:r.center.y+CAMERA_LIFT,zoom:this.camera.zoom}:null;}
  focusDistrict(id:DistrictId):WorldCamera {
    const plots=this.model?.scene?.regions.filter(r=>r.plotId&&r.district.x===id.x&&r.district.y===id.y)??[];
    if(!plots.length)return this.getCamera();
    return {x:plots.reduce((n,p)=>n+p.center.x,0)/plots.length,y:plots.reduce((n,p)=>n+p.center.y,0)/plots.length+CAMERA_LIFT,zoom:this.camera.zoom};
  }
  getCamera(){return {...this.camera};}
  setCamera(camera:WorldCamera){this.camera={...camera};this.applyCamera();this.refresh();}
  resize(viewport:WorldViewport){this.viewport=viewport;this.refresh();}
  // Pulse only the selection; scaling a ground cell would open cracks in the map.
  pulse(_id:string){this.drawSelection();}
  dispose(){this.disposed=true;for(const e of Array.from(this.cells.values()))this.remove(e);this.cells.clear();for(const n of [this.ground,this.objects,this.fog,this.overlay])if(n)n.destroy();this.props.clear();this.depth.clear();this.pack.dispose();}
  private applyCamera(){const z=this.camera.zoom;this.map.setScale(z,z,1);this.map.setPosition(-this.camera.x*z,this.camera.y*z,0);}
  private visible(p:WorldPoint,margin=600){return Math.abs(p.x-this.camera.x)<this.viewport.width/2/this.camera.zoom+margin&&Math.abs(p.y-this.camera.y)<this.viewport.height/2/this.camera.zoom+margin;}
  private clear(n:Node){for(const c of [...n.children]){c.active=false;c.destroy();}}
  private remove(e:Entry){e.node.active=false;e.node.destroy();for(const n of e.standing){this.depth.delete(n);n.active=false;n.destroy();}}
  private image(slot:string,parent:Node,p:WorldPoint):Node {
    const spec=this.pack.spec(slot),frame=this.pack.frames.get(slot);
    if(!spec||!frame)throw new Error('新场景素材缺失：'+slot);
    const [ax,ay]=spec.anchor,n=visualNode(slot,parent,p.x+spec.width*(.5-ax),-p.y+spec.height*(ay-.5),spec.width,spec.height);
    const sprite=n.addComponent(Sprite);sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;
    n.getComponent(UITransform)!.setContentSize(spec.width,spec.height);return n;
  }
  private stand(slot:string,p:WorldPoint,e:Entry){const n=this.image(slot,this.objects,p);e.standing.push(n);this.depth.set(n,p.y);return n;}
  private badge(text:string,p:WorldPoint,e:Entry){
    const n=visualNode('Plot state '+text,this.objects,p.x,-p.y,160,52),g=n.addComponent(Graphics);
    g.fillColor=tint(this.pack.palette.paper,240);g.roundRect(-80,-26,160,52,9);g.fill();
    const label=visualNode('Name',n,0,0,154,50).addComponent(Label);label.string=text;label.fontSize=20;label.lineHeight=24;label.color=tint(this.pack.palette.ink);
    e.standing.push(n);this.depth.set(n,p.y+20);
  }
  private slot(r:SceneRegion,p?:PlotRenderModel){
    if(p&&p.kind!=='unknown'&&p.kind==='field')return (p.land?.water??0)>=2?'field.wet.0':'field.dry.0';
    return r.art!;
  }
  private refresh(){
    const model=this.model,scene=model?.scene;if(!model||!scene)return;
    // Host finishes disposing the previous view before it supplies the first model.
    if(!this.ground){this.ground=visualNode('Scene tile ground',this.map);this.objects=visualNode('Scene standing objects',this.map);this.fog=visualNode('Scene unknown cells',this.map);this.overlay=visualNode('Scene selection',this.map);}
    const plots=new Map(model.plots.map(p=>[p.id,p])),live=new Set<string>();
    for(const r of scene.regions){
      if(!this.visible(r.center))continue;live.add(r.regionId);
      const p=r.plotId?plots.get(r.plotId):undefined,slot=this.slot(r,p);
      const signature=JSON.stringify([slot,p]);let e=this.cells.get(r.regionId);
      if(e?.key===signature)continue;if(e)this.remove(e);
      e={node:this.image(slot,this.ground,r.center),standing:[],key:signature};this.cells.set(r.regionId,e);
      if(!p||p.kind==='unknown')continue;
      if(p.project&&p.project.done!==p.project.total){this.badge((p.project.name||plotTitle(p))+' · '+(p.project.stage||'建设中'),r.center,e);continue;}
      if(p.landscape||p.improvement||p.purpose==='other'){this.badge(plotTitle(p),r.center,e);continue;}
      if(p.kind==='field'&&p.field?.crop){
        const stage=(p.maturity?.days??1)<=0?'mature':'growing',specific=`crop.${p.field.crop}.${stage}`;
        this.stand(this.pack.frames.has(specific)?specific:`crop.default.${stage}`,r.center,e);
      }else if(p.kind==='tree'||p.discovery?.id==='woodland')this.stand('object.tree',r.center,e);
      else if(p.kind==='water'||p.discovery?.id==='spring')this.badge('泉眼 · 水源',r.center,e);
      else if(p.kind==='rock')this.badge('石地',r.center,e);
      else if(p.discovery?.title)this.badge(p.discovery.title,r.center,e);
    }
    for(const [id,e] of Array.from(this.cells.entries()))if(!live.has(id)){this.remove(e);this.cells.delete(id);}
    const liveProps=new Set<string>();
    for(const o of scene.objects){if(!this.visible(o.center,900))continue;liveProps.add(o.id);if(!this.props.has(o.id)){const n=this.image(o.art,this.objects,o.center);this.props.set(o.id,n);this.depth.set(n,o.depth);}}
    for(const [id,n] of Array.from(this.props.entries()))if(!liveProps.has(id)){this.depth.delete(n);n.active=false;n.destroy();this.props.delete(id);}
    Array.from(this.depth.entries()).sort((a,b)=>a[1]-b[1]||a[0].name.localeCompare(b[0].name)).forEach(([n],i)=>n.setSiblingIndex(i));
    this.clear(this.fog);const fog=visualNode('Unknown boundaries',this.fog),g=fog.addComponent(Graphics);g.fillColor=tint(this.pack.palette.fog,240);
    for(const r of scene.regions)if(r.plotId&&plots.get(r.plotId)?.kind==='unknown'&&this.visible(r.center)){this.trace(g,r);g.fill();}
    this.drawSelection();
  }
  private trace(g:Graphics,r:SceneRegion){const points=r.boundary;g.moveTo(points[0].x,-points[0].y);for(const p of points.slice(1))g.lineTo(p.x,-p.y);g.close();}
  private drawSelection(){
    if(!this.overlay)return;
    this.clear(this.overlay);const r=this.model?.scene?.regions.find(r=>r.plotId===this.model?.selected);if(!r)return;
    const n=visualNode('Selection boundary',this.overlay),g=n.addComponent(Graphics);
    g.strokeColor=tint(this.pack.palette.gold);g.lineWidth=7;this.trace(g,r);g.stroke();
    g.strokeColor=tint(this.pack.palette.paper);g.lineWidth=2;this.trace(g,r);g.stroke();
    const caption=visualNode('Selected plot',n,r.center.x,-r.center.y-118,180,34),bg=caption.addComponent(Graphics);
    bg.fillColor=tint(this.pack.palette.paper,245);bg.roundRect(-90,-17,180,34,8);bg.fill();
    const text=visualNode('Name',caption,0,0,176,32).addComponent(Label);text.string=plotName(r.plotId!);text.fontSize=22;text.lineHeight=28;text.color=tint(this.pack.palette.ink);
  }
}
