/* İlan karuseli ek tasarımları (karusel.html; danışman ve broker aynı sayfada).
   Her tasarım aynı veriyi (S, IMGS, danisman()) kendi düzeniyle çizer; yardımcılar sayfadan gelir. */
(function(){
const ARIAL='Arial, "Helvetica Neue", Helvetica, sans-serif';
const GOLD='#C8A45D', BLACK='#0B0B0D', BLUE='#1A5BD6', BLUE2='#0D3A99', LIGHT='#EAF1FD', GRAY='#4A5468';

/* ---------- ortak yardımcılar ---------- */
const U=t=>(t||'').toLocaleUpperCase('tr-TR');
function fit(ctx,t,maxW,fs,min,w,sp){ while(fs>min && tw(ctx,t,fs,w,sp)>maxW) fs-=2; return fs; }
function lines(ctx,text,size,maxW){ return richLines(ctx,text,size,400,700,maxW); }
/* *kalın* kelimeler ayrı renkte; align: left | center */
function rich(ctx,L,x,y,size,lh,c1,c2,align){
  L.forEach((ln,i)=>{ let w=0; ln.forEach(wd=>w+=tw(ctx,wd.t,size,wd.b?700:400,0));
    let cx=align==='center'?x-w/2:x; ln.forEach(wd=>{ cx+=txt(ctx,wd.t,cx,y+i*lh,size,wd.b?700:400,wd.b?c2:c1,0); }); });
}
function sigdir(ctx,text,size,min,maxW,maxL){ let L; while(true){ L=lines(ctx,text,size,maxW); if(L.length<=maxL||size<=min) return {L,size}; size-=4; } }
function ikon(ctx,key,x,y,s,color,lw){ const ic=ICONS[key]||ICONS.anahtar; ctx.save(); ctx.translate(x,y); ctx.scale(s/24,s/24);
  ctx.strokeStyle=color; ctx.lineWidth=lw||1.7; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke(new Path2D(ic[1])); ctx.restore(); }
function dKoyu(ctx,x,y,h,center){ const im=window.LOGOKOYU||window.LOGOIMG; if(!im) return; const w=h*im.naturalWidth/im.naturalHeight; ctx.drawImage(im,center?x-w/2:x,y,w,h); }
function dBeyaz(ctx,x,y,h,center,shadow){ const im=window.LOGOIMG; if(!im) return; const w=h*im.naturalWidth/im.naturalHeight;
  ctx.save(); if(shadow!==false){ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=16; ctx.shadowOffsetY=6;} ctx.drawImage(im,center?x-w/2:x,y,w,h); ctx.restore(); }
/* danışmanın dekupe fotoğrafı, alt kenarı bottom'a oturur */
function boy(ctx,d,cx,bottom,h){ const im=DANIMG[d.id]; if(!im) return; h=h*(d.kh||860)/860; const w=h*im.naturalWidth/im.naturalHeight; ctx.drawImage(im,cx-w/2,bottom-h,w,h); }
function avatar(ctx,d,cx,cy,r,bg,ring,ringW){
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill(); ctx.clip();
  const im=DANIMG[d.id]; if(im){ const D=2*r, iw=D*1.6, ih=iw*im.naturalHeight/im.naturalWidth, top=cy-D*.56; ctx.drawImage(im,cx-iw/2,top,iw,ih); }
  ctx.restore(); if(ring){ ctx.beginPath(); ctx.arc(cx,cy,r+(ringW||4)/2,0,Math.PI*2); ctx.strokeStyle=ring; ctx.lineWidth=ringW||4; ctx.stroke(); }
}
function isim(d){ const p=d.ad.split(' '), last=p.pop(); return {first:p.join(' '), last}; }
function adSatir(ctx,d,x,y,size,c1,c2,maxW,align){ const n=isim(d); let s=size; while(s>18 && tw(ctx,n.first+' ',s,400,0)+tw(ctx,n.last,s,700,0)>maxW) s-=2;
  const w1=tw(ctx,n.first+' ',s,400,0), w=w1+tw(ctx,n.last,s,700,0); const x0=align==='center'?x-w/2:align==='right'?x-w:x;
  txt(ctx,n.first+' ',x0,y,s,400,c1,0); txt(ctx,n.last,x0+w1,y,s,700,c2||c1,0); }
function cnt(ctx,n,T,x,y,color,align){ return txt(ctx,String(n).padStart(2,'0')+' / '+String(T).padStart(2,'0'),x,y,22,700,color,.12,align||'right'); }
function pill(ctx,t,x,y,h,fs,bg,color,align,stroke){ const w=tw(ctx,t,fs,700,.18)+h*.9; const x0=align==='right'?x-w:align==='center'?x-w/2:x;
  rr(ctx,x0,y,w,h,h/2); if(bg){ctx.fillStyle=bg; ctx.fill();} if(stroke){ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke();}
  txt(ctx,t,x0+w/2,y+h/2+fs*.36,fs,700,color,.18,'center'); return w; }
function chipList(c){ return (c.chips||'').split(',').map(s=>s.trim()).filter(Boolean); }
/* etiketleri satırlara dizer; maxRows'u aşanlar gösterilmez. Dönen: kullanılan yükseklik */
function chips(ctx,list,x,y,maxW,h,fs,st,maxRows){
  const rows=[[]]; let rw=0; list.forEach(ch=>{ const w=tw(ctx,ch,fs,700,0)+h*.9; if(rw+w>maxW && rows[rows.length-1].length){ if(rows.length>=(maxRows||1)) return; rows.push([]); rw=0; } if(w<=maxW){ rows[rows.length-1].push([ch,w]); rw+=w+10; } });
  if(!rows[0].length) return 0;
  rows.forEach((r,ri)=>{ let cx=x; const yy=y+ri*(h+10); r.forEach(([t,w])=>{ rr(ctx,cx,yy,w,h,h/2); if(st.bg){ctx.fillStyle=st.bg; ctx.fill();} if(st.stroke){ctx.strokeStyle=st.stroke; ctx.lineWidth=2; ctx.stroke();}
    txt(ctx,t,cx+w/2,yy+h/2+fs*.36,fs,700,st.color,0,'center'); cx+=w+10; }); });
  return rows.length*h+(rows.length-1)*10;
}
function statYaz(ctx,big,x,y,size,color,align){ const m=String(big).match(/^(.*?)(\s*m²)$/);
  const a=m?m[1]:String(big), b=m?m[2]:''; const w=tw(ctx,a,size,700,-.02)+(b?tw(ctx,b,size*.5,700,0):0); const x0=align==='center'?x-w/2:x;
  const wa=txt(ctx,a,x0,y,size,700,color,-.02); if(b) txt(ctx,b,x0+wa,y,size*.5,700,color,0); return w; }
function stats(f){ return (f.stats||[]).filter(s=>s[0]); }
function items(f,max){ return (f.items||[]).filter(it=>it[1]).slice(0,max||8); }
function fotoAlan(ctx,sl,i,x,y,w,h,gap,r,gapColor,yan){
  const a=IMGS['s'+i+'a']||{}, b=IMGS['s'+i+'b']||{};
  const kirp=(img,xx,yy,ww,hh,f,axis)=>{ ctx.save(); if(r){ rr(ctx,xx,yy,ww,hh,r); ctx.clip(); } coverImg(ctx,img,xx,yy,ww,hh,axis==='x'?f:50,axis==='y'?f:50); ctx.restore(); };
  if(sl.tip==='ikili'){
    if(yan){ const hw=(w-gap)/2; kirp(a.img,x,y,hw,h,a.f,'x'); kirp(b.img,x+hw+gap,y,hw,h,b.f,'x'); if(!r&&gapColor){ ctx.fillStyle=gapColor; ctx.fillRect(x+hw,y,gap,h); } }
    else { const hh=(h-gap)/2; kirp(a.img,x,y,w,hh,a.f,'y'); kirp(b.img,x,y+hh+gap,w,hh,b.f,'y'); if(!r&&gapColor){ ctx.fillStyle=gapColor; ctx.fillRect(x,y+hh,w,gap); } }
  } else kirp(a.img,x,y,w,h,a.f,'x');
}
function telOf(d){ return d.tel||OFIS_TEL; }
function projeAdi(c){ return [c.the,c.proje].filter(Boolean).join(' '); }
/* "The" ince, proje adı kalın; fs otomatik küçülür */
function projeYaz(ctx,c,x,y,maxW,fs,min,c1,c2,align,upper){
  const the=upper?U(c.the):c.the||'', pr=upper?U(c.proje):c.proje||''; const sp=upper?.06:-.02;
  const w=s=>(the?tw(ctx,the+' ',s,400,sp):0)+tw(ctx,pr,s,700,sp); while(fs>min && w(fs)>maxW) fs-=2;
  let x0=align==='center'?x-w(fs)/2:x; if(the) x0+=txt(ctx,the+' ',x0,y,fs,400,c1,sp); txt(ctx,pr,x0,y,fs,700,c2||c1,sp); return fs;
}
function konumYaz(ctx,c,x,y,fs,color,bar){ if(!c.konum) return; let cx=x; if(bar){ ctx.fillStyle=bar; rr(ctx,x,y-fs*.45,44,5,2.5); ctx.fill(); cx+=60; } txt(ctx,U(c.konum),cx,y,fs,700,color,.3); }
function prog2(ctx,n,T,y,bg,fg,x,w){ x=x??64; w=w??W-128; rr(ctx,x,y,w,4,2); ctx.fillStyle=bg; ctx.fill(); rr(ctx,x,y,w*n/T,4,2); ctx.fillStyle=fg; ctx.fill(); }

/* ================= 1) BEYAZ ZARİF ================= */
const beyaz={ad:'Beyaz Zarif',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle='#F7F5F1'; ctx.fillRect(0,0,W,H);
  ctx.save(); rr(ctx,40,40,W-80,770,40); ctx.clip(); coverImg(ctx,IMGS.cover.img,40,40,W-80,770,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,40,0,300,[[0,'rgba(10,22,40,.45)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(40,40,W-80,260); ctx.restore();
  dBeyaz(ctx,84,80,72);
  if(c.badge) pill(ctx,U(c.badge),W-84,92,48,20,RED,'#fff','right');
  konumYaz(ctx,c,64,894,24,RED,RED);
  const bigW=c.big?tw(ctx,c.big,120,700,-.03):0; if(c.big) txt(ctx,c.big,W-64,986,120,700,RED,-.03,'right');
  projeYaz(ctx,c,64,980,W-128-bigW-40,88,44,NAVY,NAVY);
  let y=1044; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,32,W-128).slice(0,2); rich(ctx,L,64,y,32,40,GRAY,NAVY); y+=(L.length-1)*40+30; } else y-=20;
  chips(ctx,chipList(c),64,y,W-128,52,22,{stroke:'#D6CFC3',color:NAVY},1);
  ctx.fillStyle='#E3DED5'; ctx.fillRect(64,1186,W-128,2);
  avatar(ctx,d,110,1262,46,'#EDE8E0');
  adSatir(ctx,d,178,1256,30,NAVY,NAVY,440); txt(ctx,U(d.unvan),178,1288,16,700,'#8A8F9C',.2);
  txt(ctx,'ARAYIN',W-64,1236,16,700,'#8A8F9C',.24,'right'); txt(ctx,telOf(d),W-64,1284,38,700,NAVY,0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  ctx.fillStyle='#F7F5F1'; ctx.fillRect(0,0,W,H);
  fotoAlan(ctx,sl,i,40,40,W-80,920,16,36);
  ctx.save(); rr(ctx,40,40,W-80,240,36); ctx.clip(); ctx.fillStyle=lin(ctx,0,40,0,260,[[0,'rgba(10,22,40,.4)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(40,40,W-80,240); ctx.restore();
  dBeyaz(ctx,84,78,60);
  const cw=128; rr(ctx,W-84-cw,84,cw,46,23); ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fill(); cnt(ctx,n,T,W-84-cw/2,115,NAVY,'center');
  eyebrow(ctx,sl.label,64,1030,RED);
  const t=sigdir(ctx,sl.title||'',60,44,W-128,2); rich(ctx,t.L,64,1104,t.size,t.size*1.1,NAVY,RED);
  if(sl.sub){ const L=lines(ctx,sl.sub,28,W-128).slice(0,2); rich(ctx,L,64,1104+(t.L.length-1)*t.size*1.1+50,28,38,GRAY,NAVY); }
  prog2(ctx,n,T,H-34,'rgba(10,22,40,.1)',NAVY);
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle='#F7F5F1'; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,64,56,70); cnt(ctx,n,T,W-64,102,NAVY);
  eyebrow(ctx,f.eyebrow,64,206,RED);
  txt(ctx,f.t1||'',64,292,fit(ctx,f.t1||'',W-128,72,40,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',64,370,fit(ctx,f.t2||'',W-128,72,40,700,-.02),700,RED,-.02);
  const st=stats(f); if(st.length){ const g=18, sw=(W-128-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*(sw+g); rr(ctx,x,420,sw,168,28); ctx.fillStyle='#fff'; ctx.fill();
      statYaz(ctx,big,x+sw/2,512,fit(ctx,big,sw-30,64,30,700,-.02),NAVY,'center'); txt(ctx,U(small),x+sw/2,554,18,700,'#8A8F9C',.2,'center'); }); }
  const it=items(f), tw2=(W-128-18)/2, th=126;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=622+Math.floor(k/2)*(th+16);
    rr(ctx,tx,ty,tw2,th,26); ctx.fillStyle='#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(tx+66,ty+th/2,38,0,Math.PI*2); ctx.fillStyle='rgba(225,27,43,.10)'; ctx.fill(); ikon(ctx,x[0],tx+66-19,ty+th/2-19,38,RED,1.8);
    const fs=fit(ctx,x[1],tw2-140,30,20,700,0); txt(ctx,x[1],tx+124,ty+th/2+fs*.36,fs,700,NAVY,0); });
  prog2(ctx,n,T,H-48,'rgba(10,22,40,.1)',NAVY);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(780,640,320,0,Math.PI*2); ctx.fillStyle='#F3EFE8'; ctx.fill();
  boy(ctx,d,770,1100,800);
  dKoyu(ctx,64,56,70); cnt(ctx,n,T,W-64,102,NAVY);
  eyebrow(ctx,c.eyebrow,64,230,RED,false);
  txt(ctx,c.h1||'',64,320,fit(ctx,c.h1||'',520,84,40,400,-.03),400,NAVY,-.03);
  txt(ctx,c.h2||'',64,406,fit(ctx,c.h2||'',520,84,40,700,-.03),700,RED,-.03);
  txt(ctx,c.h3||'',64,492,fit(ctx,c.h3||'',520,84,40,400,-.03),400,NAVY,-.03);
  rich(ctx,lines(ctx,c.desc||defDesc(),27,420).slice(0,4),64,560,27,38,GRAY,NAVY);
  txt(ctx,'PORTFÖY DANIŞMANI',64,856,18,700,RED,.24);
  const nm=isim(d); txt(ctx,nm.first,64,924,fit(ctx,nm.first,420,62,30,400,-.02),400,NAVY,-.02); txt(ctx,nm.last,64,988,fit(ctx,nm.last,420,62,30,700,-.02),700,NAVY,-.02);
  rr(ctx,40,1080,W-80,230,36); ctx.fillStyle=NAVY; ctx.fill();
  txt(ctx,'ARAYIN',88,1140,17,700,'rgba(255,255,255,.6)',.24); txt(ctx,telOf(d),88,1206,56,700,'#fff',0);
  txt(ctx,c.addr||'',88,1256,fit(ctx,c.addr||'',560,19,13,400,0),400,'rgba(255,255,255,.65)',0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-88-cw,1155,cw,80,40); ctx.fillStyle=RED; ctx.fill(); txt(ctx,c.cta,W-88-cw/2,1204,fs,700,'#fff',0,'center'); }
}};

/* ================= 2) KIRMIZI GÜÇ ================= */
const kirmizi={ad:'Kırmızı Güç',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(10,22,40,.6)'],[.2,'rgba(10,22,40,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,82);
  if(c.badge) pill(ctx,U(c.badge),W-64,74,48,20,NAVY,'#fff','right');
  ctx.beginPath(); ctx.moveTo(0,826); ctx.lineTo(W,726); ctx.lineTo(W,752); ctx.lineTo(0,852); ctx.closePath(); ctx.fillStyle=NAVY; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,852); ctx.lineTo(W,752); ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fillStyle=RED; ctx.fill();
  if(c.big){ const fs=fit(ctx,c.big,420,88,40,700,-.02), bw=tw(ctx,c.big,fs,700,-.02)+56; ctx.save(); ctx.shadowColor='rgba(0,0,0,.25)'; ctx.shadowBlur=24; ctx.shadowOffsetY=10;
    rr(ctx,64,672,bw,116,18); ctx.fillStyle='#fff'; ctx.fill(); ctx.restore(); txt(ctx,c.big,92,672+58+fs*.36,fs,700,RED,-.02); }
  boy(ctx,d,850,H,620);
  konumYaz(ctx,c,64,940,24,'#fff','#fff');
  projeYaz(ctx,c,64,1030,560,84,40,'#fff','#fff');
  let y=1084; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,560).slice(0,2); rich(ctx,L,64,y,30,38,'rgba(255,255,255,.92)','#fff'); y+=(L.length-1)*38+30; } else y-=24;
  chips(ctx,chipList(c),64,y,560,48,21,{stroke:'rgba(255,255,255,.75)',color:'#fff'},2);
  const bw=380, bx=W-40-bw; rr(ctx,bx,1218,bw,96,22); ctx.fillStyle=NAVY; ctx.fill();
  adSatir(ctx,d,bx+bw/2,1258,28,'#fff','#fff',bw-40,'center'); txt(ctx,telOf(d),bx+bw/2,1294,24,700,'rgba(255,255,255,.85)',.02,'center');
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  fotoAlan(ctx,sl,i,0,0,W,H,10,0,RED);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(10,22,40,.55)'],[.2,'rgba(10,22,40,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,68);
  const cw=132; rr(ctx,W-64-cw,62,cw,48,24); ctx.fillStyle=RED; ctx.fill(); cnt(ctx,n,T,W-64-cw/2,94,'#fff','center');
  const bw=900, t=sigdir(ctx,sl.title||'',58,42,bw-112,3), sL=sl.sub?lines(ctx,sl.sub,26,bw-112).slice(0,2):[];
  const h=58+(t.L.length)*t.size*1.08+(sL.length?18+sL.length*36:0)+34, y=H-90-h;
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=40; ctx.shadowOffsetY=16; ctx.fillStyle=RED; ctx.fillRect(0,y,bw,h); ctx.restore();
  if(sl.label) pill(ctx,U(sl.label),64,y-24,48,18,NAVY,'#fff');
  rich(ctx,t.L,64,y+58+t.size*.82,t.size,t.size*1.08,'#fff','#fff');
  if(sL.length) rich(ctx,sL,64,y+58+t.L.length*t.size*1.08+18+26,26,36,'rgba(255,255,255,.88)','#fff');
  prog2(ctx,n,T,H-46,'rgba(255,255,255,.3)','#fff');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=RED; ctx.fillRect(0,0,W,H);
  let g=ctx.createRadialGradient(W,H,0,W,H,1100); g.addColorStop(0,'rgba(120,0,10,.45)'); g.addColorStop(1,'rgba(120,0,10,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,70); cnt(ctx,n,T,W-64,102,'#fff');
  ctx.fillStyle=NAVY; rr(ctx,64,188,44,6,3); ctx.fill(); txt(ctx,U(f.eyebrow),124,198,20,700,'#fff',.24);
  txt(ctx,f.t1||'',64,286,fit(ctx,f.t1||'',W-128,74,40,400,-.02),400,'#fff',-.02); txt(ctx,f.t2||'',64,364,fit(ctx,f.t2||'',W-128,74,40,700,-.02),700,NAVY,-.02);
  const st=stats(f); if(st.length){ const sw=(W-128)/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*sw; if(k){ ctx.fillStyle='rgba(255,255,255,.3)'; ctx.fillRect(x,430,2,130); }
      statYaz(ctx,big,x+(k?36:0),500,fit(ctx,big,sw-50,80,30,700,-.02),'#fff'); txt(ctx,U(small),x+(k?36:0),546,18,700,'rgba(255,255,255,.75)',.2); }); }
  const it=items(f), tw2=(W-128-18)/2, th=124;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=610+Math.floor(k/2)*(th+16);
    rr(ctx,tx,ty,tw2,th,24); ctx.fillStyle='#fff'; ctx.fill();
    rr(ctx,tx+26,ty+26,72,72,18); ctx.fillStyle='rgba(225,27,43,.1)'; ctx.fill(); ikon(ctx,x[0],tx+44,ty+44,36,RED,1.9);
    const fs=fit(ctx,x[1],tw2-140,30,20,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,NAVY,0); });
  prog2(ctx,n,T,H-48,'rgba(255,255,255,.3)','#fff');
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,H);
  let g=ctx.createRadialGradient(800,620,0,800,620,520); g.addColorStop(0,'rgba(255,255,255,.16)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  boy(ctx,d,800,1120,830);
  dBeyaz(ctx,64,56,76); cnt(ctx,n,T,W-64,102,'#fff');
  ctx.fillStyle=RED; rr(ctx,64,214,44,6,3); ctx.fill(); txt(ctx,U(c.eyebrow),124,224,20,700,'rgba(255,255,255,.8)',.24);
  txt(ctx,c.h1||'',64,316,fit(ctx,c.h1||'',520,84,40,400,-.03),400,'#fff',-.03);
  txt(ctx,c.h2||'',64,402,fit(ctx,c.h2||'',520,84,40,700,-.03),700,RED,-.03);
  txt(ctx,c.h3||'',64,488,fit(ctx,c.h3||'',520,84,40,400,-.03),400,'#fff',-.03);
  rich(ctx,lines(ctx,c.desc||defDesc(),27,420).slice(0,4),64,556,27,38,'rgba(255,255,255,.72)','#fff');
  txt(ctx,'PORTFÖY DANIŞMANI',64,880,18,700,'rgba(255,255,255,.6)',.24);
  const nm=isim(d); txt(ctx,nm.first,64,944,fit(ctx,nm.first,430,58,30,400,-.02),400,'#fff',-.02); txt(ctx,nm.last,64,1006,fit(ctx,nm.last,430,58,30,700,-.02),700,'#fff',-.02);
  ctx.fillStyle=RED; ctx.fillRect(0,1120,W,H-1120);
  txt(ctx,'ARAYIN',64,1176,17,700,'rgba(255,255,255,.75)',.24); txt(ctx,telOf(d),64,1248,62,700,'#fff',0);
  txt(ctx,c.addr||'',64,1296,fit(ctx,c.addr||'',600,19,13,400,0),400,'rgba(255,255,255,.85)',0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-64-cw,1176,cw,80,40); ctx.fillStyle='#fff'; ctx.fill(); txt(ctx,c.cta,W-64-cw/2,1225,fs,700,RED,0,'center'); }
}};

