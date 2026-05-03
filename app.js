/* ===========================================================
   FVP Jump Profile - Samozino method (pure JS)
   =========================================================== */
const G = 9.81;
const N_DEFAULT = 6;

const RANGE = {
  bm:[25,200], hpo:[0.20,0.55], alpha:[10,90], hmax:[0.05,0.90]
};

const ARCHETYPES = {
  "Sprinter (deficit de fuerza)": {
    athlete:"Sprinter ejemplo", body_mass:78, hpo:0.40, alpha:90,
    trials:[[0,0.255,0.250,0.245],[20,0.173,0.168,0.163],[40,0.113,0.108,0.103],
            [60,0.069,0.064,0.059],[80,0.036,0.031,0.026],[100,0.012,0.008,0.005]]
  },
  "Saltador vertical (equilibrado)": {
    athlete:"Saltador ejemplo", body_mass:82, hpo:0.42, alpha:90,
    trials:[[0,0.343,0.338,0.333],[20,0.267,0.262,0.257],[40,0.209,0.204,0.199],
            [60,0.162,0.157,0.152],[80,0.124,0.119,0.114],[100,0.093,0.088,0.083]]
  },
  "Jugador de equipo (futbol/basket)": {
    athlete:"Jugador ejemplo", body_mass:75, hpo:0.38, alpha:90,
    trials:[[0,0.264,0.259,0.254],[15,0.202,0.197,0.192],[30,0.154,0.149,0.144],
            [45,0.116,0.111,0.106],[60,0.084,0.079,0.074],[75,0.059,0.054,0.049]]
  },
  "Halterofilo / fuerza (deficit velocidad)": {
    athlete:"Halterofilo ejemplo", body_mass:95, hpo:0.40, alpha:90,
    trials:[[0,0.317,0.312,0.307],[30,0.246,0.241,0.236],[60,0.192,0.187,0.182],
            [90,0.149,0.144,0.139],[120,0.114,0.109,0.104],[150,0.086,0.081,0.076]]
  },
  "Recreativo / sedentario": {
    athlete:"Recreativo ejemplo", body_mass:70, hpo:0.36, alpha:90,
    trials:[[0,0.128,0.123,0.118],[10,0.100,0.095,0.090],[20,0.076,0.071,0.066],
            [30,0.056,0.051,0.046],[40,0.040,0.035,0.030],[50,0.026,0.021,0.016]]
  }
};

/* --------------------- estado --------------------- */
const session = {
  athlete:"", date: new Date().toISOString().slice(0,16).replace("T"," "),
  body_mass:0, hpo:0, alpha:90,
  trials: Array.from({length:N_DEFAULT},()=>({add_mass:0,h1:null,h2:null,h3:null}))
};
let lastResult = null;

/* --------------------- cube root real --------------------- */
const cbrt = x => Math.sign(x)*Math.pow(Math.abs(x),1/3);

/* --------------------- cálculo --------------------- */
function hmaxOf(t){
  const v=[t.h1,t.h2,t.h3].filter(x=>x!=null && x>0);
  return v.length? Math.max(...v): null;
}

function optimalSfv(Pmax_kg, hpo, alpha_deg){
  if(Pmax_kg<=0||hpo<=0) return NaN;
  const a = G*Math.sin(alpha_deg*Math.PI/180);
  const Pm=Pmax_kg, h=hpo;
  const disc = 2*a**3*h**9*Pm**6 + 27*h**8*Pm**8;
  if(disc<0) return NaN;
  const inner = -(a**6)*h**6 - 18*a**3*h**5*Pm**2 - 54*h**4*Pm**4
                + 6*Math.sqrt(3)*Math.sqrt(disc);
  const S = cbrt(inner);
  return -(a*a)/(3*Pm) - (-(a**4)*h**4 - 12*a*h**3*Pm**2)/(3*h*h*Pm*S) + S/(3*h*h*Pm);
}

