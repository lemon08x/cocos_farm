import { cropNames, num, plotName, playerText, taskView } from '../view/FarmPresentation';
import { boardTileSlot } from '../view/world/current/CurrentMapLayout';

/** Pure mapping from observation data to HUD strings. Matches FarmHud's HudModel. */
export interface HudViewModel {date:string;term:string;money:string;food:string;pressure:string;field:string;detail:string;next:string;thumbnail:string}

export function plotTitle(p:any):string{
  if(!p)return '田院';
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
export function buildHudViewModel(obs:any,selected:string,board:boolean):HudViewModel{
  const g=obs.game,c=g.life.calendar,p=g.economy.farm.plots.find((p:any)=>p.id===selected);
  const detail=fieldDetailText(board,p);
  return {
    date:board?c.lunarDate+' · '+c.currentTerm:c.lunarDate,term:c.currentTerm+' · '+g.world.weatherName,
    money:'钱 '+num(g.family.money),food:'口粮 '+num(g.economy.foodTotal),pressure:'压力 '+num(g.life.person.pressure),
    field:p?plotName(selected):'地块单元',
    detail:board?(!p||p.kind==='unknown'?'未探索':p.kind==='field'&&p.purpose!=='other'?detail:plotTitle(p)):detail,
    next:nextTaskText(board,g.economy.farm.schedule.tasks,obs),thumbnail:boardTileSlot(p)
  };
}
