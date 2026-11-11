(async()=>{
const data=await window.PortfolioContent.load();
window.PortfolioContent.render(data);
const projects=Object.fromEntries(data.projects.map(p=>[p.id,p]));
const esc=window.PortfolioContent.escape;
const dialog=document.querySelector('#project-dialog');
document.querySelector('#projects').addEventListener('click',event=>{
 const button=event.target.closest('[data-project]');if(!button)return;
 const p=projects[button.dataset.project];if(!p)return;
 document.querySelector('#dialog-content').innerHTML='<div class="eyebrow subdued">'+esc(p.kicker)+'</div><h2 id="dialog-title">'+esc(p.title)+'</h2><div class="tags">'+p.tools.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div><p class="detail-intro">'+esc(p.intro)+'</p><h3>'+esc(p.heading)+'</h3><ul>'+p.points.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>'+(p.note?'<p class="detail-note">'+esc(p.note)+'</p>':'')+'<div class="detail-footer">'+p.links.map(l=>'<a class="button primary" href="'+esc(l.url)+'" target="_blank" rel="noopener noreferrer" data-project-link="'+esc(p.id)+'">'+esc(l.label)+' ↗</a>').join('')+'</div>';
 dialog.showModal();document.body.style.overflow='hidden';window.PortfolioContent.track('project_open',p.id);
});
document.querySelector('#dialog-content').addEventListener('click',e=>{if(e.target.closest('[data-project-link]'))window.PortfolioContent.track('project_link',e.target.closest('[data-project-link]').dataset.projectLink);});
document.querySelectorAll('a[download]').forEach(a=>a.addEventListener('click',()=>window.PortfolioContent.track('cv_click','cv')));
window.PortfolioContent.track('page_view',location.pathname);
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{document.body.style.overflow='';});
dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
const links=[...document.querySelectorAll('.dock a')];
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>{const active=a.getAttribute('href')==='#'+entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}});},{rootMargin:'-15% 0px -55% 0px',threshold:0});
document.querySelectorAll('main section[id]').forEach(s=>observer.observe(s));
document.querySelector('#year').textContent=new Date().getFullYear();
document.querySelector('#copy-email').addEventListener('click',async()=>{const toast=document.querySelector('#toast');try{await navigator.clipboard.writeText('jerikhorap@gmail.com');toast.textContent='Email address copied';}catch{toast.textContent='jerikhorap@gmail.com';}toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3000);});

// Browse project files in a continuous loop.
const viewer=document.querySelector('.file-browser');
const cards=[...document.querySelectorAll('.project-card')];
const pagination=document.querySelector('.deck-pagination');
const filenames=Object.fromEntries(data.projects.map(p=>[p.id,p.id+'.project']));
let visibleCards=cards.slice(),fileIndex=0,lastWheelAt=0,wheelTotal=0,lastWheelEvent=0;
const previous=document.querySelector('#previous-project'),next=document.querySelector('#next-project');
function showFile(index){
 if(!visibleCards.length){cards.forEach(card=>card.hidden=true);document.querySelector('#file-name').textContent='No projects in this category';document.querySelector('#file-count').textContent='00 / 00';previous.disabled=next.disabled=true;return;}
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

// One entrance per page load; do not replay when navigating project files.

const entranceObserver=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{if(entry.isIntersecting){viewer.classList.add('viewer-open');entranceObserver.disconnect();}});
},{threshold:0.2});
entranceObserver.observe(viewer);

})().catch(error=>{console.error('Portfolio content could not be initialized:',error.message);});
