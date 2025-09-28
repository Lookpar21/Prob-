// Baccarat Deck Tracker — v6 Basic
const RANKS=[1,2,3,4,5,6,7,8,9,10,11,12,13];
const DISPLAY={1:"A",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"10",11:"J",12:"Q",13:"K"};

let counts={}, history=[];
resetCounts();

function resetCounts(){
  counts={}; for(const r of RANKS) counts[r]=32;
  history=[]; renderAll();
}

function removeOne(r){ if(counts[r]>0){ counts[r]--; history.push(r); renderAll(); } }

function renderButtons(){
  const div=document.getElementById("rankButtons"); div.innerHTML="";
  for(const r of RANKS){
    const b=document.createElement("button");
    b.className="rank-btn"; b.textContent=DISPLAY[r];
    b.disabled=counts[r]<=0; b.onclick=()=>removeOne(r);
    div.appendChild(b);
  }
}

function renderCircles(){
  const div=document.getElementById("enteredCircles"); div.innerHTML="";
  const start=Math.max(0,history.length-80);
  for(let i=start;i<history.length;i++){
    const c=document.createElement("div"); c.className="circle";
    c.innerHTML="<span>"+DISPLAY[history[i]]+"</span>"; div.appendChild(c);
  }
}

function renderCounts(){
  let html="<table><thead><tr><th>ไพ่</th><th>เหลือ</th></tr></thead><tbody>";
  let total=0;
  for(const r of RANKS){ html+=`<tr><td>${DISPLAY[r]}</td><td>${counts[r]}</td></tr>`; total+=counts[r]; }
  html+=`</tbody><tfoot><tr><td>รวม</td><td>${total}</td></tr></tfoot></table>`;
  document.getElementById("countsTable").innerHTML=html;
  document.getElementById("totalLeft").textContent="เหลือทั้งหมด: "+total;
}

function renderAll(){ renderButtons(); renderCircles(); renderCounts(); }

document.getElementById("btnUndo").onclick=()=>{
  const last=history.pop(); if(last!=null){ counts[last]++; renderAll(); }
};

document.getElementById("btnReset").onclick=()=>resetCounts();

function drawSequence(n){
  const bag=[]; for(const r of RANKS){ for(let i=0;i<counts[r];i++) bag.push(r); }
  for(let i=bag.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
  return bag.slice(0,n);
}

document.getElementById("btnShowN").onclick=()=>{
  const n=parseInt(document.getElementById("previewCount").value,10);
  const seq=drawSequence(n);
  let html="<table><tr><th>#</th><th>ไพ่</th></tr>";
  seq.forEach((r,i)=> html+=`<tr><td>${i+1}</td><td>${DISPLAY[r]}</td></tr>`);
  html+="</table>"; document.getElementById("nextN").innerHTML=html;
};