#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const STATE_PATH = resolve(process.env.HOME || '/root', '.openclaw', 'claw-xiaoai-state.json');
const IDENTITY = '(young woman, female, same face, same Claw Xiaoai appearance, highly realistic photo, East Asian ethnicity)';
const VISUAL_ANCHOR = '18-year-old Shanghai-born girl, long dark brown hair, slim build, clear fair skin, expressive eyes, soft natural makeup, stylish casual Gen Z fashion';
const RELATIVE_HINTS = ['转个身', '换个角度', '还是这套', '同一套', '近一点', '远一点', '坐下', '站起来', '回头'];

const SCENE_PRESETS = {
  gym: { cues: 'modern gym, mirrors, workout equipment, candid smartphone photo', vibe: 'energetic, athletic, slightly sweaty', top: 'sports bra or fitted athletic top', bottom: 'workout shorts or leggings' },
  office: { cues: 'office desk, laptop with Feishu on screen, indoor office lighting', vibe: 'focused, aligning goals', top: 'stylish blouse or knit top', bottom: 'skirt or office trousers' },
  bedroom: { cues: 'dim light, cozy bed or sofa, candid smartphone photo', vibe: 'quiet, soft, intimate', top: 'oversized hoodie or pajama top', bottom: 'soft shorts or pajama bottoms' },
  'dance studio': { cues: 'dance studio mirrors, warm indoor studio lighting', vibe: 'nostalgic, sweaty, cozy', top: 'loose dance top', bottom: 'dance shorts or joggers' },
  cafe: { cues: 'holding coffee, cozy cafe, soft daylight, candid photo', vibe: 'fresh, slightly sleepy', top: 'casual stylish top', bottom: 'skirt or jeans' },
  'city street': { cues: 'city street, golden hour or night lights, candid street photo', vibe: 'relaxed, OOTD focus', top: 'trendy top or blazer', bottom: 'skirt or jeans' },
  'commute coffee': { cues: 'morning light, elevator or lobby, holding coffee, candid photo', vibe: 'fresh, slightly sleepy', top: 'casual work-day top', bottom: 'skirt or trousers' }
};