function compute(s){
  const F=[],V=[],P=[];
  for(const t of s.trials){
    const h=hmaxOf(t);
    if(h==null||h<=0) continue;
    const m=s.body_mass + (t.add_mass||0);
    if(m<=0||s.hpo<=0) continue;
    const f=m*G*(h/s.hpo+1);
    const v=Math.sqrt(G*h/2);
    F.push(f); V.push(v); P.push(f*v);
  }
  if(F.length<2) throw new Error("Se necesitan al menos 2 condiciones validas.");

  // regresión lineal F = a + b*V
  const n=F.length;
  const meanV=V.reduce((a,b)=>a+b,0)/n;
  const meanF=F.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0;
  for(let i=0;i<n;i++){num+=(V[i]-meanV)*(F[i]-meanF); den+=(V[i]-meanV)**2;}
  const slope=num/den, intercept=meanF-slope*meanV;
  const Sfv=slope, Fo=intercept, Vo=-Fo/Sfv, Pmax=Fo*Vo/4;
  let ssRes=0, ssTot=0;
  for(let i=0;i<n;i++){const fp=slope*V[i]+intercept; ssRes+=(F[i]-fp)**2; ssTot+=(F[i]-meanF)**2;}
  const r2 = ssTot>0 ? 1-ssRes/ssTot : NaN;

  const Pmax_kg=Pmax/s.body_mass, Sfv_kg=Sfv/s.body_mass, Fo_kg=Fo/s.body_mass;
  const Sfv_opt_kg=optimalSfv(Pmax_kg,s.hpo,s.alpha);
  const fvimb_ratio=Sfv_kg/Sfv_opt_kg;
  const fvimb_pct=Math.abs(1-fvimb_ratio)*100;
  let reco;
  if(Math.abs(1-fvimb_ratio)<=0.10) reco="Well balanced (±10% del óptimo)";
  else if(fvimb_ratio<1) reco="Déficit de FUERZA → entrenar fuerza";
  else reco="Déficit de VELOCIDAD → entrenar velocidad";

  return {F,V,P,Fo,Vo,Sfv,Pmax,Fo_kg,Pmax_kg,Sfv_kg,Sfv_opt_kg,
          FVimb_ratio:fvimb_ratio,FVimb_pct:fvimb_pct,recommendation:reco,r2};
}

/* --------------------- validación --------------------- */
function validate(s){
  const m=[];
  if(s.body_mass<=0) m.push(["err","Falta Body mass (kg)."]);
  else if(s.body_mass<RANGE.bm[0]||s.body_mass>RANGE.bm[1])
    m.push(["warn",`Body mass ${s.body_mass} fuera de ${RANGE.bm[0]}-${RANGE.bm[1]} kg.`]);
  if(s.hpo<=0) m.push(["err","Falta Hpo (m). Mide la distancia de empuje (ver Instrucciones)."]);
  else if(s.hpo<RANGE.hpo[0]||s.hpo>RANGE.hpo[1])
    m.push(["warn",`Hpo ${s.hpo} fuera de ${RANGE.hpo[0]}-${RANGE.hpo[1]} m.`]);
  if(s.alpha<RANGE.alpha[0]||s.alpha>RANGE.alpha[1])
    m.push(["warn",`alpha ${s.alpha}° fuera de ${RANGE.alpha[0]}-${RANGE.alpha[1]}°.`]);

  let valid=0;
  s.trials.forEach((t,i)=>{
    const hs=[t.h1,t.h2,t.h3].filter(x=>x!=null&&x>0);
    if(!hs.length && !t.add_mass) return;
    if(!hs.length){ m.push(["err",`Fila ${i+1}: hay masa pero ninguna altura.`]); return; }
    const h=Math.max(...hs);
    if(h>5){ m.push(["err",`Fila ${i+1}: Hmax=${h} parece estar en cm. Usa metros.`]); return; }
    if(h<RANGE.hmax[0]||h>RANGE.hmax[1])
      m.push(["warn",`Fila ${i+1}: Hmax ${h.toFixed(3)} m fuera de ${RANGE.hmax[0]}-${RANGE.hmax[1]}.`]);
    else valid++;
    if(hs.length>=2){
      const mean=hs.reduce((a,b)=>a+b,0)/hs.length;
      const sd=Math.sqrt(hs.reduce((a,b)=>a+(b-mean)**2,0)/hs.length);
      const cv=sd/mean*100;
      if(cv>5) m.push(["warn",`Fila ${i+1}: CV entre intentos = ${cv.toFixed(1)}% (>5%).`]);
    }
  });
  if(valid<2) m.push(["err",`Necesitas al menos 2 condiciones válidas (tienes ${valid}).`]);
  else if(valid<4) m.push(["warn",`Solo ${valid} condiciones válidas. Recomendado 5–6.`]);
  return m;
}

