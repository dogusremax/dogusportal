/* İlan karuseli ek tasarımları (karusel.html + portfoy-karusel.html ortak).
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

window.KARUSEL_TASARIMLARI={beyaz,kirmizi,luks,panel,mavi};
})();
