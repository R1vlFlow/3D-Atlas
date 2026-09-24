import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s);
const state={tab:'bones',bones:[],canals:[],model:null,selected:null,selectedEntry:null,exploded:false,isolated:false,treeFilter:'all',
  viewed:JSON.parse(localStorage.getItem('atlasViewed')||'[]')};

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x071016);
const camera=new THREE.PerspectiveCamera(42,1,.01,1000); camera.position.set(0,1,4.8);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; $('#scene').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07; controls.minDistance=.15; controls.maxDistance=20;
scene.add(new THREE.HemisphereLight(0xe9f5ff,0x17222a,2.5)); const l=new THREE.DirectionalLight(0xffffff,3);l.position.set(4,6,7);scene.add(l);
const root3d=new THREE.Group();scene.add(root3d); const ray=new THREE.Raycaster();const mouse=new THREE.Vector2();

function resize(){const r=$('#scene').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function frame(o){if(!o)return;const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.position.copy(c).add(new THREE.Vector3(d*.1,d*.08,d*1.15));controls.target.copy(c);controls.update()}
function materials(o){const a=[];o.traverse(x=>{if(x.isMesh){if(!x.userData.baseMaterial)x.userData.baseMaterial=x.material; a.push(x)}});return a}
function highlight(o){if(state.selected?.isMesh){state.selected.material?.emissive?.setHex(state.selected.userData.oldEmissive??0);state.selected.scale.copy(state.selected.userData.oldScale||new THREE.Vector3(1,1,1))}
state.selected=o;if(o?.isMesh){if(o.material?.emissive){o.userData.oldEmissive=o.material.emissive.getHex();o.material.emissive.setHex(0x397a9e)}o.userData.oldScale=o.scale.clone();o.scale.multiplyScalar(1.018)}}
function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\s_.\-/:()[\]{}]+/g,'').replace(/^(left|right|l|r)[_ -]?/,'').replace(/[_-]?(left|right|l|r)$/,'')}
function candidates(name){
 const n=norm(name); const all=[...state.bones];
 return all.find(x=>x.modelNameCandidates?.some(c=>norm(c)===n) || norm(x.la)===n || norm(x.id)===n ||
   x.aliases?.some(c=>norm(c)===n) || x.modelNameCandidates?.some(c=>n.includes(norm(c))||norm(c).includes(n)));
}
function focusObject(o){const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));camera.position.copy(c).add(new THREE.Vector3(d*.15,d*.1,d*1.35));controls.target.copy(c);controls.update()}
function showModelSelection(name){
 const entry=candidates(name);
 if(entry){selectEntry(entry); return}
 $('#card').innerHTML=`<h2>Выбранный 3D-объект</h2><div class="latin">${name}</div><p>Mesh выбран непосредственно в 3D. Для этого имени пока нет точного сопоставления в анатомической базе.</p><div class="actions"><button id="focusSel">🎯 Фокус</button><button id="isolateSel">◉ Изолировать</button></div>`;
 $('#focusSel').onclick=()=>state.selected&&focusObject(state.selected);
 $('#isolateSel').onclick=()=>isolate(state.selected);
}
function sideOf(x){const t=(x.la+' '+x.id+' '+(x.modelNameCandidates||[]).join(' ')).toLowerCase(); if(/(^|[^a-z])(left|sin|sinistra|l)([^a-z]|$)/.test(t))return 'L'; if(/(^|[^a-z])(right|dex|dextra|r)([^a-z]|$)/.test(t))return 'R'; return '—'}
function selectEntry(x){
 state.selectedEntry=x;
 if(!state.viewed.includes(x.la)){state.viewed.push(x.la);localStorage.setItem('atlasViewed',JSON.stringify(state.viewed))}
 if(state.tab==='bones'){
  $('#card').innerHTML=`<h2>${x.ru}</h2><div class="latin">${x.la} · ${x.type}</div><p>${x.description}</p>
  <div class="pill">ID: ${x.id}</div><div class="pill">Model mapping</div><div class="pill">Сторона: ${sideOf(x)}</div>
  <div class="actions"><button id="focusEntry">🎯 Найти на модели</button><button id="isolateEntry">◉ Изолировать</button><button id="showAll">↺ Показать всё</button></div>
  <p class="hint">Сопоставление использует имя mesh и набор алиасов; для левой/правой стороны применяется нормализация имени.</p>`;
 }else{
  $('#card').innerHTML=`<h2>${x.ru}</h2><div class="latin">${x.la}</div><p><b>Вход:</b> ${x.entrance}</p><p><b>Выход:</b> ${x.exit}</p><p><b>Содержимое:</b> ${x.contents}</p>`;
 }
 $('#focusEntry').onclick=()=>findEntryOnModel(x);
 $('#isolateEntry').onclick=()=>{const o=findMesh(x); if(o){highlight(o);isolate(o);focusObject(o)}else toast('Mesh структуры пока не найден в загруженной модели')};
 $('#showAll').onclick=showAll;
}
function findMesh(x){
 if(!state.model)return null; let found=null;
 state.model.traverse(o=>{if(found||!o.isMesh)return;const n=o.userData.sourceName||o.name; if(x.modelNameCandidates?.some(c=>norm(c)===norm(n))||norm(n)===norm(x.la)||norm(n)===norm(x.id))found=o}); return found;
}
function findEntryOnModel(x){const o=findMesh(x);if(!o){toast('Mesh структуры пока не найден в загруженной модели');return}highlight(o);focusObject(o);toast(`Фокус: ${x.ru}`)}
function isolate(o){
 if(!state.model||!o)return;
 state.isolated=true;
 state.model.traverse(m=>{if(m.isMesh)m.visible=(m===o||m.userData.sourceName===o.userData.sourceName)});
 highlight(o); focusObject(o); toast('Режим изоляции включён');
}
function showAll(){if(state.model)state.model.traverse(m=>{if(m.isMesh)m.visible=true});state.isolated=false;toast('Показаны все структуры')}
const modelSources=[
 'https://raw.githubusercontent.com/DrMuratAltun/anatomi-simulatoru/main/systems/skeleton.glb',
 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ScatteringSkull/glTF-Binary/ScatteringSkull.glb'
];
function loadModel(i=0){$('#modelStatus').textContent='3D engine: загрузка модели…';new GLTFLoader().load(modelSources[i],g=>{
 state.model=g.scene;state.model.traverse(o=>{if(o.isMesh)o.userData.sourceName=o.name});root3d.add(state.model);frame(state.model);
 $('#modelStatus').textContent=i===0?'3D engine: separated skeleton GLB ✓':'3D engine: fallback skull GLB ✓';
},undefined,()=>{if(i+1<modelSources.length)loadModel(i+1);else $('#modelStatus').textContent='3D engine: модель недоступна — база и интерфейс работают'});}
loadModel();

