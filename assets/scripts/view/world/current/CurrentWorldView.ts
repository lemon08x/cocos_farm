import { Node, tween, Vec3, Tween, Graphics, Label, UITransform } from 'cc';
import { ArtRenderer, visualNode, tint } from '../../../art/ArtRenderer';
import { plotName } from '../../FarmPresentation';
import { DISTRICT_STEP_X, DISTRICT_STEP_Y, HOME_PLOT_ID, cameraForDistrict, coordinatesOf, districtOrigin, plotIdAt, plotPosition } from '../../FarmDistrict';
import { BOARD_TILE, MAP_LAYOUT, boardTileSlot } from './CurrentMapLayout';
import type { DistrictId, FarmWorldViewContract, PlotRenderModel, WorldCamera, WorldPoint, WorldRenderModel, WorldViewport } from '../FarmWorldViewContract';
import type { WorldViewRegistry } from '../WorldViewRegistry';

export interface WorldViewHost {base:Node;map:Node;art:ArtRenderer}
export function registerCurrentWorldView(registry:WorldViewRegistry<WorldViewHost>){
  registry.register({id:'current',name:'田格手账',create:async host=>new CurrentWorldView(host.base,host.map,host.art)});
}

export class CurrentWorldView implements FarmWorldViewContract {
  private plots=new Map<string,{node:Node;key:string;x:number;y:number;interactive:boolean}>();
  private clouds:Node[]=[];
  private grounds=new Map<string,Node>();
  private connectors=new Map<string,Node>();
  private camera:WorldCamera={x:0,y:0,zoom:1};
  private viewport:WorldViewport|null=null;
  constructor(private base:Node,private map:Node,private art:ArtRenderer){}
  get continuous(){return this.art.pack.manifest.groundMode==='continuous';}
  get board(){return this.art.pack.manifest.groundMode==='board';}
  get panLimits(){return this.board?{x:Infinity,y:Infinity}:this.continuous?{x:72,y:110}:{x:800,y:700};}
  setArt(art:ArtRenderer){
    const wasBoard=this.board;this.art=art;
    if(wasBoard||this.board){for(const p of this.plots.values())p.node.destroy();this.plots.clear();}
    for(const ground of this.grounds.values())ground.destroy();this.grounds.clear();
    for(const connector of this.connectors.values())connector.destroy();this.connectors.clear();
    this.background();for(const p of Array.from(this.plots.values()))p.key='';
  }
  background(){
    for(const n of this.clouds)Tween.stopAllByTarget(n);this.clouds=[];
    this.clear(this.base);
    const height=this.base.getComponent(UITransform)!.height;
    const backdrop=visualNode('Backdrop',this.base,0,0,720,height),g=backdrop.addComponent(Graphics);
    g.fillColor=tint(this.art.palette.base);g.rect(-360,-height/2,720,height);g.fill();
    if(this.board){
      return;
    }
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
  render(model:WorldRenderModel){
    const camera=model.camera??this.camera;this.camera={...camera};
    if(this.board){this.renderBoard(model.plots,model.selected,camera.x,camera.y,camera.zoom);return;}
    const panX=camera.x,panY=camera.y,observedPlots=model.plots,selected=model.selected;
    this.map.setScale(1,1,1);this.map.setPosition(0,-165,0);
    // In a continuous scene the backdrop and invisible plot regions share the same camera.
    this.base.setPosition(this.continuous?panX:0,this.continuous?panY:0,0);
    const visible=observedPlots.filter(p=>p.kind!=='unknown'||p.reachable).sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    const ids=new Set(visible.map(p=>p.id));
    for(const [id,e]of Array.from(this.plots)){if(!ids.has(id)){Tween.stopAllByTarget(e.node);e.node.destroy();this.plots.delete(id);}}
    visible.forEach((p,index)=>{
      const x=(p.x-p.y)*MAP_LAYOUT.stepX+panX,y=(this.continuous?0:MAP_LAYOUT.originY)-(p.x+p.y-2)*MAP_LAYOUT.stepY+panY;
      const key=JSON.stringify([p.kind,p.field,p.land?.water,(p.maturity?.days??1)<=0,p.id===selected]);
      let e=this.plots.get(p.id);
      if(!e){e={node:visualNode('Plot '+p.id,this.map,x,y,116,62),key:'',x,y,interactive:true};this.plots.set(p.id,e);}
      e.x=x;e.y=y;e.interactive=true;e.node.setPosition(x,y);e.node.setSiblingIndex(index);
      if(e.key===key)return;e.key=key;this.clear(e.node);
      let terrain=p.kind==='field'?((p.land?.water??0)>=2?'fieldWet':'fieldDry'):p.kind;
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
  private renderBoard(observedPlots:PlotRenderModel[],selected:string,panX:number,panY:number,zoom:number){
    this.base.setPosition(0,0,0);
    this.map.setScale(zoom,zoom,1);this.map.setPosition(panX,panY+80,0);
    const height=this.base.getComponent(UITransform)!.height;
    const cx=-panX/zoom,cy=-(panY+80)/zoom,halfX=360/zoom+BOARD_TILE.width,halfY=height/(2*zoom)+BOARD_TILE.height;
    const minX=Math.floor((cx-halfX)/DISTRICT_STEP_X)-1,maxX=Math.ceil((cx+halfX)/DISTRICT_STEP_X)+1;
    const minY=Math.floor((-cy-halfY)/DISTRICT_STEP_Y)-1,maxY=Math.ceil((-cy+halfY)/DISTRICT_STEP_Y)+1;
    const lookup=new Map(observedPlots.map(p=>[p.id,p]));
    const groundIds=new Set<string>(),connectorIds=new Set<string>(),boardPlots:{p:PlotRenderModel;x:number;y:number}[]=[];
    for(let uy=minY;uy<=maxY;uy++)for(let ux=minX;ux<=maxX;ux++){
      const gx=ux*DISTRICT_STEP_X,gy=-uy*DISTRICT_STEP_Y;
      if(Math.abs(gx-cx)>halfX+DISTRICT_STEP_X/2||Math.abs(gy-cy)>halfY+DISTRICT_STEP_Y/2)continue;
      const unitKey=ux+','+uy;groundIds.add(unitKey);
      if(!this.grounds.has(unitKey)){
        const ground=this.art.image('board.ground',this.map,gx,gy,DISTRICT_STEP_X+2,DISTRICT_STEP_Y+2);
        if(ground)this.grounds.set(unitKey,ground);
      }
      const connectors:[string,string,number,number,number,number][]=[];
      if(Math.abs(uy%2)===1)connectors.push(['h:'+unitKey,'board.canalH',gx,gy-DISTRICT_STEP_Y/2,DISTRICT_STEP_X+2,110]);
      if(ux%3===0)connectors.push(['v:'+unitKey,'board.canalV',gx+DISTRICT_STEP_X/2,gy,120,DISTRICT_STEP_Y+2]);
      for(const [id,slot,x,y,width,height]of connectors){
        connectorIds.add(id);
        if(!this.connectors.has(id)){
          const art=this.art.image(slot,this.map,x,y,width,height);
          if(art)this.connectors.set(id,art);
        }
      }
      const origin=districtOrigin({x:ux,y:uy});
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        const x=origin.x+col,y=origin.y+row,pos=plotPosition(x,y);
        if(Math.abs(pos.x-cx)>halfX||Math.abs(pos.y-cy)>halfY)continue;
        const id=plotIdAt(x,y);boardPlots.push({p:lookup.get(id)||{id,x,y,kind:'unknown',reachable:false},x:pos.x,y:pos.y});
      }
    }
    for(const [id,node] of Array.from(this.grounds))if(!groundIds.has(id)){node.destroy();this.grounds.delete(id);}
    for(const [id,node] of Array.from(this.connectors))if(!connectorIds.has(id)){node.destroy();this.connectors.delete(id);}
    for(const ground of this.grounds.values())ground.setSiblingIndex(0);
    for(const connector of this.connectors.values())connector.setSiblingIndex(this.grounds.size);
    const ids=new Set(boardPlots.map(({p})=>p.id));
    for(const [id,e] of Array.from(this.plots))if(!ids.has(id)){Tween.stopAllByTarget(e.node);e.node.destroy();this.plots.delete(id);}
    boardPlots.forEach(({p,x,y},index)=>{
      const interactive=p.kind!=='unknown'||p.reachable===true;
      const key=JSON.stringify([p.kind,p.purpose,p.improvement,p.landscape?.kind,p.field?.crop,p.land?.water,(p.maturity?.days??1)<=0,!!p.project,p.id===selected,interactive]);
      let e=this.plots.get(p.id);
      if(!e){e={node:visualNode('Board plot '+p.id,this.map,x,y,BOARD_TILE.width,BOARD_TILE.height),key:'',x,y,interactive};this.plots.set(p.id,e);}
      e.x=x;e.y=y;e.interactive=interactive;e.node.setPosition(x,y);e.node.setSiblingIndex(index+this.grounds.size+this.connectors.size);
      if(e.key===key)return;e.key=key;this.clear(e.node);
      this.drawBoardTile(e.node,p,p.id===selected,interactive);
    });
  }
  private drawBoardTile(node:Node,p:PlotRenderModel,selected:boolean,interactive:boolean){
    const C=this.art.palette;
    this.art.image(boardTileSlot(p),node,0,0,BOARD_TILE.width,BOARD_TILE.height);
    if(p.kind==='unknown'){
      const fog=visualNode('Unexplored land',node),g=fog.addComponent(Graphics);
      g.fillColor=tint(C.paper,82);g.roundRect(-96,-72,192,144,10);g.fill();
    }
    if(p.field?.crop)this.art.image('icon.crop-'+p.field.crop,node,0,p.id===HOME_PLOT_ID?-40:5,p.id===HOME_PLOT_ID?40:50,p.id===HOME_PLOT_ID?40:50);
    if(p.project)this.art.image('icon.hoe',node,0,8,48,48);
    if(selected){
      const border=visualNode('Selected plot border',node),b=border.addComponent(Graphics);
      b.strokeColor=tint('#42e6d3',210);b.lineWidth=8;b.roundRect(-99,-74,198,148,10);b.stroke();
      b.strokeColor=tint('#e3fff4');b.lineWidth=2;b.roundRect(-99,-74,198,148,10);b.stroke();
    }
  }
  hit(x:number,y:number):string|null{let selected=null;for(const[id,p]of Array.from(this.plots)){
    if(!p.interactive)continue;
    const inside=this.board?Math.abs(x-p.x)<=BOARD_TILE.width/2&&Math.abs(y-p.y)<=BOARD_TILE.height/2:Math.abs(x-p.x)/MAP_LAYOUT.hitX+Math.abs(y-p.y)/MAP_LAYOUT.hitY<=1;
    if(inside)selected=id;
  }return selected;}
  pulse(id:string){const e=this.plots.get(id);if(!e)return;Tween.stopAllByTarget(e.node);e.node.setScale(1,1,1);tween(e.node).to(.15,{scale:new Vec3(1.06,1.06,1)}).to(.25,{scale:new Vec3(1,1,1)}).start();}
  hitTest(point:WorldPoint){return this.hit(point.x,point.y);}
  focusPlot(id:string):WorldCamera|null{
    const c=coordinatesOf(id);if(!c)return null;
    const zoom=this.camera.zoom,pos=plotPosition(c.x,c.y);
    return this.board?{x:-pos.x*zoom,y:-pos.y*zoom,zoom}:
      {x:-(c.x-c.y)*MAP_LAYOUT.stepX,y:-((this.continuous?0:MAP_LAYOUT.originY)-(c.x+c.y-2)*MAP_LAYOUT.stepY),zoom};
  }
  focusDistrict(id:DistrictId):WorldCamera{
    const camera=cameraForDistrict(id,this.camera.zoom);
    return {x:camera.x,y:camera.y,zoom:this.camera.zoom};
  }
  getCamera():WorldCamera{return {...this.camera};}
  setCamera(camera:WorldCamera){this.camera={...camera};}
  resize(viewport:WorldViewport){this.viewport=viewport;}
  private clear(parent:Node){for(const n of [...parent.children]){n.active=false;n.destroy();}}
  dispose(){for(const n of this.clouds)Tween.stopAllByTarget(n);for(const e of Array.from(this.plots.values()))Tween.stopAllByTarget(e.node);}
}
