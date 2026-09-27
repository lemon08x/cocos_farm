import { Node } from 'cc';

/** Retain actual views so back restores their page and scroll position. */
export class PanelStack {
  private entries:{key:string;node:Node;onShow:()=>void}[]=[];
  get current(){return this.entries[this.entries.length-1]?.node??null;}
  get depth(){return this.entries.length;}
  push(key:string,create:()=>Node,onShow=()=>{}){
    // Pagination / filters replace their own view, not a new navigation level.
    if(this.entries[this.entries.length-1]?.key===key)this.removeTop();
    if(this.current)this.current.active=false;
    const node=create();this.entries.push({key,node,onShow});return node;
  }
  back(){this.removeTop();const entry=this.entries[this.entries.length-1];if(entry){entry.onShow();entry.node.active=true;}}
  clear(){while(this.entries.length)this.removeTop();}
  private removeTop(){const entry=this.entries.pop();if(entry){entry.node.active=false;entry.node.destroy();}}
}
