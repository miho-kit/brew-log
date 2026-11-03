const STORAGE_KEY='brewLogRecordsV1';
const BACKUP_STORAGE_KEY='brewLogRecordsBackupV1';
const tasteLevels=['弱い','やや弱い','ちょうど良い','やや強い','強い'];
const tasteItems=[['sweetness','甘み'],['acidity','酸味'],['bitterness','苦味'],['aroma','香り']];
const state={records:loadRecords(),taste:{sweetness:'ちょうど良い',acidity:'ちょうど良い',bitterness:'ちょうど良い',aroma:'ちょうど良い'}};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function localDateString(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function readStoredRecords(key){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null)return null;
    const data=JSON.parse(raw);
    return Array.isArray(data)?data:null;
  }catch{return null}
}
function loadRecords(){
  const primary=readStoredRecords(STORAGE_KEY);
  const backup=readStoredRecords(BACKUP_STORAGE_KEY);
  const records=primary?.length?primary:backup?.length?backup:(primary||backup||[]);
  if(records.length&&!primary?.length){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(records))}catch{}
  }
  return records;
}
function persist(){
  const data=JSON.stringify(state.records);
  localStorage.setItem(BACKUP_STORAGE_KEY,data);
  localStorage.setItem(STORAGE_KEY,data);
}
function uid(){
  return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function toast(message){
  const el=$('#toast');
  el.textContent=message;el.classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800);
}
function setView(view){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#formView').classList.toggle('hidden',view!=='form');
  $('#historyView').classList.toggle('hidden',view!=='history');
  if(view==='history')renderHistory();
  window.scrollTo({top:0,behavior:'smooth'});
}
function setChoice(group,value){
  $$(`[data-choice="${group}"] .choice`).forEach(b=>b.classList.toggle('active',b.dataset.value===String(value)));
  $(`#${group}`).value=value;
  if(group==='dose')$('#customDoseWrap').classList.toggle('hidden',value!=='other');
  if(group==='method')$('#customMethodWrap').classList.toggle('hidden',value!=='other');
}
function renderTasteRows(){
  $('#tasteRows').innerHTML=tasteItems.map(([key,label])=>`
    <div class="tasteRow" data-taste="${key}">
      <div class="tasteName">${label}</div>
      <div class="tasteChoices">${tasteLevels.map(level=>`<button type="button" class="tasteChoice ${state.taste[key]===level?'active':''}" data-value="${level}">${level==='ちょうど良い'?'ちょうど<br>良い':level.replace('やや','やや<br>')}</button>`).join('')}</div>
    </div>`).join('');
}
function setTaste(key,value){state.taste[key]=value;renderTasteRows()}
function setRating(value){
  $('#rating').value=value;
  $$('#overallRating button').forEach(b=>b.classList.toggle('active',Number(b.dataset.rating)<=Number(value)));
}
function setStepper(type,value){
  if(type==='temp'){
    value=Math.min(98,Math.max(75,Number(value)));
    $('#temperature').value=value;$('#tempValue').textContent=value;
  }else{
    value=Math.min(31,Math.max(15,Number(value)));
    $('#grindClicks').value=value;$('#grindValue').textContent=value;
  }
}
function actualDose(){
  return $('#dose').value==='other'?Number($('#customDose').value):Number($('#dose').value);
}
function actualMethod(){
  return $('#method').value==='other'?$('#customMethod').value.trim():$('#method').value;
}
function validate(){
  if(!$('#brewDate').value)return '日付を入力してください';
  if(!$('#beanName').value.trim())return '豆の種類を入力してください';
  if($('#dose').value==='other'&&(!actualDose()||actualDose()<=0))return '豆量を入力してください';
  if($('#method').value==='other'&&!actualMethod())return '抽出方法を入力してください';
  if(!Number($('#rating').value))return '総合評価を選択してください';
  return '';
}
function resetForm(){
  $('#brewForm').reset();
  $('#editingId').value='';
  $('#brewDate').value=localDateString();
  $('#beanName').value='';
  setChoice('roast','中煎り');setChoice('dose','15');setChoice('method','4:6');
  $('#customDose').value='';$('#customMethod').value='';
  setStepper('temp',88);setStepper('grind',24);setRating(0);
  state.taste={sweetness:'ちょうど良い',acidity:'ちょうど良い',bitterness:'ちょうど良い',aroma:'ちょうど良い'};
  renderTasteRows();
  $('#wantAgain').checked=false;$('#memo').value='';
  $('#saveButtonLabel').textContent='記録を保存';$('#cancelEdit').classList.add('hidden');
}
function saveRecord(event){
  event.preventDefault();
  const error=validate();if(error){toast(error);return}
  const id=$('#editingId').value||uid();
  const record={
    id,date:$('#brewDate').value,bean:$('#beanName').value.trim(),roast:$('#roast').value,dose:actualDose(),temperature:Number($('#temperature').value),
    grindClicks:Number($('#grindClicks').value),method:actualMethod(),taste:{...state.taste},rating:Number($('#rating').value),memo:$('#memo').value.trim(),wantAgain:$('#wantAgain').checked,
    updatedAt:Date.now()
  };
  const index=state.records.findIndex(r=>r.id===id);
  if(index>=0)state.records[index]=record;else state.records.push(record);
  persist();refreshBeanControls();
  toast(index>=0?'記録を更新しました':'記録を保存しました');
  resetForm();setView('history');
}
function editRecord(id){
  const r=state.records.find(x=>x.id===id);if(!r)return;
  setView('form');
  $('#editingId').value=r.id;$('#brewDate').value=r.date;$('#beanName').value=r.bean;
  setChoice('roast',r.roast);
  if([15,20,30].includes(Number(r.dose))){setChoice('dose',String(r.dose));$('#customDose').value=''}else{setChoice('dose','other');$('#customDose').value=r.dose}
  setStepper('temp',r.temperature);setStepper('grind',r.grindClicks);
  if(['4:6','7投式'].includes(r.method)){setChoice('method',r.method);$('#customMethod').value=''}else{setChoice('method','other');$('#customMethod').value=r.method}
  state.taste={...state.taste,...r.taste};renderTasteRows();setRating(r.rating);
  $('#memo').value=r.memo||'';$('#wantAgain').checked=!!r.wantAgain;
  $('#saveButtonLabel').textContent='変更を保存';$('#cancelEdit').classList.remove('hidden');
}
function deleteRecord(id){
  const r=state.records.find(x=>x.id===id);if(!r)return;
  if(!confirm(`「${r.bean}」の記録を削除しますか？`))return;
  state.records=state.records.filter(x=>x.id!==id);persist();refreshBeanControls();renderHistory();toast('記録を削除しました');
}
function uniqueBeans(){return [...new Set(state.records.map(r=>r.bean).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'))}
function refreshBeanControls(){
  const beans=uniqueBeans();
  $('#beanSuggestions').innerHTML=beans.map(b=>`<option value="${escapeHtml(b)}"></option>`).join('');
  const current=$('#beanFilter').value;
  $('#beanFilter').innerHTML='<option value="">すべての豆</option>'+beans.map(b=>`<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  if(beans.includes(current))$('#beanFilter').value=current;
}
function displayDate(date){
  const [y,m,d]=date.split('-');return `${y}.${Number(m)}.${Number(d)}`;
}
function starString(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function renderHistory(){
  const bean=$('#beanFilter').value;
  const roast=$('#roastFilter').value;
  const sort=$('#sortOrder').value;
  const wantAgainOnly=$('#wantAgainFilter').checked;
  let records=state.records.filter(r=>(!bean||r.bean===bean)&&(!roast||r.roast===roast)&&(!wantAgainOnly||r.wantAgain));
  records=[...records].sort((a,b)=>{
    if(sort==='oldest')return a.date.localeCompare(b.date)||a.updatedAt-b.updatedAt;
    if(sort==='bean')return a.bean.localeCompare(b.bean,'ja')||b.date.localeCompare(a.date);
    return b.date.localeCompare(a.date)||b.updatedAt-a.updatedAt;
  });
  $('#historyCount').textContent=`${records.length}件`;
  $('#emptyState').classList.toggle('hidden',records.length!==0);
  $('#emptyState strong').textContent=state.records.length?'条件に合う記録がありません':'まだ記録がありません';
  $('#emptyState span').textContent=state.records.length?'絞り込み条件を変更してください。':'「記録する」から最初の一杯を保存してください。';
  $('#logList').innerHTML=records.map(r=>`
    <article class="logCard">
      <div class="logTop"><div><div class="logDate">${displayDate(r.date)}</div><h3 class="logBean">${escapeHtml(r.bean)}</h3>${r.wantAgain?'<span class="againBadge">また飲みたい</span>':''}</div><div class="logStars" aria-label="総合評価${r.rating}">${starString(r.rating)}</div></div>
      <div class="logMeta"><span class="metaChip">${escapeHtml(r.roast)}</span><span class="metaChip">${r.dose}g</span><span class="metaChip">${r.temperature}℃</span><span class="metaChip">${r.grindClicks}クリック</span><span class="metaChip">${escapeHtml(r.method)}</span></div>
      <div class="tasteSummary">${tasteItems.map(([k,label])=>`<div><span>${label}</span><strong>${escapeHtml(r.taste?.[k]||'')}</strong></div>`).join('')}</div>
      ${r.memo?`<p class="logMemo">${escapeHtml(r.memo)}</p>`:''}
      <div class="logActions"><button type="button" data-edit="${r.id}">編集</button><button type="button" class="delete" data-delete="${r.id}">削除</button></div>
    </article>`).join('');
}

$$('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-choice]').forEach(group=>group.addEventListener('click',e=>{const b=e.target.closest('.choice');if(b)setChoice(group.dataset.choice,b.dataset.value)}));
$$('[data-step]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.step;const current=type==='temp'?Number($('#temperature').value):Number($('#grindClicks').value);setStepper(type,current+Number(b.dataset.dir))}));
$('#tasteRows').addEventListener('click',e=>{const b=e.target.closest('.tasteChoice');if(!b)return;const row=b.closest('[data-taste]');setTaste(row.dataset.taste,b.dataset.value)});
$$('#overallRating button').forEach(b=>b.addEventListener('click',()=>setRating(Number(b.dataset.rating))));
$('#brewForm').addEventListener('submit',saveRecord);
$('#cancelEdit').addEventListener('click',()=>{resetForm();toast('編集をキャンセルしました')});
$('#beanFilter').addEventListener('change',renderHistory);
$('#roastFilter').addEventListener('change',renderHistory);
$('#sortOrder').addEventListener('change',renderHistory);
$('#wantAgainFilter').addEventListener('change',renderHistory);
$('#logList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]');const del=e.target.closest('[data-delete]');if(edit)editRecord(edit.dataset.edit);if(del)deleteRecord(del.dataset.delete)});

resetForm();refreshBeanControls();renderHistory();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
