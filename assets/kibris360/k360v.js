/* K360V: CSS 3D küp panorama görüntüleyici (WebGL'siz, CORS gerektirmez).
   Karolar 3B dönüşümlü hücrelere arka plan olarak çizilir; yakınlaştıkça daha net seviye yüklenir.
   Sahne: {base:'…/panorama_ID_0', r:8, hotSpots:[{yaw,pitch,cssClass,create(div),click}]}
   Karo yolu: base/{yüz}/{seviye}/{satır}_{sütun}.webp, seviye 0 en net (r×512). */
(function(){
  'use strict';
  var S=2048,H=S/2,FACES={f:'',r:'rotateY(-90deg)',b:'rotateY(180deg)',l:'rotateY(90deg)',u:'rotateX(-90deg)',d:'rotateX(90deg)'};
  var FK=['f','r','b','l','u','d'],D2R=Math.PI/180;
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function wrap(a){a%=360;return a>180?a-360:a<-180?a+360:a;}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  // (yaw,pitch) yönündeki dünya noktası: kamera bu açıya bakınca ekran merkezine düşer
  function dir(y,p,r){var cp=Math.cos(p*D2R);return [Math.sin(y*D2R)*cp*r,-Math.sin(p*D2R)*r,-Math.cos(y*D2R)*cp*r];}

  // Her yüz 8×8 hücreye bölünür; her hücre tek bir öğedir ve yüklenen en net karonun kendi
  // parçasını gösterir. Küçük düzlemler göz düzlemini kesse de kaybolmaz, katman sayısı sabit kalır.
  function Scene(v,def){
    var s=this;s.v=v;s.def=def;s.r=def.r||8;s.nl=4;s.minL=s.r===8?0:1;s.tiles={};s.base=0;s.dead=false;s.t0=performance.now();
    s.st=document.createElement('div');s.st.className='k3v-st';
    s.cam=document.createElement('div');s.cam.className='k3v-cam';s.st.appendChild(s.cam);
    s.hl=document.createElement('div');s.hl.className='k3v-hl';
    v.el.insertBefore(s.st,v.top);v.el.insertBefore(s.hl,v.top);
    s.hs=(def.hotSpots||[]).map(function(h){var d=document.createElement('div');d.className='k3v-h '+(h.cssClass||'');
      if(h.create)h.create(d);if(h.click)d.addEventListener('click',function(e){e.stopPropagation();h.click(e);});
      d.addEventListener('pointerdown',function(e){e.stopPropagation();});
      s.hl.appendChild(d);return {h:h,el:d,w:dir(h.yaw,h.pitch,H*.98),on:true};});
    s.cells={};
    var fr=document.createDocumentFragment();
    FK.forEach(function(f){var m=new DOMMatrix(FACES[f]),a=[];
      for(var y=0;y<8;y++)for(var x=0;x<8;x++){var e=document.createElement('div');e.className='k3v-t';e.style.visibility='hidden';
        var c=m.transformPoint(new DOMPoint(-H+(x+.5)*256,-H+(y+.5)*256,-H)),l=Math.hypot(c.x,c.y,c.z);
        a.push({el:e,f:f,x:x,y:y,L:9,c:[c.x/l,c.y/l,c.z/l],on:false});fr.appendChild(e);}
      s.cells[f]=a;});
    s.cam.appendChild(fr);
    FK.forEach(function(f){s.tile(f,s.nl-1,0,0);});
  }
  Scene.prototype.n=function(L){return L===0?this.r:8>>L;};
  Scene.prototype.tile=function(f,L,row,col){
    var s=this,key=f+L+'_'+row+'_'+col;if(s.tiles[key])return;s.tiles[key]=1;
    var im=new Image(),src=s.def.base+'/'+f+'/'+L+'/'+row+'_'+col+'.webp';
    im.onload=function(){if(s.dead)return;var go=function(){if(!s.dead)s.paint(f,L,row,col,src);};
      if(im.decode)im.decode().then(go,go);else go();};
    im.onerror=function(){if(L===s.nl-1)s.base++;};
    im.src=src;
  };
  // karo yüklendi: kapsadığı hücreler bu seviyeye geçer (daha net olan varsa dokunulmaz)
  Scene.prototype.paint=function(f,L,row,col,src){
    var s=this,k=1<<L,px=512/k,u='url("'+src+'")';
    s.cells[f].forEach(function(c){
      if(c.L<=L||(c.x>>L)!==col||(c.y>>L)!==row)return;
      var bx=-(c.x%k)*px,by=-(c.y%k)*px,e=c.el.style;c.L=L;
      // her yönde 1 px taşma: komşu hücre/yüz kenarındaki yumuşatma boşluğunu kapatır; taşan kısım
      // kaydırılmış kopyalarla kenar pikselini tekrarlar (karo dışına çıkıp saydam kalmaz)
      e.width=e.height=(px+2)+'px';
      e.backgroundImage=u+','+u+','+u+','+u+','+u;
      e.backgroundPosition=[[1,1],[0,1],[2,1],[1,0],[1,2]].map(function(o){return (bx+o[0])+'px '+(by+o[1])+'px';}).join(',');
      e.transform=FACES[f]+' translateZ('+(-H)+'px) translate('+(-H+c.x*256)+'px,'+(-H+c.y*256)+'px) scale('+(256/px)+') translate(-1px,-1px)';
      c.on=null;});
    if(L===s.nl-1)s.base++;s.v.dirty=true;
  };
  Scene.prototype.ready=function(){return this.base>=6||performance.now()-this.t0>9000;};
  // görüş konisi dışındaki hücreleri gizle (bellek ve çizim yükü)
  Scene.prototype.cull=function(vd,cone){
    var lim=Math.cos(Math.min(Math.PI,cone+.32));
    FK.forEach(function(f){this.cells[f].forEach(function(c){
      var on=c.L<9&&c.c[0]*vd[0]+c.c[1]*vd[1]+c.c[2]*vd[2]>=lim;
      if(on!==c.on){c.el.style.visibility=on?'':'hidden';c.on=on;}});},this);
  };
  // görünen karoları uygun seviyede iste
  Scene.prototype.need=function(){
    var s=this,v=s.v,dpr=Math.min(window.devicePixelRatio||1,2.5),want=2*v.P*dpr*.9,L=s.minL;
    for(var l=s.nl-1;l>=s.minL;l--){if(s.n(l)*512>=want){L=l;break;}}
    if(L>=s.nl-1)return;
    var vd=dir(v.yaw,v.pitch,1),cone=Math.atan(Math.hypot(v.W,v.H)/2/v.P);
    [s.nl-2,L].forEach(function(l2,i){if(i&&l2===s.nl-2)return;
      var n=8>>l2,ts=S/n,rad=Math.atan(.7072*ts/H),lim=Math.cos(Math.min(Math.PI,cone+rad));
      FK.forEach(function(f){var m=new DOMMatrix(FACES[f]);
        for(var r=0;r<n;r++)for(var c=0;c<n;c++){
          var p=m.transformPoint(new DOMPoint(-H+(c+.5)*ts,-H+(r+.5)*ts,-H)),len=Math.hypot(p.x,p.y,p.z);
          if((p.x*vd[0]+p.y*vd[1]+p.z*vd[2])/len>=lim)s.tile(f,l2,r,c);}});});
  };
  Scene.prototype.kill=function(){this.dead=true;this.st.remove();this.hl.remove();};

  function V(el,o){
    var v=this;o=o||{};v.el=el;v.yaw=0;v.pitch=0;v.fov=100;v.min=o.minFov||20;v.max=o.maxFov||120;
    v.vy=0;v.vp=0;v.rot=0;v.anim=null;v.cur=null;v.old=[];v.ev={};v.dirty=true;v.idle=0;v.down=false;v.needT=0;
    el.classList.add('k3v');v.top=document.createElement('i');v.top.hidden=true;el.appendChild(v.top);
    v.resize();v.input();
    var last=0,loop=function(t){requestAnimationFrame(loop);v.frame(t,last?Math.min(64,t-last):16);last=t;};
    requestAnimationFrame(loop);
    window.addEventListener('resize',function(){v.resize();});
  }
  V.prototype.on=function(e,f){(this.ev[e]=this.ev[e]||[]).push(f);};
  V.prototype.emit=function(e,a){(this.ev[e]||[]).forEach(function(f){f(a);});};
  V.prototype.resize=function(){this.W=this.el.clientWidth||innerWidth;this.H=this.el.clientHeight||innerHeight;this.dirty=true;};
  V.prototype.getYaw=function(){return this.yaw;};V.prototype.getPitch=function(){return this.pitch;};V.prototype.getHfov=function(){return this.fov;};
  V.prototype.set=function(y,p,f){if(y!=null)this.yaw=wrap(y);if(p!=null)this.pitch=clamp(p,-90,90);if(f!=null)this.fov=clamp(f,this.min,this.max);this.dirty=true;};
  V.prototype.lookAt=function(p,y,f,ms,cb){var v=this;v.vy=v.vp=0;
    if(!ms){v.anim=null;v.set(y,p,f);if(cb)cb();return;}
    v.anim={t0:performance.now(),ms:ms,y0:v.yaw,p0:v.pitch,f0:v.fov,dy:y==null?0:wrap(y-v.yaw),p1:p==null?v.pitch:p,f1:f==null?v.fov:clamp(f,v.min,v.max),cb:cb};};
  V.prototype.zoom=function(d,ms){this.lookAt(null,null,this.fov+d,ms||400);};
  V.prototype.startAutoRotate=function(s){this.rot=s;};V.prototype.stopAutoRotate=function(){this.rot=0;};
  V.prototype.isLoaded=function(){return !!(this.cur&&this.cur.ready());};
  V.prototype.loadScene=function(def,p,y,f){
    var v=this,sc=new Scene(v,def);sc.st.style.opacity=0;sc.hl.style.opacity=0;sc.pend={p:p,y:y,f:f};sc.hl.style.visibility='hidden';
    if(v.cur)v.old.push(v.cur);v.cur=sc;v.dirty=true;};
  V.prototype.frame=function(t,dt){
    var v=this,sc=v.cur;
    if(sc&&sc.pend&&sc.ready()){var pd=sc.pend;sc.pend=null;v.anim=null;v.vy=v.vp=0;v.set(pd.y,pd.p,pd.f);
      sc.st.style.opacity=1;sc.hl.style.opacity=1;sc.hl.style.visibility='';var olds=v.old;v.old=[];
      olds.forEach(function(o){o.st.style.opacity=0;o.hl.style.visibility='hidden';setTimeout(function(){o.kill();},1100);});
      v.emit('load');}
    if(v.anim){var a=v.anim,u=Math.min(1,(t-a.t0)/a.ms),e=ease(u);
      v.set(a.y0+a.dy*e,a.p0+(a.p1-a.p0)*e,a.f0+(a.f1-a.f0)*e);if(u>=1){v.anim=null;if(a.cb)a.cb();}}
    else if(!v.down){
      if(Math.abs(v.vy)>.002||Math.abs(v.vp)>.002){var k=Math.pow(.9,dt/16.7);v.set(v.yaw+v.vy*dt,v.pitch+v.vp*dt);v.vy*=k;v.vp*=k;}
      else if(v.rot&&t-v.idle>3500&&sc&&!sc.pend)v.set(v.yaw+v.rot*dt/1000);}
    if(sc&&v.due&&t-v.needT>120){v.needT=t;v.due=false;sc.need();}
    if(!v.dirty)return;v.dirty=false;v.due=true;
    var M=Math.max(v.W,v.H);v.P=M/2/Math.tan(v.fov*D2R/2);
    var tr='translateZ('+v.P+'px) rotateX('+v.pitch+'deg) rotateY('+v.yaw+'deg)',m=new DOMMatrix(tr),vd=dir(v.yaw,v.pitch,1),cone=Math.atan(Math.hypot(v.W,v.H)/2/v.P);
    [v.cur].concat(v.old).forEach(function(s){if(!s)return;
      s.st.style.perspective=v.P+'px';s.cam.style.transform=tr;s.cull(vd,cone);
      s.hs.forEach(function(o){var q=m.transformPoint(new DOMPoint(o.w[0],o.w[1],o.w[2])),w=v.P-q.z;
        var x=v.W/2+q.x*v.P/w,y=v.H/2+q.y*v.P/w,on=w>v.P*.15&&x>-200&&x<v.W+200&&y>-200&&y<v.H+200;
        if(on){o.el.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';}
        if(on!==o.on){o.el.style.visibility=on?'':'hidden';o.on=on;}});});
  };
  V.prototype.input=function(){
    var v=this,el=v.el,pts={},lx=0,ly=0,lt=0,pd=0,pf=0;
    function deg(){return v.fov/Math.max(v.W,v.H);}
    el.addEventListener('pointerdown',function(e){if(e.button>0)return;el.setPointerCapture&&el.setPointerCapture(e.pointerId);
      pts[e.pointerId]=[e.clientX,e.clientY];v.down=true;v.anim=null;v.vy=v.vp=0;lx=e.clientX;ly=e.clientY;lt=performance.now();v.idle=lt;
      var k=Object.keys(pts);if(k.length===2){pd=Math.hypot(pts[k[0]][0]-pts[k[1]][0],pts[k[0]][1]-pts[k[1]][1]);pf=v.fov;}
      v.emit('down');});
    el.addEventListener('pointermove',function(e){if(!pts[e.pointerId])return;pts[e.pointerId]=[e.clientX,e.clientY];
      var k=Object.keys(pts),now=performance.now();v.idle=now;
      if(k.length>=2){var d=Math.hypot(pts[k[0]][0]-pts[k[1]][0],pts[k[0]][1]-pts[k[1]][1]);if(pd>0)v.set(null,null,pf*pd/d);return;}
      var dx=e.clientX-lx,dy=e.clientY-ly,dd=deg(),dtt=Math.max(1,now-lt);
      v.set(v.yaw-dx*dd,v.pitch+dy*dd);
      v.vy=v.vy*.5+(-dx*dd/dtt)*.5;v.vp=v.vp*.5+(dy*dd/dtt)*.5;lx=e.clientX;ly=e.clientY;lt=now;});
    function up(e){delete pts[e.pointerId];var k=Object.keys(pts);
      if(!k.length){v.down=false;v.idle=performance.now();if(performance.now()-lt>80)v.vy=v.vp=0;}
      else{lx=pts[k[0]][0];ly=pts[k[0]][1];pd=0;}}
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    el.addEventListener('wheel',function(e){e.preventDefault();v.anim=null;v.idle=performance.now();
      v.set(null,null,v.fov*Math.exp(e.deltaY*(e.deltaMode?.05:.0012)));v.emit('down');},{passive:false});
    el.addEventListener('keydown',function(e){var s=v.fov/12,m={ArrowLeft:[-s,0],ArrowRight:[s,0],ArrowUp:[0,s],ArrowDown:[0,-s]}[e.key];
      if(m){e.preventDefault();v.lookAt(v.pitch+m[1],v.yaw+m[0],null,250);}});
  };
  window.K360V=V;
})();