/* ================= 3) LÜKS GECE ================= */
function cerceve(ctx){ ctx.strokeStyle='rgba(200,164,93,.85)'; ctx.lineWidth=2; ctx.strokeRect(32,32,W-64,H-64); }
const luks={ad:'Lüks Gece',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle=BLACK; ctx.fillRect(0,0,W,H);
  coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(11,11,13,.7)'],[.22,'rgba(11,11,13,0)']]); ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,H,0,0,[[0,'rgba(11,11,13,.97)'],[.42,'rgba(11,11,13,.82)'],[.62,'rgba(11,11,13,0)']]); ctx.fillRect(0,0,W,H);
  cerceve(ctx);
  dBeyaz(ctx,W/2,70,74,true);
  if(c.badge) pill(ctx,U(c.badge),W/2,170,44,18,null,GOLD,'center',GOLD);
  projeYaz(ctx,c,W/2,820,W-160,96,40,'#fff','#fff','center');
  ctx.fillStyle=GOLD; ctx.fillRect(W/2-70,858,140,2);
  const kl=[c.big,U(c.konum)].filter(Boolean).join('   ·   '); txt(ctx,kl,W/2,918,28,700,GOLD,.18,'center');
  let y=980; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,32,W-200).slice(0,2); rich(ctx,L,W/2,y,32,42,'rgba(255,255,255,.85)','#fff','center'); y+=(L.length-1)*42+60; } else y+=10;
  const ch=chipList(c); if(ch.length){ let s=ch.join('  ◆  '), f=fit(ctx,s,W-160,24,16,700,.06); txt(ctx,s,W/2,y,f,700,'rgba(255,255,255,.9)',.06,'center'); }
  avatar(ctx,d,W/2,1166,54,'#1C1C20',GOLD,3);
  const n=isim(d); const nm=U(d.ad), tel=telOf(d), w1=tw(ctx,nm,22,700,.2), w2=tw(ctx,'   '+tel,22,400,.06), x0=W/2-(w1+w2)/2;
  txt(ctx,nm,x0,1272,22,700,GOLD,.2); txt(ctx,'   '+tel,x0+w1,1272,22,400,'#fff',.06);
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  ctx.fillStyle=BLACK; ctx.fillRect(0,0,W,H);
  fotoAlan(ctx,sl,i,0,0,W,H,4,0,GOLD);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(11,11,13,.6)'],[.2,'rgba(11,11,13,0)']]); ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,H,0,0,[[0,'rgba(11,11,13,.95)'],[.3,'rgba(11,11,13,.7)'],[.5,'rgba(11,11,13,0)']]); ctx.fillRect(0,0,W,H);
  cerceve(ctx);
  dBeyaz(ctx,72,70,60); cnt(ctx,n,T,W-72,110,GOLD);
  const t=sigdir(ctx,sl.title||'',58,42,W-200,2), sL=sl.sub?lines(ctx,sl.sub,26,W-220).slice(0,2):[];
  const end=1262, subTop=end-(sL.length?(sL.length-1)*36:0), tLast=sL.length?subTop-58:end, tFirst=tLast-(t.L.length-1)*t.size*1.1;
  txt(ctx,U(sl.label),W/2,tFirst-t.size-26,20,700,GOLD,.3,'center');
  rich(ctx,t.L,W/2,tFirst,t.size,t.size*1.1,'#fff',GOLD,'center');
  if(sL.length) rich(ctx,sL,W/2,subTop,26,36,'rgba(255,255,255,.78)','#fff','center');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=BLACK; ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,0,0,W/2,0,900); g.addColorStop(0,'rgba(200,164,93,.16)'); g.addColorStop(1,'rgba(200,164,93,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  cerceve(ctx); dBeyaz(ctx,W/2,70,62,true,false);
  txt(ctx,U(f.eyebrow),W/2,230,20,700,GOLD,.3,'center');
  txt(ctx,f.t1||'',W/2,316,fit(ctx,f.t1||'',W-200,68,40,400,-.01),400,'#fff',-.01,'center'); txt(ctx,f.t2||'',W/2,394,fit(ctx,f.t2||'',W-200,68,40,700,-.01),700,GOLD,-.01,'center');
  const st=stats(f); if(st.length){ const sw=(W-160)/st.length;
    st.forEach(([big,small],k)=>{ const x=80+k*sw; if(k){ ctx.fillStyle='rgba(200,164,93,.45)'; ctx.fillRect(x,470,1.5,120); }
      statYaz(ctx,big,x+sw/2,540,fit(ctx,big,sw-40,76,30,700,-.02),'#fff','center'); txt(ctx,U(small),x+sw/2,582,18,700,GOLD,.24,'center'); }); }
  ctx.fillStyle='rgba(200,164,93,.4)'; ctx.fillRect(80,640,W-160,1.5);
  const it=items(f), cw=(W-160)/2, rh=126;
  it.forEach((x,k)=>{ const tx=80+(k%2)*cw, ty=660+Math.floor(k/2)*rh;
    ctx.beginPath(); ctx.arc(tx+42,ty+rh/2,34,0,Math.PI*2); ctx.strokeStyle='rgba(200,164,93,.7)'; ctx.lineWidth=1.5; ctx.stroke(); ikon(ctx,x[0],tx+42-17,ty+rh/2-17,34,GOLD,1.7);
    const fs=fit(ctx,x[1],cw-120,30,20,700,0); txt(ctx,x[1],tx+96,ty+rh/2+fs*.36,fs,700,'#fff',0);
    if(k%2===0 && k+2<it.length){ ctx.fillStyle='rgba(200,164,93,.18)'; ctx.fillRect(80,ty+rh,W-160,1); } });
  txt(ctx,'RE/MAX DOĞUŞ',W/2,1278,18,700,'rgba(200,164,93,.8)',.4,'center');
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=BLACK; ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,470,0,W/2,470,460); g.addColorStop(0,'rgba(200,164,93,.32)'); g.addColorStop(1,'rgba(200,164,93,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  boy(ctx,d,W/2,770,600);
  ctx.fillStyle=lin(ctx,0,640,0,770,[[0,'rgba(11,11,13,0)'],[1,BLACK]]); ctx.fillRect(0,640,W,131);
  cerceve(ctx); dBeyaz(ctx,W/2,70,62,true,false);
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,800,18,700,GOLD,.3,'center');
  adSatir(ctx,d,W/2,862,54,'#fff','#fff',W-200,'center');
  ctx.fillStyle=GOLD; ctx.fillRect(W/2-60,896,120,2);
  const hs=[[c.h1,400,'#fff'],[c.h2,700,GOLD],[c.h3,400,'#fff']].filter(h=>h[0]); let fs=56;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],-.01),0); while(fs>30 && hw(fs)>W-180) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,976,fs,h[1],h[2],-.01); });
  const dl=lines(ctx,c.desc||defDesc(),24,W-240).slice(0,2); rich(ctx,dl,W/2,1026,24,34,'rgba(255,255,255,.65)','#fff','center');
  txt(ctx,telOf(d),W/2,1150,58,700,GOLD,.02,'center');
  if(c.cta) pill(ctx,c.cta,W/2,1180,64,22,null,'#fff','center',GOLD);
  txt(ctx,c.addr||'',W/2,1292,fit(ctx,c.addr||'',W-200,18,13,400,0),400,'rgba(255,255,255,.5)',0,'center');
}};

/* ================= 4) LACİVERT PANEL ================= */
const PW=430;
const panel={ad:'Lacivert Panel',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover, mw=PW-96;
  coverImg(ctx,IMGS.cover.img,PW,0,W-PW,H,IMGS.cover.fx,50);
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,PW,H); ctx.fillStyle=RED; ctx.fillRect(PW,0,10,H);
  dBeyaz(ctx,48,56,66,false,false);
  let y=176; if(c.badge){ pill(ctx,U(c.badge),48,y,44,18,RED,'#fff'); y+=44; }
  y+=150; if(c.the){ txt(ctx,c.the,48,y-80,34,400,'rgba(255,255,255,.85)',0); }
  let ps=84; const uzun=()=>Math.max(...(c.proje||'').split(/\s+/).map(w=>tw(ctx,w,ps,700,-.02)));
  while(ps>40 && (uzun()>mw || lines(ctx,'*'+(c.proje||'')+'*',ps,mw).length>2)) ps-=2;
  const pl=lines(ctx,'*'+(c.proje||'')+'*',ps,mw); rich(ctx,pl,48,y,ps,ps*1.02,'#fff','#fff'); y+=(pl.length-1)*ps*1.02+60;
  if(c.konum){ konumYaz(ctx,c,48,y,22,'#fff',RED); y+=40; }
  if(c.big){ const fs=fit(ctx,c.big,mw,190,60,700,-.04); y+=fs*.8; txt(ctx,c.big,44,y,fs,700,'#fff',-.04); y+=56; }
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,34,mw).slice(0,3); rich(ctx,L,48,y+10,34,44,'rgba(255,255,255,.88)','#fff'); y+=10+(L.length-1)*44+44; }
  chipList(c).slice(0,4).forEach(ch=>{ if(y>1050) return; y+=50; ctx.fillStyle=RED; ctx.fillRect(48,y-19,14,14); txt(ctx,ch,76,y-5,fit(ctx,ch,mw-30,27,16,700,0),700,'#fff',0); });
  ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(48,1112,mw,2);
  avatar(ctx,d,48+56,1196,56,'#1E3354',RED,3);
  const nm=isim(d); txt(ctx,nm.first,178,1186,fit(ctx,nm.first,PW-200,24,16,400,0),400,'#fff',0); txt(ctx,nm.last,178,1218,fit(ctx,nm.last,PW-200,28,16,700,0),700,'#fff',0);
  txt(ctx,telOf(d),48,1300,fit(ctx,telOf(d),mw,34,20,700,0),700,'#fff',0);
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,H);
  fotoAlan(ctx,sl,i,0,0,W,930,8,0,NAVY,true);
  ctx.fillStyle=lin(ctx,0,0,0,300,[[0,'rgba(10,22,40,.55)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(0,0,W,300);
  dBeyaz(ctx,64,56,66); cnt(ctx,n,T,W-64,100,'#fff');
  ctx.fillStyle=RED; ctx.fillRect(0,930,W,8);
  const no=String(n).padStart(2,'0'); txt(ctx,no,56,1100,128,700,RED,-.04);
  const x=300, mw=W-x-64; txt(ctx,U(sl.label),x,1008,20,700,'rgba(255,255,255,.6)',.26);
  const t=sigdir(ctx,sl.title||'',54,40,mw,2); rich(ctx,t.L,x,1076,t.size,t.size*1.1,'#fff','#fff');
  if(sl.sub){ const L=lines(ctx,sl.sub,26,mw).slice(0,2); rich(ctx,L,x,1076+(t.L.length-1)*t.size*1.1+48,26,36,'rgba(255,255,255,.72)','#fff'); }
  prog2(ctx,n,T,H-48,'rgba(255,255,255,.15)',RED);
},
feat(ctx,n,T){ const f=S.feat, mw=PW-96;
  ctx.fillStyle=CREAM; ctx.fillRect(0,0,W,H); ctx.fillStyle=NAVY; ctx.fillRect(0,0,PW,H); ctx.fillStyle=RED; ctx.fillRect(PW,0,10,H);
  dBeyaz(ctx,48,56,66,false,false); cnt(ctx,n,T,W-64,100,NAVY);
  txt(ctx,U(f.eyebrow),48,236,19,700,RED,.26);
  txt(ctx,f.t1||'',48,312,fit(ctx,f.t1||'',mw,56,30,400,-.02),400,'#fff',-.02); txt(ctx,f.t2||'',48,374,fit(ctx,f.t2||'',mw,56,30,700,-.02),700,'#fff',-.02);
  stats(f).forEach(([big,small],k)=>{ const y=520+k*190; ctx.fillStyle=RED; ctx.fillRect(48,y-100,40,5);
    statYaz(ctx,big,48,y,fit(ctx,big,mw,80,30,700,-.02),'#fff'); txt(ctx,U(small),48,y+42,18,700,'rgba(255,255,255,.6)',.22); });
  const it=items(f), x0=PW+56, rw=W-x0-56, rh=Math.min(140,1140/Math.max(1,it.length));
  it.forEach((x,k)=>{ const ty=170+k*rh; rr(ctx,x0,ty+rh/2-38,76,76,20); ctx.fillStyle='#fff'; ctx.fill(); ikon(ctx,x[0],x0+19,ty+rh/2-19,38,RED,1.8);
    const fs=fit(ctx,x[1],rw-110,32,20,700,0); txt(ctx,x[1],x0+104,ty+rh/2+fs*.36,fs,700,NAVY,0);
    if(k<it.length-1){ ctx.fillStyle='#DDD6CA'; ctx.fillRect(x0,ty+rh,rw,1.5); } });
},
close(ctx,n,T){ const d=danisman(), c=S.close, x0=PW+56, mw=W-x0-56;
  ctx.fillStyle=CREAM; ctx.fillRect(0,0,W,H); ctx.fillStyle=RED; ctx.fillRect(0,0,PW,H);
  const g=ctx.createRadialGradient(PW/2,700,0,PW/2,700,520); g.addColorStop(0,'rgba(255,255,255,.22)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,PW,H);
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,PW,H); ctx.clip(); boy(ctx,d,PW/2,H,780); ctx.restore();
  dBeyaz(ctx,48,56,66);
  cnt(ctx,n,T,W-56,100,NAVY);
  txt(ctx,U(c.eyebrow),x0,236,19,700,RED,.26);
  txt(ctx,c.h1||'',x0,322,fit(ctx,c.h1||'',mw,78,36,400,-.03),400,NAVY,-.03);
  txt(ctx,c.h2||'',x0,402,fit(ctx,c.h2||'',mw,78,36,700,-.03),700,NAVY,-.03);
  txt(ctx,c.h3||'',x0,482,fit(ctx,c.h3||'',mw,78,36,400,-.03),400,NAVY,-.03);
  rich(ctx,lines(ctx,c.desc||defDesc(),26,mw).slice(0,4),x0,548,26,36,GRAY,NAVY);
  txt(ctx,'PORTFÖY DANIŞMANI',x0,780,18,700,RED,.24);
  const nm=isim(d); txt(ctx,nm.first,x0,846,fit(ctx,nm.first,mw,56,28,400,-.02),400,NAVY,-.02); txt(ctx,nm.last,x0,908,fit(ctx,nm.last,mw,56,28,700,-.02),700,NAVY,-.02);
  ctx.fillStyle='#DDD6CA'; ctx.fillRect(x0,960,mw,2);
  txt(ctx,'ARAYIN',x0,1018,17,700,'#8A8F9C',.24); txt(ctx,telOf(d),x0,1080,fit(ctx,telOf(d),mw,54,30,700,0),700,NAVY,0);
  txt(ctx,c.addr||'',x0,1124,fit(ctx,c.addr||'',mw,18,12,400,0),400,'#6B7385',0);
  if(c.cta){ const fs=26, cw=Math.min(mw,tw(ctx,c.cta,fs,700,0)+64); rr(ctx,x0,1180,cw,80,40); ctx.fillStyle=RED; ctx.fill(); txt(ctx,c.cta,x0+cw/2,1229,fs,700,'#fff',0,'center'); }
}};

/* ================= 5) MODERN MAVİ ================= */
function kart(ctx,x,y,w,h,r){ ctx.save(); ctx.shadowColor='rgba(10,30,70,.28)'; ctx.shadowBlur=50; ctx.shadowOffsetY=18; rr(ctx,x,y,w,h,r); ctx.fillStyle='#fff'; ctx.fill(); ctx.restore(); }
const mavi={ad:'Modern Mavi',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(13,58,153,.55)'],[.2,'rgba(13,58,153,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,82);
  if(c.badge) pill(ctx,U(c.badge),W-64,74,50,20,'#fff',BLUE,'right');
  kart(ctx,40,790,W-80,520,48);
  if(c.big){ ctx.save(); ctx.shadowColor='rgba(13,58,153,.4)'; ctx.shadowBlur=30; ctx.shadowOffsetY=12; ctx.beginPath(); ctx.arc(W-150,790,96,0,Math.PI*2); ctx.fillStyle=BLUE; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(W-150,790,96,0,Math.PI*2); ctx.strokeStyle='#fff'; ctx.lineWidth=6; ctx.stroke();
    const fs=fit(ctx,c.big,150,64,26,700,-.02); txt(ctx,c.big,W-150,790+fs*.36,fs,700,'#fff',-.02,'center'); }
  if(c.konum){ ikon(ctx,'konum',88,850,30,BLUE,2); txt(ctx,U(c.konum),128,874,22,700,BLUE,.26); }
  projeYaz(ctx,c,88,958,c.big?720:W-176,78,40,NAVY,NAVY);
  let y=1012; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,W-176).slice(0,2); rich(ctx,L,88,y,30,38,GRAY,NAVY); y+=(L.length-1)*38+30; } else y-=24;
  chips(ctx,chipList(c),88,y,W-176,48,21,{bg:LIGHT,color:BLUE},1);
  ctx.fillStyle='#E6ECF5'; ctx.fillRect(88,1160,W-176,2);
  avatar(ctx,d,88+44,1236,44,LIGHT);
  adSatir(ctx,d,196,1232,28,NAVY,NAVY,420); txt(ctx,U(d.unvan),196,1264,15,700,'#8A93A6',.2);
  txt(ctx,telOf(d),W-88,1250,34,700,BLUE,0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  fotoAlan(ctx,sl,i,0,0,W,H,8,0,'#fff');
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(13,58,153,.5)'],[.18,'rgba(13,58,153,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,68);
  const cw=132; rr(ctx,W-64-cw,62,cw,48,24); ctx.fillStyle='#fff'; ctx.fill(); cnt(ctx,n,T,W-64-cw/2,94,BLUE,'center');
  const mw=W-176, t=sigdir(ctx,sl.title||'',56,40,mw,2), sL=sl.sub?lines(ctx,sl.sub,26,mw).slice(0,2):[];
  const h=48+46+28+t.L.length*t.size*1.1+(sL.length?10+sL.length*36:0)+30, y=H-70-h;
  kart(ctx,40,y,W-80,h,40);
  if(sl.label) pill(ctx,U(sl.label),88,y+48,46,18,LIGHT,BLUE);
  rich(ctx,t.L,88,y+48+46+28+t.size*.8,t.size,t.size*1.1,NAVY,BLUE);
  if(sL.length) rich(ctx,sL,88,y+48+46+28+t.L.length*t.size*1.1+10+22,26,36,GRAY,NAVY);
  prog2(ctx,n,T,H-36,'rgba(255,255,255,.35)','#fff');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'#F3F7FE'],[1,'#E1EAFA']]); ctx.fillRect(0,0,W,H);
  dKoyu(ctx,64,56,70); cnt(ctx,n,T,W-64,102,NAVY);
  if(f.eyebrow) pill(ctx,U(f.eyebrow),64,166,48,19,BLUE,'#fff');
  txt(ctx,f.t1||'',64,296,fit(ctx,f.t1||'',W-128,72,40,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',64,374,fit(ctx,f.t2||'',W-128,72,40,700,-.02),700,BLUE,-.02);
  const st=stats(f); if(st.length){ const g=18, sw=(W-128-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*(sw+g); rr(ctx,x,424,sw,176,32); ctx.fillStyle=lin(ctx,x,424,x+sw,600,[[0,BLUE],[1,BLUE2]]); ctx.fill();
      statYaz(ctx,big,x+sw/2,518,fit(ctx,big,sw-30,66,30,700,-.02),'#fff','center'); txt(ctx,U(small),x+sw/2,562,18,700,'rgba(255,255,255,.75)',.2,'center'); }); }
  const it=items(f), tw2=(W-128-18)/2, th=124;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=636+Math.floor(k/2)*(th+16);
    ctx.save(); ctx.shadowColor='rgba(13,58,153,.10)'; ctx.shadowBlur=24; ctx.shadowOffsetY=8; rr(ctx,tx,ty,tw2,th,28); ctx.fillStyle='#fff'; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(tx+64,ty+th/2,38,0,Math.PI*2); ctx.fillStyle=LIGHT; ctx.fill(); ikon(ctx,x[0],tx+64-19,ty+th/2-19,38,BLUE,1.9);
    const fs=fit(ctx,x[1],tw2-140,30,20,700,0); txt(ctx,x[1],tx+122,ty+th/2+fs*.36,fs,700,NAVY,0); });
  prog2(ctx,n,T,H-48,'rgba(13,58,153,.12)',BLUE);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=lin(ctx,0,0,W,H,[[0,BLUE],[1,BLUE2]]); ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(790,620,330,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fill();
  ctx.beginPath(); ctx.arc(790,620,250,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.1)'; ctx.fill();
  boy(ctx,d,790,1080,800);
  dBeyaz(ctx,64,56,76); cnt(ctx,n,T,W-64,102,'#fff');
  txt(ctx,U(c.eyebrow),64,226,20,700,'rgba(255,255,255,.75)',.24);
  txt(ctx,c.h1||'',64,316,fit(ctx,c.h1||'',520,84,40,400,-.03),400,'#fff',-.03);
  txt(ctx,c.h2||'',64,402,fit(ctx,c.h2||'',520,84,40,700,-.03),700,'#fff',-.03);
  txt(ctx,c.h3||'',64,488,fit(ctx,c.h3||'',520,84,40,400,-.03),400,'#fff',-.03);
  rich(ctx,lines(ctx,c.desc||defDesc(),26,420).slice(0,4),64,554,26,36,'rgba(255,255,255,.8)','#fff');
  txt(ctx,'PORTFÖY DANIŞMANI',64,866,18,700,'rgba(255,255,255,.7)',.24);
  const nm=isim(d); txt(ctx,nm.first,64,930,fit(ctx,nm.first,430,56,28,400,-.02),400,'#fff',-.02); txt(ctx,nm.last,64,992,fit(ctx,nm.last,430,56,28,700,-.02),700,'#fff',-.02);
  kart(ctx,40,1062,W-80,248,44);
  txt(ctx,'ARAYIN',88,1124,17,700,'#8A93A6',.24); txt(ctx,telOf(d),88,1192,56,700,NAVY,0);
  txt(ctx,c.addr||'',88,1244,fit(ctx,c.addr||'',560,19,13,400,0),400,'#6B7385',0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-88-cw,1140,cw,80,40); ctx.fillStyle=BLUE; ctx.fill(); txt(ctx,c.cta,W-88-cw/2,1189,fs,700,'#fff',0,'center'); }
}};


