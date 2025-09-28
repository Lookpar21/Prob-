// ===== Constants & state =====
const RANKS=[1,2,3,4,5,6,7,8,9,10,11,12,13];
const DISPLAY={1:"A",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K"};
const PARSE={'A':1,'J':11,'Q':12,'K':13}; for(let i=2;i<=10;i++) PARSE[String(i)]=i;
const VAL=r=>(r>=1&&r<=9)?r:0;

function makeCounts(){ const c={}; for(const r of RANKS) c[r]=32; return c; }
let counts=makeCounts();
let hist=[]; // {rank, side:'P'|'B'|'U'}
let removedP=[], removedB=[], removedU=[];
let currentSide='P';

// For preview section
let previewN=[];
let observedReal=[];

// ===== DOM refs =====
const sideP=document.getElementById('sideP');
const sideB=document.getElementById('sideB');
const sideU=document.getElementById('sideU');
const rankButtonsDiv=document.getElementById('rankButtons');
const btnUndo=document.getElementById('btnUndo');
const btnReset=document.getElementById('btnReset');
const totalLeftSpan=document.getElementById('totalLeft');
const badgesP=document.getElementById('badgesP');
const badgesB=document.getElementById('badgesB');
const badgesU=document.getElementById('badgesU');
const cntP=document.getElementById('cntP');
const cntB=document.getElementById('cntB');
const cntU=document.getElementById('cntU');
const countsTableDiv=document.getElementById('countsTable');
const typedRank=document.getElementById('typedRank');
const btnAddRank=document.getElementById('btnAddRank');
const nextProbDiv=document.getElementById('nextProb');
const permsOutDiv=document.getElementById('permsOut');
const simNInput=document.getElementById('simN');
const btnSim=document.getElementById('btnSim');
const simStatus=document.getElementById('simStatus');
const simResultsDiv=document.getElementById('simResults');
const tiePayoutSel=document.getElementById('tiePayout');
const recBox=document.getElementById('recBox');
const evTable=document.getElementById('evTable');
const previewCountSel=document.getElementById('previewCount');
const btnShowN=document.getElementById('btnShowN');
const btnCopyN=document.getElementById('btnCopyN');
const nextNDiv=document.getElementById('nextN');
const realNextInput=document.getElementById('realNext');
const btnConfirmNext=document.getElementById('btnConfirmNext');
const observedList=document.getElementById('observedList');

// ===== UI helpers =====
function setSide(side){
  currentSide=side;
  for(const el of [sideP,sideB,sideU]) el.classList.remove('active','p','b','u');
  if(side==='P') sideP.classList.add('active','p');
  else if(side==='B') sideB.classList.add('active','b');
  else sideU.classList.add('active','u');
}
sideP.onclick=()=>setSide('P'); sideB.onclick=()=>setSide('B'); sideU.onclick=()=>setSide('U');

function renderButtons(){
  rankButtonsDiv.innerHTML="";
  for(const r of RANKS){
    const b=document.createElement('button');
    b.className='rank-btn'; b.textContent=DISPLAY[r];
    b.title=`ลบ ${DISPLAY[r]} 1 ใบ — ฝั่ง ${currentSide}`;
    b.disabled=counts[r]<=0;
    b.onclick=()=>removeOne(r,currentSide);
    rankButtonsDiv.appendChild(b);
  }
}
function renderRemoved(){
  badgesP.innerHTML=""; for(const r of removedP){ const s=document.createElement('span'); s.className='badge p'; s.textContent=DISPLAY[r]; badgesP.appendChild(s); }
  badgesB.innerHTML=""; for(const r of removedB){ const s=document.createElement('span'); s.className='badge b'; s.textContent=DISPLAY[r]; badgesB.appendChild(s); }
  badgesU.innerHTML=""; for(const r of removedU){ const s=document.createElement('span'); s.className='badge u'; s.textContent=DISPLAY[r]; badgesU.appendChild(s); }
  cntP.textContent=removedP.length; cntB.textContent=removedB.length; cntU.textContent=removedU.length;
}
function renderCounts(){
  let html=`<table><thead><tr><th>หน้าไพ่</th><th>เหลือ</th></tr></thead><tbody>`;
  let total=0;
  for(const r of RANKS){ html+=`<tr><td style="text-align:left">${DISPLAY[r]}</td><td>${counts[r]}</td></tr>`; total+=counts[r]; }
  html+=`</tbody><tfoot><tr><td style="text-align:left">รวม</td><td>${total}</td></tr></tfoot></table>`;
  countsTableDiv.innerHTML=html;
  totalLeftSpan.textContent=`เหลือทั้งหมด: ${total}`;
}
function renderAll(){ renderButtons(); renderRemoved(); renderCounts(); }
renderAll();

function removeOne(rank, side){
  if(counts[rank]<=0) return;
  counts[rank]-=1;
  hist.push({rank, side});
  if(side==='P') removedP.push(rank); else if(side==='B') removedB.push(rank); else removedU.push(rank);
  renderAll();
}
btnUndo.onclick=()=>{
  const last=hist.pop();
  if(!last) return;
  counts[last.rank]+=1;
  if(last.side==='P') removedP.pop(); else if(last.side==='B') removedB.pop(); else removedU.pop();
  renderAll();
};
btnReset.onclick=()=>{
  counts=makeCounts(); hist=[]; removedP=[]; removedB=[]; removedU=[];
  renderAll(); nextProbDiv.innerHTML=""; permsOutDiv.innerHTML=""; simResultsDiv.innerHTML="";
  recBox.className="recommend neutral"; recBox.innerHTML='<p class="rec-title">ยังไม่มีผลจำลอง</p><p class="rec-sub">กด “เริ่มจำลอง” ก่อน แล้วระบบจะแนะนำให้อัตโนมัติ</p>'; evTable.innerHTML="";
  previewN=[]; observedReal=[]; nextNDiv.innerHTML=""; observedList.innerHTML="";
};
function parseRankInput(txt){
  if(!txt) return null;
  txt=txt.trim().toUpperCase();
  return PARSE[txt]??null;
}
btnAddRank.onclick=()=>{
  const r=parseRankInput(typedRank.value);
  if(!r){ alert("พิมพ์หน้าไพ่ไม่ถูกต้อง (ใช้ A,2..10,J,Q,K)"); return; }
  removeOne(r,currentSide);
  typedRank.value="";
};

// ===== 2) Next-card probabilities =====
function nextCardProbs(){
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  if(total<=0) return {byRank:[],byValue:[], total:0};
  const byRank=RANKS.map(r=>({rank:DISPLAY[r], left:counts[r], p: 100*counts[r]/total}));
  const acc=[0,0,0,0,0,0,0,0,0,0];
  for(const r of RANKS){ acc[VAL(r)]+=counts[r]; }
  const byValue=acc.map((c,i)=>({val:i, left:c, p:100*c/total}));
  return {byRank, byValue, total};
}
document.getElementById('btnNextCard').onclick=()=>{
  const res=nextCardProbs();
  if(res.total<=0){ nextProbDiv.innerHTML="<span class='small'>ไม่มีไพ่เหลือ</span>"; return; }
  let html="<div class='control' style='min-width:280px'><h3 style='margin:0 0 6px'>ตามหน้าไพ่</h3><table><thead><tr><th>หน้าไพ่</th><th>เหลือ</th><th>โอกาส (%)</th></tr></thead><tbody>";
  for(const r of res.byRank){ html+=`<tr><td style='text-align:left'>${r.rank}</td><td>${r.left}</td><td>${r.p.toFixed(4)}</td></tr>`; }
  html+="</tbody></table></div>";
  html+="<div class='control' style='min-width:220px'><h3 style='margin:0 0 6px'>ตามค่า Baccarat (0–9)</h3><table><thead><tr><th>ค่า</th><th>เหลือ</th><th>โอกาส (%)</th></tr></thead><tbody>";
  for(const v of res.byValue){ html+=`<tr><td style='text-align:left'>${v.val}</td><td>${v.left}</td><td>${v.p.toFixed(4)}</td></tr>`; }
  html+="</tbody></table></div>";
  nextProbDiv.innerHTML=html;
};

// ===== 3) Combinatorial count =====
function log10Factorial(n){ let s=0; for(let i=2;i<=n;i++) s+=Math.log10(i); return s; }
const LOG10_416F = (function(){ let s=0; for(let i=2;i<=416;i++) s+=Math.log10(i); return s; })();

document.getElementById('btnCountPerms').onclick=()=>{
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  let logNum = log10Factorial(total);
  for(const r of RANKS){ logNum -= log10Factorial(counts[r]); }
  const logFrac = logNum - LOG10_416F;
  const approx = (logNum>6) ? `≈ 10^${logNum.toFixed(2)}` : (10**logNum).toFixed(0);
  const pctOfAll = (logFrac<-2) ? `≈ 10^${(logFrac+2).toFixed(2)}%` : ( (10**logFrac)*100 ).toPrecision(3) + "%";
  permsOutDiv.innerHTML = `<div class='control'><table>
    <thead><tr><th>ตัวชี้วัด</th><th>ค่า</th></tr></thead><tbody>
      <tr><td style='text-align:left'>ไพ่ที่เหลือ (Nrem)</td><td>${total}</td></tr>
      <tr><td style='text-align:left'>log10(Nrem!) - Σ log10(count_r!)</td><td>${logNum.toFixed(6)}</td></tr>
      <tr><td style='text-align:left'>จำนวนวิธีที่เป็นไปได้ (ประมาณ)</td><td>${approx}</td></tr>
      <tr><td style='text-align:left'>สัดส่วนเมื่อเทียบกับ 416! (log10)</td><td>${logFrac.toFixed(6)}</td></tr>
      <tr><td style='text-align:left'>สัดส่วนเทียบทั้งหมด (ประมาณ)</td><td>${pctOfAll}</td></tr>
    </tbody></table></div>`;
};

// ===== 4) Monte Carlo (Baccarat rules) =====
function sample(pool,k,rng){
  const bag=[]; for(const r of RANKS){ for(let i=0;i<pool[r];i++) bag.push(r); }
  for(let i=bag.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
  return bag.slice(0,k);
}
function playOne(counts,rng){
  const bag={}; for(const r of RANKS) bag[r]=counts[r];
  const draw=(n)=>{ const picks=sample(bag,n,rng); for(const r of picks) bag[r]-=1; return picks; };
  const first4=draw(4);
  const P=[first4[0],first4[2]], B=[first4[1],first4[3]];
  const tot=a=>(a.reduce((s,r)=>s+VAL(r),0)%10);
  let pt=tot(P), bt=tot(B);
  let natural=(pt>=8)||(bt>=8), pDraw=false, bDraw=false;
  if(!natural){
    if(pt<=5){
      const p3=draw(1)[0]; pDraw=true; P.push(p3); pt=tot(P); const p3v=VAL(p3);
      if(bt<=2) bDraw=true;
      else if(bt===3 && p3v!==8) bDraw=true;
      else if(bt===4 && [2,3,4,5,6,7].includes(p3v)) bDraw=true;
      else if(bt===5 && [4,5,6,7].includes(p3v)) bDraw=true;
      else if(bt===6 && [6,7].includes(p3v)) bDraw=true;
      if(bDraw){ const b3=draw(1)[0]; B.push(b3); bt=tot(B); }
    } else {
      if(bt<=5){ bDraw=true; const b3=draw(1)[0]; B.push(b3); bt=tot(B); }
    }
  }
  let outcome="Tie"; if(pt>bt) outcome="Player"; else if(bt>pt) outcome="Banker";
  return {natural, pDraw, bDraw, outcome};
}
let lastSim=null;
function runSim(iter,counts){
  const rng=Math.random;
  let nat=0,pd=0,bd=0,b=0,p=0,t=0;
  for(let i=0;i<iter;i++){
    const r=playOne(counts,rng);
    if(r.natural) nat++; if(r.pDraw) pd++; if(r.bDraw) bd++;
    if(r.outcome==="Banker") b++; else if(r.outcome==="Player") p++; else t++;
  }
  lastSim={pB:100*b/iter, pP:100*p/iter, pT:100*t/iter, nat:100*nat/iter, pDraw:100*pd/iter, bDraw:100*bd/iter};
  let html=`<table><thead><tr><th>Metric</th><th>Estimate (%)</th></tr></thead><tbody>`;
  html+=`<tr><td style="text-align:left">Natural (either side)</td><td>${lastSim.nat.toFixed(4)}</td></tr>`;
  html+=`<tr><td style="text-align:left">Player Draw</td><td>${lastSim.pDraw.toFixed(4)}</td></tr>`;
  html+=`<tr><td style="text-align:left">Banker Draw</td><td>${lastSim.bDraw.toFixed(4)}</td></tr>`;
  html+=`<tr><td style="text-align:left">Outcome — Banker</td><td>${lastSim.pB.toFixed(4)}</td></tr>`;
  html+=`<tr><td style="text-align:left">Outcome — Player</td><td>${lastSim.pP.toFixed(4)}</td></tr>`;
  html+=`<tr><td style="text-align:left">Outcome — Tie</td><td>${lastSim.pT.toFixed(4)}</td></tr>`;
  html+=`</tbody></table>`;
  simResultsDiv.innerHTML=html;
  renderRecommendation();
}
btnSim.onclick=()=>{
  const iter=Math.max(1000,Math.min(2000000,parseInt(simNInput.value||"200000",10)));
  simStatus.textContent="กำลังจำลอง…";
  setTimeout(()=>{ runSim(iter,counts); simStatus.textContent="เสร็จแล้ว"; },20);
};

// ===== 5) EV & recommendation =====
function renderRecommendation(){
  if(!lastSim){
    recBox.className="recommend neutral";
    recBox.innerHTML='<p class="rec-title">ยังไม่มีผลจำลอง</p><p class="rec-sub">กด “เริ่มจำลอง” ก่อน แล้วระบบจะแนะนำให้อัตโนมัติ</p>';
    evTable.innerHTML="";
    return;
  }
  const pB=lastSim.pB/100, pP=lastSim.pP/100, pT=lastSim.pT/100;
  const tiePay=parseFloat(tiePayoutSel.value||"8");
  const EV_B=0.95*pB - pP;
  const EV_P=pP - pB;
  const EV_T=tiePay*pT - (1-pT);
  function f(x){ return (100*x).toFixed(3)+"%"; }
  let html=`<table><thead><tr><th>ตัวเลือก</th><th>EV ต่อ 1 หน่วย</th><th>เงื่อนไขกำไร</th></tr></thead><tbody>`;
  html+=`<tr><td style="text-align:left">Banker (จ่าย 0.95:1)</td><td>${f(EV_B)}</td><td>ต้องมี 0.95·pB > pP</td></tr>`;
  html+=`<tr><td style="text-align:left">Player (จ่าย 1:1)</td><td>${f(EV_P)}</td><td>ต้องมี pP > pB</td></tr>`;
  html+=`<tr><td style="text-align:left">Tie (จ่าย ${tiePay}:1)</td><td>${f(EV_T)}</td><td>${tiePay===8?'pT > 11.11%':'pT > 10%'}</td></tr>`;
  html+=`</tbody></table>`;
  evTable.innerHTML=html;
  let rec="รอ/ข้ามตานี้", sub="ยังไม่มีทางเลือกที่ EV เป็นบวก", cls="neutral";
  const best=Math.max(EV_B,EV_P,EV_T);
  if(best>0){
    if(best===EV_B){ rec="แนะนำลง Banker"; sub=`EV_B = ${f(EV_B)} (pB=${(pB*100).toFixed(2)}%, pP=${(pP*100).toFixed(2)}%)`; cls="good"; }
    else if(best===EV_P){ rec="แนะนำลง Player"; sub=`EV_P = ${f(EV_P)} (pP=${(pP*100).toFixed(2)}%, pB=${(pB*100).toFixed(2)}%)`; cls="good"; }
    else { rec="พิจารณา Tie"; sub=`EV_T = ${f(EV_T)} (pT=${(pT*100).toFixed(2)}%, จ่าย ${tiePay}:1)`; cls="good"; }
  } else {
    if(best===EV_B){ sub=`Banker เสียเปรียบน้อยสุด: ${f(EV_B)}`; cls="warn"; }
    else if(best===EV_P){ sub=`Player เสียเปรียบน้อยสุด: ${f(EV_P)}`; cls="warn"; }
    else { sub=`Tie เสียเปรียบน้อยสุด: ${f(EV_T)}`; cls="warn"; }
  }
  recBox.className="recommend "+cls;
  recBox.innerHTML=`<p class="rec-title">${rec}</p><p class="rec-sub">${sub}</p>`;
}
tiePayoutSel.onchange=()=>renderRecommendation();

// ===== 6) Preview N cards + real adjustment =====
function drawSequence(pool, n){
  const bag=[]; for(const r of RANKS){ for(let i=0;i<pool[r];i++) bag.push(r); }
  for(let i=bag.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
  return bag.slice(0, Math.min(n, bag.length));
}
function showPreviewN(){
  const n = Math.max(1, parseInt(previewCountSel.value||"30", 10));
  previewN = drawSequence(counts, n);
  renderPreviewN();
}
function renderPreviewN(){
  if(!previewN.length){ nextNDiv.innerHTML="<span class='small'>ยังไม่มีตัวอย่าง — กดปุ่มสุ่มก่อน</span>"; return; }
  let html = "<table><thead><tr><th>#</th><th>หน้าไพ่</th></tr></thead><tbody>";
  for(let i=0;i<previewN.length;i++){
    html += `<tr><td style="text-align:left">${i+1}</td><td>${DISPLAY[previewN[i]]}</td></tr>`;
  }
  html += "</tbody></table>";
  nextNDiv.innerHTML = html;
}
btnShowN.onclick=()=>showPreviewN();

btnCopyN.onclick=()=>{
  if(!previewN.length){ alert("ยังไม่มีรายการให้คัดลอก"); return; }
  const text = previewN.map(r=>DISPLAY[r]).join(", ");
  navigator.clipboard.writeText(text).then(()=>{
    alert("คัดลอกแล้ว: " + text);
  }).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    alert("คัดลอกแล้ว: " + text);
  });
};

function updateObservedList(){
  if(observedReal.length){
    observedList.innerHTML = "ไพ่จริงที่ยืนยันแล้ว: " + observedReal.map(r=>DISPLAY[r]).join(", ");
  } else {
    observedList.innerHTML = "";
  }
}
btnConfirmNext.onclick=()=>{
  const r = parseRankInput(realNextInput.value);
  if(!r){ alert("พิมพ์หน้าไพ่ไม่ถูกต้อง (ใช้ A,2..10,J,Q,K)"); return; }
  if(counts[r]<=0){ alert("หน้าไพ่นี้ไม่มีเหลือในขอนแล้ว"); return; }
  counts[r]-=1;
  observedReal.push(r);
  renderCounts();
  updateObservedList();
  showPreviewN(); // สุ่มใหม่ตามจำนวนที่เลือก
  realNextInput.value="";
};

// helper
function parseRankInput(txt){
  if(!txt) return null;
  txt=txt.trim().toUpperCase();
  return PARSE[txt]??null;
}
