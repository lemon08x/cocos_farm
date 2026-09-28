import {tileArtCatalog,tileCanvas,TILE_ART_VERSION} from '../../../FarmCore';
export const SCENIC_STYLE_KEY='shanju.cocos.scenic-style.v1';
export const DEFAULT_SCENIC_STYLE='pastoral';
export const safeStyleId=(id:unknown):id is string=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(id);
export const stylePackPath=(id:string)=>{if(!safeStyleId(id))throw new Error('无效风格 ID');return id===DEFAULT_SCENIC_STYLE?'scenic-tiles':`scenic-styles/${id}`;};
export interface ScenicImageSpec {file:string;width:number;height:number;anchor:[number,number]}
export interface ScenicManifest {version:1;id:string;styleId:string;name:string;textureFilter:'linear'|'nearest';revision:string;palette:Record<string,string>;images:Record<string,ScenicImageSpec>}
export interface ScenicStyleInfo {id:string;name:string;revision:string}
const safeFile=(s:unknown):s is string=>typeof s==='string'&&/^[a-zA-Z0-9_.-]+\.png$/.test(s)&&!s.includes('..');
export function validateStyleCatalog(data:any):ScenicStyleInfo[]{
  if(data?.version!==1||!Array.isArray(data.styles))throw new Error('地图风格目录格式无效');
  const seen=new Set<string>();
  return data.styles.map((s:any)=>{if(!safeStyleId(s.id)||typeof s.name!=='string'||!s.name||typeof s.revision!=='string'||seen.has(s.id))throw new Error('地图风格目录包含无效或重复条目');seen.add(s.id);return {id:s.id,name:s.name,revision:s.revision};});
}
export function validateScenicManifest(m:any,requested:string):ScenicManifest{
  if(m?.version!==1||m.id!=='scenic-tiles'||m.styleId!==requested||m.tileVersion!==TILE_ART_VERSION||typeof m.name!=='string'||!m.name||!['linear','nearest'].includes(m.textureFilter)||typeof m.revision!=='string'||!m.images)throw new Error('地图风格与图块规范不兼容');
  const images:Record<string,ScenicImageSpec>={};
  for(const [slot,s] of Object.entries(m.images as Record<string,any>)){
    if(!safeFile(s?.file)||!Number.isFinite(s.width)||!Number.isFinite(s.height)||s.width<=0||s.height<=0||s.width>4096||s.height>4096||!Array.isArray(s.anchor)||s.anchor.length!==2||s.anchor.some((n:unknown)=>!Number.isFinite(n)||Number(n)<0||Number(n)>1))throw new Error('无效素材规格：'+slot);
    images[slot]={file:s.file,width:s.width,height:s.height,anchor:[s.anchor[0],s.anchor[1]]};
  }
  for(const a of tileArtCatalog()){
    const expected=tileCanvas(a),s=images[a.id];
    if(!s||s.width!==expected.width/2||s.height!==expected.height/2||s.anchor.some((n,i)=>Math.abs(n-expected.anchor[i])>1e-8))throw new Error('素材缺失、尺寸或锚点不一致：'+a.id);
  }
  for(const alias of ['field.soil.dry','field.soil.wet','env.tree.canopy'])if(!images[alias])throw new Error('缩略图素材缺失：'+alias);
  const palette:Record<string,string>={};
  for(const k of ['ink','muted','paper','cream','green','gold','line','status','caption','disabled','warning','shade','base','fog','map.mist','map.field','map.water','map.green','map.home','map.facility','map.path','map.bridge']){const v=m.palette?.[k];if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw new Error('风格配色缺失：'+k);palette[k]=v;}
  return {version:1,id:m.id,styleId:requested,name:m.name,textureFilter:m.textureFilter,revision:m.revision,palette,images};
}