/* --------------------- UI: tabs --------------------- */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* --------------------- UI: trials table --------------------- */
const tbody = document.querySelector("#trials tbody");
function renderTrials(){
  tbody.innerHTML="";
  session.trials.forEach((t,i)=>{
    const tr=document.createElement("tr");
    const h=hmaxOf(t);
    tr.innerHTML=`
      <td>${i+1}</td>
      <td><input type="number" min="0" step="5" value="${t.add_mass??""}" data-i="${i}" data-k="add_mass"></td>
      <td><input type="number" min="0" step="0.01" value="${t.h1??""}" data-i="${i}" data-k="h1"></td>
      <td><input type="number" min="0" step="0.01" value="${t.h2??""}" data-i="${i}" data-k="h2"></td>
      <td><input type="number" min="0" step="0.01" value="${t.h3??""}" data-i="${i}" data-k="h3"></td>
      <td>${h!=null?h.toFixed(3):"—"}</td>
      <td><button class="del-btn" data-del="${i}">✕</button></td>`;
    tbody.appendChild(tr);
  });
}
tbody.addEventListener("input",e=>{
  const inp=e.target;
  if(inp.dataset.k){
    const i=+inp.dataset.i, k=inp.dataset.k;
    const v=inp.value===""?null:parseFloat(inp.value);
    session.trials[i][k]=(k==="add_mass")?(v??0):v;
    // actualiza solo Hmax in-place sin re-render completo (para no perder foco)
    const row=inp.closest("tr");
    const h=hmaxOf(session.trials[i]);
    row.cells[5].textContent = h!=null? h.toFixed(3) : "—";
    runValidation();
  }
});
tbody.addEventListener("click",e=>{
  if(e.target.dataset.del!=null){
    session.trials.splice(+e.target.dataset.del,1);
    renderTrials(); runValidation();
  }
});
document.getElementById("addRow").onclick=()=>{
  session.trials.push({add_mass:0,h1:null,h2:null,h3:null});
  renderTrials();
};

/* --------------------- UI: campos cabecera --------------------- */
const $=id=>document.getElementById(id);
$("date").value = session.date;
function bindField(id,key,parse=parseFloat){
  $(id).addEventListener("input",e=>{
    const v=e.target.value;
    session[key] = (key==="athlete"||key==="date")? v : (v===""?0:parse(v));
    runValidation();
  });
}
bindField("athlete","athlete",x=>x);
bindField("date","date",x=>x);
bindField("alpha","alpha");
bindField("bm","body_mass");
bindField("hpo","hpo");

