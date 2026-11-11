// Browse project files in a continuous loop.
const viewer=document.querySelector('.file-browser');
const cards=[...document.querySelectorAll('.project-card')];
const pagination=document.querySelector('.deck-pagination');
const filenames={meeting:'meeting-summarizer.project',housing:'house-price-prediction.project',soc:'mini-soc-lab.project',malware:'malware-classification.project',split:'splitease.project'};
let visibleCards=cards.slice(),fileIndex=0,lastWheelAt=0,wheelTotal=0,lastWheelEvent=0;
const previous=document.querySelector('#previous-project'),next=document.querySelector('#next-project');
function showFile(index){
 fileIndex=((index%visibleCards.length)+visibleCards.length)%visibleCards.length;
 cards.forEach(card=>{card.hidden=card!==visibleCards[fileIndex];});
 const current=visibleCards[fileIndex];
 document.querySelector('#file-name').textContent=filenames[current.querySelector('[data-project]').dataset.project];
 document.querySelector('#file-count').textContent=`${String(fileIndex+1).padStart(2,'0')} / ${String(visibleCards.length).padStart(2,'0')}`;
 previous.disabled=next.disabled=visibleCards.length<2;
 pagination.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-current',String(i===fileIndex)));
}
function updatePagination(){
 pagination.replaceChildren();
 visibleCards.forEach((card,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Show ${card.querySelector('h3').textContent.replace('↗','').trim()}`);b.addEventListener('click',()=>showFile(i));pagination.append(b);});
 showFile(0);
}
previous.addEventListener('click',()=>showFile(fileIndex-1));
next.addEventListener('click',()=>showFile(fileIndex+1));
viewer.addEventListener('keydown',event=>{
 if(dialog.open||event.target.closest('.project-open'))return;
 if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)){
  event.preventDefault();showFile(event.key==='Home'?0:event.key==='End'?visibleCards.length-1:fileIndex+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1));
 }
});
viewer.addEventListener('wheel',event=>{
 if(event.ctrlKey||dialog.open||visibleCards.length<2)return;
 const rect=viewer.getBoundingClientRect();
 if(rect.top<0||rect.bottom>innerHeight)return;
 const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
 const direction=Math.sign(delta);
 if(!direction)return;
 const now=performance.now();
 if(now-lastWheelEvent>180)wheelTotal=0;
 lastWheelEvent=now;
 if(now-lastWheelAt<650){event.preventDefault();return;}
 event.preventDefault();wheelTotal+=delta;
 if(Math.abs(wheelTotal)>45){showFile(fileIndex+direction);lastWheelAt=now;wheelTotal=0;}
},{passive:false});
let touchStart=null;
viewer.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
viewer.addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)showFile(fileIndex+(dx<0?1:-1));touchStart=null;},{passive:true});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
 visibleCards=cards.filter(card=>button.dataset.filter==='all'||card.dataset.category.split(' ').includes(button.dataset.filter));
 updatePagination();
}));
updatePagination();