/* ---------- ikinci set yardımcıları ---------- */
function rrc(ctx,x,y,w,h,r){ const [a,b,c,d]=r.map(v=>Math.min(v,w/2,h/2)); ctx.beginPath(); ctx.moveTo(x+a,y); ctx.arcTo(x+w,y,x+w,y+h,b); ctx.arcTo(x+w,y+h,x,y+h,c); ctx.arcTo(x,y+h,x,y,d); ctx.arcTo(x,y,x+w,y,a); ctx.closePath(); }
function kemerYol(ctx,x,y,w,h){ const r=w/2; ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x,y+r); ctx.arc(x+r,y+r,r,Math.PI,0); ctx.lineTo(x+w,y+h); ctx.closePath(); }
function kirpYol(ctx,yol,img,x,y,w,h,fx,fy){ ctx.save(); yol(); ctx.clip(); coverImg(ctx,img,x,y,w,h,fx,fy); ctx.restore(); }
function fotoBilgi(i){ const a=IMGS['s'+i+'a']||{}, b=IMGS['s'+i+'b']||{}; return {a,b}; }
/* fotoğrafın çok bulanık hali: arka plan */
function bulanik(ctx,img,fx,koyu){
  if(img){ const sc=document.createElement('canvas'); sc.width=27; sc.height=34; const s=sc.getContext('2d'); coverImg(s,img,0,0,27,34,fx,50);
    const m=document.createElement('canvas'); m.width=108; m.height=135; const mm=m.getContext('2d'); mm.imageSmoothingQuality='high'; mm.drawImage(sc,0,0,108,135);
    ctx.save(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(m,-40,-50,W+80,H+100); ctx.restore(); }
  else { ctx.fillStyle=lin(ctx,0,0,W,H,[[0,'#2A3A55'],[1,'#0E1B30']]); ctx.fillRect(0,0,W,H); }
  ctx.fillStyle='rgba(8,12,24,'+(koyu||.38)+')'; ctx.fillRect(0,0,W,H);
}
function camKutu(ctx,x,y,w,h,r){ glass(ctx,x,y,w,h,r); ctx.save(); rr(ctx,x,y,w,h,r); ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fill(); ctx.restore(); }
function golge(ctx,yol,renk,blur,dy){ ctx.save(); ctx.shadowColor=renk; ctx.shadowBlur=blur; ctx.shadowOffsetY=dy; yol(); ctx.fillStyle='#000'; ctx.fill(); ctx.restore(); }
/* ad + telefon tek satırda, ortalı küçük kart */
function chipsOrtali(ctx,list,cx,y,maxW,h,fs,st){ const ws=[]; let tot=0; list.forEach(ch=>{ const w=tw(ctx,ch,fs,700,0)+h*.9; if(tot+w>maxW) return; ws.push([ch,w]); tot+=w+10; }); tot-=10;
  let x=cx-tot/2; ws.forEach(([t,w])=>{ if(st.cam) camKutu(ctx,x,y,w,h,h/2); else { rr(ctx,x,y,w,h,h/2); if(st.bg){ctx.fillStyle=st.bg; ctx.fill();} if(st.stroke){ctx.strokeStyle=st.stroke; ctx.lineWidth=1.5; ctx.stroke();} }
    txt(ctx,t,x+w/2,y+h/2+fs*.36,fs,700,st.color,0,'center'); x+=w+10; }); }
function satir3(ctx,parts,cx,y,fs,renk,ayrac){ const sep='   '+(ayrac||'|')+'   '; const s=parts.filter(Boolean).join(sep); const f=fit(ctx,s,W-180,fs,16,700,.04); txt(ctx,s,cx,y,f,700,renk,.04,'center'); }

/* ================= 6) KEMER ================= */
const KBG='#F2ECE4', KINK='#2A2522', KBR='#9C7A54', KMU='#7D7368', KAR='#E5DACB';
function kemerCizgi(ctx,x,y,w,h){ kemerYol(ctx,x-14,y-14,w+28,h+14); ctx.strokeStyle='rgba(156,122,84,.55)'; ctx.lineWidth=1.5; ctx.stroke(); }
const kemer={ad:'Kemer',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle=KBG; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,W/2,46,54,true);
  if(c.badge) txt(ctx,U(c.badge),W/2,150,18,700,KBR,.4,'center');
  kemerCizgi(ctx,170,190,740,700); kirpYol(ctx,()=>kemerYol(ctx,170,190,740,700),IMGS.cover.img,170,190,740,700,IMGS.cover.fx,50);
  if(c.konum) txt(ctx,U(c.konum),W/2,966,22,700,KBR,.4,'center');
  projeYaz(ctx,c,W/2,1050,W-160,82,40,KINK,KINK,'center');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,W-200).slice(0,1); rich(ctx,L,W/2,1102,30,38,KMU,KINK,'center'); }
  satir3(ctx,[c.big,...chipList(c).slice(0,3)],W/2,1160,24,KINK,'·');
  ctx.fillStyle='rgba(156,122,84,.45)'; ctx.fillRect(W/2-60,1196,120,1.5);
  const ad=d.ad, tel=telOf(d), wA=tw(ctx,ad,26,700,0), wT=tw(ctx,tel,26,400,0), tot=84+wA+30+wT; let x=W/2-tot/2;
  avatar(ctx,d,x+36,1266,36,KAR); txt(ctx,ad,x+84,1275,26,700,KINK,0); txt(ctx,tel,x+84+wA+30,1275,26,400,KMU,0);
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i);
  ctx.fillStyle=KBG; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,64,52,48); cnt(ctx,n,T,W-64,88,KMU);
  if(sl.tip==='ikili'){ const w=410, g=20, x1=(W-2*w-g)/2; [[a,x1],[b,x1+w+g]].forEach(([p,x])=>{ kemerCizgi(ctx,x,170,w,830); kirpYol(ctx,()=>kemerYol(ctx,x,170,w,830),p.img,x,170,w,830,p.f,50); }); }
  else { kemerCizgi(ctx,130,170,820,830); kirpYol(ctx,()=>kemerYol(ctx,130,170,820,830),a.img,130,170,820,830,a.f,50); }
  if(sl.label) txt(ctx,U(sl.label),W/2,1076,20,700,KBR,.4,'center');
  const t=sigdir(ctx,sl.title||'',56,40,W-200,2); rich(ctx,t.L,W/2,1150,t.size,t.size*1.1,KINK,KBR,'center');
  if(sl.sub){ const L=lines(ctx,sl.sub,26,W-240).slice(0,2); rich(ctx,L,W/2,1150+(t.L.length-1)*t.size*1.1+48,26,36,KMU,KINK,'center'); }
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=KBG; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,W/2,46,54,true); cnt(ctx,n,T,W-64,88,KMU);
  txt(ctx,U(f.eyebrow),W/2,214,20,700,KBR,.4,'center');
  txt(ctx,f.t1||'',W/2,298,fit(ctx,f.t1||'',W-180,70,36,400,-.02),400,KINK,-.02,'center'); txt(ctx,f.t2||'',W/2,374,fit(ctx,f.t2||'',W-180,70,36,700,-.02),700,KINK,-.02,'center');
  const st=stats(f); if(st.length){ const sw=(W-160)/st.length; st.forEach(([big,small],k)=>{ const x=80+k*sw; if(k){ ctx.fillStyle='rgba(156,122,84,.45)'; ctx.fillRect(x,450,1.5,130); }
    statYaz(ctx,big,x+sw/2,530,fit(ctx,big,sw-40,76,30,700,-.02),KINK,'center'); txt(ctx,U(small),x+sw/2,574,17,700,KBR,.3,'center'); }); }
  ctx.fillStyle='rgba(156,122,84,.4)'; ctx.fillRect(80,640,W-160,1.5);
  const it=items(f), cw=(W-160)/2, rh=132;
  it.forEach((x,k)=>{ const tx=80+(k%2)*cw+(k%2?24:0), ty=664+Math.floor(k/2)*rh;
    kemerYol(ctx,tx,ty+rh/2-44,66,88); ctx.fillStyle=KAR; ctx.fill(); ikon(ctx,x[0],tx+14,ty+rh/2-16,38,KBR,1.7);
    const fs=fit(ctx,x[1],cw-130,30,20,700,0); txt(ctx,x[1],tx+92,ty+rh/2+fs*.36,fs,700,KINK,0);
    if(k%2===0 && k+2<it.length){ ctx.fillStyle='rgba(156,122,84,.22)'; ctx.fillRect(80,ty+rh,W-160,1); } });
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=KBG; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,W/2,46,54,true); cnt(ctx,n,T,W-64,88,KMU);
  const ax=250, ay=150, aw=580, ah=640;
  kemerCizgi(ctx,ax,ay,aw,ah); kemerYol(ctx,ax,ay,aw,ah); ctx.fillStyle=KAR; ctx.fill();
  ctx.save(); kemerYol(ctx,ax,ay,aw,ah); ctx.clip(); boy(ctx,d,W/2,ay+ah,600); ctx.restore();
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,850,18,700,KBR,.4,'center');
  adSatir(ctx,d,W/2,912,54,KINK,KINK,W-200,'center');
  const hs=[[c.h1,400,KINK],[c.h2,700,KBR],[c.h3,400,KINK]].filter(h=>h[0]); let fs=50;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],-.01),0); while(fs>28 && hw(fs)>W-180) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,1000,fs,h[1],h[2],-.01); });
  rich(ctx,lines(ctx,c.desc||defDesc(),24,W-260).slice(0,2),W/2,1046,24,34,KMU,KINK,'center');
  txt(ctx,telOf(d),W/2,1166,56,700,KINK,.02,'center');
  if(c.cta) pill(ctx,c.cta,W/2,1194,62,22,KINK,'#fff','center');
  txt(ctx,c.addr||'',W/2,1300,fit(ctx,c.addr||'',W-200,18,13,400,0),400,KMU,0,'center');
}};

/* ================= 7) DERGİ ================= */
const DINK='#111111';
function dikey(ctx,t,x,y,color){ ctx.save(); ctx.translate(x,y); ctx.rotate(-Math.PI/2); txt(ctx,t,0,0,17,700,color,.36,'center'); ctx.restore(); }
const dergi={ad:'Dergi',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(0,0,0,.62)'],[.36,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,H,0,0,[[0,'rgba(0,0,0,.85)'],[.45,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,56,46,56,false,false);
  txt(ctx,U(c.badge||'Portföy'),W-56,84,18,700,'#fff',.32,'right');
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(56,128,W-112,1.5);
  if(c.the) txt(ctx,c.the,56,184,32,400,'#fff',0);
  const pr=c.proje||'', y0=c.the?190:150; let fs=fit(ctx,pr,W-112,210,60,700,-.05);
  if(fs<130){ let s2=150; const uz=()=>Math.max(...pr.split(/\s+/).map(w=>tw(ctx,w,s2,700,-.05))); let L=richLines(ctx,pr,s2,700,700,W-112);
    while(s2>70 && (L.length>2||uz()>W-112)){ s2-=4; L=richLines(ctx,pr,s2,700,700,W-112); }
    L.forEach((ln,k)=>txt(ctx,ln.map(w=>w.t).join(''),52,y0+s2*.8+k*s2*1.0,s2,700,'#fff',-.05)); }
  else txt(ctx,pr,52,y0+fs*.78,fs,700,'#fff',-.05);
  dikey(ctx,U('RE/MAX Doğuş'+(c.konum?'  —  '+c.konum:'')),W-30,720,'rgba(255,255,255,.92)');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,46,760).slice(0,2); rich(ctx,L,56,1110-(L.length-1)*54,46,54,'#fff','#fff'); }
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(56,1160,W-112,1.5);
  const cols=[c.big,...chipList(c)].filter(Boolean).slice(0,3), cw=(W-112)/3;
  cols.forEach((v,k)=>{ const x=56+k*cw; txt(ctx,String(k+1).padStart(2,'0'),x,1204,16,700,'rgba(255,255,255,.6)',.2); txt(ctx,v,x,1248,fit(ctx,v,cw-24,32,18,700,0),700,'#fff',0); });
  txt(ctx,d.ad+'  —  '+telOf(d),56,1306,20,700,'rgba(255,255,255,.85)',.06);
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  fotoAlan(ctx,sl,i,0,0,W,H,6,0,'#fff');
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(0,0,0,.55)'],[.2,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,H);
  ctx.fillStyle=lin(ctx,0,H,0,0,[[0,'rgba(0,0,0,.85)'],[.5,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,56,46,52,false,false); cnt(ctx,n,T,W-56,84,'#fff');
  ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(56,124,W-112,1.5);
  const t=sigdir(ctx,sl.title||'',66,44,W-112,2), sL=sl.sub?lines(ctx,sl.sub,26,W-240).slice(0,2):[];
  const end=1282, subTop=end-(sL.length?(sL.length-1)*36:0), tLast=sL.length?subTop-62:end, tFirst=tLast-(t.L.length-1)*t.size*1.08;
  const ny=tFirst-t.size-70; ctx.save(); ctx.font=F(190,700); ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=2.5; ctx.strokeText(String(n).padStart(2,'0'),50,ny); ctx.restore();
  if(sl.label) txt(ctx,U(sl.label),56,ny+44,19,700,'#fff',.32);
  rich(ctx,t.L,56,tFirst,t.size,t.size*1.08,'#fff','#fff');
  if(sL.length) rich(ctx,sL,56,subTop,26,36,'rgba(255,255,255,.82)','#fff');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  dKoyu(ctx,56,46,52); cnt(ctx,n,T,W-56,84,DINK); ctx.fillStyle=DINK; ctx.fillRect(56,124,W-112,1.5);
  txt(ctx,U(f.eyebrow),56,196,19,700,RED,.32);
  txt(ctx,f.t1||'',52,290,fit(ctx,f.t1||'',W-112,88,40,400,-.04),400,DINK,-.04); txt(ctx,f.t2||'',52,378,fit(ctx,f.t2||'',W-112,88,40,700,-.04),700,DINK,-.04);
  const st=stats(f); if(st.length){ const sw=(W-112)/st.length; ctx.fillStyle=DINK; ctx.fillRect(56,430,W-112,1.5);
    st.forEach(([big,small],k)=>{ const x=56+k*sw; if(k){ ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(x,430,1.5,210); }
      txt(ctx,U(small),x+(k?24:0),474,16,700,'#777',.24); statYaz(ctx,big,x+(k?24:0),596,fit(ctx,big,sw-40,120,40,700,-.04),DINK); }); }
  ctx.fillStyle=DINK; ctx.fillRect(56,640,W-112,1.5);
  const it=items(f), cw=(W-112)/2, rh=124;
  it.forEach((x,k)=>{ const tx=56+(k%2)*cw+(k%2?24:0), ty=650+Math.floor(k/2)*rh;
    txt(ctx,String(k+1).padStart(2,'0'),tx,ty+rh/2+8,22,700,RED,.1);
    const fs=fit(ctx,x[1],cw-90,32,20,700,0); txt(ctx,x[1],tx+56,ty+rh/2+fs*.36,fs,700,DINK,-.01);
    if(k%2===0 && k+2<it.length){ ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(56,ty+rh,W-112,1.5); } });
  prog2(ctx,n,T,H-48,'rgba(0,0,0,.1)',DINK,56,W-112);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  boy(ctx,d,800,H,920);
  dKoyu(ctx,56,46,52); cnt(ctx,n,T,W-56,84,DINK); ctx.fillStyle=DINK; ctx.fillRect(56,124,W-112,1.5);
  txt(ctx,U(c.eyebrow),56,200,19,700,RED,.32);
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,50,316+k*106,fit(ctx,t,560,108,40,w,-.05),w,DINK,-.05); });
  rich(ctx,lines(ctx,c.desc||defDesc(),26,430).slice(0,4),56,636,26,36,'#555',DINK);
  ctx.fillStyle=DINK; ctx.fillRect(56,1040,500,1.5);
  txt(ctx,'PORTFÖY DANIŞMANI',56,1088,17,700,RED,.3);
  const nm=isim(d); txt(ctx,nm.first+' ',56,1148,fit(ctx,d.ad,500,46,24,700,-.02),400,DINK,-.02); txt(ctx,nm.last,56+tw(ctx,nm.first+' ',fit(ctx,d.ad,500,46,24,700,-.02),400,-.02),1148,fit(ctx,d.ad,500,46,24,700,-.02),700,DINK,-.02);
  txt(ctx,telOf(d),56,1218,54,700,DINK,-.01);
  if(c.cta) txt(ctx,c.cta,56,1262,24,700,RED,0);
  txt(ctx,c.addr||'',56,1302,fit(ctx,c.addr||'',520,17,12,400,0),400,'#777',0);
}};

