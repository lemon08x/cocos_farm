import { cropNames, num, plotName, playerText, taskView } from '../view/FarmPresentation';
import { boardTileSlot } from '../view/world/current/CurrentMapLayout';

/** Pure mapping from observation data to HUD strings. Matches FarmHud's HudModel. */
export interface HudViewModel {date:string;term:string;money:string;food:string;pressure:string;field:string;detail:string;next:string;thumbnail:string;thumbnailScenic:string[];water:string;todoCount:number;fieldShort?:string;todoBadge?:string}

/** Scenic HUD thumbnail: stacked scenic art slots showing the selected plot's real
 * observed state (soil + crop, environment look for wilderness). Never a board.* slot —
 * the homestead image must not stand in for field condition (plan §7). */
export function scenicThumbnail(p:any):string[]{
  if(!p||p.kind==='unknown')return ['field.unknown'];
  if(p.landscape||p.improvement||p.purpose==='other'||(p.project&&p.project.done<p.project.total))return [];
  if(p.kind==='field'){
    const slots=[(p.land?.water??0)>=2?'field.soil.wet':'field.soil.dry'];
    if(p.field?.crop){const stage=(p.maturity?.days??1)<=0?'mature':'growing';slots.push(p.field.crop==='wheat'?`crop.wheat.${stage}`:`crop.default.${stage}`);}
    return slots;
  }
  if(p.kind==='water'||p.discovery?.id==='spring')return ['env.river.straight'];
  if(p.kind==='tree'||p.discovery?.id==='woodland')return ['env.tree.canopy'];
  if(p.kind==='rock')return [];
  return ['env.flowers'];
}

export function plotTitle(p:any):string{
  if(!p)return '田院';
  if(p.project&&p.project.done<p.project.total)return (p.project.name||'设施')+' · '+(p.project.stage||'建设中');
  if(p.landscape)return p.landscape.name||'园地';
  if(p.improvement)return ({yard:'晒场',cellar:'种子窖',shed:'窝棚',pit:'堆肥坑',retting:'沤麻塘',canal:'水渠',drain:'排水沟',shelter:'护田林'} as any)[p.improvement]||'其他用途';
  return p.field?.crop?cropNames[p.field.crop]||p.field.crop:p.kind==='field'?(p.purpose==='other'?'其他用途':'空闲田地'):p.kind==='unknown'?'未探索':p.kind==='water'?'溪涧水源':p.discovery?.title||({wild:'待垦荒地',rock:'山石',tree:'树木',story:'田间见闻'} as any)[p.kind]||'田地';
}
export function nextTaskText(board:boolean,tasks:any[],obs:any):string{
  const ready=tasks.filter((t:any)=>taskView(t,obs).ready);
  return board?
    ready.length?'今日有 '+ready.length+' 项待办可执行':tasks.length?'农历待办 '+tasks.length+' 项 · '+taskView(tasks[0],obs).status:'未安排农事 · 可先查看农历':
    ready.length?'有 '+ready.length+' 项农事可以执行':tasks.length?playerText(tasks[0].name)+'\n'+tasks[0].date:'先选田，查看农事与条件\n未到农时可学习或安排计划';
}
export function fieldDetailText(board:boolean,p:any):string{
  return p?.field?.crop?plotTitle(p)+' · '+((p.maturity?.days??1)<=0?'可以收获':'预计 '+(p.maturity?.date||'农时')+' 成熟'):
    p?.kind==='field'?(board?'空田 · 水分'+(p.land?.waterName||'未知'):'空田 · 查看播种条件\n未到农时可提前安排'):
    plotTitle(p)+(board?' · 查看农事条件':' · 点农事查看');
}
/** Scenic 专用短田况（plan §7）：一行概括状态与水分，长度与选中田卡片一起设计，
 * 不使用旧版多行文案，也不依赖 CLAMP 截断。 */
export function fieldShortText(p:any):string{
  if(!p)return '';
  if(p.kind==='unknown')return p.explorationReason||'未探索';
  if(p.kind==='field'&&p.purpose!=='other'){
    const water='水分'+(p.land?.waterName||'未知');
    if(p.field?.crop)return (cropNames[p.field.crop]||p.field.crop)+((p.maturity?.days??1)<=0?' · 可以收获':' · 生长中')+' · '+water;
    return '空田 · '+water;
  }
  return plotTitle(p);
}
/** Scenic 待办徽标（plan §7）：标明是选中田待办还是全局待办，只数未过期的计划任务。 */
export function todoBadgeText(selected:string,tasks:any[],obs:any):string{
  const now=obs?.game?.life?.calendar?.absoluteDay??0;
  const open=(t:any)=>typeof t?.deadline==='number'?now<t.deadline:true;
  const mine=tasks.filter((t:any)=>t?.plotId===selected&&open(t)).length;
  if(mine)return '本田待办 '+mine;
  const all=tasks.filter(open).length;
  return all?'全局待办 '+all:'暂无待办';
}
export function buildHudViewModel(obs:any,selected:string,board:boolean):HudViewModel{
  const g=obs.game,c=g.life.calendar,p=g.economy.farm.plots.find((p:any)=>p.id===selected);
  const detail=fieldDetailText(board,p);
  return {
    date:board?c.lunarDate+' · '+c.currentTerm:c.lunarDate,term:c.currentTerm+' · '+g.world.weatherName,
    money:'钱 '+num(g.family.money),food:'口粮 '+num(g.economy.foodTotal),pressure:'压力 '+num(g.life.person.pressure),
    field:p?plotName(selected):'地块单元',
    detail:board?(!p||p.kind==='unknown'?'未探索':p.kind==='field'&&p.purpose!=='other'?detail:plotTitle(p)):detail,
    next:nextTaskText(board,g.economy.farm.schedule.tasks,obs),thumbnail:boardTileSlot(p),thumbnailScenic:scenicThumbnail(p),
    water:p?.land?.waterName?'水分 '+p.land.waterName:'',todoCount:g.economy.farm.schedule.tasks.length,
    fieldShort:fieldShortText(p),todoBadge:todoBadgeText(selected,g.economy.farm.schedule.tasks,obs)
  };
}

export function spatialDescription(p:any):string{
 if(p.kind==='unknown')return p.explorationReason||'先探索相邻区域';
 const v=p.spatial;if(!v)return '';
 const source=(id:string)=>id.startsWith('river.')?'河流':id==='env.spring'?'河源':plotName(id);
 const water=p.waterAccess?'可引水：'+Array.from(new Set(v.waterSources.map(source))).join('、'):'尚未接通水源';
 const drainage=p.improvement==='drain'?(v.drainOutlet?'有有效排水出口':'没有低处排水出口'):'';
 const names:any={shelter:'护田林',yard:'晒场',cellar:'种子窖',shed:'窝棚',garden:'田畔花园'};
 const coverage=v.coverage.map((c:any)=>names[c.kind]+'（'+plotName(c.plotId)+'）').join('、');
 return [water,drainage,coverage?'受益：'+coverage:''].filter(Boolean).join('；');
}
