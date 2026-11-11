(() => {
 const root=document.documentElement;
 const button=document.querySelector('#theme-toggle');
 const label=button.querySelector('.theme-label');
 const meta=document.querySelector('meta[name="theme-color"]');
 function apply(theme,persist=false){
  const light=theme==='light';
  root.dataset.theme=light?'light':'dark';
  button.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');
  button.title=light?'Switch to dark mode':'Switch to light mode';
  label.textContent=light?'Dark mode':'Light mode';
  meta.content=light?'#f5f6fa':'#090b10';
  if(persist){try{localStorage.setItem('jerikho-theme',root.dataset.theme);}catch{}}
 }
 apply(root.dataset.theme);
 button.addEventListener('click',()=>apply(root.dataset.theme==='light'?'dark':'light',true));
 window.addEventListener('storage',event=>{if(event.key==='jerikho-theme')apply(event.newValue==='light'?'light':'dark');});
})();