/* ================= 8) BENTO ================= */
const BBG='#F1F0EC';
function kutu(ctx,x,y,w,h,renk){ rr(ctx,x,y,w,h,32); ctx.fillStyle=renk; ctx.fill(); }
function fotoKutu(ctx,img,x,y,w,h,fx,fy){ ctx.save(); rr(ctx,x,y,w,h,32); ctx.clip(); coverImg(ctx,img,x,y,w,h,fx,fy); ctx.restore(); }
const bento={ad:'Bento',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover, ch=chipList(c);
  ctx.fillStyle=BBG; ctx.fillRect(0,0,W,H);
  fotoKutu(ctx,IMGS.cover.img,40,40,1000,760,IMGS.cover.fx,50);
  ctx.save(); rr(ctx,40,40,1000,240,32); ctx.clip(); ctx.fillStyle=lin(ctx,0,40,0,280,[[0,'rgba(10,22,40,.5)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(40,40,1000,240); ctx.restore();
  dBeyaz(ctx,80,76,64);
  if(c.badge) pill(ctx,U(c.badge),1000,84,48,19,'#fff',RED,'right');
  kutu(ctx,40,816,620,314,NAVY);
  if(c.konum) txt(ctx,U(c.konum),80,880,19,700,'rgba(255,255,255,.6)',.3);
  projeYaz(ctx,c,80,962,540,68,36,'#fff','#fff');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,27,540).slice(0,2),80,1020,27,36,'rgba(255,255,255,.78)','#fff');
  kutu(ctx,676,816,364,314,RED);
  if(c.big){ const fs=fit(ctx,c.big,300,128,50,700,-.04); txt(ctx,c.big,858,980,fs,700,'#fff',-.04,'center'); }
  if(ch[0]) txt(ctx,ch[0],858,1060,fit(ctx,ch[0],300,26,16,700,0),700,'rgba(255,255,255,.88)',0,'center');
  kutu(ctx,40,1146,720,164,'#fff');
  avatar(ctx,d,40+28+52,1228,52,'#E9EBEF');
  adSatir(ctx,d,196,1218,30,NAVY,NAVY,520); txt(ctx,telOf(d),196,1262,28,700,RED,0);
  kutu(ctx,776,1146,264,164,'#fff');
  ch.slice(1,4).forEach((t,k)=>{ const y=1196+k*40; ctx.fillStyle=RED; ctx.beginPath(); ctx.arc(808,y-8,5,0,Math.PI*2); ctx.fill(); txt(ctx,t,824,y,fit(ctx,t,196,21,13,700,0),700,NAVY,0); });
  if(ch.length<2) dKoyu(ctx,908,1200,56,true);
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i);
  ctx.fillStyle=BBG; ctx.fillRect(0,0,W,H);
  if(sl.tip==='ikili'){ fotoKutu(ctx,a.img,40,40,1000,472,50,a.f); fotoKutu(ctx,b.img,40,528,1000,472,50,b.f); } else fotoKutu(ctx,a.img,40,40,1000,960,a.f,50);
  ctx.save(); rr(ctx,40,40,1000,200,32); ctx.clip(); ctx.fillStyle=lin(ctx,0,40,0,240,[[0,'rgba(10,22,40,.45)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(40,40,1000,200); ctx.restore();
  dBeyaz(ctx,80,76,56);
  kutu(ctx,40,1016,808,294,'#fff');
  if(sl.label) txt(ctx,U(sl.label),84,1080,19,700,RED,.3);
  const t=sigdir(ctx,sl.title||'',52,38,720,2); rich(ctx,t.L,84,1146,t.size,t.size*1.1,NAVY,RED);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,24,720).slice(0,2),84,1146+(t.L.length-1)*t.size*1.1+46,24,34,GRAY,NAVY);
  kutu(ctx,864,1016,176,294,NAVY);
  txt(ctx,String(n).padStart(2,'0'),952,1172,76,700,'#fff',-.03,'center'); txt(ctx,'/ '+String(T).padStart(2,'0'),952,1218,24,700,'rgba(255,255,255,.55)',.1,'center');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=BBG; ctx.fillRect(0,0,W,H);
  kutu(ctx,40,40,1000,340,NAVY);
  dBeyaz(ctx,80,78,52,false,false); cnt(ctx,n,T,1000,110,'rgba(255,255,255,.7)');
  txt(ctx,U(f.eyebrow),80,206,19,700,'rgba(255,255,255,.6)',.3);
  txt(ctx,f.t1||'',80,282,fit(ctx,f.t1||'',900,62,34,400,-.02),400,'#fff',-.02); txt(ctx,f.t2||'',80,346,fit(ctx,f.t2||'',900,62,34,700,-.02),700,'#fff',-.02);
  const st=stats(f); if(st.length){ const g=16, sw=(1000-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=40+k*(sw+g), on=k===0; kutu(ctx,x,396,sw,200,on?RED:'#fff');
      statYaz(ctx,big,x+36,500,fit(ctx,big,sw-60,70,30,700,-.03),on?'#fff':NAVY); txt(ctx,U(small),x+36,548,17,700,on?'rgba(255,255,255,.75)':'#8A8F9C',.24); }); }
  const it=items(f), tw2=(1000-16)/2, th=Math.min(162,(1310-612-16*3)/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=40+(k%2)*(tw2+16), ty=612+Math.floor(k/2)*(th+16); kutu(ctx,tx,ty,tw2,th,'#fff');
    rr(ctx,tx+28,ty+th/2-34,68,68,20); ctx.fillStyle=NAVY; ctx.fill(); ikon(ctx,x[0],tx+28+15,ty+th/2-19,38,'#fff',1.8);
    const fs=fit(ctx,x[1],tw2-150,30,18,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,NAVY,0); });
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=BBG; ctx.fillRect(0,0,W,H);
  rr(ctx,40,40,580,860,32); ctx.fillStyle=lin(ctx,0,40,0,900,[[0,'#E9ECF1'],[1,'#D3D9E3']]); ctx.fill();
  ctx.save(); rr(ctx,40,40,580,860,32); ctx.clip(); boy(ctx,d,330,900,820); ctx.restore();
  kutu(ctx,636,40,404,860,NAVY);
  dBeyaz(ctx,676,80,50,false,false); txt(ctx,String(n).padStart(2,'0')+' / '+String(T).padStart(2,'0'),1000,112,20,700,'rgba(255,255,255,.6)',.1,'right');
  txt(ctx,U(c.eyebrow),676,300,18,700,'rgba(255,255,255,.6)',.3);
  [[c.h1,400,'#fff'],[c.h2,700,RED],[c.h3,400,'#fff']].forEach(([t,w,cl],k)=>{ t=t||''; txt(ctx,t,676,384+k*70,fit(ctx,t,324,62,30,w,-.03),w,cl,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),22,324).slice(0,6),676,600,22,32,'rgba(255,255,255,.72)','#fff');
  kutu(ctx,40,916,580,184,'#fff');
  txt(ctx,'PORTFÖY DANIŞMANI',84,970,16,700,RED,.3); adSatir(ctx,d,84,1032,44,NAVY,NAVY,500);
  txt(ctx,c.addr||'',84,1072,fit(ctx,c.addr||'',500,17,12,400,0),400,'#6B7385',0);
  kutu(ctx,636,916,404,184,RED);
  txt(ctx,'ARAYIN',676,970,16,700,'rgba(255,255,255,.75)',.3); txt(ctx,telOf(d),676,1044,fit(ctx,telOf(d),330,46,26,700,0),700,'#fff',0);
  kutu(ctx,40,1116,1000,194,NAVY);
  txt(ctx,c.cta||'Hemen arayın',84,1230,fit(ctx,c.cta||'',760,44,24,700,0),700,'#fff',0);
  ctx.beginPath(); ctx.arc(964,1213,46,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.save(); ctx.strokeStyle=RED; ctx.lineWidth=5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(946,1213); ctx.lineTo(982,1213); ctx.moveTo(968,1199); ctx.lineTo(982,1213); ctx.lineTo(968,1227); ctx.stroke(); ctx.restore();
}};

/* ================= 9) BUZLU CAM ================= */
const cam={ad:'Buzlu Cam',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  bulanik(ctx,IMGS.cover.img,IMGS.cover.fx);
  dBeyaz(ctx,W/2,44,58,true);
  golge(ctx,()=>rr(ctx,90,140,900,780,48),'rgba(0,0,0,.45)',70,30);
  fotoKutu(ctx,IMGS.cover.img,90,140,900,780,IMGS.cover.fx,50);
  ctx.save(); rr(ctx,90,140,900,780,48); ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  if(c.badge){ const bt=U(c.badge), bw=tw(ctx,bt,18,700,.2)+44; camKutu(ctx,122,172,bw,46,23); txt(ctx,bt,122+bw/2,202,18,700,'#fff',.2,'center'); }
  if(c.big){ const fs=fit(ctx,c.big,200,64,30,700,-.02), bw=tw(ctx,c.big,fs,700,-.02)+60; camKutu(ctx,958-bw,800,bw,92,46); txt(ctx,c.big,958-bw/2,846+fs*.36,fs,700,'#fff',-.02,'center'); }
  if(c.konum) txt(ctx,U(c.konum),W/2,986,20,700,'rgba(255,255,255,.75)',.4,'center');
  projeYaz(ctx,c,W/2,1064,W-160,76,40,'#fff','#fff','center');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,28,W-200).slice(0,1),W/2,1112,28,36,'rgba(255,255,255,.85)','#fff','center');
  chipsOrtali(ctx,chipList(c),W/2,1142,W-160,46,20,{cam:1,color:'#fff'});
  const ad=d.ad, tel=telOf(d), wA=tw(ctx,ad,24,700,0), wT=tw(ctx,tel,24,400,0), bw=24+64+18+wA+26+wT+34, bx=W/2-bw/2;
  camKutu(ctx,bx,1214,bw,88,44); avatar(ctx,d,bx+24+32,1258,32,'rgba(255,255,255,.25)');
  txt(ctx,ad,bx+24+64+18,1267,24,700,'#fff',0); txt(ctx,tel,bx+24+64+18+wA+26,1267,24,400,'rgba(255,255,255,.85)',0);
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i);
  bulanik(ctx,a.img,sl.tip==='ikili'?50:a.f);
  dBeyaz(ctx,90,40,52,false);
  const cw=128; camKutu(ctx,990-cw,42,cw,48,24); cnt(ctx,n,T,990-cw/2,74,'#fff','center');
  const kart=(p,x,y,w,h,fx,fy)=>{ golge(ctx,()=>rr(ctx,x,y,w,h,44),'rgba(0,0,0,.45)',60,26); fotoKutu(ctx,p.img,x,y,w,h,fx,fy); ctx.save(); rr(ctx,x,y,w,h,44); ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2; ctx.stroke(); ctx.restore(); };
  if(sl.tip==='ikili'){ kart(a,90,124,900,420,50,a.f); kart(b,90,564,900,420,50,b.f); } else kart(a,90,124,900,860,a.f,50);
  if(sl.label) txt(ctx,U(sl.label),W/2,1062,19,700,'rgba(255,255,255,.75)',.4,'center');
  const t=sigdir(ctx,sl.title||'',56,40,W-200,2); rich(ctx,t.L,W/2,1136,t.size,t.size*1.1,'#fff','#fff','center');
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,25,W-240).slice(0,2),W/2,1136+(t.L.length-1)*t.size*1.1+46,25,35,'rgba(255,255,255,.8)','#fff','center');
},
feat(ctx,n,T){ const f=S.feat;
  bulanik(ctx,IMGS.cover.img,IMGS.cover.fx,.5);
  dBeyaz(ctx,W/2,44,58,true); cnt(ctx,n,T,W-64,84,'rgba(255,255,255,.8)');
  txt(ctx,U(f.eyebrow),W/2,204,19,700,'rgba(255,255,255,.75)',.4,'center');
  txt(ctx,f.t1||'',W/2,284,fit(ctx,f.t1||'',W-180,66,36,400,-.02),400,'#fff',-.02,'center'); txt(ctx,f.t2||'',W/2,356,fit(ctx,f.t2||'',W-180,66,36,700,-.02),700,'#fff',-.02,'center');
  const st=stats(f); if(st.length){ const g=18, sw=(W-128-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*(sw+g); camKutu(ctx,x,410,sw,176,32);
      statYaz(ctx,big,x+sw/2,506,fit(ctx,big,sw-30,66,30,700,-.02),'#fff','center'); txt(ctx,U(small),x+sw/2,550,17,700,'rgba(255,255,255,.7)',.24,'center'); }); }
  const it=items(f), tw2=(W-128-18)/2, th=128;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=618+Math.floor(k/2)*(th+18); camKutu(ctx,tx,ty,tw2,th,30);
    ctx.beginPath(); ctx.arc(tx+64,ty+th/2,36,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fill(); ikon(ctx,x[0],tx+64-18,ty+th/2-18,36,'#fff',1.8);
    const fs=fit(ctx,x[1],tw2-140,30,18,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,'#fff',0); });
  prog2(ctx,n,T,H-48,'rgba(255,255,255,.2)','#fff');
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  bulanik(ctx,IMGS.cover.img,IMGS.cover.fx,.45);
  dBeyaz(ctx,W/2,44,58,true); cnt(ctx,n,T,W-64,84,'rgba(255,255,255,.8)');
  camKutu(ctx,90,330,900,960,48);
  const g=ctx.createRadialGradient(W/2,470,0,W/2,470,380); g.addColorStop(0,'rgba(255,255,255,.22)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,100,W,700);
  boy(ctx,d,W/2,780,640);
  ctx.fillStyle='rgba(255,255,255,.3)'; ctx.fillRect(90,780,900,2);
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,834,17,700,'rgba(255,255,255,.7)',.4,'center');
  adSatir(ctx,d,W/2,894,50,'#fff','#fff',800,'center');
  const hs=[[c.h1,400],[c.h2,700],[c.h3,400]].filter(h=>h[0]); let fs=44;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],-.01),0); while(fs>26 && hw(fs)>800) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,974,fs,h[1],'#fff',-.01); });
  rich(ctx,lines(ctx,c.desc||defDesc(),23,780).slice(0,2),W/2,1018,23,32,'rgba(255,255,255,.75)','#fff','center');
  txt(ctx,telOf(d),W/2,1140,56,700,'#fff',.02,'center');
  if(c.cta) pill(ctx,c.cta,W/2,1166,62,22,'#fff',NAVY,'center');
  txt(ctx,c.addr||'',W/2,1266,fit(ctx,c.addr||'',820,17,12,400,0),400,'rgba(255,255,255,.65)',0,'center');
}};

