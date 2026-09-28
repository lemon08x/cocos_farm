import { _decorator, Component, Node, UITransform, Label, Graphics, view, screen, ResolutionPolicy, sys, Vec3, EventTouch, BlockInputEvents, profiler, Mask } from 'cc';
import { ArtPack, PackInfo } from './art/ArtPack';
import { ArtRenderer, visualNode, tint } from './art/ArtRenderer';
import { FarmWorldView } from './view/FarmWorldView';
import { cameraForDistrict, coordinatesOf, districtAtCamera, districtOf, HOME_PLOT_ID, type District } from './view/FarmDistrict';
import { MapInputController } from './view/world/MapInputController';
import { WorldViewPreferences } from './view/world/WorldViewPreferences';
import { WorldViewRegistry } from './view/world/WorldViewRegistry';
import { registerCurrentWorldView, type WorldViewHost } from './view/world/current/CurrentWorldView';
import { registerScenicWorldView, ScenicWorldView } from './view/world/scenic/ScenicWorldView';
import { clampScenicCamera, zoomCameraAboutPoint } from './view/world/scenic/ScenicLayout';
import { ScenicHud } from './view/hud/ScenicHud';
import { DistrictNavigator } from './view/hud/DistrictNavigator';
import type { FarmWorldViewContract } from './view/world/FarmWorldViewContract';
import { UiKit } from './view/UiKit';
import { PanelStack } from './view/PanelStack';
import { FarmHud } from './view/FarmHud';
import { cropNames, goodNames, num, plotName, playerText, actionVisual, actionSummary, taskView } from './view/FarmPresentation';
import { buildHudViewModel, plotTitle } from './presentation/FarmViewModel';
import { FarmCore } from './FarmCore';
const { ccclass } = _decorator;
const W=720, SAVE='shanju.cocos.farm.v1', STYLE='shanju.cocos.art.v2';

@ccclass('FarmDemo')
export class FarmDemo extends Component {
  private core=new FarmCore(); private obs:any;
  private base!:Node; private map!:Node; private hud!:Node; private overlay!:Node; private fx!:Node;
  private art!:ArtRenderer; private ui!:UiKit; private world:FarmWorldView|null=null;
  private panels=new PanelStack(); private hudView:FarmHud|null=null;
  private worldVersion='current'; private scenicView:ScenicWorldView|null=null;
  private scenicHudView:ScenicHud|null=null; private navigator:DistrictNavigator|null=null; private worldSwitchSeq=0;
  private packs:PackInfo[]=[]; private selected=HOME_PLOT_ID;
  private busy=false; private motion=true; private saveBlocked=false;
  private panX=0; private panY=0; private zoom=.82; private district:District={x:0,y:0};
  private input:MapInputController|null=null; private height=1280; private safeTop=20; private safeBottom=20;
  private worldPrefs=new WorldViewPreferences(sys.localStorage);
  private worldViews=new WorldViewRegistry<WorldViewHost>();
  private toastNode:Node|null=null;
  private get C(){return this.art.palette;}

