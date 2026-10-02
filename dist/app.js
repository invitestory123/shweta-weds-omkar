const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let motionPaused=reducedMotion;
const entrance=document.querySelector('#entrance');
const openingVideo=document.querySelector('#opening-video');
let openingStarted=false;
let finishOpeningTimer=null;
if(openingVideo){
  openingVideo.load();
  openingVideo.addEventListener('playing',()=>{
    openingVideo.classList.add('is-playing');
  });
  openingVideo.addEventListener('ended',finishOpening);
  openingVideo.addEventListener('error',()=>{
    openingVideo.classList.remove('is-playing');
  });
}
function finishOpening(){
  if(!entrance||entrance.classList.contains('finished'))return;
  if(finishOpeningTimer){clearTimeout(finishOpeningTimer);finishOpeningTimer=null;}
  openingStarted=false;
  if(openingVideo){
    openingVideo.pause();
    openingVideo.classList.remove('is-playing');
  }
  entrance.classList.add('fading-out');
  setTimeout(()=>{
    entrance.classList.add('finished');
    document.body.classList.remove('at-entrance');
    const inv=document.querySelector('#invitation');
    if(inv)inv.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'smooth'});
    observeScenes();
  },600);
}
document.querySelector('#open-invitation').addEventListener('click',()=>{
  if(openingStarted)return;
  openingStarted=true;
  entrance.classList.add('opening');
  if(openingVideo){
    openingVideo.muted=true;
    openingVideo.currentTime=0;
    const p=openingVideo.play();
    if(p!==undefined){
      p.catch(()=>{});
    }
  }
  finishOpeningTimer=setTimeout(finishOpening,4200);
});
document.querySelector('.opening-skip').addEventListener('click',e=>{e.preventDefault();finishOpening();});
document.querySelector('#motion-toggle').addEventListener('click',()=>setMotion(!motionPaused));
function setMotion(paused){motionPaused=paused;document.body.classList.toggle('motion-paused',paused);const b=document.querySelector('#motion-toggle');b.textContent=paused?'Play motion':'Pause motion';b.setAttribute('aria-pressed',String(paused));document.querySelectorAll('video').forEach(v=>paused?v.pause():(v===openingVideo&&!openingStarted?undefined:v.play().catch(()=>{})));}
function observeScenes(){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');const v=e.target.querySelector('video');if(v&&!motionPaused)v.play().catch(()=>{});observer.unobserve(e.target)}}),{threshold:.25});document.querySelectorAll('[data-scene]').forEach(el=>observer.observe(el));}
setMotion(motionPaused);
function releasePetals(){if(motionPaused)return;const host=document.querySelector('#petals');for(let i=0;i<14;i++){const petal=document.createElement('i');petal.className='petal';petal.style.left=`${i%2?82+Math.random()*12:Math.random()*12}%`;petal.style.animationDelay=`${Math.random()*2}s`;petal.style.animationDuration=`${7+Math.random()*3}s`;host.append(petal);petal.addEventListener('animationend',()=>petal.remove());}}
const handsObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setTimeout(releasePetals,reducedMotion?0:2300);handsObserver.disconnect();}},{threshold:.4});handsObserver.observe(document.querySelector('#together'));
document.querySelector('#replay-entrance').addEventListener('click',()=>{
  openingStarted=false;
  if(finishOpeningTimer){clearTimeout(finishOpeningTimer);finishOpeningTimer=null;}
  if(openingVideo){
    openingVideo.pause();
    openingVideo.currentTime=0;
    openingVideo.classList.remove('is-playing');
  }
  entrance.classList.remove('finished','opening','fading-out');
  document.body.classList.add('at-entrance');
  window.scrollTo(0,0);
  document.querySelector('#open-invitation').focus();
});
const tabs=[...document.querySelectorAll('[role=tab]')];
function selectTab(tab){tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!selected;});}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabs[next]);tabs[next].focus();}});});
const canvas=document.querySelector('#scratch'),context=canvas.getContext('2d',{willReadFrequently:true});
let scratching=false,revealed=false,lastPoint=null,scratchCount=0;
function paintScratch(){if(revealed)return;const box=canvas.getBoundingClientRect();const ratio=window.devicePixelRatio||1;canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);context.setTransform(ratio,0,0,ratio,0,0);context.globalCompositeOperation='source-over';context.fillStyle='#c4a066';context.fillRect(0,0,box.width,box.height);for(let i=0;i<box.width*box.height/10;i++){context.fillStyle=i%2?'rgba(255,241,192,.22)':'rgba(109,73,30,.1)';context.fillRect(Math.random()*box.width,Math.random()*box.height,1.5,1);}context.fillStyle='#49341e';context.font=`${Math.min(22,box.width/15)}px Georgia`;context.textAlign='center';context.textBaseline='middle';context.fillText('Scratch to reveal',box.width/2,box.height/2);}
function revealDate(){if(revealed)return;revealed=true;document.querySelector('.scratch-card').classList.add('revealed');document.querySelector('#scratch-instruction').textContent='We can’t wait to celebrate with you.';document.querySelector('#reveal-date').hidden=true;document.querySelector('#date-announcement').textContent=document.querySelector('#date-value').textContent;releasePetals();}
function scratch(e){if(!scratching||revealed)return;const box=canvas.getBoundingClientRect();const point={x:e.clientX-box.left,y:e.clientY-box.top};context.globalCompositeOperation='destination-out';context.lineWidth=36;context.lineCap='round';context.beginPath();context.moveTo(lastPoint?.x??point.x,lastPoint?.y??point.y);context.lineTo(point.x,point.y);context.stroke();lastPoint=point;if(++scratchCount%10===0){const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let clear=0,sampled=0;for(let i=3;i<pixels.length;i+=64){sampled++;if(pixels[i]<128)clear++;}if(clear/sampled>.4)revealDate();}}
canvas.addEventListener('pointerdown',e=>{scratching=true;lastPoint=null;canvas.setPointerCapture(e.pointerId);scratch(e);});canvas.addEventListener('pointermove',scratch);['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{scratching=false;lastPoint=null;}));document.querySelector('#reveal-date').addEventListener('click',revealDate);
new ResizeObserver(paintScratch).observe(canvas);
fetch('invitation.json').then(r=>{if(!r.ok)throw new Error('Invitation unavailable');return r.json();}).then(config=>{
  if(config.weddingDate)document.querySelector('#date-value').textContent=config.weddingDate;
  Object.entries(config.videos||{}).forEach(([name,src])=>{
    if(!src)return;
    if(name==='door'){
      if(openingVideo){
        if(openingVideo.src!==src&&!openingVideo.src.endsWith(src)){
          openingVideo.src=src;
        }
      }
      return;
    }
    const target=document.querySelector(`[data-scene="${name}"]`);
    if(!target)return;
    const video=document.createElement('video');
    video.className='scene-video';
    video.muted=true;
    video.playsInline=true;
    video.loop=true;
    video.preload='metadata';
    video.src=src;
    video.poster=target.querySelector('.scene-first,.door-closed')?.src||'';
    video.setAttribute('aria-hidden','true');
    video.addEventListener('error',()=>video.remove());
    target.insertBefore(video,target.querySelector('.hands-caption,.blessing-copy,.family-copy,.ceremony-copy,.reception-copy'));
    if(target.classList.contains('is-visible')&&!motionPaused)video.play().catch(()=>{});
  });
}).catch(()=>{});
document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();finishOpening();});
