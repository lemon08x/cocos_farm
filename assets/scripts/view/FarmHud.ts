import { Label, Node } from 'cc';
import { ArtRenderer, visualNode } from '../art/ArtRenderer';
import { UiKit } from './UiKit';

export interface HudModel {date:string;term:string;money:string;food:string;pressure:string;field:string;detail:string;next:string;}
export interface HudActions {farm:()=>void;inventory:()=>void;calendar:()=>void;more:()=>void;tasks:()=>void;rest:()=>void;plots:()=>void;}
/** Persistent HUD nodes: observations update strings instead of rebuilding controls. */
export class FarmHud {
  private labels:Partial<Record<keyof HudModel,Label>>={};
  constructor(parent:Node,art:ArtRenderer,ui:UiKit,height:number,top:number,bottom:number,actions:HudActions){
    const C=art.palette;
    const card=(name:string,x:number,y:number,w:number,h:number)=>{const n=visualNode(name,parent,x-360,height/2-y,w,h);art.surface(n,w,h,C.paper,20);return n;};
    const label=(key:keyof HudModel,n:Node,x:number,y:number,w:number,h:number,size=28)=>this.labels[key]=ui.text(n,'',x,y,size,C.ink,w,h);
    const date=card('Date',192,top+72,328,108);label('date',date,0,22,300,42,30);label('term',date,0,-24,300,38,26);
    ui.button(date,'农历',0,-90,170,64,actions.calendar);
    const stats=card('Resources',540,top+94,310,152);label('money',stats,0,47,290,38);label('food',stats,0,0,290,38);label('pressure',stats,0,-47,290,38);
    const next=card('Next task',360,top+260,656,112);label('next',next,-62,0,490,92,26);ui.button(next,'待办',254,0,126,80,actions.tasks,true);
    ui.button(parent,'休养',-272,height/2-top-382,150,76,actions.rest);
    ui.button(parent,'选田',272,height/2-top-382,150,76,actions.plots);
    const selected=card('Selected field',360,height-bottom-298,656,174);
    label('field',selected,-85,48,450,44,30);label('detail',selected,-85,-30,450,96,26);
    ui.button(selected,'农事',246,0,140,100,actions.farm,true);
    const nav=[['农事','hoe',actions.farm],['仓储','basket',actions.inventory],['农历','calendar',actions.calendar],['更多','more',actions.more]] as const;
    nav.forEach(([name,icon,fn],i)=>{
      const n=card(name,90+i*180,height-bottom-103,152,144);
      const slot=art.pack.frames.has('icon.'+icon)?'icon.'+icon:'icon.more';art.image(slot,n,0,27,72,72);
      ui.button(n,name,0,-41,142,62,fn);
      // Entire tile is tappable, including its illustration.
      n.on(Node.EventType.TOUCH_END,fn);
    });
  }
  update(model:HudModel){for(const key of Object.keys(this.labels) as (keyof HudModel)[]){const label=this.labels[key]!;if(label.string!==model[key])label.string=model[key];}}
}