/* ================= 10) ORGANİK ================= */
const OBG='#E9ECE3', OINK='#1F2B22', OAC='#6F8467', OKR='#F7F6F1', OSF='#CBD5BD';
const organik={ad:'Organik',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle=OBG; ctx.fillRect(0,0,W,H);
  const yol=()=>rrc(ctx,40,40,1000,820,[40,260,40,40]);
  kirpYol(ctx,yol,IMGS.cover.img,40,40,1000,820,IMGS.cover.fx,50);
  ctx.save(); yol(); ctx.clip(); ctx.fillStyle=lin(ctx,0,40,0,300,[[0,'rgba(20,30,22,.45)'],[1,'rgba(20,30,22,0)']]); ctx.fillRect(40,40,1000,260); ctx.restore();
  dBeyaz(ctx,80,76,66);
  if(c.badge) pill(ctx,U(c.badge),80,786,48,19,OKR,OINK);
  if(c.big){ ctx.beginPath(); ctx.arc(900,860,104,0,Math.PI*2); ctx.fillStyle=OAC; ctx.fill(); ctx.strokeStyle=OBG; ctx.lineWidth=10; ctx.stroke();
    const fs=fit(ctx,c.big,160,66,28,700,-.02); txt(ctx,c.big,900,860+fs*.36,fs,700,'#fff',-.02,'center'); }
  if(c.konum) txt(ctx,U(c.konum),64,946,22,700,OAC,.32);
  projeYaz(ctx,c,64,1032,c.big?700:W-128,82,40,OINK,OINK);
  let y=1084; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,W-128).slice(0,2); rich(ctx,L,64,y,30,38,'#55624F',OINK); y+=(L.length-1)*38+28; } else y-=24;
  chips(ctx,chipList(c),64,y,W-128,50,21,{bg:OKR,color:OINK},1);
  ctx.fillStyle='rgba(31,43,34,.15)'; ctx.fillRect(64,1196,W-128,2);
  avatar(ctx,d,108,1264,44,OSF,OAC,3);
  adSatir(ctx,d,174,1258,30,OINK,OINK,440); txt(ctx,U(d.unvan),174,1290,15,700,OAC,.2);
  txt(ctx,telOf(d),W-64,1276,36,700,OINK,0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i), tek=i%2===0;
  ctx.fillStyle=OBG; ctx.fillRect(0,0,W,H);
  const R=tek?[40,240,40,40]:[240,40,40,40];
  if(sl.tip==='ikili'){ kirpYol(ctx,()=>rrc(ctx,40,40,1000,452,R),a.img,40,40,1000,452,50,a.f); kirpYol(ctx,()=>rrc(ctx,40,508,1000,452,[40,40,tek?240:40,tek?40:240]),b.img,40,508,1000,452,50,b.f); }
  else kirpYol(ctx,()=>rrc(ctx,40,40,1000,920,[R[0],R[1],tek?40:240,tek?240:40]),a.img,40,40,1000,920,a.f,50);
  ctx.save(); rrc(ctx,40,40,1000,220,[R[0],R[1],0,0]); ctx.clip(); ctx.fillStyle=lin(ctx,0,40,0,260,[[0,'rgba(20,30,22,.4)'],[1,'rgba(20,30,22,0)']]); ctx.fillRect(40,40,1000,220); ctx.restore();
  dBeyaz(ctx,tek?80:W-80-60*210/78,74,60);
  const cw=128, cx=tek?W-80-cw:80; rr(ctx,cx,860,cw,48,24); ctx.fillStyle=OKR; ctx.fill(); cnt(ctx,n,T,cx+cw/2,892,OINK,'center');
  if(sl.label){ ctx.beginPath(); ctx.arc(72,1030,8,0,Math.PI*2); ctx.fillStyle=OAC; ctx.fill(); txt(ctx,U(sl.label),94,1037,20,700,OAC,.3); }
  const t=sigdir(ctx,sl.title||'',58,42,W-128,2); rich(ctx,t.L,64,1110,t.size,t.size*1.1,OINK,OAC);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,27,W-128).slice(0,2),64,1110+(t.L.length-1)*t.size*1.1+50,27,37,'#55624F',OINK);
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle=OINK; ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(W+60,-60,420,0,Math.PI*2); ctx.fillStyle='rgba(203,213,189,.08)'; ctx.fill();
  dBeyaz(ctx,64,56,66,false,false); cnt(ctx,n,T,W-64,100,'rgba(247,246,241,.7)');
  txt(ctx,U(f.eyebrow),64,210,20,700,OSF,.32);
  txt(ctx,f.t1||'',64,296,fit(ctx,f.t1||'',W-128,74,40,400,-.02),400,OKR,-.02); txt(ctx,f.t2||'',64,374,fit(ctx,f.t2||'',W-128,74,40,700,-.02),700,OSF,-.02);
  const st=stats(f); if(st.length){ const sw=(W-128)/st.length; st.forEach(([big,small],k)=>{ const x=64+k*sw;
    statYaz(ctx,big,x,506,fit(ctx,big,sw-40,84,30,700,-.03),OKR); txt(ctx,U(small),x,550,17,700,'rgba(203,213,189,.8)',.26); }); }
  const it=items(f), tw2=(W-128-18)/2, th=126;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=610+Math.floor(k/2)*(th+18);
    rrc(ctx,tx,ty,tw2,th,k%2?[20,60,20,20]:[60,20,20,20]); ctx.fillStyle='rgba(247,246,241,.07)'; ctx.fill();
    ctx.beginPath(); ctx.arc(tx+64,ty+th/2,36,0,Math.PI*2); ctx.fillStyle=OAC; ctx.fill(); ikon(ctx,x[0],tx+64-18,ty+th/2-18,36,OKR,1.8);
    const fs=fit(ctx,x[1],tw2-140,30,18,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,OKR,0); });
  prog2(ctx,n,T,H-48,'rgba(247,246,241,.15)',OSF);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=OBG; ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(780,640,330,0,Math.PI*2); ctx.fillStyle=OSF; ctx.fill();
  ctx.beginPath(); ctx.arc(470,330,46,0,Math.PI*2); ctx.fillStyle=OAC; ctx.fill();
  boy(ctx,d,770,1090,800);
  dKoyu(ctx,64,56,66); cnt(ctx,n,T,W-64,100,OINK);
  txt(ctx,U(c.eyebrow),64,230,20,700,OAC,.32);
  [[c.h1,400,OINK],[c.h2,700,OAC],[c.h3,400,OINK]].forEach(([t,w,cl],k)=>{ t=t||''; txt(ctx,t,64,320+k*86,fit(ctx,t,520,84,40,w,-.03),w,cl,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),27,420).slice(0,4),64,560,27,38,'#55624F',OINK);
  txt(ctx,'PORTFÖY DANIŞMANI',64,860,18,700,OAC,.26);
  const nm=isim(d); txt(ctx,nm.first,64,926,fit(ctx,nm.first,430,58,28,400,-.02),400,OINK,-.02); txt(ctx,nm.last,64,988,fit(ctx,nm.last,430,58,28,700,-.02),700,OINK,-.02);
  rrc(ctx,40,1074,W-80,236,[40,40,40,140]); ctx.fillStyle=OINK; ctx.fill();
  txt(ctx,'ARAYIN',100,1134,17,700,'rgba(203,213,189,.8)',.26); txt(ctx,telOf(d),100,1202,56,700,OKR,0);
  txt(ctx,c.addr||'',100,1250,fit(ctx,c.addr||'',540,18,12,400,0),400,'rgba(247,246,241,.6)',0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-88-cw,1152,cw,80,40); ctx.fillStyle=OAC; ctx.fill(); txt(ctx,c.cta,W-88-cw/2,1201,fs,700,'#fff',0,'center'); }
}};


/* ================= 11) SİNEMA ================= */
const SG='rgba(255,255,255,.55)';
function kose(ctx,x,y,w,h,L,renk){ ctx.strokeStyle=renk; ctx.lineWidth=2; ctx.beginPath();
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([a,b,sx,sy])=>{ ctx.moveTo(a+sx*L,b); ctx.lineTo(a,b); ctx.lineTo(a,b+sy*L); }); ctx.stroke(); }
const sinema={ad:'Sinema',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle='#0A0A0A'; ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,W/2,64,54,true,false);
  txt(ctx,'RE/MAX DOĞUŞ SUNAR',W/2,200,17,700,SG,.5,'center');
  coverImg(ctx,IMGS.cover.img,0,240,W,640,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,240,0,880,[[0,'rgba(10,10,10,.25)'],[.25,'rgba(10,10,10,0)'],[.8,'rgba(10,10,10,0)'],[1,'rgba(10,10,10,.5)']]); ctx.fillRect(0,240,W,640);
  kose(ctx,40,270,W-80,580,34,'rgba(255,255,255,.7)');
  if(c.badge) txt(ctx,U(c.badge),70,838,16,700,'#fff',.4);
  projeYaz(ctx,c,W/2,1000,W-140,92,40,'rgba(255,255,255,.75)','#fff','center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-36,1036,72,3);
  satir3(ctx,[c.big,U(c.konum),...chipList(c).slice(0,2)],W/2,1092,22,'rgba(255,255,255,.85)','·');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,28,W-220).slice(0,1),W/2,1146,28,36,SG,'#fff','center');
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(140,1198,W-280,1);
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,1240,15,700,SG,.45,'center');
  const s=U(d.ad)+'   ·   '+telOf(d); txt(ctx,s,W/2,1284,fit(ctx,s,W-200,26,16,700,.12),700,'#fff',.12,'center');
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  ctx.fillStyle='#0A0A0A'; ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,56,50,46,false,false); txt(ctx,'SAHNE '+String(n).padStart(2,'0')+' / '+String(T).padStart(2,'0'),W-56,82,17,700,SG,.4,'right');
  fotoAlan(ctx,sl,i,0,140,W,860,10,0,'#0A0A0A');
  kose(ctx,36,170,W-72,800,30,'rgba(255,255,255,.65)');
  if(sl.label) txt(ctx,U(sl.label),W/2,1076,18,700,SG,.45,'center');
  const t=sigdir(ctx,sl.title||'',54,38,W-200,2); rich(ctx,t.L,W/2,1146,t.size,t.size*1.12,'rgba(255,255,255,.72)','#fff','center');
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,25,W-240).slice(0,2),W/2,1146+(t.L.length-1)*t.size*1.12+48,25,35,SG,'#fff','center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-24,H-56,48,3);
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle='#0A0A0A'; ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,-100,0,W/2,-100,900); g.addColorStop(0,'rgba(255,255,255,.08)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,56,50,46,false,false); txt(ctx,'SAHNE '+String(n).padStart(2,'0')+' / '+String(T).padStart(2,'0'),W-56,82,17,700,SG,.4,'right');
  txt(ctx,U(f.eyebrow),W/2,220,18,700,SG,.45,'center');
  txt(ctx,f.t1||'',W/2,306,fit(ctx,f.t1||'',W-180,70,36,400,-.01),400,'rgba(255,255,255,.8)',-.01,'center'); txt(ctx,f.t2||'',W/2,384,fit(ctx,f.t2||'',W-180,70,36,700,-.01),700,'#fff',-.01,'center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-36,422,72,3);
  const st=stats(f); if(st.length){ const sw=(W-160)/st.length; st.forEach(([big,small],k)=>{ const x=80+k*sw; if(k){ ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(x,476,1,120); }
    statYaz(ctx,big,x+sw/2,556,fit(ctx,big,sw-40,80,30,700,-.02),'#fff','center'); txt(ctx,U(small),x+sw/2,598,16,700,SG,.4,'center'); }); }
  const it=items(f), cw=(W-160)/2, rh=126; ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(80,650,W-160,1);
  it.forEach((x,k)=>{ const tx=80+(k%2)*cw+(k%2?24:0), ty=650+Math.floor(k/2)*rh; ikon(ctx,x[0],tx,ty+rh/2-18,36,'#fff',1.5);
    const fs=fit(ctx,x[1],cw-80,29,18,700,0); txt(ctx,x[1],tx+58,ty+rh/2+fs*.36,fs,700,'#fff',0);
    if(k%2===0){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(80,ty+rh,W-160,1); } });
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle='#0A0A0A'; ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,200,0,W/2,400,520); g.addColorStop(0,'rgba(255,255,255,.2)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,900);
  boy(ctx,d,W/2,760,620);
  ctx.fillStyle=lin(ctx,0,600,0,760,[[0,'rgba(10,10,10,0)'],[1,'#0A0A0A']]); ctx.fillRect(0,600,W,161);
  dBeyaz(ctx,56,50,46,false,false); txt(ctx,'SON',W-56,82,17,700,SG,.4,'right');
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,806,16,700,SG,.45,'center');
  txt(ctx,U(d.ad),W/2,866,fit(ctx,U(d.ad),W-200,52,26,700,.08),700,'#fff',.08,'center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-36,898,72,3);
  const hs=[[c.h1,400,'rgba(255,255,255,.75)'],[c.h2,700,'#fff'],[c.h3,400,'rgba(255,255,255,.75)']].filter(h=>h[0]); let fs=46;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],0),0); while(fs>26 && hw(fs)>W-180) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,976,fs,h[1],h[2],0); });
  rich(ctx,lines(ctx,c.desc||defDesc(),23,W-260).slice(0,2),W/2,1022,23,32,SG,'#fff','center');
  txt(ctx,telOf(d),W/2,1146,56,700,'#fff',.04,'center');
  if(c.cta) pill(ctx,c.cta,W/2,1176,60,21,null,'#fff','center','rgba(255,255,255,.7)');
  txt(ctx,c.addr||'',W/2,1290,fit(ctx,c.addr||'',W-200,17,12,400,0),400,'rgba(255,255,255,.4)',0,'center');
}};

/* ================= 12) GALERİ ================= */
const GW='#ECE9E4', GI='#1C1C1C', GM='#77736C';
function duvar(ctx){ ctx.fillStyle=GW; ctx.fillRect(0,0,W,H); const g=ctx.createRadialGradient(W/2,-200,0,W/2,-200,1300); g.addColorStop(0,'rgba(255,255,255,.75)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
function tablo(ctx,img,x,y,w,h,fx,fy,pas){ pas=pas??46;
  ctx.save(); ctx.shadowColor='rgba(0,0,0,.28)'; ctx.shadowBlur=40; ctx.shadowOffsetY=24; ctx.fillStyle=GI; ctx.fillRect(x,y,w,h); ctx.restore();
  ctx.fillStyle='#FBFAF7'; ctx.fillRect(x+12,y+12,w-24,h-24);
  const ix=x+12+pas, iy=y+12+pas, iw=w-24-2*pas, ih=h-24-2*pas; ctx.save(); ctx.beginPath(); ctx.rect(ix,iy,iw,ih); ctx.clip(); if(img!==undefined) coverImg(ctx,img,ix,iy,iw,ih,fx,fy); ctx.restore();
  ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=2; ctx.strokeRect(ix-1,iy-1,iw+2,ih+2); return {ix,iy,iw,ih}; }
function etiket(ctx,x,y,w,h){ ctx.save(); ctx.shadowColor='rgba(0,0,0,.12)'; ctx.shadowBlur=18; ctx.shadowOffsetY=6; ctx.fillStyle='#fff'; ctx.fillRect(x,y,w,h); ctx.restore(); }
const galeri={ad:'Galeri',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover; duvar(ctx);
  dKoyu(ctx,W/2,44,52,true);
  tablo(ctx,IMGS.cover.img,110,140,860,800,IMGS.cover.fx,50);
  etiket(ctx,110,1000,600,280);
  if(c.badge) txt(ctx,U(c.badge),146,1048,15,700,RED,.32);
  projeYaz(ctx,c,146,1104,530,48,28,GI,GI);
  txt(ctx,[c.big,c.konum?cap(c.konum):''].filter(Boolean).join(' · '),146,1146,24,700,GM,0);
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,22,530).slice(0,2),146,1192,22,30,GM,GI);
  const ch=chipList(c).join(' / '); if(ch) txt(ctx,ch,146,1252,fit(ctx,ch,530,18,12,700,0),700,GI,0);
  avatar(ctx,d,840,1076,64,'#DCD7CF',GI,2);
  adSatir(ctx,d,840,1186,24,GI,GI,240,'center'); txt(ctx,telOf(d),840,1222,22,700,GI,0,'center'); txt(ctx,'PORTFÖY DANIŞMANI',840,1256,13,700,GM,.24,'center');
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i); duvar(ctx);
  dKoyu(ctx,W/2,44,46,true);
  if(sl.tip==='ikili'){ tablo(ctx,a.img,90,170,440,800,a.f,50,34); tablo(ctx,b.img,550,170,440,800,b.f,50,34); }
  else tablo(ctx,a.img,90,130,900,880,a.f,50);
  etiket(ctx,90,1066,720,224);
  if(sl.label) txt(ctx,U(sl.label),126,1112,15,700,RED,.32);
  const t=sigdir(ctx,sl.title||'',40,28,650,2); rich(ctx,t.L,126,1164,t.size,t.size*1.15,GM,GI);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,21,650).slice(0,2),126,1164+(t.L.length-1)*t.size*1.15+40,21,29,GM,GI);
  txt(ctx,'No.',990,1170,22,400,GM,0,'right'); txt(ctx,String(n).padStart(2,'0'),990,1250,76,700,GI,-.03,'right');
},
feat(ctx,n,T){ const f=S.feat; duvar(ctx);
  dKoyu(ctx,W/2,44,52,true); cnt(ctx,n,T,W-64,82,GM);
  txt(ctx,U(f.eyebrow),W/2,210,17,700,RED,.36,'center');
  txt(ctx,f.t1||'',W/2,292,fit(ctx,f.t1||'',W-180,68,36,400,-.02),400,GI,-.02,'center'); txt(ctx,f.t2||'',W/2,366,fit(ctx,f.t2||'',W-180,68,36,700,-.02),700,GI,-.02,'center');
  const st=stats(f); if(st.length){ const g=26, sw=(W-160-g*(st.length-1))/st.length; st.forEach(([big,small],k)=>{ const x=80+k*(sw+g);
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.25)'; ctx.shadowBlur=24; ctx.shadowOffsetY=12; ctx.fillStyle=GI; ctx.fillRect(x,420,sw,190); ctx.restore(); ctx.fillStyle='#FBFAF7'; ctx.fillRect(x+10,430,sw-20,170);
    statYaz(ctx,big,x+sw/2,520,fit(ctx,big,sw-50,64,28,700,-.02),GI,'center'); txt(ctx,U(small),x+sw/2,564,15,700,GM,.3,'center'); }); }
  etiket(ctx,80,650,W-160,620);
  const it=items(f), cw=(W-160-80)/2, rh=Math.min(140,560/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=120+(k%2)*(cw+40), ty=680+Math.floor(k/2)*rh; ikon(ctx,x[0],tx,ty+rh/2-17,34,GI,1.5);
    const fs=fit(ctx,x[1],cw-60,28,18,700,0); txt(ctx,x[1],tx+54,ty+rh/2+fs*.36,fs,700,GI,0);
    if(k%2===0 && k+2<it.length){ ctx.fillStyle='rgba(0,0,0,.1)'; ctx.fillRect(120,ty+rh,W-240,1); } });
},
close(ctx,n,T){ const d=danisman(), c=S.close; duvar(ctx);
  dKoyu(ctx,W/2,44,52,true); cnt(ctx,n,T,W-64,82,GM);
  const r=tablo(ctx,undefined,260,130,560,700,50,50,40);
  ctx.save(); ctx.beginPath(); ctx.rect(r.ix,r.iy,r.iw,r.ih); ctx.clip(); ctx.fillStyle=lin(ctx,0,r.iy,0,r.iy+r.ih,[[0,'#E7E2DA'],[1,'#CFC8BC']]); ctx.fillRect(r.ix,r.iy,r.iw,r.ih); boy(ctx,d,W/2,r.iy+r.ih,600); ctx.restore();
  etiket(ctx,140,880,800,400);
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,934,15,700,RED,.34,'center');
  adSatir(ctx,d,W/2,990,46,GI,GI,700,'center');
  const hs=[[c.h1,400],[c.h2,700],[c.h3,400]].filter(h=>h[0]); let fs=36;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],0),0); while(fs>22 && hw(fs)>700) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,1050,fs,h[1],GI,0); });
  rich(ctx,lines(ctx,c.desc||defDesc(),20,680).slice(0,2),W/2,1090,20,28,GM,GI,'center');
  txt(ctx,telOf(d),W/2,1186,50,700,GI,.02,'center');
  if(c.cta) txt(ctx,c.cta,W/2,1228,22,700,RED,0,'center');
  txt(ctx,c.addr||'',W/2,1262,fit(ctx,c.addr||'',700,16,11,400,0),400,GM,0,'center');
}};

/* ================= 13) AURORA ================= */
function aurora(ctx){ ctx.fillStyle='#070B18'; ctx.fillRect(0,0,W,H);
  [[160,180,700,'rgba(43,92,255,.55)'],[980,1180,700,'rgba(225,27,43,.38)'],[960,260,560,'rgba(122,60,255,.32)'],[120,1200,520,'rgba(0,170,200,.22)']].forEach(([x,y,r,c])=>{ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,c); g.addColorStop(1,c.replace(/[\d.]+\)$/,'0)')); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }); }
function parlakKart(ctx,img,x,y,w,h,fx,fy){ golge(ctx,()=>rr(ctx,x,y,w,h,44),'rgba(43,92,255,.45)',80,20); fotoKutu(ctx,img,x,y,w,h,fx,fy);
  ctx.save(); rr(ctx,x,y,w,h,44); ctx.clip(); ctx.fillStyle=lin(ctx,x,y,x+w*.6,y+h*.6,[[0,'rgba(255,255,255,.18)'],[.4,'rgba(255,255,255,0)']]); ctx.fillRect(x,y,w,h); ctx.restore();
  ctx.save(); rr(ctx,x,y,w,h,44); ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=2; ctx.stroke(); ctx.restore(); }
/* yere yansıma: aşağı doğru şeritler halinde solar */
function yansimaKart(ctx,img,x,y,w,h,fx,fy,rh){ if(!img) return; const n=16, sh=rh/n;
  for(let k=0;k<n;k++){ const top=y+h+8+k*sh; ctx.save(); ctx.beginPath(); ctx.rect(x,top,w,sh+.5); ctx.clip(); ctx.globalAlpha=.26*(1-k/n)*(1-k/n);
    ctx.translate(0,2*(y+h)+8); ctx.scale(1,-1); rr(ctx,x,y,w,h,44); ctx.clip(); coverImg(ctx,img,x,y,w,h,fx,fy); ctx.restore(); } }
