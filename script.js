// BooleanLab — client-side Boolean expression engine

const expressionInput = document.getElementById("expression");
const runBtn = document.getElementById("runBtn");
const errorBox = document.getElementById("error");
const resultArea = document.getElementById("resultArea");
const normalizedEl = document.getElementById("normalized");
const simplifiedEl = document.getElementById("simplified");
const variablesEl = document.getElementById("variables");
const stepsEl = document.getElementById("steps");
const tableEl = document.getElementById("truthTable");
const circuitEl = document.getElementById("circuitCanvas");

function tokenize(s){
  s=s.replace(/\s+/g,"").replace(/·/g,"*").replace(/∨/g,"+").replace(/∧/g,"*").replace(/¬/g,"!");
  const tokens=[]; let i=0;
  while(i<s.length){
    const c=s[i];
    if(/[A-D]/i.test(c)){tokens.push({type:"var",v:c.toUpperCase()});i++;continue}
    if(/[01]/.test(c)){tokens.push({type:"const",v:c});i++;continue}
    if("!'+*()".includes(c)){tokens.push({type:c==="'"?"!":c,v:c});i++;continue}
    throw new Error(`Unsupported character "${c}". Use A–D, +, *, ', ! and parentheses.`);
  }
  // Apostrophe after a variable/parenthesized expression is NOT/ complement.
  // Since tokenizer emits ! for apostrophe, parsing handles it as postfix when encountered.
  return insertImplicitAnd(tokens);
}

function insertImplicitAnd(tokens){
  const out=[];
  const left = t => t && (t.type==="var" || t.type==="const" || t.type===")");
  const right = t => t && (t.type==="var" || t.type==="const" || t.type==="(" || t.type==="!");
  for(let i=0;i<tokens.length;i++){
    if(left(tokens[i]) && right(tokens[i+1])) out.push(tokens[i],{type:"*",v:"*"});
    else out.push(tokens[i]);
  }
  return out;
}

function parse(s){
  const t=tokenize(s); let p=0;
  function primary(){
    if(!t[p]) throw new Error("Incomplete expression.");
    if(t[p].type==="var" || t[p].type==="const") return {op:"atom",v:t[p++].v};
    if(t[p].type==="("){p++;const n=or();if(!t[p]||t[p].type!==")")throw new Error("Missing closing parenthesis.");p++;return n}
    throw new Error("Expected a variable, constant or '('.");
  }
  function unary(){
    if(t[p] && t[p].type==="!"){p++;return {op:"not",a:unary()}}
    let n=primary();
    while(t[p] && t[p].type==="!"){p++;n={op:"not",a:n}}
    return n;
  }
  function and(){let n=unary();while(t[p]&&t[p].type==="*"){p++;n={op:"and",a:n,b:unary()}}return n}
  function or(){let n=and();while(t[p]&&t[p].type==="+"){p++;n={op:"or",a:n,b:and()}}return n}
  const tree=or();
  if(p<t.length) throw new Error("Unexpected token near the end of the expression.");
  return tree;
}

function vars(node,set=new Set()){if(node.op==="atom"&&/[A-D]/.test(node.v))set.add(node.v);if(node.a)vars(node.a,set);if(node.b)vars(node.b,set);return [...set].sort()}

function evalTree(n,env){
  if(n.op==="atom") return n.v==="1"?1:n.v==="0"?0:env[n.v];
  if(n.op==="not") return evalTree(n.a,env)?0:1;
  if(n.op==="and") return evalTree(n.a,env)&evalTree(n.b,env);
  return evalTree(n.a,env)|evalTree(n.b,env);
}

function str(n, parent=0){
  if(n.op==="atom")return n.v;
  if(n.op==="not"){const x=n.a.op==="atom"?str(n.a):`(${str(n.a)})`;return x+"'"}
  const prec=n.op==="or"?1:2, sym=n.op==="or"?"+":"·";
  const x=`${str(n.a,prec)}${sym}${str(n.b,prec)}`;
  return prec<parent?`(${x})`:x;
}

function clone(n){return JSON.parse(JSON.stringify(n))}
function isAtom(n,v){return n.op==="atom"&&(!v||n.v===v)}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function not(n){return {op:"not",a:n}}
function and(a,b){return {op:"and",a,b}}
function or(a,b){return {op:"or",a,b}}