  async start(){
    const frame=screen.windowSize;
    this.height=frame.height/frame.width>1.45?Math.max(1280,Math.round(W*frame.height/frame.width)):1280;
    view.setDesignResolutionSize(W,this.height,ResolutionPolicy.SHOW_ALL);
    const safe=sys.getSafeAreaRect(false);
    this.safeTop=Math.max(20,Math.min(100,this.height-safe.y-safe.height));this.safeBottom=Math.max(20,Math.min(100,safe.y));
    profiler.hideStats();
    const viewport=visualNode('World viewport',this.node,0,0,W,this.height);viewport.addComponent(Mask);
    this.base=visualNode('World',viewport,0,0,W,this.height);
    this.map=visualNode('Farm map',viewport,0,0,W,this.height);
    this.hud=visualNode('HUD',this.node,0,0,W,this.height);
    this.overlay=visualNode('Panels',this.node,0,0,W,this.height);
    this.fx=visualNode('Feedback',this.node,0,0,W,this.height);
    this.packs=await ArtPack.catalog();let pack:ArtPack;
    try{pack=await ArtPack.load(sys.localStorage.getItem(STYLE)||'fieldbook');}
    catch(error){console.warn(error);pack=await ArtPack.load('fieldbook');}
    this.art=new ArtRenderer(pack);this.ui=new UiKit(this.art);
    registerCurrentWorldView(this.worldViews);registerScenicWorldView(this.worldViews);
    const preferred=this.worldPrefs.preferredVersion();
    const version=this.worldViews.has(preferred)?preferred:'current';
    try{await this.mountWorldVersion(version);}
    catch(error){console.warn(error);await this.mountWorldVersion('current');}
    this.bindMap();
    try{this.obs=await this.core.start(sys.localStorage.getItem(SAVE)||undefined);}
    catch(error){this.saveBlocked=true;this.obs=await this.core.start(undefined);this.toast('原存档读取失败，已保留；当前为临时新局。');console.warn(error);}
    this.refresh();if(!this.saveBlocked)this.persist();
    (globalThis as any).__farmDemo=this;  // headless verification handle (tools/verify-scenic-p4.mjs)
  }
  private text(parent:Node,s:string,x:number,y:number,size=28,fill=this.C.ink,w=560,h=50,align=Label.HorizontalAlign.CENTER){return this.ui.text(parent,s,x,y,size,fill,w,h,align);}
  private box(n:Node,w:number,h:number){this.art.surface(n,w,h,this.C.cream,20,this.C.line);}
  private button(parent:Node,s:string,x:number,y:number,w:number,h:number,fn:()=>void,primary=false,enabled=true){return this.ui.button(parent,s,x,y,w,Math.max(76,h),()=>{if(!this.busy)fn();},primary,enabled);}
  private icon(parent:Node,kind:string,x=0,y=0,size=72){return this.art.image(this.art.pack.frames.has('icon.'+kind)?'icon.'+kind:'icon.more',parent,x,y,size,size);}
  private tap(n:Node,label:string,fn:()=>void){
    let moved=false,held=false;const hint=()=>{held=true;this.toast(label);};
    n.on(Node.EventType.TOUCH_START,()=>{moved=false;held=false;this.scheduleOnce(hint,.6);});
    n.on(Node.EventType.TOUCH_CANCEL,()=>this.unschedule(hint));
    n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(e.getUILocation().subtract(e.getUIStartLocation()).length()>12)moved=true;this.unschedule(hint);});
    n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{this.unschedule(hint);e.propagationStopped=true;if(!moved&&!held&&!this.busy)fn();});
  }
  private bindMap(){
    this.input=new MapInputController(this.node,{
      blocked:()=>!!this.panels.current||this.busy,
      pan:(dx,dy)=>{
        if(this.worldVersion==='scenic'&&this.scenicView){
          const c=this.scenicView.getCamera();c.x-=dx/c.zoom;c.y+=dy/c.zoom;
          this.scenicView.setCamera(clampScenicCamera(c));this.renderPlots();return;
        }
        this.panX+=dx;this.panY+=dy;this.clampCamera();this.renderPlots();
      },
      pinch:(ratio,center)=>{
        if(this.worldVersion==='scenic'&&this.scenicView){
          if(ratio!==null){
            const c=this.scenicView.getCamera(),zoom=c.zoom*ratio;
            if(center){
              // Zoom about the pinch centroid: keep the world point under the
              // centroid fixed while zooming (plan §7); clamps stay in ScenicLayout.
              const q=this.map.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(center.x,center.y,0));
              const m=this.map.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(center.x,center.y,0));
              this.scenicView.setCamera(clampScenicCamera(zoomCameraAboutPoint(c,{x:m.x,y:m.y},{x:q.x,y:q.y},zoom)));
            }else this.scenicView.setCamera(clampScenicCamera({...c,zoom}));
          }
          this.renderPlots();return true;
        }
        if(!this.boardMode())return false;
        if(ratio!==null){const old=this.zoom;this.zoom=Math.max(.65,Math.min(1.8,this.zoom*ratio));
          const r=this.zoom/old;this.panX*=r;this.panY=(this.panY+80)*r-80;}
        this.clampCamera();this.renderPlots();return true;
      },
      tap:(point,target)=>{
        for(let node=target;node;node=node.parent)
          if(node===this.hud||node===this.overlay||node===this.fx)return;
        const p=this.map.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x,point.y,0));
        const id=this.hitWorld(p.x,p.y);if(id){this.selected=id;this.refresh();}
      },
      dragEnd:()=>{
        if(this.boardMode()){
          const at=coordinatesOf(this.selected),unit=at?districtOf(at.x,at.y):null;
          if(!unit||unit.x!==this.district.x||unit.y!==this.district.y){
            const visible=this.obs.game.economy.farm.plots.filter((p:any)=>{const d=districtOf(p.x,p.y);return d.x===this.district.x&&d.y===this.district.y&&(p.kind!=='unknown'||p.reachable);});
            this.selected=(this.district.x===0&&this.district.y===0?visible.find((p:any)=>p.id===HOME_PLOT_ID):null)?.id
              ||(visible.find((p:any)=>p.kind!=='unknown')||visible[0])?.id||'';
          }
          this.refresh();
        }
        this.persistCamera();
      }
    });
    this.input.attach();
  }
  private boardMode(){return this.worldVersion==='current'&&!!this.world&&this.world.board;}
  private clampCamera(){if(!this.world||this.boardMode())return;const limit=this.world.panLimits;
    this.panX=Math.max(-limit.x,Math.min(limit.x,this.panX));this.panY=Math.max(-limit.y,Math.min(limit.y,this.panY));}
  private hitWorld(x:number,y:number):string|null{
    if(this.worldVersion==='scenic'&&this.scenicView)return this.scenicView.hitTest({x,y:-y});
    return this.world?this.world.hit(x,y):null;
  }
  private pulseWorld(id:string){if(this.worldVersion==='scenic')this.scenicView?.pulse(id);else this.world?.pulse(id);}
  private selectAndFocus(id:string){
    this.selected=id;const c=coordinatesOf(id);
    if(this.worldVersion==='scenic'){
      if(c){const camera=this.scenicView?.focusPlot(id);if(camera)this.scenicView?.setCamera(clampScenicCamera(camera));}
      this.persistCamera();this.refresh();return;
    }
    if(c){this.district=districtOf(c.x,c.y);const camera=cameraForDistrict(this.district,this.zoom);this.panX=camera.x;this.panY=camera.y;}this.persistCamera();this.refresh();
  }
  private persistCamera(){
    if(this.worldVersion==='scenic'){const c=this.scenicView?.getCamera();if(c)this.worldPrefs.rememberCamera('scenic',c);return;}
    this.worldPrefs.rememberCamera('current',{x:this.panX,y:this.panY,zoom:this.zoom});
  }
  private renderPlots(){
    if(!this.obs)return;
    if(this.worldVersion==='scenic'){
      this.scenicView?.render({plots:this.obs.game.economy.farm.plots,selected:this.selected});
      this.navigator?.update(this.obs.game.economy.farm.plots,this.scenicView?.getCamera(),this.height,this.selected);
      return;
    }
    if(this.boardMode())this.district=districtAtCamera(this.panX,this.panY,this.zoom);
    this.world?.render(this.obs.game.economy.farm.plots,this.selected,this.panX,this.panY,this.zoom);
  }
  private async mountWorldVersion(id:string){
    const seq=++this.worldSwitchSeq;
    let view:FarmWorldViewContract;
    try{view=await this.worldViews.create(id,{base:this.base,map:this.map,art:this.art});}
    catch(error){console.warn(error);throw error;}  // old world stays untouched; caller may retry
    if(seq!==this.worldSwitchSeq){view.dispose();return false;}  // superseded while loading: discard the half-built world and its textures
    this.world?.destroy();this.world=null;
    if(this.scenicView){this.scenicView.dispose();this.scenicView=null;}
    this.clearChildren(this.base);this.clearChildren(this.map);
    this.clearChildren(this.hud);this.hudView=null;this.scenicHudView=null;this.navigator=null;
    view.resize({width:W,height:this.height});
    if(view instanceof ScenicWorldView){
      this.scenicView=view;this.worldVersion='scenic';
      const saved=this.worldPrefs.cameraFor('scenic');if(saved)view.setCamera(clampScenicCamera(saved));
    }else{
      this.worldVersion='current';this.world=FarmWorldView.adapt(view);this.world.background();
    }
    this.worldPrefs.selectVersion(id);
    if(this.obs)this.refresh();
    return true;
  }
  private async switchWorldVersion(id:string){
    if(this.busy||id===this.worldVersion)return;
    this.busy=true;this.toast('正在加载场景…');
    try{
      const ok=await this.mountWorldVersion(id);
      if(ok)this.toast('已切换：'+(this.worldViews.list().find(v=>v.id===id)?.name||id));
    }catch(e){console.warn(e);this.toast('场景加载失败，已保留原画面。');}
    finally{this.busy=false;}
  }
  private openWorldVersions(){
    this.menu('场景版本','切换地图表现，日期、资源和进度保持不变',
      this.worldViews.list().map(v=>({label:(v.id===this.worldVersion?'当前 · ':'')+v.name,run:()=>void this.switchWorldVersion(v.id)})));
  }
  private hudActions(){return {
    farm:()=>{if(!this.busy){if(this.selected)this.openPlot();else this.openPlots();}},inventory:()=>{if(!this.busy)this.openInventory();},calendar:()=>{if(!this.busy)this.openSchedule();},more:()=>{if(!this.busy)this.openMore();},tasks:()=>{if(!this.busy)this.openTasks();},rest:()=>{if(!this.busy)this.openRest();},plots:()=>{if(!this.busy)this.openPlots();}
  };}
  private refresh(){
    this.renderPlots();
    const model=buildHudViewModel(this.obs,this.selected,this.boardMode());
    if(this.worldVersion==='scenic'){
      if(!this.scenicHudView)this.scenicHudView=new ScenicHud(this.hud,this.art,this.ui,this.height,this.safeTop,this.safeBottom,this.hudActions(),this.scenicView?.images??null);
      this.scenicHudView.update(model);
      if(!this.navigator)this.navigator=new DistrictNavigator(this.hud,this.art,this.ui,this.height,this.safeTop,district=>{
        const camera=this.scenicView?.focusDistrict(district);if(!camera)return;
        this.scenicView?.setCamera(clampScenicCamera(camera));this.renderPlots();this.persistCamera();
      });
      this.navigator.update(this.obs.game.economy.farm.plots,this.scenicView?.getCamera(),this.height,this.selected);
      return;
    }
    if(!this.hudView)this.hudView=new FarmHud(this.hud,this.art,this.ui,this.height,this.safeTop,this.safeBottom,this.hudActions());
    this.hudView.update(model);
  }
  private panel(title:string,subtitle='',height=1080,key=title){
    let body!:Node;const selected=this.selected;
    this.panels.push(key,()=>{
      const shade=visualNode('Modal '+key,this.overlay,0,0,W,this.height);this.art.shade(shade,W,this.height);shade.addComponent(BlockInputEvents);
      body=visualNode(title,shade,0,(this.safeBottom-this.safeTop)/2,664,height);this.art.surface(body,664,height,this.C.paper,28);
      this.text(body,title,0,height/2-65,32,this.C.ink,420,80);
      if(this.boardMode()){
        const rule=visualNode('Journal rule',body,0,height/2-126,580,3),g=rule.addComponent(Graphics);
        g.strokeColor=tint(this.C.gold);g.lineWidth=2;g.moveTo(-290,0);g.lineTo(290,0);g.stroke();
      }
      if(this.panels.depth>0){
        if(this.boardMode())this.ui.iconButton(body,'back',-279,height/2-64,80,()=>this.panels.back());
        else this.button(body,'‹',-279,height/2-64,80,80,()=>this.panels.back());
      }
      if(this.boardMode())this.ui.iconButton(body,'close',279,height/2-64,80,()=>this.close());
      else this.button(body,'×',279,height/2-64,80,80,()=>this.close());
      if(subtitle)this.text(body,subtitle,0,height/2-(this.boardMode()?160:151),this.boardMode()?23:26,this.C.ink,592,this.boardMode()?58:100);
      return shade;
    },()=>this.selectAndFocus(selected));
    return body;
  }
  private close(){this.panels.clear();}
  private pager(body:Node,page:number,pages:number,y:number,go:(page:number)=>void){
    this.button(body,'上一页',-208,y,176,76,()=>go(page-1),false,page>0);
    this.text(body,(page+1)+' / '+pages,0,y,26,this.C.ink,130,46);
    this.button(body,'下一页',208,y,176,76,()=>go(page+1),false,page<pages-1);
  }
  private menu(title:string,subtitle:string,items:{label:string;run:()=>void}[],page=0){
    const pages=Math.max(1,Math.ceil(items.length/6));page=Math.max(0,Math.min(page,pages-1));const body=this.panel(title,subtitle);
    items.slice(page*6,page*6+6).forEach((item,i)=>this.button(body,item.label,-149+(i%2)*298,248-Math.floor(i/2)*214,280,174,item.run));
    if(pages>1)this.pager(body,page,pages,-400,p=>this.menu(title,subtitle,items,p));return body;
  }
  private openMore(){this.menu('更多','田院工具与个人成长',[
    {label:'农业所学',run:()=>this.openLearning()},{label:'静修日课',run:()=>this.openPractice()},
    {label:'田间记事',run:()=>this.openEvents()},
    {label:'休养',run:()=>this.openRest()},{label:'待办',run:()=>this.openTasks()},
    {label:'回到房屋',run:()=>{this.close();this.selectAndFocus(HOME_PLOT_ID);}},
    {label:'操作帮助',run:()=>this.openHelp()},{label:'设置',run:()=>this.openSettings()}
  ]);}
  private openHelp(){const body=this.panel('操作帮助','从一块地开始');this.ui.scrollText(body,(this.boardMode()?'1. 房屋与院前田位于中心单元中央。每个单元固定 3×3 块地，向任意方向拖动可连续浏览。\n\n2. 双指张合缩放地图。':'1. 点击地面选田，边框表示当前选择；拖动可移动场景。')+'\n\n3. 下方卡片显示所选地块；查看农事可看到真实条件和用途。\n\n4. 农历中点击作物，给已开垦的田地安排计划。\n\n5. 待办中的任务到期后仍需手动执行。\n\n6. 仓储里可进入商店；更多里有学习、修行和设置。',0,-20,590,730,28);}
  private openPlots(page=0){
    const plots=this.obs.game.economy.farm.plots.filter((p:any)=>p.kind!=='unknown'||p.reachable),pages=Math.max(1,Math.ceil(plots.length/6));page=Math.max(0,Math.min(page,pages-1));
    const body=this.panel('选择田地','包含远处田地；点选后查看该田农事。');
    plots.slice(page*6,page*6+6).forEach((p:any,i:number)=>{
      const row=visualNode('Plot '+p.id,body,-150+(i%2)*300,247-Math.floor(i/2)*215,280,182);this.box(row,280,182);
      this.text(row,plotName(p.id),0,52,28,this.C.ink,256,54);this.icon(row,p.kind==='field'?'hoe':p.kind==='unknown'?'target':'leaf',-85,-15,62);
      this.text(row,plotTitle(p),34,-25,26,this.C.ink,174,100);
      this.tap(row,plotName(p.id),()=>{this.selectAndFocus(p.id);this.openPlot();});
    });this.pager(body,page,pages,-400,p=>this.openPlots(p));
  }
  private plotActions(plan=false){const p=this.selected;return this.obs.game.actions.filter((a:any)=>{const parts=a.id.split(':');return parts[0]==='economy'&&(parts[2]===p||parts[2]?.startsWith(p+'-'))&&(plan?parts[1]==='plotplan':!['plotplan','farmuse','wait'].includes(parts[1]));});}
  private openPlot(page=0){
    const p=this.obs.game.economy.farm.plots.find((p:any)=>p.id===this.selected);if(!p)return;
    const detail=p.kind==='unknown'?'探索后可查看地貌与农事':plotTitle(p)+' · '+(p.land?.soil||'')+' · 水分'+(p.land?.waterName||'未知')+(p.field?' · 肥力'+p.field.fertility:'');
    this.actionList(plotName(p.id)+' · 农事',detail,this.plotActions(),page,p.kind==='field'?()=>this.openPlans():undefined);
  }
  private shortReason(a:any){const r=a.reason||'';return /压力已为0/.test(r)?'压力已恢复':/尚未发现/.test(r)?'未发现种子':/播种窗口/.test(r)?'不在播种期':/理论|掌握|课程/.test(r)?'需先学习':/粮|食材/.test(r)?'需补给':/时间不足/.test(r)?'时间不足':'条件未满足';}
  private actionList(title:string,subtitle:string,actions:any[],page=0,plan?:()=>void){
    const sorted=actions.map(a=>this.obs.game.actions.find((v:any)=>v.id===a.id)).filter(Boolean).sort((a:any,b:any)=>Number(b.enabled)-Number(a.enabled));
    const pages=Math.max(1,Math.ceil(sorted.length/3));page=Math.max(0,Math.min(page,pages-1));const body=this.panel(title,subtitle);
    if(!sorted.length)this.text(body,'当前没有对应行动。\n可查看农历、学习或选择其他田地。',0,60,28,this.C.ink,570,180);
    sorted.slice(page*3,page*3+3).forEach((a:any,i:number)=>{
      const row=visualNode(a.id,body,0,252-i*210,600,188);this.box(row,600,188);const v=actionVisual(a);this.icon(row,v.icon,-233,34,78);
      this.text(row,v.label,45,41,28,this.C.ink,440,78,Label.HorizontalAlign.LEFT);
      this.text(row,(a.time?num(a.time)+'天':'不推进日期')+' · '+(a.pressureRelief!==undefined?'恢复压力 '+num(a.pressureRelief):'压力 +'+num(a.energy)),20,-24,25,this.C.ink,520,36);
      this.text(row,a.enabled?'查看并确认':this.shortReason(a)+' · 查看条件',-12,-66,25,a.enabled?this.C.green:this.C.warning,495,36);
      if(this.boardMode())this.icon(row,'next',248,-66,40);
      this.tap(row,playerText(a.label),()=>this.confirm(a));
    });this.pager(body,page,pages,-366,p=>this.actionList(title,subtitle,actions,p,plan));
    if(plan)this.button(body,'安排这块田的计划',0,-464,550,80,plan,true);
  }
  private confirm(a:any,task?:any){
    const body=this.panel(task?'处理待办':'行动确认','',1080,'action-confirm');const v=actionVisual(a);
    const target=/^p-?\d+q-?\d+/.exec(a.id.split(':')[2]||'')?.[0];
    const caption=task?taskView(task,this.obs).title:(target&&!a.label.includes(target)?plotName(target)+'\n':'')+playerText(a.label);
    this.icon(body,v.icon,-225,338,104);this.text(body,caption,61,338,30,this.C.ink,440,132);
    const context=task?taskView(task,this.obs):null,blocked=context?!context.ready:!a.enabled,reason=context?.reason||playerText(a.reason||'');
    const material=Object.entries(a.materials||{}).filter(([,v])=>v).map(([k,v])=>(goodNames[k]||k)+' × '+num(v)).join('、');
    let lines=[actionSummary(a),'',
      '时间：'+(a.time?num(a.time)+'天':'不推进日期'),'钱：'+num(a.money)+'    口粮报价：'+num(a.food),
      a.pressureRelief!==undefined?'预计恢复压力：'+num(a.pressureRelief):'压力：+'+num(a.energy),material?'材料：'+material:'',
      a.time?'经过时间仍会按规则结算生活消耗。':'','',blocked?'尚不能执行：'+reason:'条件已满足，可以确认。'];
    if(task&&blocked)lines=['任务：'+context!.title,'计划日期：'+task.date,'截止日期：'+task.deadlineDate,'',
      '预计耗时：'+num(task.time)+'天','预计压力：+'+num(task.energy),'实际执行前会重新检查田况与报价。','',
      '当前状态：'+context!.status,reason,...(task.gaps||[]).map((g:string)=>playerText(g))];
    this.ui.scrollText(body,lines.join('\n'),0,5,594,490,27);
    const help=/农时|窗口|到期|日期/.test(reason)?{name:'查看农历',run:()=>this.openSchedule()}:/学习|掌握|理论|课程/.test(reason)?{name:'前往学习',run:()=>this.openLearning()}:/粮|材料|种子|补给/.test(reason)?{name:'查看仓储',run:()=>this.openInventory()}:null;
    if(blocked&&help)this.button(body,help.name,0,-326,550,76,help.run);
    this.text(body,'说明区域可上下滑动',0,-259,24,this.C.muted,540,36);
    this.button(body,'返回',-151,-459,280,88,()=>this.panels.depth>1?this.panels.back():this.close());
    this.button(body,blocked?'条件未满足':'确认执行',151,-459,280,88,()=>void this.execute(a,task?.id),true,!blocked);
  }
  private async execute(a:any,taskId?:string){
    if(this.busy)return;const fresh=this.obs.game.actions.find((v:any)=>v.id===a.id),task=taskId?this.obs.game.economy.farm.schedule.tasks.find((t:any)=>t.id===taskId):null;
    if(!fresh?.enabled||(taskId&&(!task||!taskView(task,this.obs).ready))){this.toast('田况或条件已变化，请返回重新查看。');return;}
    this.busy=true;const before=this.obs.game;
    try{
      this.obs=await this.core.act(a.id);const saved=this.persist();this.close();this.refresh();if(this.motion)this.pulseWorld(this.selected);
      const after=this.obs.game,body=this.panel('行动已完成',playerText(a.label));
      const changes=['行动前：'+before.life.calendar.date,'行动后：'+after.life.calendar.date,
        '钱：'+num(before.family.money)+' → '+num(after.family.money),'口粮：'+num(before.economy.foodTotal)+' → '+num(after.economy.foodTotal),
        '压力：'+num(before.life.person.pressure)+' → '+num(after.life.person.pressure)];
      for(const key of new Set([...Object.keys(before.economy.goods),...Object.keys(after.economy.goods)])){
        const b=before.economy.goods[key]??0,n=after.economy.goods[key]??0;
        if(typeof n==='number'&&typeof b==='number'&&n!==b)changes.push((goodNames[key]||key)+'：'+num(b)+' → '+num(n));
      }
      const updated=after.actions.find((v:any)=>v.id===a.id);
      if(updated&&updated.label!==a.label)changes.push('当前进度：'+playerText(updated.label));
      if(a.id.includes(':plotplan:'))changes.push('计划已更新，当前共有 '+after.economy.farm.schedule.tasks.length+' 项待办。');
      const p=after.economy.farm.plots.find((p:any)=>p.id===this.selected);if(p)changes.push(plotName(p.id)+'：'+plotTitle(p));
      changes.push('',saved?'进度已保存。':this.saveBlocked?'当前是临时新局，原存档未覆盖。':'本地保存失败，请在设置中重试保存。');
      this.ui.scrollText(body,changes.join('\n\n'),0,25,586,590,28);
      const plan=a.id.includes(':plotplan:');
      this.button(body,taskId||plan?'继续查看待办':'继续操作',0,-380,552,84,()=>{this.close();if(taskId||plan)this.openTasks();else if(/:branch/.test(a.id))this.openLearning();else if(/:sect/.test(a.id))this.openPractice();else if(/:checkout:|:sell/.test(a.id))this.openMarket();else if(a.id!=='economy:rest:self')this.openPlot();},true);
      this.button(body,'回到田院',0,-477,552,76,()=>this.close());
    }catch(e){this.toast(e instanceof Error?e.message:String(e));}finally{this.busy=false;}
  }
  private persist(){if(this.saveBlocked)return false;try{sys.localStorage.setItem(SAVE,this.core.save());return true;}catch(e){this.toast('行动已完成，但保存失败；请在设置中重试。');console.warn(e);return false;}}
  private toast(s:string){
    if(this.toastNode){this.toastNode.active=false;this.toastNode.destroy();}
    const n=visualNode('Notice',this.fx,0,this.height/2-this.safeTop-186,652,128);this.toastNode=n;this.art.surface(n,652,128,this.C.green,20);
    this.text(n,s,0,0,27,this.C.cream,612,112);this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.toastNode===n)this.toastNode=null;},4.5);
  }
  private openPlans(){const p=this.obs.game.economy.farm.plots.find((p:any)=>p.id===this.selected);if(p?.kind!=='field'){this.openPlots();this.toast('先选择一块已开垦田地，再安排作物。');return;}this.actionList(plotName(this.selected)+' · 作物安排','保存计划不消耗时间和物资；到期后需手动执行。',this.plotActions(true));}
  private openSchedule(page=0){
    const s=this.obs.game.economy.farm.schedule,batches=s.batches.filter((b:any)=>b.year===s.year),pages=Math.max(1,Math.ceil(batches.length/3));page=Math.max(0,Math.min(page,pages-1));
    const body=this.panel('四时农历',this.boardMode()?'当前选中 '+plotName(this.selected)+' · 加入计划不耗时间，到期后手动执行':'点击作物安排计划 · 当前选中 '+plotName(this.selected));
    if(!batches.length)this.text(body,'当前没有作物窗口',0,80);
    if(this.boardMode()){
      const spine=visualNode('Season timeline',body,-267,43,3,436),line=spine.addComponent(Graphics);
      line.strokeColor=tint(this.C.line);line.lineWidth=4;line.moveTo(0,-218);line.lineTo(0,218);line.stroke();
      batches.slice(page*3,page*3+3).forEach((b:any,i:number)=>{
        const y=246-i*204,row=visualNode(b.name,body,44,y,516,180);this.box(row,516,180);
        const marker=visualNode('Season '+b.sowTerm,body,-267,y,94,54);
        this.art.surface(marker,94,54,this.C.status,16,this.C.gold);
        this.text(marker,b.sowTerm,0,0,23,this.C.ink,86,43);
        this.icon(row,'crop-'+b.crop,-207,24,66);
        this.text(row,b.name,35,45,29,this.C.ink,404,60,Label.HorizontalAlign.LEFT);
        this.text(row,'播种 '+b.sowTerm+' → 收获 '+b.harvestTerm,18,-11,25,this.C.caption,432,43);
        const now=this.obs.game.life.calendar.absoluteDay;
        const status=now>=b.end?'今年窗口已过':now<b.start?'尚未到期':'当前播种窗口';
        this.text(row,status+' · 查看安排',8,-59,24,now>=b.end?this.C.warning:this.C.green,410,39);
        this.icon(row,'next',222,-59,38);
        this.tap(row,b.name,()=>this.openBatch(b));
        this.tap(marker,b.name,()=>this.openBatch(b));
      });
      this.pager(body,page,pages,-368,p=>this.openSchedule(p));
      this.button(body,'田地计划',-152,-464,282,80,()=>this.openPlans());
      this.button(body,'计划与待办',152,-464,282,80,()=>this.openTasks(),true);
      return;
    }
    batches.slice(page*3,page*3+3).forEach((b:any,i:number)=>{
      const row=visualNode(b.name,body,0,246-i*204,600,182);this.box(row,600,182);this.icon(row,'crop-'+b.crop,-236,28,78);
      this.text(row,b.name,44,42,28,this.C.ink,438,60,Label.HorizontalAlign.LEFT);
      this.text(row,'播种 '+b.sowTerm+' → 收获 '+b.harvestTerm,30,-13,26,this.C.ink,530,40);
      const now=this.obs.game.life.calendar.absoluteDay,status=now>=b.end?'今年窗口已过':now<b.start?'尚未到期':'当前播种窗口';
      this.text(row,status+' · 查看安排',-12,-62,25,this.C.green,500,38);if(this.boardMode())this.icon(row,'next',248,-62,40);this.tap(row,b.name,()=>this.openBatch(b));
    });this.pager(body,page,pages,-368,p=>this.openSchedule(p));
    this.button(body,'田地计划',-152,-464,282,80,()=>this.openPlans());this.button(body,'计划与待办',152,-464,282,80,()=>this.openTasks(),true);
  }
  private openBatch(batch:any){
    const id='economy:plotplan:'+this.selected+'-add-'+batch.year+'-'+batch.id,action=this.obs.game.actions.find((a:any)=>a.id===id);
    if(action){this.confirm(action);return;}
    const body=this.panel(batch.name,'当前选中 '+plotName(this.selected),900,'batch-detail');
    this.ui.scrollText(body,'播种：'+batch.startDate+' 至 '+batch.endDate+'（截止前）\n\n预计成熟：'+batch.matureDate+'\n\n当前没有可新增的计划。可能已有安排、窗口已过，或田地还不能播种。',0,-5,582,370,28);
    this.button(body,'查看田地计划',0,-277,552,80,()=>this.openPlans(),true);this.button(body,'选择其他田地',0,-375,552,80,()=>this.openPlots());
  }
  private openTasks(page=0){
    const tasks=this.obs.game.economy.farm.schedule.tasks,pages=Math.max(1,Math.ceil(tasks.length/3));page=Math.max(0,Math.min(page,pages-1));
    const body=this.panel('计划与待办','点击任务查看条件并处理；不会自动执行。');
    if(!tasks.length)this.text(body,'还没有安排\n去农历选择作物，为田地添加计划。',0,80,28,this.C.ink,560,150);
    tasks.slice(page*3,page*3+3).forEach((task:any,i:number)=>{
      const v=taskView(task,this.obs),row=visualNode(task.id,body,0,251-i*210,600,188);this.box(row,600,188);
      this.text(row,v.title,0,48,28,this.C.ink,554,70,Label.HorizontalAlign.LEFT);this.text(row,task.date,0,-13,25,this.C.ink,554,50,Label.HorizontalAlign.LEFT);
      this.text(row,v.status+' · 点击处理',-12,-65,26,v.ready?this.C.green:this.C.warning,500,38,Label.HorizontalAlign.LEFT);
      if(this.boardMode())this.icon(row,'next',248,-65,40);
      this.tap(row,v.title,()=>{this.selectAndFocus(task.plotId);if(v.action)this.confirm(v.action,task);else this.openTaskUnavailable(task);});
    });this.pager(body,page,pages,-365,p=>this.openTasks(p));this.button(body,'去农历安排作物',0,-464,552,80,()=>this.openSchedule(),true);
  }
  private openTaskUnavailable(task:any){const v=taskView(task,this.obs),body=this.panel('任务详情',v.title,900,'task-detail');this.ui.scrollText(body,v.status+'\n\n'+v.reason+'\n\n当前没有对应行动，可查看田况或调整计划。',0,0,582,400,28);this.button(body,'查看这块田',-151,-357,282,80,()=>this.openPlot(),true);this.button(body,'调整计划',151,-357,282,80,()=>this.openPlans());}
  private openLearning(){this.actionList('农业所学','学习与实践会推进日期，并消耗相应资源。',this.obs.game.actions.filter((a:any)=>/^economy:branch(learn|practice):(A\d+|M0|M3|L0)$/.test(a.id)));}
  private openPractice(){this.actionList('静修日课','目前提供课程进度，不提供产量加成；会消耗时间。',this.obs.game.actions.filter((a:any)=>/^economy:sect(learn|daily):/.test(a.id)));}
  private openRest(){const a=this.obs.game.actions.find((a:any)=>a.id==='economy:rest:self');if(a)this.confirm(a);else this.toast('当前没有可用的半日休息行动。');}
  private goodIcon(key:string){const crop=key.startsWith('seed')?key.slice(4).toLowerCase():key;return cropNames[crop]?'crop-'+crop:({food:'food',wood:'wood',clay:'clay',compost:'compost',flour:'flour',straw:'straw'} as any)[key]||'basket';}
  private openInventory(page=0){
    const goods=Object.entries(this.obs.game.economy.goods).filter(([,v])=>typeof v==='number'&&(v as number)>0),pages=Math.max(1,Math.ceil(goods.length/6));page=Math.max(0,Math.min(page,pages-1));
    const body=this.panel('仓储','库存与补给 · 种子有单独名称');if(!goods.length)this.text(body,'仓库暂时为空，可去商店查看补给。',0,80,28,this.C.ink,560,100);
    goods.slice(page*6,page*6+6).forEach(([key,value],i)=>{
      const row=visualNode('Stock '+key,body,-150+(i%2)*300,250-Math.floor(i/2)*208,280,184);this.box(row,280,184);this.icon(row,this.goodIcon(key),-88,28,78);
      this.text(row,goodNames[key]||key,45,25,28,this.C.ink,166,86);this.text(row,'库存 '+num(value),0,-57,28,this.C.green,250,44);
    });this.pager(body,page,pages,-365,p=>this.openInventory(p));this.button(body,'前往商店',0,-464,552,80,()=>this.openMarket(),true);
  }
  private openMarket(){this.actionList('补给与买卖','价格与条件以当前报价为准。',this.obs.game.actions.filter((a:any)=>/^economy:checkout:good-/.test(a.id)||/^economy:(sell|sellfood):(wood|clay|wheat|soy|flax|straw|seedWheat)$/.test(a.id)));}
  private openSettings(){this.menu('设置','每次行动后自动保存到本机',[
    {label:'美术风格',run:()=>void this.openStyles()},{label:'场景版本',run:()=>this.openWorldVersions()},
    {label:this.motion?'反馈动效：开':'反馈动效：关',run:()=>{this.motion=!this.motion;this.openSettings();}},
    {label:'手动保存',run:()=>{if(this.saveBlocked)this.toast('原档读取失败，临时局不会覆盖它。');else if(this.persist())this.toast('已保存到本机');}},
    {label:'操作帮助',run:()=>this.openHelp()},{label:'备份并新开局',run:()=>this.confirmReset()}
  ]);}
  private async openStyles(){
    if(this.busy)return;this.busy=true;
    try{this.packs=await ArtPack.catalog();}catch(e){this.toast('风格目录读取失败');return;}finally{this.busy=false;}
    this.menu('美术风格','切换风格保留日期、资源和计划',[
      ...this.packs.map(p=>({label:(p.id===this.art.pack.manifest.id?'当前 · ':'')+p.name,run:()=>void this.switchStyle(p.id)})),
      {label:'重新加载当前风格',run:()=>void this.switchStyle(this.art.pack.manifest.id)}
    ]);
  }
  private async switchStyle(id:string){
    if(this.busy)return;this.busy=true;this.toast('正在加载风格…');
    try{
      const pack=await ArtPack.load(id),old=this.art.pack;this.close();this.clearChildren(this.fx);this.toastNode=null;this.clearChildren(this.hud);this.hudView=null;this.scenicHudView=null;this.navigator=null;
      this.art=new ArtRenderer(pack);this.ui=new UiKit(this.art);this.world?.setArt(this.art);
      for(const node of [...this.hud.children])node.destroy();this.hudView=null;this.scenicHudView=null;this.navigator=null;
      this.clampCamera();this.refresh();this.scheduleOnce(()=>old.dispose(),0);
      try{sys.localStorage.setItem(STYLE,id);}catch(e){console.warn(e);}this.toast('已切换：'+pack.manifest.name);
    }catch(e){console.warn(e);this.toast('美术加载失败，已保留原画面。');}finally{this.busy=false;}
  }
  private openEvents(){const events=this.obs.recentEvents.filter((e:any)=>e.detail||e.message||e.reason),body=this.panel('田间记事','最近实际发生的事件');this.ui.scrollText(body,playerText(events.map((e:any)=>e.detail||e.message||e.reason).join('\n\n'))||'新的一年，从一块田开始。',0,-40,590,750,28);}
  private confirmReset(){const body=this.panel('重新开始','旧存档会先保留为备份',660);this.text(body,'是否新开一局？\n日期将回到第一年正月初一。',0,-10,28,this.C.ink,560,170);this.button(body,'返回',-151,-236,282,80,()=>this.panels.back());this.button(body,'备份并新开',151,-236,282,80,()=>void this.reset(),true);}
  private async reset(){if(this.busy)return;this.busy=true;try{const old=sys.localStorage.getItem(SAVE);if(old)sys.localStorage.setItem(SAVE+'.backup.'+Date.now(),old);this.obs=await this.core.start(undefined);this.saveBlocked=false;this.selected=HOME_PLOT_ID;this.district={x:0,y:0};this.panX=this.panY=0;this.zoom=.82;this.persistCamera();const saved=this.persist();this.close();this.refresh();this.toast(saved?'新局已开始，原档已备份。':'新局已开始，但保存失败，请重试。');}catch(e){this.toast(String(e));}finally{this.busy=false;}}
  private clearChildren(parent:Node){for(const n of [...parent.children]){n.active=false;n.destroy();}}
  onDestroy(){this.input?.detach();this.panels.clear();this.world?.destroy();this.scenicView?.dispose();this.art?.pack.dispose();if((globalThis as any).__farmDemo===this)delete (globalThis as any).__farmDemo;}
}