const auroraT={ad:'Aurora',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover; aurora(ctx);
  dBeyaz(ctx,W/2,44,58,true);
  const x=110,y=140,w=860,h=700; yansimaKart(ctx,IMGS.cover.img,x,y,w,h,IMGS.cover.fx,50,120); parlakKart(ctx,IMGS.cover.img,x,y,w,h,IMGS.cover.fx,50);
  if(c.badge){ const bt=U(c.badge), bw=tw(ctx,bt,18,700,.2)+44; camKutu(ctx,x+32,y+32,bw,46,23); txt(ctx,bt,x+32+bw/2,y+62,18,700,'#fff',.2,'center'); }
  if(c.big){ const fs=fit(ctx,c.big,200,64,30,700,-.02), bw=tw(ctx,c.big,fs,700,-.02)+60; camKutu(ctx,x+w-32-bw,y+h-124,bw,92,46); txt(ctx,c.big,x+w-32-bw/2,y+h-78+fs*.36,fs,700,'#fff',-.02,'center'); }
  if(c.konum) txt(ctx,U(c.konum),W/2,972,20,700,'rgba(160,190,255,.9)',.4,'center');
  projeYaz(ctx,c,W/2,1052,W-160,78,40,'#fff','#fff','center');
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,28,W-200).slice(0,1),W/2,1100,28,36,'rgba(255,255,255,.8)','#fff','center');
  chipsOrtali(ctx,chipList(c),W/2,1132,W-160,46,20,{cam:1,color:'#fff'});
  const ad=d.ad, tel=telOf(d), wA=tw(ctx,ad,24,700,0), wT=tw(ctx,tel,24,400,0), bw=24+64+18+wA+26+wT+34, bx=W/2-bw/2;
  camKutu(ctx,bx,1210,bw,88,44); avatar(ctx,d,bx+24+32,1254,32,'rgba(255,255,255,.25)');
  txt(ctx,ad,bx+24+64+18,1263,24,700,'#fff',0); txt(ctx,tel,bx+24+64+18+wA+26,1263,24,400,'rgba(255,255,255,.85)',0);
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i); aurora(ctx);
  dBeyaz(ctx,90,40,52,false); const cw=128; camKutu(ctx,990-cw,42,cw,48,24); cnt(ctx,n,T,990-cw/2,74,'#fff','center');
  if(sl.tip==='ikili'){ [[a,90],[b,550]].forEach(([p,x])=>{ yansimaKart(ctx,p.img,x,124,440,780,p.f,50,110); parlakKart(ctx,p.img,x,124,440,780,p.f,50); }); }
  else { yansimaKart(ctx,a.img,90,124,900,780,a.f,50,110); parlakKart(ctx,a.img,90,124,900,780,a.f,50); }
  if(sl.label) txt(ctx,U(sl.label),W/2,1070,19,700,'rgba(160,190,255,.9)',.4,'center');
  const t=sigdir(ctx,sl.title||'',56,40,W-200,2); rich(ctx,t.L,W/2,1142,t.size,t.size*1.1,'#fff','#fff','center');
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,25,W-240).slice(0,2),W/2,1142+(t.L.length-1)*t.size*1.1+46,25,35,'rgba(255,255,255,.75)','#fff','center');
},
feat(ctx,n,T){ aurora(ctx); const f=S.feat;
  dBeyaz(ctx,W/2,44,58,true); cnt(ctx,n,T,W-64,84,'rgba(255,255,255,.8)');
  txt(ctx,U(f.eyebrow),W/2,204,19,700,'rgba(160,190,255,.9)',.4,'center');
  txt(ctx,f.t1||'',W/2,284,fit(ctx,f.t1||'',W-180,66,36,400,-.02),400,'#fff',-.02,'center'); txt(ctx,f.t2||'',W/2,356,fit(ctx,f.t2||'',W-180,66,36,700,-.02),700,'#fff',-.02,'center');
  const st=stats(f); if(st.length){ const g=18, sw=(W-128-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*(sw+g); camKutu(ctx,x,410,sw,176,32);
      statYaz(ctx,big,x+sw/2,506,fit(ctx,big,sw-30,66,30,700,-.02),'#fff','center'); txt(ctx,U(small),x+sw/2,550,17,700,'rgba(255,255,255,.7)',.24,'center'); }); }
  const it=items(f), tw2=(W-128-18)/2, th=128;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=618+Math.floor(k/2)*(th+18); camKutu(ctx,tx,ty,tw2,th,30);
    ctx.beginPath(); ctx.arc(tx+64,ty+th/2,36,0,Math.PI*2); ctx.fillStyle=lin(ctx,tx+28,ty,tx+100,ty+th,[[0,'rgba(43,92,255,.9)'],[1,'rgba(122,60,255,.9)']]); ctx.fill(); ikon(ctx,x[0],tx+64-18,ty+th/2-18,36,'#fff',1.8);
    const fs=fit(ctx,x[1],tw2-140,30,18,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,'#fff',0); });
  prog2(ctx,n,T,H-48,'rgba(255,255,255,.2)','#fff');
},
close(ctx,n,T){ const d=danisman(), c=S.close; aurora(ctx);
  dBeyaz(ctx,W/2,44,58,true); cnt(ctx,n,T,W-64,84,'rgba(255,255,255,.8)');
  camKutu(ctx,90,330,900,960,48);
  const g=ctx.createRadialGradient(W/2,470,0,W/2,470,380); g.addColorStop(0,'rgba(120,150,255,.3)'); g.addColorStop(1,'rgba(120,150,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,100,W,700);
  boy(ctx,d,W/2,780,640);
  ctx.fillStyle='rgba(255,255,255,.3)'; ctx.fillRect(90,780,900,2);
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,834,17,700,'rgba(160,190,255,.9)',.4,'center');
  adSatir(ctx,d,W/2,894,50,'#fff','#fff',800,'center');
  const hs=[[c.h1,400],[c.h2,700],[c.h3,400]].filter(h=>h[0]); let fs=44;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],-.01),0); while(fs>26 && hw(fs)>800) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,974,fs,h[1],'#fff',-.01); });
  rich(ctx,lines(ctx,c.desc||defDesc(),23,780).slice(0,2),W/2,1018,23,32,'rgba(255,255,255,.75)','#fff','center');
  txt(ctx,telOf(d),W/2,1140,56,700,'#fff',.02,'center');
  if(c.cta){ const fs2=22, cw=tw(ctx,c.cta,fs2,700,.18)+56; rr(ctx,W/2-cw/2,1166,cw,62,31); ctx.fillStyle=lin(ctx,W/2-cw/2,0,W/2+cw/2,0,[[0,'#2B5CFF'],[1,'#7A3CFF']]); ctx.fill(); txt(ctx,c.cta,W/2,1166+31+fs2*.36,fs2,700,'#fff',.18,'center'); }
  txt(ctx,c.addr||'',W/2,1266,fit(ctx,c.addr||'',820,17,12,400,0),400,'rgba(255,255,255,.6)',0,'center');
}};

/* ================= 14) UYUMLU RENK ================= */
const _renk=new WeakMap();
function hsl(h,s,l){ return `hsl(${Math.round(h)},${Math.round(s*100)}%,${Math.round(l*100)}%)`; }
function palet(img){ let h=215,s=.35;
  if(img){ if(_renk.has(img)) return _renk.get(img);
    try{ const c=document.createElement('canvas'); c.width=24; c.height=30; const x=c.getContext('2d'); x.drawImage(img,0,0,24,30); const p=x.getImageData(0,0,24,30).data;
      let sx=0,sy=0,ws=0,ss=0; for(let k=0;k<p.length;k+=4){ const r=p[k]/255,g=p[k+1]/255,b=p[k+2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), sat=mx?((mx-mn)/mx):0; if(mx<.08||mx>.97) continue;
        let hh=0; if(mx!==mn){ if(mx===r) hh=((g-b)/(mx-mn))%6; else if(mx===g) hh=(b-r)/(mx-mn)+2; else hh=(r-g)/(mx-mn)+4; } hh*=60; const wgt=sat*sat+.02; sx+=Math.cos(hh*Math.PI/180)*wgt; sy+=Math.sin(hh*Math.PI/180)*wgt; ws+=wgt; ss+=sat; }
      if(ws){ h=(Math.atan2(sy,sx)*180/Math.PI+360)%360; s=Math.min(.55,Math.max(.18,ss/(p.length/4)*1.4)); } }catch(e){} }
  const P={koyu:hsl(h,s*.9,.15), orta:hsl(h,s*.8,.27), acik:hsl(h,s*.5,.9), vurgu:hsl(h,Math.min(.8,s+.25),.68), zemin:hsl(h,s*.45,.93)};
  if(img) _renk.set(img,P); return P; }
const uyum={ad:'Uyumlu Renk',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover, P=palet(IMGS.cover.img);
  ctx.fillStyle=P.koyu; ctx.fillRect(0,0,W,H);
  coverImg(ctx,IMGS.cover.img,0,0,W,900,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,260,[[0,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,260);
  const g=ctx.createLinearGradient(0,640,0,900); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,P.koyu); ctx.fillStyle=g; ctx.fillRect(0,640,W,261);
  dBeyaz(ctx,64,56,76);
  if(c.badge) pill(ctx,U(c.badge),W-64,72,48,19,P.vurgu,P.koyu,'right');
  if(c.konum) txt(ctx,U(c.konum),64,890,22,700,P.vurgu,.32);
  const bigW=c.big?tw(ctx,c.big,110,700,-.03):0; if(c.big) txt(ctx,c.big,W-64,984,110,700,P.vurgu,-.03,'right');
  projeYaz(ctx,c,64,976,W-128-bigW-40,86,40,'#fff','#fff');
  let y=1036; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,W-128).slice(0,2); rich(ctx,L,64,y,30,38,P.acik,'#fff'); y+=(L.length-1)*38+30; } else y-=24;
  chips(ctx,chipList(c),64,y,W-128,50,21,{bg:P.orta,color:'#fff'},1);
  ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(64,1186,W-128,2);
  avatar(ctx,d,110,1262,46,P.orta,P.vurgu,3);
  adSatir(ctx,d,180,1256,30,'#fff','#fff',440); txt(ctx,U(d.unvan),180,1288,15,700,P.acik,.2);
  txt(ctx,telOf(d),W-64,1274,38,700,'#fff',0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a}=fotoBilgi(i), P=palet(a.img);
  ctx.fillStyle=P.koyu; ctx.fillRect(0,0,W,H);
  fotoAlan(ctx,sl,i,0,0,W,980,8,0,P.koyu);
  ctx.fillStyle=lin(ctx,0,0,0,240,[[0,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]); ctx.fillRect(0,0,W,240);
  const g=ctx.createLinearGradient(0,760,0,980); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,P.koyu); ctx.fillStyle=g; ctx.fillRect(0,760,W,221);
  dBeyaz(ctx,64,56,64); const cw=132; rr(ctx,W-64-cw,62,cw,48,24); ctx.fillStyle=P.koyu; ctx.fill(); cnt(ctx,n,T,W-64-cw/2,94,'#fff','center');
  if(sl.label) txt(ctx,U(sl.label),64,1036,20,700,P.vurgu,.32);
  const t=sigdir(ctx,sl.title||'',60,42,W-128,2); rich(ctx,t.L,64,1110,t.size,t.size*1.1,'#fff',P.vurgu);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,26,W-128).slice(0,2),64,1110+(t.L.length-1)*t.size*1.1+48,26,36,P.acik,'#fff');
  prog2(ctx,n,T,H-44,'rgba(255,255,255,.15)',P.vurgu);
},
feat(ctx,n,T){ const f=S.feat, P=palet(IMGS.cover.img);
  ctx.fillStyle=P.koyu; ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W,0,0,W,0,900); g.addColorStop(0,P.orta); g.addColorStop(1,P.koyu); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  dBeyaz(ctx,64,56,70); cnt(ctx,n,T,W-64,102,'rgba(255,255,255,.75)');
  txt(ctx,U(f.eyebrow),64,206,20,700,P.vurgu,.32);
  txt(ctx,f.t1||'',64,292,fit(ctx,f.t1||'',W-128,74,40,400,-.02),400,'#fff',-.02); txt(ctx,f.t2||'',64,370,fit(ctx,f.t2||'',W-128,74,40,700,-.02),700,P.vurgu,-.02);
  const st=stats(f); if(st.length){ const sw=(W-128)/st.length; st.forEach(([big,small],k)=>{ const x=64+k*sw;
    statYaz(ctx,big,x,500,fit(ctx,big,sw-40,84,30,700,-.03),'#fff'); txt(ctx,U(small),x,544,17,700,P.acik,.26); }); }
  const it=items(f), tw2=(W-128-18)/2, th=126;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=606+Math.floor(k/2)*(th+18); rr(ctx,tx,ty,tw2,th,28); ctx.fillStyle='rgba(255,255,255,.07)'; ctx.fill();
    ctx.beginPath(); ctx.arc(tx+64,ty+th/2,36,0,Math.PI*2); ctx.fillStyle=P.vurgu; ctx.fill(); ikon(ctx,x[0],tx+64-18,ty+th/2-18,36,P.koyu,2);
    const fs=fit(ctx,x[1],tw2-140,30,18,700,0); txt(ctx,x[1],tx+120,ty+th/2+fs*.36,fs,700,'#fff',0); });
  prog2(ctx,n,T,H-48,'rgba(255,255,255,.15)',P.vurgu);
},
close(ctx,n,T){ const d=danisman(), c=S.close, P=palet(IMGS.cover.img);
  ctx.fillStyle=P.zemin; ctx.fillRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(780,640,330,0,Math.PI*2); ctx.fillStyle=P.acik; ctx.fill();
  boy(ctx,d,770,1090,800);
  dKoyu(ctx,64,56,66); cnt(ctx,n,T,W-64,100,P.koyu);
  txt(ctx,U(c.eyebrow),64,230,20,700,P.orta,.32);
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,64,320+k*86,fit(ctx,t,520,84,40,w,-.03),w,P.koyu,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),27,420).slice(0,4),64,560,27,38,P.orta,P.koyu);
  txt(ctx,'PORTFÖY DANIŞMANI',64,860,18,700,P.orta,.26);
  const nm=isim(d); txt(ctx,nm.first,64,926,fit(ctx,nm.first,430,58,28,400,-.02),400,P.koyu,-.02); txt(ctx,nm.last,64,988,fit(ctx,nm.last,430,58,28,700,-.02),700,P.koyu,-.02);
  rr(ctx,40,1074,W-80,236,40); ctx.fillStyle=P.koyu; ctx.fill();
  txt(ctx,'ARAYIN',100,1134,17,700,P.acik,.26); txt(ctx,telOf(d),100,1202,56,700,'#fff',0);
  txt(ctx,c.addr||'',100,1250,fit(ctx,c.addr||'',540,18,12,400,0),400,P.acik,0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-88-cw,1152,cw,80,40); ctx.fillStyle=P.vurgu; ctx.fill(); txt(ctx,c.cta,W-88-cw/2,1201,fs,700,P.koyu,0,'center'); }
}};

/* ================= 15) KOLAJ ================= */
const PK='#F3EEE5';
function kagit(ctx){ ctx.fillStyle=PK; ctx.fillRect(0,0,W,H); ctx.fillStyle='rgba(120,100,70,.05)'; for(let y=60;y<H;y+=60) ctx.fillRect(0,y,W,1.5); }
function baski(ctx,img,cx,cy,w,h,aci,fx,fy,alt,yazi){ alt=alt||18;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(aci*Math.PI/180);
  ctx.save(); ctx.shadowColor='rgba(60,40,20,.28)'; ctx.shadowBlur=36; ctx.shadowOffsetY=16; ctx.fillStyle='#fff'; ctx.fillRect(-w/2,-h/2,w,h); ctx.restore();
  const p=18; ctx.save(); ctx.beginPath(); ctx.rect(-w/2+p,-h/2+p,w-2*p,h-p-alt); ctx.clip(); coverImg(ctx,img,-w/2+p,-h/2+p,w-2*p,h-p-alt,fx,fy); ctx.restore();
  if(yazi) txt(ctx,yazi,-w/2+p+6,h/2-alt/2+8,22,700,NAVY,.1);
  ctx.save(); ctx.rotate(-3*Math.PI/180); ctx.fillStyle='rgba(233,220,190,.82)'; ctx.fillRect(-70,-h/2-22,140,44); ctx.restore();
  ctx.restore(); }
