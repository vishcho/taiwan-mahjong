const selectedPreview = document.body.dataset.preview === 'selected';
const proposals = [
  {id:'a',name:'清爽工具',english:'QUIET UTILITY',brand:'牌理',subtitle:'台灣 16 張麻將',description:'一眼知道，下一張打什麼。',detail:'淺色底與清楚留白，把最佳捨牌放在第一眼。適合快速查牌與長時間閱讀。'},
  {id:'b',name:'經典牌桌',english:'EVERYDAY TABLE',brand:'十六張',subtitle:'把每一手，打得更好',description:'熟悉的牌桌，順手的操作。',detail:'墨綠桌面、米色牌面與暖色紙卡，先看手牌再看建議。保留實體麻將的熟悉感。'},
  {id:'c',name:'深色數據',english:'FOCUS & NUMBERS',brand:'牌效率',subtitle:'TAIWAN / 16 TILES',description:'向聽、張數，直接讀數字。',detail:'深色介面搭配高對比數字，以張數條呈現受入。適合偏好密集資訊與暗色畫面的人。'}
];
if (selectedPreview) {
  proposals.splice(0, proposals.length, {
    id:'c',name:'經典配色 × 數據排版',english:'B PALETTE / C LAYOUT',brand:'牌效率',subtitle:'TAIWAN / 16 TILES',
    description:'牌桌的溫度，數據的清楚。',detail:'採 B 的墨綠、米色與暖金配色，保留 C 的結果優先、大數字、受入張數條與底部鍵盤。'
  });
}
const fullHand = ['1m','2m','3m','4m','5m','6m','9m','7p','8p','9p','1s','2s','3s','4s','5s','7z','7z'];
const states = Object.fromEntries(proposals.map(p=>[p.id,{mode:17,suit:'m',region:'手牌',toastTimer:null}]));
const zhNumbers = ['','一','二','三','四','五','六','七','八','九'];
const honorNames = ['','東','南','西','北','白','發','中'];
const flowers = ['春','夏','秋','冬','梅','蘭','竹','菊'];
const suitNames = {m:'萬',p:'筒',s:'索',z:'字'};
const icons = {
  share:'<path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14" transform="translate(1 -2)"/>',
  erase:'<path d="M9 5h12v14H9L2 12 9 5Z"/><path d="m12 9 6 6m0-6-6 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  signal:'<path d="M3 19v-3m5 3v-7m5 7V8m5 11V4"/>',
  wifi:'<path d="M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 3a4 4 0 0 1 6 0m-3 3h0"/>',
  battery:'<rect x="2" y="6" width="17" height="12" rx="2"/><path d="M22 10v4M5 9h11v6H5z"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.more}</svg>`;}
function tileName(tile){const n=Number(tile[0]);return tile[1]==='z'?honorNames[n]:tile[1]==='f'?flowers[n-1]:`${zhNumbers[n]}${suitNames[tile[1]]}`;}
function tileArt(tile){
  const n=Number(tile[0]),suit=tile[1];
  let art='';
  if(suit==='m') art=`<text x="18" y="20" text-anchor="middle" font-family="Noto Serif CJK TC,serif" font-weight="700" font-size="20" fill="#34423e">${zhNumbers[n]}</text><text x="18" y="43" text-anchor="middle" font-family="Noto Serif CJK TC,serif" font-weight="700" font-size="22" fill="#aa4135">萬</text>`;
  if(suit==='z') art=n===5?'<rect x="8" y="8" width="20" height="31" rx="2" fill="none" stroke="#435984" stroke-width="3"/><path d="M11 11h14v25H11z" fill="none" stroke="#435984" stroke-width=".7"/>':`<text x="18" y="35" text-anchor="middle" font-family="Noto Serif CJK TC,serif" font-weight="700" font-size="29" fill="${n===6?'#287459':n===7?'#af3930':'#2c3c42'}">${honorNames[n]}</text>`;
  if(suit==='p'){
    const dots={1:[[18,24]],2:[[18,12],[18,36]],3:[[8,10],[18,24],[28,38]],4:[[9,13],[27,13],[9,35],[27,35]],5:[[9,10],[27,10],[18,24],[9,38],[27,38]],6:[[9,10],[27,10],[9,24],[27,24],[9,38],[27,38]],7:[[8,8],[18,14],[28,20],[9,30],[27,30],[9,41],[27,41]],8:[[9,8],[27,8],[9,19],[27,19],[9,30],[27,30],[9,41],[27,41]],9:[[7,10],[18,10],[29,10],[7,24],[18,24],[29,24],[7,38],[18,38],[29,38]]};
    art=dots[n].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${n===1?12:4}" fill="none" stroke="${n===1||n===5&&i===2?'#a94839':i%3===0?'#355774':'#2d715f'}" stroke-width="${n===1?3:2}"/><circle cx="${x}" cy="${y}" r="${n===1?6:1}" fill="${n===1?'none':'#497d71'}" stroke="#497d71" stroke-width="1"/>`).join('');
  }
  if(suit==='s'){
    if(n===1) art='<path d="M15 18c-8 0-12 12-7 20 2-9 6-9 9-10 5 9 12 10 13 8-4-7-6-13-8-16l2-7-5-3-4 3z" fill="#2c7a58"/><path d="m18 11 4-7 4 4-4 3m-7 18-3 11m9-10 4 11" fill="none" stroke="#a94335" stroke-width="2"/><circle cx="20" cy="14" r="1.3" fill="#fff9e5"/><path d="m13 24-4 11m6-9-2 8m9-7 3 7" stroke="#e5d28b" stroke-width="1.5"/>';
    else{
      const stalks={2:[[18,12],[18,36]],3:[[18,10],[9,34],[27,34]],4:[[9,12],[27,12],[9,36],[27,36]],5:[[18,24],[8,10],[28,10],[8,38],[28,38]],6:[[8,12],[18,12],[28,12],[8,36],[18,36],[28,36]],7:[[18,7],[8,24],[18,24],[28,24],[8,40],[18,40],[28,40]],8:[[8,8],[28,8],[8,19],[28,19],[8,30],[28,30],[8,41],[28,41]],9:[[8,8],[18,8],[28,8],[8,24],[18,24],[28,24],[8,40],[18,40],[28,40]]};
      const h=n>6?9:13;
      art=stalks[n].map(([x,y])=>`<path d="M${x} ${y-h/2}v${h}m-2-${h-2}h4m-4 ${h-4}h4" stroke="#286b53" stroke-width="2.7" stroke-linecap="round"/>`).join('');
    }
  }
  if(suit==='f') art=`<g transform="translate(18 16)">${Array.from({length:5},(_,i)=>`<ellipse rx="4" ry="8" cy="-5" fill="${n<5?'#ba725b':'#6c9064'}" transform="rotate(${i*72})"/>`).join('')}<circle r="3" fill="#dec176"/></g><text x="18" y="45" text-anchor="middle" font-family="serif" font-weight="700" font-size="16" fill="#4e604d">${flowers[n-1]}</text>`;
  return `<svg viewBox="0 0 36 50" aria-hidden="true">${art}</svg>`;
}
function tile(id,classes=''){return `<span class="tile ${classes}" role="img" aria-label="${tileName(id)}">${tileArt(id)}</span>`;}
function waits(id){
  if(id==='c') return `<div class="waiting"><div class="waiting-head">有效牌<span>實際未知剩餘張數</span></div>${[['3s',3],['6s',4]].map(([t,n])=>`<div class="bar-row">${tile(t,'small')}<span class="bar-name">${tileName(t)}</span><div class="count-bar" aria-hidden="true">${Array.from({length:4},(_,i)=>`<i class="${i>=n?'empty':''}"></i>`).join('')}</div><span class="bar-count">${n} 張</span></div>`).join('')}</div>`;
  return `<div class="waiting"><div class="waiting-head">有效牌<span>還能摸到幾張？</span></div><div class="wait-grid">${[['3s',3],['6s',4]].map(([t,n])=>`<div class="wait-item">${tile(t,'small')}<span class="wait-name">${tileName(t)}</span><span class="wait-count"><strong>${n}</strong> 張</span></div>`).join('')}</div></div>`;
}
function result(id){
  const isDiscard=states[id].mode===17;
  const main=`<div class="result-top"><span class="result-tag"><i></i>${isDiscard?'最佳捨牌':'目前聽牌'}</span><button class="mini-link" data-action="explain">${isDiscard?'為什麼？':'看拆解'} ↗</button></div><div class="result-main">${tile(isDiscard?'9m':'3s','big')}<div><div class="discard-name">${isDiscard?'打九萬':'等三・六索'}</div><p class="discard-caption">${isDiscard?'捨牌後即可聽牌':'再摸一張，就有機會胡牌'}</p></div><div class="shanten-badge"><strong>0</strong><span>向聽<br>聽牌</span></div></div>`;
  const metrics=id==='c'?'<div class="metrics"><div class="metric"><strong>07</strong><span>實際受入<br>剩餘張數</span></div><div class="metric"><strong>02</strong><span>有效牌<br>種類</span></div></div>':'<div class="result-bottom"><span>實際受入 <strong>7</strong> 張</span><span>有效牌 <strong>2</strong> 種</span></div>';
  return `<section class="result" aria-label="分析結果">${main}${metrics}${id==='b'?waits(id):''}</section>${id!=='b'?waits(id):''}`;
}
function hand(id){
  const state=states[id],tiles=fullHand.filter(t=>state.mode===17||t!=='9m');
  return `<section class="hand-section" aria-label="目前手牌"><h3 class="section-title">我的手牌<span>${state.mode} 張 · 無副露</span></h3><div class="hand-grid">${tiles.map(t=>tile(t,t==='9m'?'chosen':'')).join('')}</div><div class="hand-note"><span>${state.mode===17?'金框為建議捨牌':'摸牌前 · 等待進張'}</span><button data-action="board">公開牌 0 張 ＋</button></div></section>`;
}
function keyboard(id){
  const state=states[id],flower=state.region==='花牌',suit=flower?'f':state.suit,count=flower?8:suit==='z'?7:9;
  return `<section class="keyboard" aria-label="麻將牌鍵盤"><div class="input-tabs" aria-label="輸入區域">${['手牌','副露','牌河','花牌'].map(region=>`<button data-region="${region}" class="${state.region===region?'active':''}" aria-pressed="${state.region===region}">${region}</button>`).join('')}</div><div class="keyboard-heading"><strong>${flower?'記錄花牌':`點牌輸入${state.region}`}</strong><span>點一下選牌</span></div><div class="suit-tabs" aria-label="牌種">${Object.entries(suitNames).map(([key,name])=>`<button data-suit="${key}" class="${state.suit===key&&!flower?'active':''}" aria-pressed="${state.suit===key&&!flower}">${name}</button>`).join('')}</div><div class="keys">${Array.from({length:count},(_,i)=>`<button class="key" data-tile="${i+1}${suit}" aria-label="輸入${tileName(`${i+1}${suit}`)}">${tileArt(`${i+1}${suit}`)}</button>`).join('')}<button class="key erase" data-action="erase" aria-label="刪除最後一張">${icon('erase')}</button></div></section>`;
}
function phoneContent(id){
  const p=proposals.find(p=>p.id===id),state=states[id];
  return `<div class="status" aria-hidden="true"><span>9:41</span><span class="status-icons">${icon('signal')}${icon('wifi')}${icon('battery')}</span></div><header class="app-header"><div class="brand"><div class="brand-symbol" aria-hidden="true">中</div><div><div class="brand-title">${p.brand}</div><div class="brand-subtitle">${p.subtitle}</div></div></div><div class="head-actions"><button class="icon-button" data-action="undo" aria-label="還原示例">${icon('undo')}</button><button class="icon-button" data-action="share" aria-label="分享此視覺預覽">${icon('share')}</button></div></header><div class="mode-switch" aria-label="摸牌狀態"><button data-mode="16" class="${state.mode===16?'active':''}" aria-pressed="${state.mode===16}">摸牌前 · 16 張</button><button data-mode="17" class="${state.mode===17?'active':''}" aria-pressed="${state.mode===17}">摸牌後 · 17 張</button></div><div class="app-content">${id==='b'?'<div class="table-label"><span>自己的牌，看得最清楚。</span><span class="seat">東</span></div>'+hand(id)+result(id):result(id)+hand(id)}<button class="details-link" data-action="details"><span>最佳拆解與改良牌</span><span>查看詳情 →</span></button></div>${keyboard(id)}<div class="safe-area" aria-hidden="true"><div class="home-bar"></div></div>`;
}
function renderPhone(id){
  const phone=document.querySelector(`#phone-${id}`);
  phone.innerHTML=phoneContent(id);
}
document.querySelector('#gallery').innerHTML=proposals.map(p=>`<article class="proposal" id="proposal-${p.id}"><div class="proposal-label"><span class="letter">${selectedPreview?'B+C':p.id.toUpperCase()}</span><div><h2>${p.name}</h2><p>${p.english}</p></div></div><div class="phone theme-${p.id}${selectedPreview?' theme-selected':''}" id="phone-${p.id}" data-proposal="${p.id}">${phoneContent(p.id)}</div><p class="proposal-caption"><strong>${p.description}</strong>${p.detail}</p></article>`).join('');
const params=new URLSearchParams(location.search);
let activeView=selectedPreview?'c':proposals.some(p=>p.id===params.get('view'))?params.get('view'):matchMedia('(max-width:760px)').matches?'a':'all';
function setView(view,updateUrl=true){
  activeView=view;
  document.querySelectorAll('.proposal').forEach(el=>el.hidden=view!=='all'&&el.id!==`proposal-${view}`);
  document.querySelectorAll('[data-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===view)));
  document.querySelector('#gallery').classList.toggle('single',view!=='all');
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('view',view);history.replaceState({},'',url);}
}
setView(activeView,false);
if(params.get('focus')==='1')document.body.classList.add('focus');
const focusButton=document.createElement('button');
focusButton.className='focus-toggle';focusButton.textContent=document.body.classList.contains('focus')?'退出':'手機全螢幕預覽';
focusButton.addEventListener('click',()=>{document.body.classList.toggle('focus');focusButton.textContent=document.body.classList.contains('focus')?'退出':'手機全螢幕預覽';window.scrollTo(0,0);});
document.body.append(focusButton);
document.querySelector('.view-switch').addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);});
matchMedia('(max-width:760px)').addEventListener('change',event=>{if(event.matches&&activeView==='all')setView('a');});
function toast(id,message){
  const phone=document.querySelector(`#phone-${id}`);phone.querySelector('.toast')?.remove();clearTimeout(states[id].toastTimer);
  const element=document.createElement('div');element.className='toast';element.setAttribute('role','status');element.textContent=message;phone.append(element);
  states[id].toastTimer=setTimeout(()=>element.remove(),2400);
}
function openDrawer(id,type,trigger){
  const phone=document.querySelector(`#phone-${id}`),draw=states[id].mode===16;
  const groups=[['1m','2m','3m'],['4m','5m','6m'],['7p','8p','9p'],['1s','2s','3s'],['4s','5s'],['7z','7z']];
  let title='這一手，怎麼拆？';
  let content=`<p>${draw?'目前手牌':'打掉九萬後'}，有 4 組面子、1 組搭子與 1 對中。</p><div class="decompositions">${groups.map(group=>`<div class="decomp-group">${group.map(t=>tile(t)).join('')}</div>`).join('')}</div><p>四索、五索可以等三索或六索，完成第 5 組面子。</p><div class="detail-count"><strong>7</strong><span>張實際受入<br>三索剩 3 張 ＋ 六索剩 4 張</span></div><p>改良牌須在向聽不變時增加受入；摸到有效牌能直接胡牌，歸在有效牌。</p>`;
  if(type==='board'){title='公開牌記錄';content='<p>此示例尚未加入公開牌。實際使用時可記錄四家牌河與副露，用來扣除已知牌。</p><div class="detail-count"><strong>0</strong><span>張公開牌<br>此示例僅扣除自己的手牌</span></div><p>被吃、碰、槓走的捨牌，即使保留在牌河歷史，也只能扣一次。</p>';}
  const backdrop=document.createElement('div');backdrop.className='drawer-backdrop';backdrop.innerHTML=`<section class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title-${id}"><div class="drawer-handle"></div><div class="drawer-header"><h3 id="drawer-title-${id}">${title}</h3><button class="icon-button" data-close aria-label="關閉詳情">${icon('close')}</button></div>${content}<p class="example-note">固定盤面示例，供比較視覺與操作。</p></section>`;
  phone.append(backdrop);
  const siblings=[...phone.children].filter(el=>el!==backdrop);siblings.forEach(el=>el.inert=true);
  const close=()=>{backdrop.remove();siblings.forEach(el=>el.inert=false);trigger?.focus();};
  backdrop.addEventListener('click',event=>{if(event.target===backdrop||event.target.closest('[data-close]'))close();});
  backdrop.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){event.preventDefault();backdrop.querySelector('[data-close]').focus();}});
  backdrop.querySelector('[data-close]').focus();
}
document.querySelector('#gallery').addEventListener('click',async event=>{
  const button=event.target.closest('button'),phone=event.target.closest('[data-proposal]');if(!button||!phone)return;
  const id=phone.dataset.proposal,state=states[id];
  if(button.dataset.mode){state.mode=Number(button.dataset.mode);renderPhone(id);phone.querySelector(`[data-mode="${state.mode}"]`).focus({preventScroll:true});}
  if(button.dataset.region){state.region=button.dataset.region;phone.querySelector('.keyboard').outerHTML=keyboard(id);phone.querySelector(`[data-region="${state.region}"]`).focus({preventScroll:true});}
  if(button.dataset.suit){state.suit=button.dataset.suit;if(state.region==='花牌')state.region='手牌';phone.querySelector('.keyboard').outerHTML=keyboard(id);phone.querySelector(`[data-suit="${state.suit}"]`).focus({preventScroll:true});}
  if(button.dataset.tile){phone.querySelectorAll('.key').forEach(el=>el.classList.remove('selected'));button.classList.add('selected');toast(id,`已選${tileName(button.dataset.tile)} · 輸入互動示意，分析結果維持固定示例。`);}
  if(button.dataset.action==='undo'){state.mode=17;state.region='手牌';state.suit='m';renderPhone(id);toast(id,'已還原 17 張示例盤面。');}
  if(button.dataset.action==='erase'){phone.querySelectorAll('.key').forEach(el=>el.classList.remove('selected'));toast(id,'已清除鍵盤選取。');}
  if(['explain','details','board'].includes(button.dataset.action))openDrawer(id,button.dataset.action,button);
  if(button.dataset.action==='share'){
    const url=new URL(location.href);url.searchParams.set('view',id);
    try{if(location.protocol==='file:')throw new Error('local-preview');await navigator.clipboard.writeText(url.href);toast(id,'已複製這款視覺預覽的連結。');}
    catch{toast(id,`目前為 ${id.toUpperCase()} 版預覽，可使用上方頁籤切換比較。`);}
  }
});
