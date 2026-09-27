/** UI-only adapters. All costs, dates and action availability come from observation. */
export const cropNames: Record<string,string> = {wheat:'小麦',soy:'大豆',flax:'亚麻',rice:'水稻',millet:'粟',adzuki:'小豆',mallow:'葵菜',mustard:'芥菜'};
export const goodNames: Record<string,string> = {wood:'木材',clay:'黏土',seedWheat:'麦种',seedSoy:'豆种',seedFlax:'麻种',food:'干粮',wheat:'小麦',soy:'大豆',flax:'亚麻',straw:'秸秆',compost:'堆肥',flour:'面粉',seedRice:'稻种',rice:'稻谷',seedMillet:'粟种',millet:'粟',salt:'盐',seedAdzuki:'小豆种',seedMallow:'葵菜种',seedMustard:'芥菜种'};
export const num=(n:unknown)=>Number(n??0).toLocaleString('zh-CN',{maximumFractionDigits:2});
export function plotName(id:string){
  if(id==='p2q2')return '院前田';
  const m=/^p(-?\d+)q(-?\d+)$/.exec(id);
  return m?`田地 ${Number(m[1])}·${Number(m[2])}`:id;
}
export function playerText(text:string=''){
  return text.replace(/p-?\d+q-?\d+/g,plotName).replace(/年度农时/g,'农历').replace(/压力已为0/g,'压力已经恢复');
}
export function actionVisual(a:any){
  const op=a.id.split(':')[1],target=a.id.split(':')[2]||'';
  const crop=Object.keys(cropNames).find(k=>new RegExp(`(?:^|-)${k}(?:\\d|$|-)`).test(target));
  const symbol=op==='rest'?'rest':op==='plotplan'?'list':/sect/.test(op)?'lotus':/branch/.test(op)?'book':/checkout|sell|buy/.test(op)?'market':op==='farmfertilize'?'compost':op==='farmplot'?(/收获|采收/.test(a.label)?'sickle':/播种/.test(a.label)?'seed':'water'):'hoe';
  return {icon:crop?'crop-'+crop:symbol,symbol,label:playerText(a.label).replace(/^院前田\s*/, '')};
}
export function taskView(task:any,obs:any){
  const now=obs.game.life.calendar.absoluteDay;
  const action=obs.game.actions.find((a:any)=>a.id===task.actionId);
  const plot=obs.game.economy.farm.plots.find((p:any)=>p.id===task.plotId);
  // farmplot uses the same command for sowing, tending and harvesting. Never offer a
  // future harvest through an action that currently means sowing or watering.
  const sameOperation=task.kind==='harvest'?!!plot?.field?.crop&&(plot.maturity?.days??Infinity)<=0:
    task.kind==='sow'?!plot?.field?.crop:task.kind==='water'?!!plot?.field?.crop:true;
  const expired=now>=task.deadline;
  const due=task.due===true;
  const gaps=task.gaps||[];
  const ready=!expired&&due&&sameOperation&&!!action?.enabled&&gaps.length===0;
  const status=expired?'已过期':!due?'未到期':ready?'可执行':'缺少条件';
  const reason=expired?'已错过执行窗口':!due?`计划日期：${task.date}`:playerText(gaps.join('；')||action?.reason||(!sameOperation?'当前田况与此任务不符':'当前没有对应行动'));
  return {action,ready,status,reason,title:playerText(task.name||task.label||task.kind)};
}
export function actionSummary(a:any){
  if(a.id.includes(':plotplan:'))return '只调整农事计划，不消耗时间和物资。到期后需手动确认农事。';
  if(a.id==='economy:rest:self')return `休息半天，预计恢复 ${num(a.pressureRelief)} 压力，最低为 0。时间流逝照常消耗口粮。`;
  // Keep useful original effects, remove the shared engine appendix referring to
  // screens that this agricultural client does not expose.
  return playerText((a.description||'按当前田况执行这项行动。').split(' 行动耗费')[0]);
}
