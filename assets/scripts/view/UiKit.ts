import { Label, Node, Mask, ScrollView, UITransform, EventTouch, UIOpacity } from 'cc';
import { ArtRenderer, tint, visualNode } from '../art/ArtRenderer';

/** Shared view primitives. Screen layout and business content remain in FarmDemo for now. */
export class UiKit {
  constructor(public art:ArtRenderer){}
  text(parent:Node,s:string,x:number,y:number,size=24,fill=this.art.palette.ink,w=550,h=42,align=Label.HorizontalAlign.CENTER){
    const n=visualNode('Text '+s.slice(0,18),parent,x,y,w,h);const l=n.addComponent(Label);
    l.string=s;l.fontSize=size;l.lineHeight=Math.round(size*1.3);l.color=tint(fill);l.fontFamily='Microsoft YaHei';l.horizontalAlign=align;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=true;return l;
  }
  button(parent:Node,s:string,x:number,y:number,w:number,h:number,fn:()=>void,primary=false,enabled=true){
    const C=this.art.palette,n=visualNode('Button '+s,parent,x,y,w,h);
    this.art.surface(n,w,h,primary?C.green:C.cream,18,C.line);
    this.text(n,s,0,0,28,primary?C.cream:C.ink,w-20,h-8);
    if(!enabled)n.addComponent(UIOpacity).opacity=165;
    let moved=false;
    n.on(Node.EventType.TOUCH_START,()=>{moved=false;});
    n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(e.getUILocation().subtract(e.getUIStartLocation()).length()>12)moved=true;});
    n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;if(enabled&&!moved)fn();});
    return n;
  }
  scrollText(parent:Node,s:string,x:number,y:number,w:number,h:number,size=27,fill=this.art.palette.ink){
    const viewport=visualNode('Scrollable text',parent,x,y,w,h);viewport.addComponent(Mask);
    const scroll=viewport.addComponent(ScrollView);scroll.horizontal=false;scroll.vertical=true;scroll.elastic=false;
    const content=visualNode('Text content',viewport,0,h/2,w,h);content.getComponent(UITransform)!.setAnchorPoint(.5,1);
    const label=this.text(content,s,0,0,size,fill,w-16,h,Label.HorizontalAlign.LEFT);
    label.node.getComponent(UITransform)!.setAnchorPoint(.5,1);label.verticalAlign=Label.VerticalAlign.TOP;
    label.overflow=Label.Overflow.RESIZE_HEIGHT;label.updateRenderData(true);
    content.getComponent(UITransform)!.setContentSize(w,Math.max(h,label.node.getComponent(UITransform)!.height));scroll.content=content;
    return viewport;
  }
}