/* --------------------- arquetipos --------------------- */
const archSel=$("archetype");
Object.keys(ARCHETYPES).forEach(k=>{
  const o=document.createElement("option"); o.value=k; o.textContent=k; archSel.appendChild(o);
});
archSel.addEventListener("change",e=>{
  const k=e.target.value; if(!k) return;
  const d=ARCHETYPES[k];
  Object.assign(session,{athlete:d.athlete,body_mass:d.body_mass,hpo:d.hpo,alpha:d.alpha,
    trials:d.trials.map(([m,a,b,c])=>({add_mass:m,h1:a,h2:b,h3:c}))});
  refreshHeader(); renderTrials(); runValidation();
});
function refreshHeader(){
  $("athlete").value=session.athlete;
  $("date").value=session.date;
  $("alpha").value=session.alpha;
  $("bm").value=session.body_mass||"";
  $("hpo").value=session.hpo||"";
}

/* --------------------- reset / json --------------------- */
$("reset").onclick=()=>{
  Object.assign(session,{athlete:"",body_mass:0,hpo:0,alpha:90,
    trials:Array.from({length:N_DEFAULT},()=>({add_mass:0,h1:null,h2:null,h3:null}))});
  session.date=new Date().toISOString().slice(0,16).replace("T"," ");
  refreshHeader(); renderTrials(); runValidation();
  $("resultsContent").hidden=true; $("noResults").hidden=false;
};
$("saveJson").onclick=()=>{
  const blob=new Blob([JSON.stringify(session,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`FVP_${(session.athlete||"session").replace(/\s+/g,"_")}.json`;
  a.click();
};
$("loadJson").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      Object.assign(session,d);
      session.trials=d.trials.map(t=>({add_mass:t.add_mass||0,h1:t.h1,h2:t.h2,h3:t.h3}));
      refreshHeader(); renderTrials(); runValidation();
    }catch(err){alert("JSON invalido: "+err.message);}
  };
  r.readAsText(f);
});

/* --------------------- validación UI --------------------- */
function runValidation(){
  const div=$("validation"); div.innerHTML="";
  const msgs=validate(session);
  if(!msgs.length){
    div.innerHTML=`<div class="msg ok">✅ Datos válidos. Pulsa Calcular.</div>`;
    $("compute").disabled=false;
  } else {
    msgs.forEach(([lvl,m])=>{
      const icon=lvl==="err"?"❌":lvl==="warn"?"⚠️":"ℹ️";
      div.innerHTML+=`<div class="msg ${lvl}">${icon} ${m}</div>`;
    });
    $("compute").disabled = msgs.some(([l])=>l==="err");
  }
}

/* --------------------- calcular --------------------- */
let fvChart=null, pvChart=null;
$("compute").onclick=()=>{
  try{
    lastResult=compute(session);
    showResults(lastResult);
    document.querySelector('.tab[data-tab="resultados"]').click();
  }catch(e){ alert("Error: "+e.message); }
};