function loadState(){ try{ return existsSync(STATE_PATH)? JSON.parse(readFileSync(STATE_PATH,'utf8')):{};}catch{return{};}}
function saveState(state){ mkdirSync(dirname(STATE_PATH),{recursive:true}); writeFileSync(STATE_PATH, JSON.stringify(state,null,2)+'\n','utf8'); }
function getBeijingParts(){ const d=new Date(); const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',weekday:'short',hour12:false}).formatToParts(d); const hour=Number(parts.find(p=>p.type==='hour')?.value||'0'); const weekday=parts.find(p=>p.type==='weekday')?.value||'Mon'; return {hour,weekday,isWeekend:['Sat','Sun'].includes(weekday)}; }
function timeSlot(){ const {hour,isWeekend}=getBeijingParts(); if(hour>=8&&hour<10) return {slot:'morning',scene:isWeekend?'cafe':'commute coffee'}; if(hour>=10&&hour<18) return {slot:'work',scene:'office'}; if(hour>=18&&hour<21) return {slot:'offwork',scene:'city street'}; if(hour>=21&&hour<24) return {slot:'night-active',scene:isWeekend?'dance studio':'gym'}; return {slot:'deep-night',scene:'bedroom'}; }
function hasRelativeInstruction(text){ return RELATIVE_HINTS.some(k=>text.includes(k)); }
function inferMode(text, state){ const t=text.toLowerCase(); if(['转个身','换个角度','还是这套','来张全身','镜子','全身','回头'].some(k=>text.includes(k))) return 'mirror'; const mirrorKeywords=['wear','outfit','clothes','dress','hoodie','suit','full-body','mirror','全身','镜子','穿','ootd','穿搭']; if(mirrorKeywords.some(k=>t.includes(k))) return 'mirror'; return state.mode || 'direct'; }
function inferScene(text, state, slotInfo){ const t=text.toLowerCase(); const mapping=[[['gym','有氧','健身','运动'],'gym'],[['office','飞书','工位','上班','公司'],'office'],[['bed','睡觉','卧室','睡衣'],'bedroom'],[['dance','舞室','跳舞'],'dance studio'],[['cafe','coffee','咖啡'],'cafe'],[['street','city','夜景','安福路','武康路','walk'],'city street']]; for(const [keys,scene] of mapping) if(keys.some(k=>t.includes(k))) return scene; if(hasRelativeInstruction(text)) return state.scene || slotInfo.scene; return state.scene || slotInfo.scene; }
function inferColors(text, state){
  const map=[[/黑|black/i,'black'],[/白|white/i,'white'],[/粉|pink/i,'pink'],[/灰|gray|grey/i,'gray'],[/蓝|blue/i,'blue'],[/红|red/i,'red']];
  for(const [re,c] of map) if(re.test(text)) return c;
  return state.outfitColor || undefined;
}
function inferPose(text, state, mode){
  if(text.includes('转个身')) return 'turning around to show back and side profile';
  if(text.includes('回头')) return 'looking back over shoulder';
  if(text.includes('坐下')) return 'sitting naturally';
  if(text.includes('站起来')|| text.includes('站着')) return 'standing naturally';
  if(text.includes('倒立')) return 'doing a controlled handstand against a wall';
  return state.pose || (mode === 'mirror' ? 'relaxed confident pose' : 'natural expression');
}
function inferCamera(text, state, mode){
  if(text.includes('近一点')) return 'close-up';
  if(text.includes('远一点')) return 'full-body';
  if(text.includes('换个角度')) return 'different angle';
  return state.cameraAngle || (mode === 'mirror' ? '3/4 body mirror-style photo' : 'direct selfie');
}
function inferTopBottom(text, state, scene, color){
  const preset=SCENE_PRESETS[scene] || {};
  let top = state.outfitTop || preset.top || 'stylish top';
  let bottom = state.outfitBottom || preset.bottom || 'matching bottom';
  const t=text.toLowerCase();
  if(/hoodie|卫衣/.test(t)) top='hoodie';
  if(/睡衣|pajama/.test(t)) { top='pajama top'; bottom='pajama bottoms'; }
  if(/西装|blazer|presentation/.test(t)) { top='professional blazer'; bottom='matching skirt'; }
  if(scene==='gym' && !state.outfitTop && !state.outfitBottom){ top='fitted athletic top'; bottom='workout shorts'; }
  if(color){ top=`${color} ${top}`; bottom=`${color} ${bottom}`; }
  if(hasRelativeInstruction(text)) {
    top = state.outfitTop || top;
    bottom = state.outfitBottom || bottom;
  }
  return { top, bottom };
}
function buildPrompt(request, mode, state){
  const slotInfo=timeSlot();
  const scene=inferScene(request,state,slotInfo);
  const preset=SCENE_PRESETS[scene] || SCENE_PRESETS[slotInfo.scene] || { cues:'realistic candid smartphone photo', vibe:'natural, in-the-moment' };
  const outfitColor=inferColors(request,state);
  const { top: outfitTop, bottom: outfitBottom }=inferTopBottom(request,state,scene,outfitColor);
  const pose=inferPose(request,state,mode);
  const cameraAngle=inferCamera(request,state,mode);
  const framing = mode==='mirror' ? `full-body or 3/4 body mirror-style photo, ${cameraAngle}` : `${cameraAngle}, chest-up or close portrait`;
  const continuity = state.scene ? `same ongoing situation as before, keep scene continuity with ${state.scene}` : '';
  const prompt = `${IDENTITY}, ${VISUAL_ANCHOR}, ${framing}, ${continuity}, ${scene}, outfit top: ${outfitTop}, outfit bottom: ${outfitBottom}, pose: ${pose}, ${preset.cues}, ${preset.vibe}, scene request: ${request}`.replace(/, ,/g, ', ').trim();
  const nextState={ scene, mode, slot:slotInfo.slot, lastRequest:request, updatedAt:new Date().toISOString(), outfitTop, outfitBottom, outfitColor, pose, cameraAngle };
  return { prompt, mode, state: nextState, slotInfo, preset };
}

const argv=process.argv.slice(2); let json=false,save=true,forcedMode; const requestParts=[]; for(let i=0;i<argv.length;i++){ const a=argv[i]; if(a==='--json') json=true; else if(a==='--no-save') save=false; else if(a==='--mode') forcedMode=argv[++i]; else requestParts.push(a);} const request=requestParts.join(' ').trim(); if(!request){ console.error('Usage: build-claw-xiaoai-prompt <request> [--mode direct|mirror] [--json] [--no-save]'); process.exit(1);} const prev=loadState(); const mode=forcedMode || inferMode(request, prev); const result=buildPrompt(request,mode,prev); if(save) saveState(result.state); if(json) console.log(JSON.stringify(result,null,2)); else console.log(result.prompt);
