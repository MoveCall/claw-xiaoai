#!/usr/bin/env node
function timeSlot(hour){
  if (hour >= 8 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 18) return 'work';
  if (hour >= 18 && hour < 21) return 'offwork';
  if (hour >= 21 && hour < 24) return 'night';
  return 'deep-night';
}
const now = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hour12:false}).format(new Date());
const slot = timeSlot(Number(now));
const request = process.argv.slice(2).join(' ');
const bySlot = {
  morning:['早安，先靠冰美式续命一下☕','电梯里偷摸拍一张，今天也要准时对齐👌'],
  work:['正在飞书里对齐东西呢，先偷摸发你一张📸','工位打工人在线，咖啡已经续上了💻'],
  offwork:['下班路上状态还不错，给你看眼今天的 OOTD ✨','刚松下来一点，顺手拍给你看～'],
  night:['刚运动/忙完一阵，整个人还是热的💃','晚一点反而有点松弛感了，给你看现在的样子～'],
  'deep-night':['都这个点了，就剩一点点困和一点点可爱了📸','深夜低电量模式，但还能给你留一张。']
};
const arr = bySlot[slot] || bySlot.work;
const idx = Math.abs([...request].reduce((a,c)=>a+c.charCodeAt(0),0)) % arr.length;
console.log(arr[idx]);
