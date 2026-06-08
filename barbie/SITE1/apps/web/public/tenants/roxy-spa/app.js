function toggleDrawer(o){
  var d=document.getElementById('drawer'),b=document.getElementById('drawerBg');
  if(o){d.classList.add('open');b.classList.add('open');}
  else{d.classList.remove('open');b.classList.remove('open');}
}
window.addEventListener('scroll',function(){
  var t=document.getElementById('toTop');
  if(!t)return;
  t.style.display=window.scrollY>400?'flex':'none';
});
function toTop(){window.scrollTo({top:0,behavior:'smooth'});}