function showResults(r){
  $("noResults").hidden=true; $("resultsContent").hidden=false;
  $("kpi-fo").textContent=r.Fo.toFixed(0);
  $("kpi-fokg").textContent=`${r.Fo_kg.toFixed(2)} N/kg`;
  $("kpi-vo").textContent=r.Vo.toFixed(2);
  $("kpi-pmax").textContent=r.Pmax.toFixed(0);
  $("kpi-pmaxkg").textContent=`${r.Pmax_kg.toFixed(2)} W/kg`;
  $("kpi-fvimb").textContent=`${(r.FVimb_ratio*100).toFixed(1)} %`;
  $("kpi-fvimb-pct").textContent=`${r.FVimb_pct.toFixed(1)}% desbal.`;
  $("kpi-sfv").textContent=r.Sfv_kg.toFixed(3);
  $("kpi-sfvopt").textContent=r.Sfv_opt_kg.toFixed(3);
  $("kpi-r2").textContent=r.r2.toFixed(3);

  const banner=$("reco");
  banner.textContent=r.recommendation;
  banner.className="banner "+(r.recommendation.toLowerCase().includes("balanced")?"ok":
                              r.recommendation.includes("FUERZA")?"err":"warn");

  // detalle
  const tb=document.querySelector("#detail tbody"); tb.innerHTML="";
  for(let i=0;i<r.F.length;i++){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td>${r.F[i].toFixed(1)}</td><td>${r.V[i].toFixed(3)}</td><td>${r.P[i].toFixed(1)}</td>`;
    tb.appendChild(tr);
  }

  drawCharts(r);
}

function drawCharts(r){
  const sfv_opt = r.Sfv_opt_kg * session.body_mass;
  let Fo_opt=null,Vo_opt=null;
  if(!isNaN(sfv_opt) && r.Pmax*sfv_opt<0){
    Fo_opt=Math.sqrt(-4*r.Pmax*sfv_opt);
    Vo_opt=-Fo_opt/sfv_opt;
  }
  const v_max=Math.max(r.Vo,...r.V,Vo_opt||0)*1.10;

  // F-v
  const fvData={
    datasets:[
      {label:"Mediciones",type:"scatter",
        data:r.V.map((v,i)=>({x:v,y:r.F[i]})),
        backgroundColor:"#1f77b4",pointRadius:6,pointBorderColor:"#fff",pointBorderWidth:2},
      {label:`Regresión (r²=${r.r2.toFixed(3)})`,type:"line",
        data:[{x:0,y:r.Fo},{x:v_max,y:r.Sfv*v_max+r.Fo}],
        borderColor:"#1f77b4",borderWidth:2,fill:false,pointRadius:0}
    ]
  };
  if(Fo_opt!=null){
    fvData.datasets.push({label:"F-v óptimo (mismo Pmax)",type:"line",
      data:[{x:0,y:Fo_opt},{x:Vo_opt,y:0}],
      borderColor:"#16a34a",borderWidth:2,borderDash:[6,4],fill:false,pointRadius:0});
  }
  if(fvChart) fvChart.destroy();
  fvChart=new Chart($("fvChart"),{type:"scatter",data:fvData,options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{title:{display:true,text:`F-v profile  ·  FVimb=${(r.FVimb_ratio*100).toFixed(1)}%`},
             legend:{position:"bottom"}},
    scales:{x:{title:{display:true,text:"Velocity (m/s)"},min:0,max:v_max},
            y:{title:{display:true,text:"Force (N)"},min:0}}}});

  // P-v curve
  const N=80; const v_pts=[],p_pts=[];
  for(let i=0;i<=N;i++){const v=(r.Vo*1.05)*i/N; v_pts.push(v); p_pts.push(v*(r.Sfv*v+r.Fo));}
  const pvData={
    datasets:[
      {label:`Pmax = ${r.Pmax.toFixed(0)} W (${r.Pmax_kg.toFixed(1)} W/kg)`,type:"line",
        data:v_pts.map((v,i)=>({x:v,y:Math.max(0,p_pts[i])})),
        borderColor:"#d62728",backgroundColor:"rgba(214,39,40,.12)",
        borderWidth:2,fill:true,pointRadius:0,tension:0.2},
      {label:"Mediciones",type:"scatter",
        data:r.V.map((v,i)=>({x:v,y:r.P[i]})),
        backgroundColor:"#d62728",pointRadius:6,pointBorderColor:"#fff",pointBorderWidth:2}
    ]
  };
  if(pvChart) pvChart.destroy();
  pvChart=new Chart($("pvChart"),{type:"scatter",data:pvData,options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{title:{display:true,text:"P-v profile"},legend:{position:"bottom"}},
    scales:{x:{title:{display:true,text:"Velocity (m/s)"},min:0,max:r.Vo*1.10},
            y:{title:{display:true,text:"Power (W)"},min:0}}}});
}

/* --------------------- export CSV / PDF --------------------- */
$("exportCsv").onclick=()=>{
  if(!lastResult) return;
  const r=lastResult;
  const lines=[
    `FVP Jump Profile`,
    `Atleta,${session.athlete}`,
    `Fecha,${session.date}`,
    `Body mass (kg),${session.body_mass}`,
    `Hpo (m),${session.hpo}`,
    `alpha (deg),${session.alpha}`,
    ``,
    `Indicador,Valor`,
    `Fo (N),${r.Fo.toFixed(2)}`,
    `Fo (N/kg),${r.Fo_kg.toFixed(3)}`,
    `Vo (m/s),${r.Vo.toFixed(3)}`,
    `Sfv (N.s/m),${r.Sfv.toFixed(3)}`,
    `Sfv (N.s/m/kg),${r.Sfv_kg.toFixed(4)}`,
    `Pmax (W),${r.Pmax.toFixed(2)}`,
    `Pmax (W/kg),${r.Pmax_kg.toFixed(3)}`,
    `Sfv opt (N.s/m/kg),${r.Sfv_opt_kg.toFixed(4)}`,
    `FVimb (% optimo),${(r.FVimb_ratio*100).toFixed(2)}`,
    `Desbalance (%),${r.FVimb_pct.toFixed(2)}`,
    `r2,${r.r2.toFixed(4)}`,
    `Recomendacion,${r.recommendation}`,
    ``,
    `# F (N),V (m/s),P (W)`,
    ...r.F.map((f,i)=>`${i+1},${f.toFixed(2)},${r.V[i].toFixed(3)},${r.P[i].toFixed(2)}`)
  ];
  const blob=new Blob([lines.join("\n")],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`FVP_${(session.athlete||"session").replace(/\s+/g,"_")}.csv`; a.click();
};

$("exportPdf").onclick=async ()=>{
  if(!lastResult) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");
  const r=lastResult;
  pdf.setFontSize(14); pdf.setFont(undefined,"bold");
  pdf.text(`FVP Jump Profile — ${session.athlete||"-"}`,15,15);
  pdf.setFontSize(10); pdf.setFont(undefined,"normal");
  pdf.text(`Fecha: ${session.date}    BM: ${session.body_mass} kg    Hpo: ${session.hpo} m    α: ${session.alpha}°`,15,22);
  let y=32;
  const rows=[
    ["Fo (N)",r.Fo.toFixed(0),"Fo (N/kg)",r.Fo_kg.toFixed(2)],
    ["Vo (m/s)",r.Vo.toFixed(2),"r²",r.r2.toFixed(3)],
    ["Pmax (W)",r.Pmax.toFixed(0),"Pmax (W/kg)",r.Pmax_kg.toFixed(2)],
    ["Sfv (N·s/m/kg)",r.Sfv_kg.toFixed(3),"Sfv óptima",r.Sfv_opt_kg.toFixed(3)],
    ["FVimb (% óptimo)",`${(r.FVimb_ratio*100).toFixed(1)} %`,"Desbalance",`${r.FVimb_pct.toFixed(1)} %`],
  ];
  pdf.setFontSize(11);
  rows.forEach(row=>{
    pdf.setFont(undefined,"bold"); pdf.text(row[0],15,y);
    pdf.setFont(undefined,"normal"); pdf.text(String(row[1]),65,y);
    pdf.setFont(undefined,"bold"); pdf.text(row[2],110,y);
    pdf.setFont(undefined,"normal"); pdf.text(String(row[3]),160,y);
    y+=7;
  });
  y+=4;
  pdf.setFont(undefined,"bold"); pdf.text("Recomendación:",15,y);
  pdf.setFont(undefined,"normal"); pdf.text(r.recommendation,55,y); y+=10;

  // gráficos como imagen
  const fvImg = $("fvChart").toDataURL("image/png",1.0);
  const pvImg = $("pvChart").toDataURL("image/png",1.0);
  pdf.addImage(fvImg,"PNG",15,y,180,90); y+=95;
  pdf.addImage(pvImg,"PNG",15,y,180,90);

  pdf.save(`FVP_${(session.athlete||"session").replace(/\s+/g,"_")}.pdf`);
};

/* --------------------- init --------------------- */
renderTrials();
runValidation();