function sticker(ctx,cx,cy,r,renk){ ctx.save(); ctx.shadowColor='rgba(60,40,20,.25)'; ctx.shadowBlur=16; ctx.shadowOffsetY=6; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=renk; ctx.fill(); ctx.restore(); }
const kolaj={ad:'Kolaj',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover, s0=IMGS.s0a||{}, s1=IMGS.s1a||{};
  kagit(ctx);
  dKoyu(ctx,64,52,58);
  if(c.badge) pill(ctx,U(c.badge),W-64,60,48,19,RED,'#fff','right');
  baski(ctx,s0.img,850,330,330,300,7,s0.f,50);
  baski(ctx,s1.img,860,690,320,290,-6,s1.f,50);
  baski(ctx,IMGS.cover.img,420,520,700,640,-3,IMGS.cover.fx,50,24);
  if(c.big){ sticker(ctx,700,830,92,RED); const fs=fit(ctx,c.big,150,62,26,700,-.02); ctx.save(); ctx.translate(700,830); ctx.rotate(-8*Math.PI/180); txt(ctx,c.big,0,fs*.36,fs,700,'#fff',-.02,'center'); ctx.restore(); }
  if(c.konum) txt(ctx,U(c.konum),64,966,22,700,RED,.32);
  projeYaz(ctx,c,64,1050,W-128,84,40,NAVY,NAVY);
  let y=1100; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,30,W-128).slice(0,1); rich(ctx,L,64,y,30,38,GRAY,NAVY); y+=30; } else y-=24;
  chips(ctx,chipList(c),64,y,W-128,48,21,{bg:'#fff',color:NAVY},1);
  avatar(ctx,d,110,1262,46,'#E9E2D6','#fff',5);
  adSatir(ctx,d,180,1256,30,NAVY,NAVY,440); txt(ctx,U(d.unvan),180,1288,15,700,'#8A8F9C',.2);
  txt(ctx,telOf(d),W-64,1274,36,700,NAVY,0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i], {a,b}=fotoBilgi(i), yon=i%2?1:-1;
  kagit(ctx);
  dKoyu(ctx,64,52,50); cnt(ctx,n,T,W-64,88,NAVY);
  if(sl.tip==='ikili'){ baski(ctx,a.img,400,400,640,500,-4,50,a.f,60,U(sl.label)); baski(ctx,b.img,670,780,640,480,5,50,b.f); }
  else baski(ctx,a.img,W/2,560,900,820,2*yon,a.f,50,80,U(sl.label));
  const t=sigdir(ctx,sl.title||'',56,40,W-128,2); rich(ctx,t.L,64,1130,t.size,t.size*1.1,NAVY,RED);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,26,W-128).slice(0,2),64,1130+(t.L.length-1)*t.size*1.1+48,26,36,GRAY,NAVY);
},
feat(ctx,n,T){ const f=S.feat; kagit(ctx);
  dKoyu(ctx,64,52,58); cnt(ctx,n,T,W-64,88,NAVY);
  txt(ctx,U(f.eyebrow),64,206,20,700,RED,.32);
  txt(ctx,f.t1||'',64,290,fit(ctx,f.t1||'',W-128,74,40,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',64,368,fit(ctx,f.t2||'',W-128,74,40,700,-.02),700,NAVY,-.02);
  const st=stats(f), notlar=['#FFE7A3','#FFD3C9','#D6E8FF']; if(st.length){ const g=26, sw=(W-128-g*(st.length-1))/st.length;
    st.forEach(([big,small],k)=>{ const x=64+k*(sw+g); ctx.save(); ctx.translate(x+sw/2,520); ctx.rotate((k%2?2.5:-2)*Math.PI/180);
      ctx.save(); ctx.shadowColor='rgba(60,40,20,.2)'; ctx.shadowBlur=18; ctx.shadowOffsetY=8; ctx.fillStyle=notlar[k%3]; ctx.fillRect(-sw/2,-88,sw,176); ctx.restore();
      statYaz(ctx,big,0,8,fit(ctx,big,sw-40,64,28,700,-.02),NAVY,'center'); txt(ctx,U(small),0,52,16,700,'rgba(10,22,40,.6)',.24,'center'); ctx.restore(); }); }
  const it=items(f), tw2=(W-128-18)/2, th=124;
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=650+Math.floor(k/2)*(th+16);
    ctx.save(); ctx.shadowColor='rgba(60,40,20,.12)'; ctx.shadowBlur=14; ctx.shadowOffsetY=5; ctx.fillStyle='#fff'; ctx.fillRect(tx,ty,tw2,th); ctx.restore();
    ikon(ctx,x[0],tx+28,ty+th/2-19,38,RED,1.8);
    const fs=fit(ctx,x[1],tw2-110,30,18,700,0); txt(ctx,x[1],tx+90,ty+th/2+fs*.36,fs,700,NAVY,0); });
},
close(ctx,n,T){ const d=danisman(), c=S.close; kagit(ctx);
  ctx.save(); ctx.translate(790,560); ctx.rotate(4*Math.PI/180);
  ctx.save(); ctx.shadowColor='rgba(60,40,20,.28)'; ctx.shadowBlur=36; ctx.shadowOffsetY=16; ctx.fillStyle='#fff'; ctx.fillRect(-250,-340,500,680); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(-232,-322,464,564); ctx.clip(); ctx.fillStyle=lin(ctx,0,-322,0,242,[[0,'#E9EEF5'],[1,'#CBD5E3']]); ctx.fillRect(-232,-322,464,564); boy(ctx,d,0,242,560); ctx.restore();
  txt(ctx,d.ad,0,300,fit(ctx,d.ad,440,30,18,700,0),700,NAVY,0,'center');
  ctx.save(); ctx.rotate(-3*Math.PI/180); ctx.fillStyle='rgba(233,220,190,.82)'; ctx.fillRect(-70,-362,140,44); ctx.restore(); ctx.restore();
  dKoyu(ctx,64,52,58); cnt(ctx,n,T,W-64,88,NAVY);
  txt(ctx,U(c.eyebrow),64,230,20,700,RED,.32);
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,64,320+k*86,fit(ctx,t,470,84,40,w,-.03),w,NAVY,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),26,440).slice(0,4),64,560,26,36,GRAY,NAVY);
  txt(ctx,'PORTFÖY DANIŞMANI',64,860,18,700,RED,.26);
  const nm=isim(d); txt(ctx,nm.first,64,926,fit(ctx,nm.first,440,58,28,400,-.02),400,NAVY,-.02); txt(ctx,nm.last,64,988,fit(ctx,nm.last,440,58,28,700,-.02),700,NAVY,-.02);
  ctx.save(); ctx.translate(W/2,1180); ctx.rotate(-1.5*Math.PI/180);
  ctx.save(); ctx.shadowColor='rgba(60,40,20,.25)'; ctx.shadowBlur=24; ctx.shadowOffsetY=10; ctx.fillStyle=RED; rr(ctx,-500,-100,1000,200,28); ctx.fill(); ctx.restore();
  txt(ctx,'ARAYIN',-450,-40,17,700,'rgba(255,255,255,.8)',.26); txt(ctx,telOf(d),-450,30,56,700,'#fff',0);
  txt(ctx,c.addr||'',-450,72,fit(ctx,c.addr||'',540,17,12,400,0),400,'rgba(255,255,255,.8)',0);
  if(c.cta){ const fs=24, cw=tw(ctx,c.cta,fs,700,0)+56; rr(ctx,450-cw,-36,cw,72,36); ctx.fillStyle='#fff'; ctx.fill(); txt(ctx,c.cta,450-cw/2,9,fs,700,RED,0,'center'); }
  ctx.restore();
}};


/* ================= 4. SET: MODERN KURUMSAL ================= */
const KG='#F4F5F7', KL='#E3E6EC', KS='#8A93A6';
function statList(f,c){ const st=stats(f); if(st.length) return st; return [[c.big,'ODA']].filter(s=>s[0]); }
function tablo3(ctx,list,x,y,w,h,renk,etiketRenk,cizgi,align){ const n=list.length; if(!n) return; const cw=w/n;
  list.forEach(([v,l],k)=>{ const cx=x+k*cw; if(k){ ctx.fillStyle=cizgi; ctx.fillRect(cx,y+18,1.5,h-36); }
    const ax=align==='center'?cx+cw/2:cx+(k?32:0);
    txt(ctx,U(l),ax,y+h/2-14,15,700,etiketRenk,.24,align); txt(ctx,v,ax,y+h/2+30,fit(ctx,v,cw-40,40,20,700,-.01),700,renk,-.01,align); }); }

/* ---- 16) BİLGİ FÖYÜ ---- */
function fBas(ctx,n,T){ ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,124); dBeyaz(ctx,64,32,60,false,false); if(n) cnt(ctx,n,T,W-64,74,'rgba(255,255,255,.75)'); }
function fAlt(ctx,d){ ctx.fillStyle=NAVY; ctx.fillRect(0,H-56,W,56); txt(ctx,'RE/MAX DOĞUŞ',64,H-20,16,700,'rgba(255,255,255,.7)',.3); txt(ctx,d.ad+'  ·  '+telOf(d),W-64,H-20,17,700,'#fff',.04,'right'); }
const foy={ad:'Bilgi Föyü',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,124); dBeyaz(ctx,64,32,60,false,false);
  if(c.badge) txt(ctx,U(c.badge),W-64,74,18,700,'#fff',.3,'right');
  coverImg(ctx,IMGS.cover.img,0,124,W,690,IMGS.cover.fx,50); ctx.fillStyle=RED; ctx.fillRect(0,814,W,12);
  if(c.konum) txt(ctx,U(c.konum),64,884,20,700,KS,.32);
  projeYaz(ctx,c,64,962,W-128,76,38,NAVY,NAVY);
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) rich(ctx,lines(ctx,sub,26,W-128).slice(0,1),64,1006,26,34,GRAY,NAVY);
  rr(ctx,64,1036,W-128,128,14); ctx.strokeStyle=KL; ctx.lineWidth=2; ctx.stroke();
  tablo3(ctx,statList(S.feat,c),64,1036,W-128,128,NAVY,KS,KL,'center');
  ctx.fillStyle=NAVY; ctx.fillRect(0,1196,W,H-1196);
  avatar(ctx,d,112,1273,46,'#1E3354','#fff',3);
  adSatir(ctx,d,180,1266,28,'#fff','#fff',440); txt(ctx,U(d.unvan),180,1298,15,700,'rgba(255,255,255,.6)',.2);
  txt(ctx,'ARAYIN',W-64,1246,15,700,'rgba(255,255,255,.6)',.26,'right'); txt(ctx,telOf(d),W-64,1294,38,700,'#fff',0,'right');
},
photo(ctx,i,n,T){ const sl=S.slides[i], d=danisman();
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); fBas(ctx,n,T);
  fotoAlan(ctx,sl,i,0,124,W,860,8,0,'#fff'); ctx.fillStyle=RED; ctx.fillRect(0,984,W,10);
  if(sl.label) txt(ctx,U(sl.label),64,1056,19,700,RED,.3);
  const t=sigdir(ctx,sl.title||'',54,38,W-128,2); rich(ctx,t.L,64,1124,t.size,t.size*1.1,NAVY,NAVY);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,25,W-128).slice(0,2),64,1124+(t.L.length-1)*t.size*1.1+44,25,34,GRAY,NAVY);
  fAlt(ctx,d);
},
feat(ctx,n,T){ const f=S.feat, d=danisman();
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); fBas(ctx,n,T);
  txt(ctx,U(f.eyebrow),64,210,19,700,RED,.3);
  txt(ctx,f.t1||'',64,292,fit(ctx,f.t1||'',W-128,70,36,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',64,368,fit(ctx,f.t2||'',W-128,70,36,700,-.02),700,NAVY,-.02);
  const st=stats(f); if(st.length){ rr(ctx,64,414,W-128,140,14); ctx.fillStyle=KG; ctx.fill(); tablo3(ctx,st,64,414,W-128,140,NAVY,KS,KL,'center'); }
  const it=items(f), cw=(W-128)/2, rh=Math.min(150,660/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=64+(k%2)*cw+(k%2?20:0), ty=596+Math.floor(k/2)*rh;
    rr(ctx,tx,ty+rh/2-30,60,60,14); ctx.fillStyle=NAVY; ctx.fill(); ikon(ctx,x[0],tx+13,ty+rh/2-17,34,'#fff',1.8);
    const fs=fit(ctx,x[1],cw-100,29,18,700,0); txt(ctx,x[1],tx+82,ty+rh/2+fs*.36,fs,700,NAVY,0);
    if(k%2===0 && k+2<it.length){ ctx.fillStyle=KL; ctx.fillRect(64,ty+rh,W-128,1.5); } });
  fAlt(ctx,d);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H); fBas(ctx,n,T);
  rr(ctx,560,170,480,880,24); ctx.fillStyle=KG; ctx.fill();
  ctx.save(); rr(ctx,560,170,480,880,24); ctx.clip(); boy(ctx,d,800,1050,780); ctx.restore();
  ctx.fillStyle=RED; ctx.fillRect(560,1040,480,10);
  txt(ctx,U(c.eyebrow),64,230,19,700,RED,.3);
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,64,316+k*80,fit(ctx,t,460,76,34,w,-.03),w,NAVY,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),24,450).slice(0,4),64,546,24,34,GRAY,NAVY);
  txt(ctx,'PORTFÖY DANIŞMANI',64,860,16,700,RED,.28);
  const nm=isim(d); txt(ctx,nm.first,64,920,fit(ctx,nm.first,460,52,26,400,-.02),400,NAVY,-.02); txt(ctx,nm.last,64,978,fit(ctx,nm.last,460,52,26,700,-.02),700,NAVY,-.02);
  ctx.fillStyle=NAVY; ctx.fillRect(0,1090,W,H-1090);
  txt(ctx,'ARAYIN',64,1150,16,700,'rgba(255,255,255,.6)',.28); txt(ctx,telOf(d),64,1218,58,700,'#fff',0);
  txt(ctx,c.addr||'',64,1272,fit(ctx,c.addr||'',600,18,12,400,0),400,'rgba(255,255,255,.65)',0);
  if(c.cta){ const fs=26, cw=tw(ctx,c.cta,fs,700,0)+64; rr(ctx,W-64-cw,1166,cw,80,40); ctx.fillStyle=RED; ctx.fill(); txt(ctx,c.cta,W-64-cw/2,1215,fs,700,'#fff',0,'center'); }
}};

/* ---- 17) İSVİÇRE ---- */
const SI='#111';
function sKural(ctx,y){ ctx.fillStyle=SI; ctx.fillRect(64,y,W-128,3); }
const isvicre={ad:'İsviçre',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  sKural(ctx,60); dKoyu(ctx,64,84,48); if(c.badge) txt(ctx,U(c.badge),W-64,120,17,700,RED,.3,'right');
  const pr=c.proje||''; let s2=148; const uz=()=>Math.max(...pr.split(/\s+/).map(w=>tw(ctx,w,s2,700,-.05))); let L=richLines(ctx,pr,s2,700,700,W-128);
  while(s2>60 && (L.length>2||uz()>W-128)){ s2-=4; L=richLines(ctx,pr,s2,700,700,W-128); }
  if(c.the) txt(ctx,c.the,64,206,30,400,SI,0);
  L.forEach((ln,k)=>txt(ctx,ln.map(w=>w.t).join(''),58,220+s2*.8+k*s2*.95,s2,700,SI,-.05));
  const py=Math.max(420,220+s2*.8+(L.length-1)*s2*.95+44);
  coverImg(ctx,IMGS.cover.img,64,py,W-128,1080-py,IMGS.cover.fx,50);
  if(c.big){ const fs=fit(ctx,c.big,260,96,40,700,-.03), bw=tw(ctx,c.big,fs,700,-.03)+56; ctx.fillStyle=RED; ctx.fillRect(W-64-bw,1080-fs-40,bw,fs+40); txt(ctx,c.big,W-64-bw/2,1080-20-fs*.12,fs,700,'#fff',-.03,'center'); }
  sKural(ctx,1104);
  const cw=(W-128)/3, ch=chipList(c);
  [['Konum',c.konum?cap(c.konum):''],['Özellik',ch[0]||''],['Danışman',d.ad]].forEach(([l,v],k)=>{ const x=64+k*cw; txt(ctx,U(l),x,1150,15,700,RED,.24); txt(ctx,v,x,1196,fit(ctx,v,cw-24,30,16,700,0),700,SI,0); });
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub) txt(ctx,sub.replace(/\*/g,''),64,1262,fit(ctx,sub.replace(/\*/g,''),640,24,14,400,0),400,'#555',0);
  txt(ctx,telOf(d),W-64,1262,30,700,SI,0,'right'); sKural(ctx,1290);
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  sKural(ctx,60); dKoyu(ctx,W-64-48*519/187,84,48);
  txt(ctx,String(n).padStart(2,'0'),58,268,170,700,RED,-.05);
  if(sl.label) txt(ctx,U(sl.label),300,182,17,700,SI,.24); txt(ctx,'/ '+String(T).padStart(2,'0'),300,230,26,700,'#999',0);
  fotoAlan(ctx,sl,i,64,300,W-128,760,16,0,null,true);
  const t=sigdir(ctx,sl.title||'',54,38,W-128,2); rich(ctx,t.L,64,1138,t.size,t.size*1.08,SI,SI);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,24,W-128).slice(0,2),64,1138+(t.L.length-1)*t.size*1.08+42,24,32,'#555',SI);
  sKural(ctx,1290);
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  sKural(ctx,60); dKoyu(ctx,64,84,48); cnt(ctx,n,T,W-64,120,SI);
  txt(ctx,f.t1||'',58,268,fit(ctx,f.t1||'',W-128,92,40,400,-.04),400,SI,-.04); txt(ctx,f.t2||'',58,360,fit(ctx,f.t2||'',W-128,92,40,700,-.04),700,SI,-.04);
  sKural(ctx,404);
  const st=stats(f); if(st.length){ const sw=(W-128)/st.length; st.forEach(([big,small],k)=>{ const x=64+k*sw; txt(ctx,U(small),x,450,15,700,RED,.24); statYaz(ctx,big,x-4,570,fit(ctx,big,sw-30,110,36,700,-.05),SI); }); }
  sKural(ctx,610);
  const it=items(f), cw=(W-128)/2, rh=Math.min(150,660/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=64+(k%2)*cw, ty=622+Math.floor(k/2)*rh;
    txt(ctx,String(k+1).padStart(2,'0'),tx,ty+44,18,700,RED,.1); ikon(ctx,x[0],tx+cw-80,ty+rh/2-20,40,SI,1.5);
    const fs=fit(ctx,x[1],cw-120,32,18,700,-.01); txt(ctx,x[1],tx,ty+rh-36,fs,700,SI,-.01);
    if(k%2===0){ ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(64,ty+rh,W-128,1.5); ctx.fillRect(64+cw-12,ty+12,1.5,rh-24); } });
  sKural(ctx,1290);
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  sKural(ctx,60); dKoyu(ctx,64,84,48); cnt(ctx,n,T,W-64,120,SI);
  ctx.fillStyle=KG; ctx.fillRect(560,190,456,840); ctx.save(); ctx.beginPath(); ctx.rect(560,190,456,840); ctx.clip(); boy(ctx,d,788,1030,760); ctx.restore();
  ctx.fillStyle=RED; ctx.fillRect(560,190,456,10);
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,58,290+k*96,fit(ctx,t,470,96,36,w,-.05),w,SI,-.05); });
  rich(ctx,lines(ctx,c.desc||defDesc(),24,440).slice(0,4),64,560,24,34,'#555',SI);
  sKural(ctx,1060);
  const cw=(W-128)/3;
  [['Danışman',d.ad],['Telefon',telOf(d)],['Adres',c.addr||'']].forEach(([l,v],k)=>{ const x=64+k*cw; txt(ctx,U(l),x,1106,15,700,RED,.24);
    if(k<2) txt(ctx,v,x,1152,fit(ctx,v,cw-24,30,16,700,0),700,SI,0); else rich(ctx,lines(ctx,v,19,cw-10).slice(0,3),x,1146,19,26,'#555',SI); });
  if(c.cta){ ctx.fillStyle=RED; ctx.fillRect(64,1200,W-128,72); txt(ctx,c.cta,W/2,1246,28,700,'#fff',0,'center'); }
  sKural(ctx,1290);
}};

