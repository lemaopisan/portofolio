(() => {
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const text=(value,max=10000)=>String(value??'').trim().slice(0,max);
 const lines=value=>Array.isArray(value)?value.map(v=>text(v)).filter(Boolean):[];
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function safeUrl(value,local=false){
  const v=text(value,2000);if(!v)return '';
  if(local&&/^\/(?!\/)/.test(v)&&!/[\\\u0000-\u0020]/.test(v))return v;
  try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
 }
 function connection(){
  const c=window.PORTFOLIO_CONFIG||{},url=safeUrl(c.supabaseUrl),key=text(c.supabaseKey,4000);
  if(!url||!url.startsWith('https://')||!key||key.startsWith('sb_secret_'))return null;
  if(key.split('.').length===3){try{if(JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon')return null;}catch{return null;}}
  else if(!/^sb_publishable_[a-zA-Z0-9_-]{20,}$/.test(key))return null;
  return {url:url.replace(/\/$/,''),key};
 }
 function normalize(input){
  if(!input||input.version!==1||!input.profile)throw new Error('This content file has an unsupported format.');
  for(const name of ['projects','experience','toolkit','education'])if(!Array.isArray(input[name])||input[name].length>100)throw new Error('Invalid '+name+' collection.');
  const id=(v,i)=>text(v,64).replace(/[^a-z0-9_-]/g,'')||'item-'+i;
  const profile={aboutHeading:text(input.profile.aboutHeading,160)||'A little about me.',about:lines(input.profile.about).slice(0,20),heroIntro:text(input.profile.heroIntro,1000),heroNote:text(input.profile.heroNote,600),cvUrl:safeUrl(input.profile.cvUrl,true)||'/Jerikho-Stefian-CV.pdf'};
  const projects=input.projects.map((p,i)=>({id:id(p.id,i),title:text(p.title,180),kicker:text(p.kicker,180),summary:text(p.summary,1200),categories:lines(p.categories).filter(c=>['ai','security','app'].includes(c)),visual:['meeting','housing','soc','malware','split','file'].includes(p.visual)?p.visual:'file',tools:lines(p.tools).slice(0,30),intro:text(p.intro),heading:text(p.heading,160)||'Project details',points:lines(p.points).slice(0,40),note:text(p.note),links:(Array.isArray(p.links)?p.links:[]).slice(0,12).map(l=>({label:text(l.label,100)||'Open link',url:safeUrl(l.url)})).filter(l=>l.url)}));
  if(new Set(projects.map(p=>p.id)).size!==projects.length)throw new Error('Project identifiers must be unique.');
  if(projects.some(p=>!p.title||!p.categories.length))throw new Error('Each project needs a title and at least one category.');
  return {version:1,profile,projects,experience:input.experience.map((p,i)=>({id:id(p.id,i),title:text(p.title,180),organization:text(p.organization,180),date:text(p.date,180),description:text(p.description),tags:lines(p.tags).slice(0,30),incoming:p.incoming===true})),toolkit:input.toolkit.map((p,i)=>({id:id(p.id,i),title:text(p.title,180),items:lines(p.items).slice(0,50)})),education:input.education.map((p,i)=>({id:id(p.id,i),institution:text(p.institution,180),program:text(p.program,300),date:text(p.date,180),details:text(p.details,2000),icon:p.icon==='shield'?'shield':'graduation'}))};
 }
 async function defaults(){const r=await fetch('/content.json',{cache:'no-cache'});if(!r.ok)throw new Error('Could not load the bundled website content.');return normalize(await r.json());}
 async function load(){
  const fallback=await defaults(),c=connection();if(!c)return fallback;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
  try{const r=await fetch(c.url+'/rest/v1/portfolio_content?id=eq.main&select=payload',{headers:{apikey:c.key},signal:controller.signal,cache:'no-store'});if(!r.ok)return fallback;const rows=await r.json();return rows[0]?.payload?normalize(rows[0].payload):fallback;}catch{return fallback;}finally{clearTimeout(timer);}
 }
 const icons={graduation:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5-10-5Zm4 3v5c3 3 9 3 12 0v-5M22 9v7"/></svg>',shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></svg>'};
 const templates=new Map();
 function render(data){
  document.querySelectorAll('[data-project]').forEach(button=>{if(!templates.has(button.dataset.project))templates.set(button.dataset.project,button.querySelector('.project-visual').cloneNode(true));});
  const list=document.querySelector('#projects');list.replaceChildren();
  data.projects.forEach((p,i)=>{
   const article=document.createElement('article');article.className='project-card';article.dataset.category=p.categories.join(' ');article.hidden=i!==0;
   const button=document.createElement('button');button.className='project-open';button.dataset.project=p.id;button.setAttribute('aria-label','Read '+p.title+' case study');
   let visual=templates.get(p.visual)?.cloneNode(true);
   if(!visual){visual=document.createElement('div');visual.className='project-visual file-generic';visual.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 6h24l12 12v40H14zM38 6v14h12M23 32h18M23 40h18M23 48h12"/></svg><span>'+escape(p.id)+'.project</span>';}
   visual.querySelectorAll('[id]').forEach(el=>{const old=el.id;el.id=old+'-'+i;visual.querySelectorAll('[fill]').forEach(shape=>{if(shape.getAttribute('fill')==='url(#'+old+')')shape.setAttribute('fill','url(#'+el.id+')');});});
   button.append(visual);const info=document.createElement('div');info.className='project-info';
   info.innerHTML='<div class="project-kicker">'+escape(p.kicker)+'</div><h3>'+escape(p.title)+'<span aria-hidden="true">↗</span></h3><p>'+escape(p.summary)+'</p><div class="tags">'+p.tools.map(t=>'<span>'+escape(t)+'</span>').join('')+'</div>';
   button.append(info);article.append(button);list.append(article);
  });
  document.querySelector('[data-filter="all"] span').textContent=data.projects.length;
  const about=document.querySelector('.about-copy');about.querySelector('h2').textContent=data.profile.aboutHeading;
  about.querySelectorAll(':scope > p,:scope > .profile-paragraphs').forEach(p=>p.remove());
  const paragraphs=document.createElement('div');paragraphs.className='profile-paragraphs';data.profile.about.forEach(t=>{const p=document.createElement('p');p.textContent=t;paragraphs.append(p);});about.querySelector('h2').after(paragraphs);
  document.querySelector('.hero .intro').textContent=data.profile.heroIntro;document.querySelector('.hero-sub').textContent=data.profile.heroNote;
  document.querySelectorAll('a[download]').forEach(a=>{a.href=data.profile.cvUrl;a.setAttribute('download','Jerikho-Stefian-CV.pdf');});
  document.querySelector('.timeline').innerHTML=data.experience.map(p=>'<article class="timeline-item"><div class="timeline-date">'+escape(p.date)+(p.incoming?' <span class="future-label">INCOMING</span>':'')+'</div><div><h3>'+escape(p.title)+' <span class="company">'+escape(p.organization)+'</span></h3><p>'+escape(p.description)+'</p>'+(p.tags.length?'<div class="tags">'+p.tags.map(t=>'<span>'+escape(t)+'</span>').join('')+'</div>':'')+'</div></article>').join('');
  const toolbox=document.querySelector('.toolbox');toolbox.querySelectorAll('.tool-row').forEach(el=>el.remove());
  data.toolkit.forEach((p,i)=>{const row=document.createElement('div');row.className='tool-row';row.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span><div><h4>'+escape(p.title)+'</h4><p>'+escape(p.items.join(' · '))+'</p></div>';toolbox.querySelector('.toolbox-footer').before(row);});
  about.querySelectorAll('.education-note,.education-list').forEach(el=>el.remove());
  const education=document.createElement('div');education.className='education-list';education.innerHTML=data.education.map(p=>'<div class="education-note"><span class="education-icon">'+icons[p.icon]+'</span><div><strong>'+escape(p.institution)+'</strong><span>'+escape(p.program)+'</span><span class="education-date">'+escape(p.date)+'</span><small>'+escape(p.details)+'</small></div></div>').join('');about.querySelector('.education-heading').after(education);
 }
 let visitId;
 function track(name,target=''){
  const c=connection();if(!c)return;
  try{if(!visitId){visitId=sessionStorage.getItem('portfolio-visit-id')||crypto.randomUUID();sessionStorage.setItem('portfolio-visit-id',visitId);}fetch(c.url+'/rest/v1/rpc/track_portfolio_event',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({event_name:name,event_target:String(target).slice(0,200),visit_id:visitId}),keepalive:true}).catch(()=>{});}catch{}
 }
 window.PortfolioContent={clone,escape,safeUrl,connection,normalize,defaults,load,render,track,icons};
})();
