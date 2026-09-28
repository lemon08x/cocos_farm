import { Node, EventTouch } from 'cc';

export interface UiPoint {x:number;y:number}
/** Gesture classification only; the handler keeps every behavior decision
 * (zoom clamps, board snap-back, HUD hit filtering). */
export interface MapGestureHandler {
  blocked():boolean;
  pan(dx:number,dy:number):void;
  /** Span ratio vs the previous frame, null on the first pinch frame. Return true when consumed. */
  pinch(ratio:number|null):boolean;
  tap(point:UiPoint,target:Node|null):void;
  dragEnd():void;
}
// Listen above both the world and HUD. Decorative cards and image sprites must not create dead drag zones.
export class MapInputController {
  private drag=0;private pinchDistance=0;
  constructor(private node:Node,private handler:MapGestureHandler){}
  attach(){
    this.node.on(Node.EventType.TOUCH_START,this.onStart,this);
    this.node.on(Node.EventType.TOUCH_MOVE,this.onMove,this);
    this.node.on(Node.EventType.TOUCH_END,this.onEnd,this);
    this.node.on(Node.EventType.TOUCH_CANCEL,this.onCancel,this);
  }
  detach(){
    this.node.off(Node.EventType.TOUCH_START,this.onStart,this);
    this.node.off(Node.EventType.TOUCH_MOVE,this.onMove,this);
    this.node.off(Node.EventType.TOUCH_END,this.onEnd,this);
    this.node.off(Node.EventType.TOUCH_CANCEL,this.onCancel,this);
  }
  private span(e:EventTouch){const touches=e.getTouches();if(touches.length<2)return 0;
    const a=touches[0].getUILocation(),b=touches[1].getUILocation();return Math.hypot(a.x-b.x,a.y-b.y);}
  private onStart(e:EventTouch){this.drag=e.getTouches().length>1?999:0;this.pinchDistance=this.span(e);}
  private onMove(e:EventTouch){
    if(this.handler.blocked())return;
    const distance=this.span(e);
    if(distance){
      if(this.handler.pinch(this.pinchDistance?distance/this.pinchDistance:null)){this.pinchDistance=distance;this.drag=999;return;}
      if(this.pinchDistance){this.pinchDistance=0;this.drag=999;return;}
    }else if(this.pinchDistance){this.pinchDistance=0;this.drag=999;return;}
    const d=e.getUIDelta();this.drag+=Math.abs(d.x)+Math.abs(d.y);
    if(this.drag>10)this.handler.pan(d.x,d.y);
  }
  private onEnd(e:EventTouch){
    if(e.getTouches().length<2)this.pinchDistance=0;
    if(this.handler.blocked())return;
    if(this.drag>10){this.handler.dragEnd();return;}
    const p=e.getUILocation();this.handler.tap({x:p.x,y:p.y},e.target as Node|null);
  }
  private onCancel(){this.drag=0;this.pinchDistance=0;}
}