renderer.domElement.addEventListener('click',e=>{if(!state.model)return;const r=renderer.domElement.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*2-1;mouse.y=-(e.clientY-r.top)/r.height*2+1;ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(state.model,true)[0];if(!hit)return;highlight(hit.object);showModelSelection(hit.object.userData.sourceName||hit.object.name||'Mesh')});

async function loadData(){state.bones=await (await fetch('./data/bones.json')).json();state.canals=await (await fetch('./data/canals.json')).json();renderList()}loadData();
function renderList(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));const q=$('#search').value.toLowerCase();const arr=state[state.tab].filter(x=>{const matches=(x.ru+' '+x.la+' '+JSON.stringify(x)).toLowerCase().includes(q); if(state.tab!=='bones'||state.treeFilter==='all')return matches; if(state.treeFilter==='paired')return matches&&x.type==='paired'; if(state.treeFilter==='unpaired')return matches&&x.type==='unpaired'; return matches});$('#list').innerHTML=arr.map((x,i)=>`<button class="item" data-i="${i}"><b>${x.ru}</b><small>${x.la}</small></button>`).join('');document.querySelectorAll('.item').forEach(b=>b.onclick=()=>selectEntry(arr[+b.dataset.i]));}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;state.treeFilter='all';renderList()});$('#search').oninput=renderList;
$('#treeAll').onclick=()=>{state.treeFilter='all';renderList()};
$('#treePaired').onclick=()=>{state.treeFilter='paired';state.tab='bones';renderList()};
$('#treeUnpaired').onclick=()=>{state.treeFilter='unpaired';state.tab='bones';renderList()};
$('#reset').onclick=()=>state.model&&frame(state.model);
$('#explode').onclick=()=>{state.exploded=!state.exploded;if(state.model){state.model.position.x=state.exploded?.35:0}toast(state.exploded?'Режим разборки включён':'Модель собрана')};
$('#boneLayer').onchange=e=>root3d.visible=e.target.checked;
$('#labels').onchange=e=>toast(e.target.checked?'Подписи включены':'Подписи скрыты');
$('#progressBtn').onclick=()=>open(`<h2>📊 Прогресс</h2><p>Просмотрено структур: <b>${state.viewed.length}</b> из ${state.bones.length+state.canals.length} в текущей базе.</p><p>Прогресс хранится локально в браузере.</p>`);
$('#modelBtn').onclick=()=>open(`<h2>3D-модель</h2><p>Вьюер сначала пытается загрузить separated-skeleton GLB из проекта anatomi-simulatoru, затем использует резервный Khronos skull asset.</p><p>Нажатие на mesh теперь запускает слой сопоставления: <b>mesh → анатомическая запись → карточка → фокус/изоляция</b>.</p>`);
$('#aboutBtn').onclick=()=>open(`<h2>3D Anatomy Atlas — Beta 0.98</h2><p>Независимый учебный атлас. 3D-вьюер, анатомические данные и UI разделены.</p><p>Проект не является клиническим приложением.</p><p><b>0.98:</b> добавлено дерево-фильтр костей, фильтрация парных/непарных костей и подготовлена база для L/R-навигации.</p>`);
$('#quizBtn').onclick=async()=>{const qs=await (await fetch('./data/questions.json')).json(),q=qs[Math.floor(Math.random()*qs.length)];open(`<h2>🧠 Мини-тест</h2><p><b>${q.q}</b></p>${q.options.map((x,i)=>`<button class="q" data-a="${i}">${String.fromCharCode(65+i)} — ${x}</button>`).join('')}`);document.querySelectorAll('.q').forEach(b=>b.onclick=()=>{close();toast(+b.dataset.a===q.answer?'✓ Верно!':'✗ Правильный ответ: '+String.fromCharCode(65+q.answer))})};
function open(h){$('#modalBox').innerHTML=h;$('#modal').style.display='flex'}function close(){ $('#modal').style.display='none'}$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
function toast(t){const e=document.createElement('div');e.textContent=t;e.style='position:fixed;bottom:52px;left:50%;transform:translateX(-50%);padding:10px 14px;background:#10212b;border:1px solid #3a5667;border-radius:9px;z-index:30';document.body.appendChild(e);setTimeout(()=>e.remove(),1800)}
addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key.toLowerCase()==='r'&&state.model)frame(state.model);if(e.key.toLowerCase()==='i'&&state.selected)isolate(state.selected);if(e.key.toLowerCase()==='a')showAll()});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)}animate();
