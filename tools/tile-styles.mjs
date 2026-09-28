import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {root,artDir,readJson,writeJson,fileExists,sha} from './tile-art-lib.mjs';

export const stylesRoot=path.join(root,'art/scenic/styles');
export const validStyleId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(id);
export const runtimePath=id=>id==='pastoral'?'scenic-tiles':`scenic-styles/${id}`;
export function validateStyle(s,id){
  if(!validStyleId(id)||s?.version!==1||s.id!==id||s.contract!=='scenic-tiles@1'||typeof s.name!=='string'||!s.name.trim())throw new Error(`风格配置无效：${id}`);
  if(!['draft','ready'].includes(s.status)||!['linear','nearest'].includes(s.textureFilter))throw new Error(`${id}: status 或 textureFilter 无效`);
  const colors=['ink','muted','paper','cream','green','gold','line','status','caption','disabled','warning','shade','base','fog','map.mist','map.field','map.water','map.green','map.home','map.facility','map.path','map.bridge'];
  for(const k of colors)if(!/^#[0-9a-fA-F]{6}$/.test(s.palette?.[k]))throw new Error(`${id}: 缺少有效配色 ${k}`);
  if(typeof s.generation?.description!=='string'||!Array.isArray(s.generation.references)||s.generation.references.some(r=>typeof r!=='string'||path.isAbsolute(r)||r.split(/[\\/]/).includes('..')))throw new Error(`${id}: generation 说明或参考路径无效`);
  return s;
}
export const styleDigest=s=>sha(JSON.stringify({id:s.id,generation:s.generation}));
export async function readStyle(id='pastoral'){
  if(!validStyleId(id))throw new Error('风格 ID 必须为小写字母开头的字母、数字或短横线，最长 40 字符');
  const s=validateStyle(await readJson(path.join(stylesRoot,id,'style.json')),id);
  return {...s,sourceDir:id==='pastoral'?artDir:path.join(stylesRoot,id)};
}
export async function listStyles(){
  const styles=[];for(const d of await fs.readdir(stylesRoot,{withFileTypes:true}))if(d.isDirectory()&&await fileExists(path.join(stylesRoot,d.name,'style.json')))styles.push(await readStyle(d.name));
  return styles.sort((a,b)=>a.id.localeCompare(b.id));
}
export async function initStyle(id,name){
  if(!validStyleId(id)||id==='pastoral')throw new Error('请选择新的有效风格 ID，不能覆盖 pastoral');
  const dir=path.join(stylesRoot,id);if(await fileExists(dir))throw new Error('风格目录已存在，不覆盖');
  const base=await readStyle();
  await writeJson(path.join(dir,'style.json'),{version:1,id,name:name||id,status:'draft',contract:'scenic-tiles@1',textureFilter:'linear',palette:base.palette,generation:{description:'',references:[],negative:''}});
  await fs.writeFile(path.join(dir,'README.md'),'填写 style.json 中用户确定的风格与参考图，再运行 npm run tiles:prepare -- --style '+id+'。目录是草稿，图片齐全并通过导入后才设为 ready 并发布。\n');
  console.log(`已创建独立草稿风格：${dir}`);
}
async function main(){const [cmd,id,...args]=process.argv.slice(2);if(cmd==='init')return initStyle(id,args[0]==='--name'?args[1]:id);if(cmd==='list'){console.log((await listStyles()).map(s=>`${s.id}\t${s.status}\t${s.name}`).join('\n'));return;}throw new Error('用法：tiles:style init <id> --name <名称> | tiles:style list');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
