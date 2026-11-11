(async()=>{
 'use strict';
 const C=window.PortfolioContent,esc=C.escape,$=s=>document.querySelector(s),root=$('#editor-content');
 const names={overview:'Overview',projects:'Projects',experience:'Experience',toolkit:'Toolkit',education:'Education & training',about:'About me',cv:'CV document',analytics:'Analytics',backup:'Backup & help'};
 let client=null,draft=null,revision=0,tab='overview',dirty=false,preview=false,publishing=false,formEdits=false,statsRange=30,statusTimer;
 const base=await C.defaults().catch(()=>null);
 if(!base){$('#loading-panel').innerHTML='<h1>Could not load your content.</h1><p>Check that data/content.json was uploaded with the website, then reload this page.</p>';return;}
 function ask(message){return new Promise(resolve=>{const modal=document.querySelector('#studio-confirm');modal.querySelector('p').textContent=message;modal.returnValue='cancel';modal.addEventListener('close',()=>resolve(modal.returnValue==='confirm'),{once:true});modal.showModal();});}
 function status(message,error=false){clearTimeout(statusTimer);const el=$('#studio-status');el.textContent=message;el.className='studio-status visible'+(error?' error':'');statusTimer=setTimeout(()=>el.classList.remove('visible'),error?10000:5000);}
 function show(id){['setup-panel','login-panel','loading-panel','workspace'].forEach(name=>$('#'+name).hidden=name!==id);}
 function updateState(){
  $('#save-state').textContent=formEdits?'Save this form first':dirty?'Unpublished changes':preview?'Preview only':'All changes published';
  $('#publish').disabled=preview||!dirty||publishing||formEdits;
  $('#publish').textContent=publishing?'Publishing…':'Publish changes';
 }
 function setDirty(){dirty=true;formEdits=false;updateState();}
 function download(name,body,type='application/json'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([body],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 function metric(label,value){return '<div class="metric-card"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';}
 function list(values){return String(values??'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);}
 function field(name,label,value='',type='text',help='',required=false){
  const wide=type==='textarea'?' wide':'';
  return '<label class="'+wide+'">'+esc(label)+(type==='textarea'?'<textarea name="'+esc(name)+'" rows="4" '+(required?'required':'')+'>'+esc(Array.isArray(value)?value.join('\n'):value)+'</textarea>':'<input name="'+esc(name)+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'>')+(help?'<span class="field-help">'+esc(help)+'</span>':'')+'</label>';
 }
 function overview(){
  root.innerHTML='<div class="cards-row">'+metric('Projects',draft.projects.length)+metric('Experience entries',draft.experience.length)+metric('Toolkit groups',draft.toolkit.length)+metric('Education & training',draft.education.length)+'</div><div class="editor-card"><h2>A home for everything you’re building.</h2><p>Choose a section to add or edit content. Save each form, then select Publish changes when you’re ready. New projects automatically appear in your file viewer, including their descriptions and links.</p></div><div class="editor-card"><h2>Website analytics</h2><p>'+(preview?'Analytics will appear after connection. Preview activity is not recorded.':'See page views, browser sessions, project opens, and CV download-button clicks. Counts start after setup; earlier traffic is not available.')+'</p><button class="studio-button secondary-studio small" data-open-analytics>View analytics</button></div>';
  root.querySelector('[data-open-analytics]').onclick=()=>changeTab('analytics');
 }
 function renderCollection(){
  const items=draft[tab];root.innerHTML='<div class="section-actions"><p>Edit items, or use the arrows to change their order.<br>Changes go live only after you publish.</p><button class="studio-button" id="new-item">+ Add '+(tab==='education'?'education':tab==='toolkit'?'group':tab==='experience'?'experience':'project')+'</button></div><div class="item-list">'+items.map((item,i)=>'<article class="list-item"><div><h2>'+esc(item.title||item.institution)+'</h2><p>'+esc((item.summary||item.description||item.program||item.items?.join(' · ')||'').slice(0,180))+'</p></div><div class="item-controls"><button data-action="up" data-index="'+i+'" aria-label="Move '+esc(item.title||item.institution)+' up" '+(i===0?'disabled':'')+'>↑</button><button data-action="down" data-index="'+i+'" aria-label="Move '+esc(item.title||item.institution)+' down" '+(i===items.length-1?'disabled':'')+'>↓</button><button data-action="edit" data-index="'+i+'">Edit</button><button class="delete" data-action="delete" data-index="'+i+'">Remove</button></div></article>').join('')+'</div>';
  if(!items.length)root.querySelector('.item-list').innerHTML='<div class="empty-state"><h2>Nothing here yet.</h2><p>Add your first item to this section.</p></div>';
  $('#new-item').onclick=()=>itemForm(-1);
  root.querySelector('.item-list').onclick=async e=>{const b=e.target.closest('[data-action]');if(!b)return;const i=Number(b.dataset.index),action=b.dataset.action;
   if(action==='edit')return itemForm(i);
   if(action==='delete'){if(!await ask('Remove “'+(items[i].title||items[i].institution)+'”? It will be removed from the live site only after publishing.'))return;items.splice(i,1);}
   else{const j=i+(action==='up'?-1:1);if(j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];}
   setDirty();renderCollection();
  };
 }
 function linkRow(link={label:'',url:''}){const row=document.createElement('div');row.className='link-row';row.innerHTML=field('link-label','Button label',link.label)+field('link-url','Link URL',link.url,'url')+'<button type="button" class="studio-button secondary-studio small" aria-label="Remove link">×</button>';row.querySelector('button').onclick=()=>{row.remove();formEdits=true;updateState();};return row;}
 function itemForm(index){
  const kind=tab,item=index<0?{}:C.clone(draft[kind][index]);let fields='';
  if(kind==='projects'){
   fields=field('title','Project title',item.title,'text','',true)+field('kicker','Category label',item.kicker,'text','For example: Natural language processing')+field('summary','Card description',item.summary,'textarea','A short introduction shown in the project viewer.',true)+field('tools','Tools / technologies',item.tools||[],'textarea','One tool per line.')+field('intro','Full project description',item.intro,'textarea','Shown when a visitor opens the project.')+field('heading','Details heading',item.heading||'Project details')+field('points','Details / contributions',item.points||[],'textarea','One point per line. Describe what you actually worked on.')+field('note','Additional note',item.note,'textarea');
   fields+='<div class="wide"><p class="field-label">Include in filters</p><div class="check-row">'+[['ai','AI & data'],['security','Cybersecurity'],['app','Applications']].map(([v,l])=>'<label><input type="checkbox" name="category" value="'+v+'" '+((item.categories||[]).includes(v)?'checked':'')+'>'+l+'</label>').join('')+'</div></div><label class="wide">Card visual<select name="visual">'+[['file','Document'],['meeting','Meeting workspace'],['housing','House price chart'],['soc','SOC terminal'],['malware','Image classification'],['split','SplitEase receipt']].map(([v,l])=>'<option value="'+v+'" '+((item.visual||'file')===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
  }else if(kind==='experience'){
   fields=field('title','Role / title',item.title,'text','',true)+field('organization','Organization',item.organization)+field('date','Date or date range',item.date,'text','For example: Sep 2026 — Present')+field('description','Description',item.description,'textarea')+field('tags','Skill tags',item.tags||[],'textarea','One tag per line.')+'<div class="wide check-row"><label><input name="incoming" type="checkbox" '+(item.incoming?'checked':'')+'>Show the “Incoming” label</label></div>';
  }else if(kind==='toolkit'){
   fields=field('title','Group name',item.title,'text','For example: Programming & data',true)+field('items','Tools / skills',item.items||[],'textarea','One item per line.',true);
  }else{
   fields=field('institution','Institution / training provider',item.institution,'text','',true)+field('program','Degree or program',item.program)+field('date','Date range',item.date)+field('details','Additional details',item.details,'textarea')+'<label>Icon<select name="icon"><option value="graduation" '+(item.icon!=='shield'?'selected':'')+'>Graduation cap</option><option value="shield" '+(item.icon==='shield'?'selected':'')+'>Security shield</option></select></label>';
  }
  root.innerHTML='<div class="form-card"><h2>'+(index<0?'Add new item':'Edit item')+'</h2><form id="item-form"><div class="form-grid">'+fields+'</div>'+(kind==='projects'?'<div class="links-editor"><h3>Project links</h3><p class="field-help">Add repository, demo, write-up, or other supporting links.</p><div id="project-links"></div><button type="button" id="add-link" class="studio-button secondary-studio small">+ Add link</button></div>':'')+'<div class="form-actions"><button type="submit" class="studio-button">Save item</button><button type="button" id="cancel-form" class="studio-button secondary-studio">Cancel</button></div></form></div>';
  const form=$('#item-form');formEdits=false;updateState();
  form.addEventListener('input',()=>{formEdits=true;updateState();});form.addEventListener('change',()=>{formEdits=true;updateState();});
  if(kind==='projects'){
   (item.links||[]).forEach(link=>$('#project-links').append(linkRow(link)));
   $('#add-link').onclick=()=>{$('#project-links').append(linkRow());formEdits=true;updateState();};
  }
  $('#cancel-form').onclick=async()=>{if(formEdits&&!await ask('Discard changes to this form?'))return;formEdits=false;updateState();renderCollection();};
  form.onsubmit=e=>{e.preventDefault();try{
   const f=new FormData(form),v=n=>String(f.get(n)||'').trim();let result={id:item.id||'item-'+crypto.randomUUID().slice(0,8)};
   if(kind==='projects'){
    const categories=f.getAll('category');if(!categories.length)throw new Error('Choose at least one project filter.');
    const projectLinks=[...form.querySelectorAll('.link-row')].map(row=>{const label=row.querySelector('[name="link-label"]').value.trim(),url=row.querySelector('[name="link-url"]').value.trim();if(!url&&!label)return null;if(!C.safeUrl(url))throw new Error('Every project link needs a valid https:// or http:// address.');return {label:label||'Open link',url:C.safeUrl(url)};}).filter(Boolean);
    result={...result,title:v('title'),kicker:v('kicker'),summary:v('summary'),tools:list(v('tools')),intro:v('intro'),heading:v('heading'),points:list(v('points')),note:v('note'),visual:v('visual'),categories,links:projectLinks};
   }else if(kind==='experience')result={...result,title:v('title'),organization:v('organization'),date:v('date'),description:v('description'),tags:list(v('tags')),incoming:f.has('incoming')};
   else if(kind==='toolkit')result={...result,title:v('title'),items:list(v('items'))};
   else result={...result,institution:v('institution'),program:v('program'),date:v('date'),details:v('details'),icon:v('icon')};
   if(index<0)draft[kind].push(result);else draft[kind][index]=result;
   draft=C.normalize(draft);setDirty();renderCollection();status('Item saved to your draft. Publish when ready.');
  }catch(error){status(error.message,true);}};
 }
 function aboutForm(){
  const p=draft.profile;root.innerHTML='<div class="form-card"><h2>Your introduction</h2><form id="about-form">'+field('aboutHeading','About section heading',p.aboutHeading,'text','',true)+field('about','About paragraphs',p.about.join('\n\n'),'textarea','Separate paragraphs with a blank line.',true)+field('heroIntro','Homepage description',p.heroIntro,'textarea')+field('heroNote','Homepage supporting line',p.heroNote)+'<div class="form-actions"><button type="submit" class="studio-button">Save about me</button></div></form></div>';
  const form=$('#about-form');form.oninput=()=>{formEdits=true;updateState();};form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);draft.profile={...draft.profile,aboutHeading:f.get('aboutHeading'),about:String(f.get('about')).split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean),heroIntro:f.get('heroIntro'),heroNote:f.get('heroNote')};draft=C.normalize(draft);setDirty();status('About text saved to your draft.');};
 }
 function cvPage(){
  root.innerHTML='<div class="form-card"><h2>Your current CV</h2><p class="field-help">The website links to this PDF. Replace it whenever your CV changes.</p><a class="cv-preview-link" href="'+esc(C.safeUrl(draft.profile.cvUrl,true))+'" target="_blank" rel="noopener">Open current CV ↗</a><form id="cv-form"><label>Upload a new PDF<input id="cv-file" type="file" accept="application/pdf,.pdf" required '+(preview?'disabled':'')+'></label><p class="field-help">PDF only, up to 5 MB. After uploading, publish your changes to update the live download.</p><button type="submit" id="upload-cv" class="studio-button" '+(preview?'disabled':'')+'>Upload PDF</button></form>'+(preview?'<p class="field-help">File upload is available after storage is connected.</p>':'')+'</div>';
  $('#cv-form').onsubmit=async e=>{e.preventDefault();const button=$('#upload-cv');try{
   const file=$('#cv-file').files[0];if(!file||file.size>5*1024*1024)throw new Error('Choose a PDF smaller than 5 MB.');
   const signature=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(signature!=='%PDF-')throw new Error('This file is not a valid PDF.');
   button.disabled=true;button.textContent='Uploading…';const path='cv/'+crypto.randomUUID()+'.pdf';
   const {error}=await client.storage.from('portfolio-assets').upload(path,file,{contentType:'application/pdf',cacheControl:'3600',upsert:false});if(error)throw error;
   draft.profile.cvUrl=client.storage.from('portfolio-assets').getPublicUrl(path,{download:'Jerikho-Stefian-CV.pdf'}).data.publicUrl;setDirty();cvPage();status('PDF uploaded. Publish changes to use it on your website.');
  }catch(error){status(error.message,true);}finally{if(button.isConnected){button.disabled=false;button.textContent='Upload PDF';}}};
 }
 async function analyticsPage(){
  if(preview){root.innerHTML='<div class="empty-state"><h2>Your analytics will live here.</h2><p>After setup, this page shows page views, browser sessions, project opens, repository-link clicks, and CV download-button clicks. No sample traffic is presented as real data.</p><a class="studio-button" href="/admin/setup.html" target="_blank" rel="noopener">Connect analytics ↗</a></div>';return;}
  root.innerHTML='<p class="field-help">Loading analytics…</p>';
  const {data,error}=await client.rpc('portfolio_analytics',{since_at:new Date(Date.now()-statsRange*86400000).toISOString()});
  if(tab!=='analytics')return;
  if(error){root.innerHTML='<div class="empty-state"><h2>Analytics could not load.</h2><p>'+esc(error.message)+'</p></div>';return;}
  root.innerHTML='<div class="analytics-toolbar"><p class="field-help">Recorded since setup. Dates are shown in UTC.</p><select id="analytics-range" aria-label="Analytics period">'+[7,30,90].map(n=>'<option value="'+n+'" '+(n===statsRange?'selected':'')+'>Last '+n+' days</option>').join('')+'</select></div><div class="cards-row">'+metric('Page views',data.pageViews)+metric('Browser sessions',data.sessions)+metric('CV button clicks',data.cvClicks)+metric('Project opens',data.projectOpens)+'</div><div class="editor-card"><h2>Daily page views</h2><div id="daily-chart" class="daily-chart" role="img" aria-label="Daily recorded page views"></div><p class="field-help">A browser session is not necessarily a unique person. CV clicks do not confirm a completed download. Counts are approximate and client-side blockers may reduce collection.</p></div><div class="editor-card"><h2>Project engagement</h2><table class="data-table"><thead><tr><th>Project</th><th>Opens</th><th>Link clicks</th></tr></thead><tbody>'+(data.projects||[]).map(p=>'<tr><td>'+esc(draft.projects.find(d=>d.id===p.target)?.title||p.target)+'</td><td>'+Number(p.opens)+'</td><td>'+Number(p.link_clicks)+'</td></tr>').join('')+'</tbody></table>'+(!(data.projects||[]).length?'<p class="field-help">No project events recorded in this period yet.</p>':'')+'</div>';
  const daily=data.daily||[],max=Math.max(1,...daily.map(d=>Number(d.views)));
  $('#daily-chart').innerHTML=daily.length?daily.map((d,i)=>'<div title="'+esc(d.day)+': '+Number(d.views)+' views"><i style="height:'+Math.max(2,Number(d.views)/max*100)+'%"></i>'+(i===0||i===daily.length-1?'<small>'+esc(d.day.slice(5))+'</small>':'')+'</div>').join(''):'<p class="field-help">No page views recorded in this period yet.</p>';
  $('#analytics-range').onchange=e=>{statsRange=Number(e.target.value);analyticsPage();};
 }
 function backupPage(){
  root.innerHTML='<div class="editor-card"><h2>Keep a copy of your content</h2><p>Download a JSON backup whenever you make major changes. You can restore it here later. A backup contains text and links, not the uploaded PDF file itself.</p><div class="entry-actions"><button id="export-content" class="studio-button">Download backup</button></div><label style="margin-top:25px">Restore content backup<input id="restore-content" type="file" accept=".json,application/json"></label></div><div class="editor-card"><h2>Connection & account help</h2><p>Your password is handled by Supabase Auth. Database policies limit publishing and CV uploads to the admin account registered during setup.</p><a href="/admin/setup.html" class="cv-preview-link" target="_blank" rel="noopener">Open setup guide ↗</a></div>';
  $('#export-content').onclick=()=>download('portfolio-content-backup.json',JSON.stringify(draft,null,2));
  $('#restore-content').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw new Error('This backup is too large.');const restored=C.normalize(JSON.parse(await file.text()));if(!await ask('Replace your current draft with this backup? Nothing will go live until you publish.'))return;draft=restored;setDirty();status('Backup restored to your draft.');}catch(error){status('Could not restore backup: '+error.message,true);}};
 }
 function render(){
  $('#section-title').textContent=names[tab];document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('selected',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false');});
  if(tab==='overview')overview();else if(['projects','experience','toolkit','education'].includes(tab))renderCollection();else if(tab==='about')aboutForm();else if(tab==='cv')cvPage();else if(tab==='analytics')analyticsPage();else backupPage();
  updateState();
 }
 async function changeTab(next){if(formEdits&&!await ask('Discard unsaved changes to this form?'))return;formEdits=false;tab=next;render();}
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
 $('#preview-editor').onclick=()=>{preview=true;draft=C.clone(base);$('#preview-banner').hidden=false;$('#account-label').textContent='Preview · not connected';$('#sign-out').textContent='Exit preview';show('workspace');render();};
 $('#connection-form').onsubmit=e=>{e.preventDefault();const url=$('#project-url').value.trim(),key=$('#public-key').value.trim(),previous=window.PORTFOLIO_CONFIG;window.PORTFOLIO_CONFIG={supabaseUrl:url,supabaseKey:key};const c=C.connection();window.PORTFOLIO_CONFIG=previous;if(!c){status('Use a valid HTTPS project URL and a public publishable/anon key. Secret keys are not accepted.',true);return;}download('config.js','// Public settings only. Database policies protect edits.\nwindow.PORTFOLIO_CONFIG = '+JSON.stringify({supabaseUrl:c.url,supabaseKey:c.key},null,2)+';\n','text/javascript');status('Connection file downloaded. Follow the setup guide to install it.');};
 $('#sign-out').onclick=async()=>{if((dirty||formEdits)&&!await ask('Leave with unpublished changes?'))return;if(preview){dirty=false;formEdits=false;location.reload();return;}await client.auth.signOut();dirty=false;formEdits=false;show('login-panel');};
 $('#publish').onclick=async()=>{if(preview||!dirty||publishing||formEdits)return;publishing=true;updateState();try{
  const validated=C.normalize(draft),{data,error}=await client.rpc('save_portfolio',{new_payload:validated,expected_revision:revision});if(error)throw error;revision=data;draft=validated;dirty=false;status('Published. Refresh your public website to see the changes.');
 }catch(error){status('Publishing failed: '+error.message,true);}finally{publishing=false;updateState();}};
 window.addEventListener('beforeunload',e=>{if(!preview&&(dirty||formEdits)){e.preventDefault();e.returnValue='';}});
 async function openWorkspace(user){
  const {data:allowed,error:roleError}=await client.rpc('is_portfolio_admin');if(roleError)throw new Error('Run the Supabase setup SQL before signing in. '+roleError.message);if(!allowed){await client.auth.signOut();throw new Error('This account does not have admin access. Add its user UUID during setup.');}
  const {data,error}=await client.from('portfolio_content').select('payload,revision').eq('id','main').maybeSingle();if(error)throw error;
  draft=data?.payload?C.normalize(data.payload):C.clone(base);revision=data?.revision||0;preview=false;dirty=false;formEdits=false;$('#preview-banner').hidden=true;$('#account-label').textContent=user.email;$('#sign-out').textContent='Sign out';show('workspace');render();
 }
 $('#login-form').onsubmit=async e=>{e.preventDefault();const b=$('#login-submit');b.disabled=true;b.textContent='Signing in…';try{
  const {data,error}=await client.auth.signInWithPassword({email:$('#admin-email').value.trim(),password:$('#admin-password').value});$('#admin-password').value='';if(error)throw new Error('Sign-in failed. Check your email and password.');await openWorkspace(data.user);
 }catch(error){status(error.message,true);}finally{b.disabled=false;b.textContent='Sign in';}};
 const c=C.connection();if(!c){show('setup-panel');return;}
 try{
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';script.onload=resolve;script.onerror=()=>reject(new Error('Could not load the sign-in service. Check your connection and reload.'));document.head.append(script);});
  client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data}=await client.auth.getUser();if(data.user)await openWorkspace(data.user);else show('login-panel');
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&!preview){dirty=false;formEdits=false;show('login-panel');}});
 }catch(error){show('login-panel');status(error.message,true);}
})().catch(error=>{console.error('Portfolio Studio:',error.message);const panel=document.querySelector('#loading-panel');if(panel)panel.innerHTML='<h1>Workspace could not open.</h1><p>Reload the page and check the connection settings.</p>';});