function simplify(root){
  let n=clone(root), changed=true, rounds=0, log=[];
  function once(x){
    if(x.op==="atom")return x;
    if(x.op==="not"){
      x.a=once(x.a);
      if(x.a.op==="not"){log.push("Double negation: X'' = X");return x.a.a}
      if(x.a.op==="and"){log.push("De Morgan: (A·B)' = A' + B'");return once(or(not(x.a.a),not(x.a.b)))}
      if(x.a.op==="or"){log.push("De Morgan: (A+B)' = A'·B'");return once(and(not(x.a.a),not(x.a.b)))}
      return x;
    }
    x.a=once(x.a);x.b=once(x.b);
    // identity/null/complement/idempotent
    if(x.op==="and"){
      if(isAtom(x.a,"0")||isAtom(x.b,"0")){log.push("Domination: X·0 = 0");return {op:"atom",v:"0"}}
      if(isAtom(x.a,"1")){log.push("Identity: 1·X = X");return x.b}
      if(isAtom(x.b,"1")){log.push("Identity: X·1 = X");return x.a}
      if(equal(x.a,x.b)){log.push("Idempotent: X·X = X");return x.a}
      if(equal(x.a,not(x.b))||equal(x.b,not(x.a))){log.push("Complement: X·X' = 0");return {op:"atom",v:"0"}}
    } else {
      if(isAtom(x.a,"1")||isAtom(x.b,"1")){log.push("Domination: X+1 = 1");return {op:"atom",v:"1"}}
      if(isAtom(x.a,"0")){log.push("Identity: 0+X = X");return x.b}
      if(isAtom(x.b,"0")){log.push("Identity: X+0 = X");return x.a}
      if(equal(x.a,x.b)){log.push("Idempotent: X+X = X");return x.a}
      if(equal(x.a,not(x.b))||equal(x.b,not(x.a))){log.push("Complement: X+X' = 1");return {op:"atom",v:"1"}}
    }
    // Absorption X + X·Y = X and X(X+Y)=X
    if(x.op==="or"){
      if(x.a.op==="and"&&(equal(x.a.a,x.b)||equal(x.a.b,x.b))){log.push("Absorption: X + X·Y = X");return x.b}
      if(x.b.op==="and"&&(equal(x.b.a,x.a)||equal(x.b.b,x.a))){log.push("Absorption: X + X·Y = X");return x.a}
    }
    if(x.op==="and"){
      if(x.a.op==="or"&&(equal(x.a.a,x.b)||equal(x.a.b,x.b))){log.push("Absorption: X(X+Y) = X");return x.b}
      if(x.b.op==="or"&&(equal(x.b.a,x.a)||equal(x.b.b,x.a))){log.push("Absorption: X(X+Y) = X");return x.a}
    }
    return x;
  }
  while(changed&&rounds<8){const before=str(n);n=once(n);changed=before!==str(n);rounds++}
  return {tree:n,log};
}

function analyze(){
  errorBox.classList.add("hidden");
  try{
    const tree=parse(expressionInput.value);
    const vs=vars(tree);
    const simp=simplify(tree);
    normalizedEl.textContent=str(tree);
    simplifiedEl.textContent=str(simp.tree);
    variablesEl.textContent=vs.length?vs.join(", "):"None";
    resultArea.classList.remove("hidden");
    stepsEl.classList.remove("hidden");
    stepsEl.textContent = simp.log.length ? "Simplification steps:\\n" + simp.log.map((x,i)=>`${i+1}. ${x}`).join("\\n") : "The expression is already simplified by the available Boolean laws.";
    makeTruthTable(tree,vs);
    makeCircuit(tree,simp.tree);
  }catch(e){
    resultArea.classList.add("hidden");stepsEl.classList.add("hidden");
    errorBox.textContent=e.message;errorBox.classList.remove("hidden");
  }
}

function makeTruthTable(tree,vs){
  const rows=[];
  rows.push(`<tr>${vs.map(v=>`<th>${v}</th>`).join("")}<th>F</th></tr>`);
  const count=Math.pow(2,vs.length);
  for(let i=0;i<count;i++){
    const env={};
    vs.forEach((v,j)=>env[v]=(i>>(vs.length-j-1))&1);
    rows.push(`<tr>${vs.map(v=>`<td>${env[v]}</td>`).join("")}<td><b>${evalTree(tree,env)}</b></td></tr>`);
  }
  tableEl.innerHTML=rows.join("");
}

function makeCircuit(tree,simple){
  const label = str(simple);
  // Clear and draw a readable conceptual gate-level view.
  circuitEl.innerHTML = `<div class="circuit">
    <div class="gate" style="left:35px;top:65px">INPUTS</div>
    <div class="wire" style="left:115px;top:85px;width:150px"></div>
    <div class="gate" style="left:265px;top:58px">${simple.op==="atom"?simple.v:(simple.op==="and"?"AND":"OR")}</div>
    <div class="wire" style="left:355px;top:85px;width:150px"></div>
    <div class="gate" style="left:505px;top:58px">F = ${label}</div>
    <div class="node" style="left:190px;top:73px">•</div>
    <div style="position:absolute;left:35px;top:130px;color:#667085;font-size:13px">
      Simplified expression: <strong>${label}</strong><br>
      Gate type shown for the final operation. For complex expressions, the truth table is the verification source.
    </div>
  </div>`;
}

document.querySelectorAll("[data-expr]").forEach(btn=>btn.addEventListener("click",()=>{expressionInput.value=btn.dataset.expr;analyze()}));
runBtn.addEventListener("click",analyze);
expressionInput.addEventListener("keydown",e=>{if(e.key==="Enter")analyze()});

// Quiz
const quiz=[
  {q:"Which Boolean operation gives 1 only when both inputs are 1?",o:["OR","AND","NOT","XOR"],a:1},
  {q:"What is A + 0 equal to?",o:["0","1","A","A'"],a:2},
  {q:"What is A · A' equal to?",o:["A","1","0","A'"],a:2},
  {q:"Which law says A + A·B = A?",o:["Identity","Absorption","Complement","Associative"],a:1},
  {q:"How many rows are in a truth table for 3 variables?",o:["3","6","8","9"],a:2}
];
let qi=0;
function renderQuiz(){
  const q=quiz[qi];document.getElementById("question").textContent=q.q;
  document.getElementById("quizFeedback").textContent="";
  document.getElementById("options").innerHTML=q.o.map((x,i)=>`<button class="option" data-i="${i}">${x}</button>`).join("");
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.i);
    document.querySelectorAll(".option").forEach(x=>x.disabled=true);
    if(i===q.a){b.classList.add("correct");document.getElementById("quizFeedback").textContent="Correct!";document.getElementById("quizFeedback").style.color="#26834f"}
    else{b.classList.add("wrong");document.querySelectorAll(".option")[q.a].classList.add("correct");document.getElementById("quizFeedback").textContent="Not quite. The highlighted answer is correct.";document.getElementById("quizFeedback").style.color="#b33a46"}
  });
}
document.getElementById("nextQuestion").onclick=()=>{qi=(qi+1)%quiz.length;renderQuiz()};
renderQuiz();
analyze();
