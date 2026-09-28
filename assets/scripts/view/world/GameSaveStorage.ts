export const GAME_SAVE_KEY='shanju.cocos.farm.v2';
const OLD_GAME_SAVE_KEY='shanju.cocos.farm.v1';
interface SaveStorage {getItem(key:string):string|null;removeItem(key:string):void}
/** Only the explicitly retired game slot is removed. Invalid v2 data is kept. */
export function prepareGameSave(storage:SaveStorage):{saved:string|null;reset:boolean}{
  const old=storage.getItem(OLD_GAME_SAVE_KEY);
  const saved=storage.getItem(GAME_SAVE_KEY);
  if(old!==null)storage.removeItem(OLD_GAME_SAVE_KEY);
  return {saved,reset:saved===null};
}
