(function(){
var box=document.getElementById('cd');if(!box)return;
var end=new Date(box.getAttribute('data-end')).getTime();
var ctx=null,on=false,last=-1,muted=false;
var b=document.getElementById('snd');
function label(){if(b)b.textContent=on?'Sesi kapat':'Sesi aç';}
function tick(){
  if(!on||!ctx||ctx.state!=='running')return;
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
function enable(){
  if(muted||on)return;
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{
    if(!ctx)ctx=new AC();
    var p=ctx.resume();
    var done=function(){if(ctx.state==='running'&&!muted){on=true;label();tick();}};
    if(p&&p.then)p.then(done,function(){});else done();
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
if(b){b.addEventListener('click',function(e){
  e.stopPropagation();
  if(on){on=false;muted=true;label();}
  else{muted=false;enable();}
});}
// Tarayıcılar ses için kullanıcı dokunuşu ister: ilk dokunuşta otomatik açılır.
var evs=['pointerdown','touchend','click','keydown'];
function first(){enable();if(on){for(var i=0;i<evs.length;i++)document.removeEventListener(evs[i],first,true);}}
for(var i=0;i<evs.length;i++)document.addEventListener(evs[i],first,true);
enable();
label();
})();