/* ---- 18) PRESTİJ ---- */
const PSV='#B9C2D3';
function prBg(ctx){ ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'#0D1E3A'],[1,'#07101F']]); ctx.fillRect(0,0,W,H); }
const prestij={ad:'Prestij',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  prBg(ctx); coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(7,16,31,.7)'],[.2,'rgba(7,16,31,0)'],[.45,'rgba(7,16,31,.15)'],[.66,'rgba(7,16,31,.92)'],[1,'#07101F']]); ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(185,194,211,.55)'; ctx.lineWidth=1.5; ctx.strokeRect(36,36,W-72,H-72);
  dBeyaz(ctx,W/2,70,66,true);
  if(c.badge){ ctx.fillStyle=RED; ctx.fillRect(W/2-20,166,40,3); txt(ctx,U(c.badge),W/2,204,17,700,'#fff',.36,'center'); }
  if(c.konum) txt(ctx,U(c.konum),W/2,880,20,700,PSV,.42,'center');
  projeYaz(ctx,c,W/2,966,W-160,84,40,'#fff','#fff','center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-40,1000,80,3);
  const st=statList(S.feat,c).slice(0,3); tablo3(ctx,st,90,1030,W-180,120,'#fff',PSV,'rgba(185,194,211,.4)','center');
  ctx.fillStyle='rgba(185,194,211,.35)'; ctx.fillRect(120,1180,W-240,1.5);
  const s=U(d.ad)+'   |   '+U(d.unvan)+'   |   '+telOf(d); txt(ctx,s,W/2,1240,fit(ctx,s,W-180,21,13,700,.12),700,'#fff',.12,'center');
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  prBg(ctx); fotoAlan(ctx,sl,i,0,0,W,H,6,0,'#07101F');
  ctx.fillStyle=lin(ctx,0,0,0,H,[[0,'rgba(7,16,31,.6)'],[.18,'rgba(7,16,31,0)'],[.58,'rgba(7,16,31,0)'],[.8,'rgba(7,16,31,.9)'],[1,'#07101F']]); ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(185,194,211,.55)'; ctx.lineWidth=1.5; ctx.strokeRect(36,36,W-72,H-72);
  dBeyaz(ctx,72,66,54,false); cnt(ctx,n,T,W-72,104,PSV);
  const t=sigdir(ctx,sl.title||'',56,40,W-200,2), sL=sl.sub?lines(ctx,sl.sub,25,W-240).slice(0,2):[];
  const end=1258, subTop=end-(sL.length?(sL.length-1)*35:0), tLast=sL.length?subTop-56:end, tFirst=tLast-(t.L.length-1)*t.size*1.1;
  if(sl.label){ txt(ctx,U(sl.label),W/2,tFirst-t.size-34,18,700,PSV,.42,'center'); ctx.fillStyle=RED; ctx.fillRect(W/2-24,tFirst-t.size-14,48,3); }
  rich(ctx,t.L,W/2,tFirst,t.size,t.size*1.1,'rgba(255,255,255,.85)','#fff','center');
  if(sL.length) rich(ctx,sL,W/2,subTop,25,35,PSV,'#fff','center');
},
feat(ctx,n,T){ const f=S.feat; prBg(ctx);
  ctx.strokeStyle='rgba(185,194,211,.55)'; ctx.lineWidth=1.5; ctx.strokeRect(36,36,W-72,H-72);
  dBeyaz(ctx,W/2,70,58,true,false); cnt(ctx,n,T,W-72,104,PSV);
  txt(ctx,U(f.eyebrow),W/2,214,18,700,PSV,.42,'center');
  txt(ctx,f.t1||'',W/2,296,fit(ctx,f.t1||'',W-180,68,36,400,-.02),400,'#fff',-.02,'center'); txt(ctx,f.t2||'',W/2,370,fit(ctx,f.t2||'',W-180,68,36,700,-.02),700,'#fff',-.02,'center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-40,404,80,3);
  tablo3(ctx,stats(f),90,440,W-180,140,'#fff',PSV,'rgba(185,194,211,.4)','center');
  ctx.fillStyle='rgba(185,194,211,.3)'; ctx.fillRect(90,610,W-180,1.5);
  const it=items(f), cw=(W-180)/2, rh=Math.min(150,620/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=90+(k%2)*cw+(k%2?20:0), ty=626+Math.floor(k/2)*rh;
    ctx.strokeStyle='rgba(185,194,211,.6)'; ctx.lineWidth=1.5; ctx.strokeRect(tx,ty+rh/2-30,60,60); ikon(ctx,x[0],tx+13,ty+rh/2-17,34,'#fff',1.6);
    const fs=fit(ctx,x[1],cw-100,28,18,700,0); txt(ctx,x[1],tx+82,ty+rh/2+fs*.36,fs,700,'#fff',0); });
},
close(ctx,n,T){ const d=danisman(), c=S.close; prBg(ctx);
  ctx.strokeStyle='rgba(185,194,211,.55)'; ctx.lineWidth=1.5; ctx.strokeRect(36,36,W-72,H-72);
  dBeyaz(ctx,W/2,70,58,true,false);
  ctx.beginPath(); ctx.arc(W/2,500,300,0,Math.PI*2); ctx.fillStyle='rgba(185,194,211,.1)'; ctx.fill(); ctx.strokeStyle='rgba(185,194,211,.45)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,800); ctx.arc(W/2,500,300,0,Math.PI); ctx.clip(); boy(ctx,d,W/2,800,640); ctx.restore();
  txt(ctx,'PORTFÖY DANIŞMANI',W/2,850,17,700,PSV,.42,'center');
  adSatir(ctx,d,W/2,910,50,'#fff','#fff',800,'center');
  ctx.fillStyle=RED; ctx.fillRect(W/2-40,940,80,3);
  const hs=[[c.h1,400],[c.h2,700],[c.h3,400]].filter(h=>h[0]); let fs=42;
  const hw=s=>hs.reduce((a,h,i)=>a+tw(ctx,h[0]+(i<hs.length-1?' ':''),s,h[1],0),0); while(fs>24 && hw(fs)>W-200) fs-=2;
  let x=W/2-hw(fs)/2; hs.forEach((h,i)=>{ x+=txt(ctx,h[0]+(i<hs.length-1?' ':''),x,1010,fs,h[1],'#fff',0); });
  txt(ctx,telOf(d),W/2,1112,56,700,'#fff',.02,'center');
  if(c.cta) pill(ctx,c.cta,W/2,1142,62,22,RED,'#fff','center');
  txt(ctx,c.addr||'',W/2,1256,fit(ctx,c.addr||'',W-200,17,12,400,0),400,PSV,0,'center');
}};

/* ---- 19) DİYAGONAL ---- */
function egik(ctx,pts,renk){ ctx.beginPath(); pts.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle=renk; ctx.fill(); }
const diyagonal={ad:'Diyagonal',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  coverImg(ctx,IMGS.cover.img,0,0,W,H,IMGS.cover.fx,50);
  ctx.fillStyle=lin(ctx,0,0,0,300,[[0,'rgba(10,22,40,.55)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(0,0,W,300);
  egik(ctx,[[0,640],[760,640],[620,H],[0,H]],'rgba(10,22,40,.96)');
  egik(ctx,[[784,640],[810,640],[670,H],[644,H]],RED);
  dBeyaz(ctx,64,56,80);
  if(c.badge) pill(ctx,U(c.badge),W-64,72,48,19,RED,'#fff','right');
  boy(ctx,d,880,H,560);
  rr(ctx,720,1236,320,74,16); ctx.fillStyle='#fff'; ctx.fill();
  adSatir(ctx,d,880,1268,22,NAVY,NAVY,290,'center'); txt(ctx,telOf(d),880,1296,20,700,RED,0,'center');
  const mw=(y)=>760-(y-640)*140/(H-640)-110;
  if(c.konum) konumYaz(ctx,c,64,724,21,'#fff',RED);
  projeYaz(ctx,c,64,812,mw(812),76,36,'#fff','#fff');
  if(c.big) txt(ctx,c.big,64,960,fit(ctx,c.big,mw(960),140,50,700,-.04),700,'#fff',-.04);
  let y=1028; const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,28,mw(1060)).slice(0,2); rich(ctx,L,64,y,28,36,'rgba(255,255,255,.85)','#fff'); y+=(L.length-1)*36+34; }
  chipList(c).slice(0,3).forEach(ch=>{ if(y>1300) return; y+=38; ctx.fillStyle=RED; ctx.fillRect(64,y-14,10,10); txt(ctx,ch,86,y-4,fit(ctx,ch,mw(y)-30,22,14,700,0),700,'#fff',0); });
},
photo(ctx,i,n,T){ const sl=S.slides[i];
  fotoAlan(ctx,sl,i,0,0,W,H,8,0,NAVY);
  ctx.fillStyle=lin(ctx,0,0,0,300,[[0,'rgba(10,22,40,.55)'],[1,'rgba(10,22,40,0)']]); ctx.fillRect(0,0,W,300);
  dBeyaz(ctx,64,56,66);
  egik(ctx,[[W-200,56],[W-40,56],[W-64,112],[W-224,112]],RED); cnt(ctx,n,T,W-132,93,'#fff','center');
  const mw=820, t=sigdir(ctx,sl.title||'',54,38,mw-140,2), sL=sl.sub?lines(ctx,sl.sub,24,mw-160).slice(0,2):[];
  const h=56+t.L.length*t.size*1.1+(sL.length?14+sL.length*33:0)+40, y=H-80-h;
  egik(ctx,[[0,y],[mw,y],[mw-60,y+h],[0,y+h]],'rgba(10,22,40,.96)'); egik(ctx,[[mw+16,y],[mw+34,y],[mw-26,y+h],[mw-44,y+h]],RED);
  if(sl.label) pill(ctx,U(sl.label),64,y-24,48,17,RED,'#fff');
  rich(ctx,t.L,64,y+56+t.size*.8,t.size,t.size*1.1,'rgba(255,255,255,.85)','#fff');
  if(sL.length) rich(ctx,sL,64,y+56+t.L.length*t.size*1.1+14+20,24,33,'rgba(255,255,255,.75)','#fff');
},
feat(ctx,n,T){ const f=S.feat;
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  egik(ctx,[[720,0],[W,0],[W,380],[620,380]],NAVY); egik(ctx,[[690,0],[708,0],[608,380],[590,380]],RED);
  dKoyu(ctx,64,56,66); cnt(ctx,n,T,W-64,100,'#fff');
  txt(ctx,U(f.eyebrow),64,214,19,700,RED,.3);
  txt(ctx,f.t1||'',64,296,fit(ctx,f.t1||'',500,64,32,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',64,368,fit(ctx,f.t2||'',500,64,32,700,-.02),700,NAVY,-.02);
  const st=stats(f); if(st.length){ const g=16, sw=(W-128-g*(st.length-1))/st.length; st.forEach(([big,small],k)=>{ const x=64+k*(sw+g);
    egik(ctx,[[x+20,452],[x+sw,452],[x+sw-20,612],[x,612]],k===0?RED:KG);
    statYaz(ctx,big,x+sw/2,540,fit(ctx,big,sw-60,62,28,700,-.02),k===0?'#fff':NAVY,'center'); txt(ctx,U(small),x+sw/2,580,15,700,k===0?'rgba(255,255,255,.8)':KS,.24,'center'); }); }
  const it=items(f), tw2=(W-128-18)/2, th=Math.min(140,(1290-648-3*16)/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=64+(k%2)*(tw2+18), ty=648+Math.floor(k/2)*(th+16); rr(ctx,tx,ty,tw2,th,12); ctx.fillStyle=KG; ctx.fill(); ctx.fillStyle=RED; ctx.fillRect(tx,ty,6,th);
    ikon(ctx,x[0],tx+32,ty+th/2-18,36,NAVY,1.8); const fs=fit(ctx,x[1],tw2-110,29,18,700,0); txt(ctx,x[1],tx+88,ty+th/2+fs*.36,fs,700,NAVY,0); });
},
close(ctx,n,T){ const d=danisman(), c=S.close;
  ctx.fillStyle=KG; ctx.fillRect(0,0,W,H);
  egik(ctx,[[0,0],[660,0],[480,H],[0,H]],NAVY); egik(ctx,[[684,0],[704,0],[524,H],[504,H]],RED);
  boy(ctx,d,800,H,880);
  dBeyaz(ctx,64,56,66,false,false); cnt(ctx,n,T,W-64,100,NAVY);
  txt(ctx,U(c.eyebrow),64,230,19,700,'rgba(255,255,255,.6)',.3);
  [[c.h1,400,'#fff'],[c.h2,700,RED],[c.h3,400,'#fff']].forEach(([t,w,cl],k)=>{ t=t||''; txt(ctx,t,64,316+k*80,fit(ctx,t,500-k*30,76,34,w,-.03),w,cl,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),23,400).slice(0,4),64,540,23,33,'rgba(255,255,255,.72)','#fff');
  txt(ctx,'PORTFÖY DANIŞMANI',64,800,16,700,'rgba(255,255,255,.6)',.28);
  const nm=isim(d); txt(ctx,nm.first,64,858,fit(ctx,nm.first,420,48,24,400,-.02),400,'#fff',-.02); txt(ctx,nm.last,64,912,fit(ctx,nm.last,420,48,24,700,-.02),700,'#fff',-.02);
  txt(ctx,'ARAYIN',64,1030,16,700,'rgba(255,255,255,.6)',.28); txt(ctx,telOf(d),64,1090,fit(ctx,telOf(d),400,50,28,700,0),700,'#fff',0);
  rich(ctx,lines(ctx,c.addr||'',17,380).slice(0,2),64,1130,17,24,'rgba(255,255,255,.6)','#fff');
  if(c.cta){ const fs=24, cw=Math.min(400,tw(ctx,c.cta,fs,700,0)+60); rr(ctx,64,1200,cw,74,37); ctx.fillStyle=RED; ctx.fill(); txt(ctx,c.cta,64+cw/2,1246,fs,700,'#fff',0,'center'); }
}};

/* ---- 20) SUNUM ---- */
function suBas(ctx,n,T,etiket){ ctx.fillStyle=KG; ctx.fillRect(0,0,W,H); dKoyu(ctx,48,40,50); txt(ctx,etiket,W-48,76,16,700,KS,.3,'right'); ctx.fillStyle=KL; ctx.fillRect(48,112,W-96,2); }
function suAlt(ctx,d,n){ ctx.fillStyle=NAVY; ctx.fillRect(0,H-70,W,70); avatar(ctx,d,82,H-35,22,'#1E3354');
  txt(ctx,d.ad+'  ·  '+telOf(d),118,H-27,20,700,'#fff',.02); txt(ctx,String(n).padStart(2,'0'),W-48,H-26,22,700,RED,.1,'right'); }
const sunum={ad:'Sunum',aile:ARIAL,
cover(ctx,T){ const d=danisman(), c=S.cover;
  suBas(ctx,1,T,'PORTFÖY SUNUMU');
  ctx.save(); rr(ctx,48,140,620,1050,20); ctx.clip(); coverImg(ctx,IMGS.cover.img,48,140,620,1050,IMGS.cover.fx,50); ctx.restore();
  const x=700, mw=W-48-x; let y=170;
  if(c.badge){ pill(ctx,U(c.badge),x,y,42,15,RED,'#fff'); y+=42; }
  if(c.konum){ y+=48; txt(ctx,U(c.konum),x,y,17,700,KS,.3); }
  y+=20; if(c.the){ y+=34; txt(ctx,c.the,x,y,28,400,NAVY,0); }
  let ps=60; const uzn=()=>Math.max(...(c.proje||'').split(/\s+/).map(w=>tw(ctx,w,ps,700,-.02))); while(ps>30&&(uzn()>mw||lines(ctx,'*'+(c.proje||'')+'*',ps,mw).length>3)) ps-=2;
  const pl=lines(ctx,'*'+(c.proje||'')+'*',ps,mw); y+=ps*.9; rich(ctx,pl,x,y,ps,ps*1.05,NAVY,NAVY); y+=(pl.length-1)*ps*1.05;
  if(c.big){ y+=110; txt(ctx,c.big,x,y,fit(ctx,c.big,mw,100,40,700,-.04),700,RED,-.04); }
  const sub=(c.sub||'').replace(/\n/g,' '); if(sub){ const L=lines(ctx,sub,22,mw).slice(0,3); y+=44; rich(ctx,L,x,y,22,30,GRAY,NAVY); y+=(L.length-1)*30; }
  y+=50;
  statList(S.feat,c).slice(0,3).forEach(([v,l])=>{ ctx.fillStyle=KL; ctx.fillRect(x,y,mw,2); txt(ctx,U(l),x,y+38,14,700,KS,.24); txt(ctx,v,x+mw,y+40,fit(ctx,v,mw-120,26,14,700,0),700,NAVY,0,'right'); y+=64; });
  ctx.fillStyle=KL; ctx.fillRect(x,y,mw,2);
  chipList(c).slice(0,3).forEach((ch,k)=>{ const yy=y+44+k*36; if(yy>1180) return; ctx.fillStyle=RED; ctx.fillRect(x,yy-12,8,8); txt(ctx,ch,x+20,yy-2,fit(ctx,ch,mw-24,19,12,700,0),700,NAVY,0); });
  suAlt(ctx,d,1);
},
photo(ctx,i,n,T){ const sl=S.slides[i], d=danisman();
  suBas(ctx,n,T,U(sl.label||'Detay'));
  const {a,b}=fotoBilgi(i);
  if(sl.tip==='ikili'){ fotoKutuR(ctx,a.img,48,140,484,800,a.f,50); fotoKutuR(ctx,b.img,548,140,484,800,b.f,50); } else fotoKutuR(ctx,a.img,48,140,W-96,800,a.f,50);
  const t=sigdir(ctx,sl.title||'',50,36,700,2); rich(ctx,t.L,48,1030,t.size,t.size*1.1,NAVY,RED);
  if(sl.sub) rich(ctx,lines(ctx,sl.sub,23,700).slice(0,3),48,1030+(t.L.length-1)*t.size*1.1+44,23,32,GRAY,NAVY);
  rr(ctx,800,976,232,250,20); ctx.fillStyle='#fff'; ctx.fill();
  txt(ctx,'SLAYT',916,1036,14,700,KS,.3,'center'); txt(ctx,String(n).padStart(2,'0'),916,1140,92,700,NAVY,-.04,'center'); txt(ctx,'/ '+String(T).padStart(2,'0'),916,1190,20,700,KS,.1,'center');
  suAlt(ctx,d,n);
},
feat(ctx,n,T){ const f=S.feat, d=danisman(); suBas(ctx,n,T,U(f.eyebrow||''));
  txt(ctx,f.t1||'',48,214,fit(ctx,f.t1||'',W-96,62,32,400,-.02),400,NAVY,-.02); txt(ctx,f.t2||'',48,282,fit(ctx,f.t2||'',W-96,62,32,700,-.02),700,NAVY,-.02);
  const st=stats(f); if(st.length){ const g=16, sw=(W-96-g*(st.length-1))/st.length; st.forEach(([big,small],k)=>{ const x=48+k*(sw+g);
    rr(ctx,x,330,sw,170,20); ctx.fillStyle=k===0?NAVY:'#fff'; ctx.fill(); txt(ctx,U(small),x+30,376,14,700,k===0?'rgba(255,255,255,.6)':KS,.24);
    statYaz(ctx,big,x+30,458,fit(ctx,big,sw-50,62,28,700,-.02),k===0?'#fff':NAVY); }); }
  const it=items(f), tw2=(W-96-16)/2, th=Math.min(150,(1250-524-3*16)/Math.max(1,Math.ceil(it.length/2)));
  it.forEach((x,k)=>{ const tx=48+(k%2)*(tw2+16), ty=524+Math.floor(k/2)*(th+16); rr(ctx,tx,ty,tw2,th,20); ctx.fillStyle='#fff'; ctx.fill();
    rr(ctx,tx+26,ty+th/2-32,64,64,16); ctx.fillStyle='rgba(225,27,43,.1)'; ctx.fill(); ikon(ctx,x[0],tx+40,ty+th/2-18,36,RED,1.8);
    const fs=fit(ctx,x[1],tw2-130,28,18,700,0); txt(ctx,x[1],tx+110,ty+th/2+fs*.36,fs,700,NAVY,0); });
  suAlt(ctx,d,n);
},
close(ctx,n,T){ const d=danisman(), c=S.close; suBas(ctx,n,T,U(c.eyebrow||'İletişim'));
  rr(ctx,48,140,460,1050,20); ctx.fillStyle=lin(ctx,0,140,0,1190,[[0,'#E9ECF1'],[1,'#D3D9E3']]); ctx.fill();
  ctx.save(); rr(ctx,48,140,460,1050,20); ctx.clip(); boy(ctx,d,278,1190,860); ctx.restore();
  const x=540, mw=W-48-x;
  [[c.h1,400],[c.h2,700],[c.h3,400]].forEach(([t,w],k)=>{ t=t||''; txt(ctx,t,x,232+k*70,fit(ctx,t,mw,66,30,w,-.03),w,k===1?RED:NAVY,-.03); });
  rich(ctx,lines(ctx,c.desc||defDesc(),22,mw).slice(0,4),x,410,22,31,GRAY,NAVY);
  let y=600; [['Danışman',d.ad],['Ünvan',d.unvan],['Telefon',telOf(d)],['Adres',c.addr||'']].forEach(([l,v],k)=>{ ctx.fillStyle=KL; ctx.fillRect(x,y,mw,2);
    txt(ctx,U(l),x,y+36,13,700,KS,.24); const L=lines(ctx,v,k===2?32:21,mw).slice(0,2); rich(ctx,L,x,y+(k===2?80:72),k===2?32:21,28,NAVY,NAVY); y+=k===3?130:110; });
  if(c.cta){ const fs=24; rr(ctx,x,1100,mw,84,20); ctx.fillStyle=RED; ctx.fill(); txt(ctx,c.cta,x+mw/2,1150,fit(ctx,c.cta,mw-40,fs,16,700,0),700,'#fff',0,'center'); }
  suAlt(ctx,d,n);
}};
function fotoKutuR(ctx,img,x,y,w,h,fx,fy){ ctx.save(); rr(ctx,x,y,w,h,20); ctx.clip(); coverImg(ctx,img,x,y,w,h,fx,fy); ctx.restore(); }

/* Seçicide gösterilenler (Umut 29 Eki onayı). Diğerleri yedek, istenirse buraya eklenir. */
window.KARUSEL_TASARIMLARI={cam,uyum,kolaj,isvicre,prestij,diyagonal,sunum};
})();
