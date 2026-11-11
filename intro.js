(() => {
 const root=document.documentElement;
 const overlay=document.querySelector('#site-intro');
 const skip=document.querySelector('#skip-intro');
 const replay=document.querySelector('#replay-intro');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const targets=[...document.querySelectorAll('body > header,body > main,body > footer,body > nav')];
 let closeTimer,removeTimer,previousFocus,running=false;
 function remember(){try{sessionStorage.setItem('jerikho-intro-v1','seen');}catch{}}
 function finish(immediate=false){
  if(!running)return;
  running=false;clearTimeout(closeTimer);clearTimeout(removeTimer);remember();
  const restoreFocus=overlay.contains(document.activeElement);
  targets.forEach(el=>el.inert=false);
  root.classList.remove('intro-pending');
  // Retain the overlay for its short fade while the homepage enters underneath.
  overlay.style.display='grid';
  overlay.setAttribute('aria-hidden','true');overlay.inert=true;
  document.body.classList.add('page-enter');
  if(immediate||reduced.matches){overlay.style.display='none';}
  else{overlay.classList.add('intro-out');removeTimer=setTimeout(()=>{overlay.style.display='none';},520);}
  if(restoreFocus&&previousFocus&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});
 }
 function start(){
  if(running)return;
  if(reduced.matches){root.classList.remove('intro-pending');document.body.classList.add('page-enter');remember();return;}
  running=true;previousFocus=document.activeElement;clearTimeout(removeTimer);
  overlay.style.display='';overlay.classList.remove('intro-out');overlay.removeAttribute('aria-hidden');overlay.inert=false;
  document.body.classList.remove('page-enter');
  root.classList.add('intro-pending');targets.forEach(el=>el.inert=true);
  // Restart the sequence when explicitly replayed.
  overlay.getAnimations({subtree:true}).forEach(a=>{a.cancel();a.play();});
  skip.focus({preventScroll:true});remember();closeTimer=setTimeout(()=>finish(),1650);
 }
 skip.addEventListener('click',()=>finish());
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish();}if(e.key==='Tab'){e.preventDefault();skip.focus();}});
 reduced.addEventListener('change',()=>{if(reduced.matches)finish(true);});
 replay.addEventListener('click',start);
 if(root.classList.contains('intro-pending'))start();else{overlay.setAttribute('aria-hidden','true');overlay.inert=true;document.body.classList.add('page-enter');}
})();
