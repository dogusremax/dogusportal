(function(){
var box=document.getElementById('cd');if(!box)return;
var end=new Date(box.getAttribute('data-end')).getTime();
var ctx=null,on=false,last=-1;
function tick(){
  if(!on||!ctx)return;
  try{
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.value=1100;
    g.gain.setValueAtTime(0.0001,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.06);
    o.connect(g);g.connect(ctx.destination);
    o.start();o.stop(ctx.currentTime+0.07);
  }catch(e){}
}
function draw(){
  var d=Math.max(0,end-Date.now()),s=Math.floor(d/1000);
  document.getElementById('cg').textContent=Math.floor(s/86400);
  document.getElementById('cs').textContent=Math.floor(s%86400/3600);
  document.getElementById('cm').textContent=Math.floor(s%3600/60);
  document.getElementById('cn').textContent=s%60;
  if(s!==last&&s>0){last=s;tick();}
}
draw();setInterval(draw,250);
var b=document.getElementById('snd');
if(b){b.addEventListener('click',function(){
  if(!on){
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    if(!ctx)ctx=new AC();
    if(ctx.state==='suspended')ctx.resume();
    on=true;b.textContent='Sesi kapat';tick();
  }else{on=false;b.textContent='Sesi aç';}
});}
})();
