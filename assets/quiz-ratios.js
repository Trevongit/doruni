(function(){
  function gcd(a,b){return b?gcd(b,a%b):Math.abs(a);}
  function parseRatioInput(str){
    if(!str) return null;
    let norm=str.toLowerCase().replace(/\s+/g,'').replace(/to/,':');
    if(!/^\d+:\d+$/.test(norm)) return null;
    let parts=norm.split(':').map(Number);
    if(!Number.isInteger(parts[0])||!Number.isInteger(parts[1])) return null;
    return {a:parts[0],b:parts[1],text:parts[0]+":"+parts[1]};
  }
  function parseIntInput(str){
    const n=Number(str.trim());
    return Number.isInteger(n)?n:null;
  }
  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }
  function buildSimplifyQuestions(){
    const pairs=[[18,12],[50,45],[24,16],[32,24],[40,10],[21,14],[49,35],[27,15],[63,42],[36,24],[45,30],[28,20],[54,24],[30,21],[16,12],[15,10],[81,27],[44,22],[22,11],[48,36]];
    return pairs.map(p=>{
      const g=gcd(p[0],p[1]);
      return {
        type:'simplify',
        prompt:`Simplify ${p[0]}:${p[1]}`,
        data:{a:p[0],b:p[1]},
        hints:[`Both parts divisible by ${g}`,`${p[0]}÷${g} : ${p[1]}÷${g} = ${p[0]/g}:${p[1]/g}`],
        answer:`${p[0]/g}:${p[1]/g}`,
        solution:`gcd(${p[0]},${p[1]}) = ${g}; divide both by ${g} to get ${p[0]/g}:${p[1]/g}`
      };
    });
  }
  function buildMissingQuestions(){
    const bases=[[3,7],[2,5],[4,9],[5,8],[7,9],[3,4],[5,6],[6,11],[4,7],[8,9],[2,3],[5,7]];
    const qs=[];
    bases.forEach((b,i)=>{
      const a=b[0],c=b[1];
      if(i%2===0){
        const scale=2+(i%3);
        const c1=a*scale;
        const ans=c*scale;
        qs.push({
          type:'missing',
          prompt:`${a}:${c} = ${c1}:?`,
          data:{a:a,b:c,c:c1,missing:'d'},
          hints:[`Cross multiply: ${a}×? = ${c}×${c1}`,`? = ${c}×${c1} ÷ ${a}`],
          answer:ans.toString(),
          solution:`${a}×? = ${c}×${c1}; ? = ${c}×${c1} ÷ ${a} = ${ans}`
        });
      } else {
        const s1=2+(i%3);
        const s2=3+(i%2);
        const B=c*s2;
        const C=a*s1;
        const D=c*s1;
        const ans=a*s2;
        qs.push({
          type:'missing',
          prompt:`?:${B} = ${C}:${D}`,
          data:{b:B,c:C,d:D,missing:'a'},
          hints:[`Cross multiply: ?×${D} = ${B}×${C}`,`? = ${B}×${C} ÷ ${D}`],
          answer:ans.toString(),
          solution:`?×${D} = ${B}×${C}; ? = ${B}×${C} ÷ ${D} = ${ans}`
        });
      }
    });
    return qs;
  }
  function buildContextQuestions(){
    const contexts=[
      {a:2,b:5,given:'sugar',givenPart:'a',givenVal:6,target:'flour',unit:'cups'},
      {a:3,b:4,given:'boys',givenPart:'a',givenVal:18,target:'girls',unit:'students'},
      {a:1,b:5,given:'centimetres',givenPart:'a',givenVal:3,target:'kilometres',unit:'km',prompt:`A map scale is 1 cm : 5 km. If the distance on the map is 3 cm, what is the real distance in km?`},
      {a:5,b:3,given:'red paint',givenPart:'a',givenVal:20,target:'blue paint',unit:'litres'},
      {a:4,b:7,given:'apples',givenPart:'a',givenVal:12,target:'oranges',unit:''},
      {a:2,b:3,given:'cats',givenPart:'a',givenVal:8,target:'dogs',unit:''},
      {a:3,b:5,given:'math books',givenPart:'a',givenVal:9,target:'science books',unit:''},
      {a:1,b:2,given:'width',givenPart:'a',givenVal:5,target:'length',unit:'m'}
    ];
    return contexts.map(ctx=>{
      const otherPart = ctx.givenPart==='a'?ctx.b:ctx.a;
      const basePart = ctx.givenPart==='a'?ctx.a:ctx.b;
      const factor = ctx.givenVal/basePart;
      const ans = otherPart*factor;
      const prompt = ctx.prompt || `A recipe uses a ${ctx.given}:${ctx.target} ratio of ${ctx.a}:${ctx.b}. If ${ctx.given} is ${ctx.givenVal} ${ctx.unit||''}, how much ${ctx.target}?`;
      return {
        type:'context',
        prompt:prompt,
        data:{a:ctx.a,b:ctx.b,givenPart:ctx.givenPart,givenVal:ctx.givenVal},
        hints:[`${ctx.given.charAt(0).toUpperCase()+ctx.given.slice(1)} is multiplied by ${factor}`,`${ctx.target.charAt(0).toUpperCase()+ctx.target.slice(1)} = ${otherPart}×${factor} = ${ans}`],
        answer:ans.toString(),
        solution:`${ctx.givenVal} ÷ ${basePart} = ${factor}; ${ctx.target} = ${otherPart}×${factor} = ${ans}`
      };
    });
  }
  const questionPool=[...buildSimplifyQuestions(),...buildMissingQuestions(),...buildContextQuestions()];
  let questions=[],currentIndex=0,userAnswers=[];
  const root=document.getElementById('quiz-root');
  const last=document.getElementById('last-attempt');
  displayLastAttempt();
  renderStart();

  function displayLastAttempt(){
    const data=localStorage.getItem('ratiosLast');
    if(data){
      const obj=JSON.parse(data);
      const d=new Date(obj.date);
      last.textContent=`Last attempt: ${obj.score}/${obj.total} – ${d.toLocaleDateString()}`;
    } else {
      last.textContent='No previous attempts';
    }
  }
  function renderStart(){
    root.innerHTML='<button id="start">Start Quiz</button> <button id="shuffle">Shuffle questions</button>';
    document.getElementById('start').addEventListener('click',()=>startQuiz());
    document.getElementById('shuffle').addEventListener('click',()=>{
      shuffle(questionPool);
    });
  }
  function startQuiz(filter){
    let pool=questionPool.slice();
    if(filter) pool=pool.filter(q=>q.type===filter);
    shuffle(pool);
    questions=pool.slice(0,12);
    currentIndex=0;
    userAnswers=[];
    renderQuestion();
  }
  function renderQuestion(){
    const q=questions[currentIndex];
    root.innerHTML=`<div class="question"><div>${currentIndex+1}/12: ${q.prompt}</div><input id="answer" aria-label="Your answer"/><button id="submit">Check</button><button id="hint">Hint</button><button id="solution">Show solution</button><div id="hint-box" class="hint" aria-live="polite"></div><div id="feedback" class="feedback" aria-live="polite"></div></div>`;
    const answerInput=document.getElementById('answer');
    answerInput.focus();
    answerInput.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
    document.getElementById('submit').addEventListener('click',submit);
    let hintIndex=0;
    document.getElementById('hint').addEventListener('click',()=>{
      if(hintIndex<q.hints.length){document.getElementById('hint-box').textContent=q.hints[hintIndex++];}
    });
    document.getElementById('solution').addEventListener('click',()=>{
      document.getElementById('hint-box').textContent=q.solution;
    });
    function submit(){
      const val=answerInput.value.trim();
      const res=validate(q,val);
      userAnswers.push({q:q,answer:val,correct:res.correct});
      const fb=document.getElementById('feedback');
      fb.textContent=res.message;
      fb.className='feedback '+(res.correct?'correct':'incorrect');
      document.getElementById('submit').disabled=true;
      document.getElementById('hint').disabled=true;
      document.getElementById('solution').disabled=false;
      root.innerHTML+=`<button id="next">Next</button>`;
      document.getElementById('next').addEventListener('click',()=>{
        currentIndex++;
        if(currentIndex<questions.length) renderQuestion();
        else finishQuiz();
      });
    }
  }
  function validate(q,val){
    if(q.type==='simplify'){
      const parsed=parseRatioInput(val);
      if(!parsed) return {correct:false,message:'Whole numbers only'};
      if(parsed.a*q.data.b!==parsed.b*q.data.a) return {correct:false,message:'Incorrect'};
      if(gcd(parsed.a,parsed.b)!==1) return {correct:false,message:'Simplest form required'};
      return {correct:true,message:'Correct'};
    }
    if(q.type==='missing'||q.type==='context'){
      const n=parseIntInput(val);
      if(n===null) return {correct:false,message:'Whole numbers only'};
      if(q.type==='missing'){
        if(q.data.missing==='d'){
          return n*q.data.a===q.data.b*q.data.c?{correct:true,message:'Correct'}:{correct:false,message:'Incorrect'};
        } else {
          return n*q.data.d===q.data.b*q.data.c?{correct:true,message:'Correct'}:{correct:false,message:'Incorrect'};
        }
      }
      if(q.type==='context'){
        const basePart=q.data.givenPart==='a'?q.data.a:q.data.b;
        const otherPart=q.data.givenPart==='a'?q.data.b:q.data.a;
        const factor=q.data.givenVal/basePart;
        const ans=otherPart*factor;
        return n===ans?{correct:true,message:'Correct'}:{correct:false,message:'Incorrect'};
      }
    }
    return {correct:false,message:'Incorrect'};
  }
  function finishQuiz(){
    const correct=userAnswers.filter(a=>a.correct).length;
    localStorage.setItem('ratiosLast',JSON.stringify({score:correct,total:questions.length,date:Date.now()}));
    displayLastAttempt();
    let rows='<table><tr><th>Question</th><th>Your answer</th><th>Correct</th><th></th></tr>';
    userAnswers.forEach((ua)=>{
      rows+=`<tr><td>${ua.q.prompt}</td><td>${ua.answer||''}</td><td>${ua.q.answer}</td><td><button class="retry" data-type="${ua.q.type}">Try similar</button></td></tr>`;
    });
    rows+='</table><button id="retry-wrong">Retry wrong only</button> <button id="restart">Start over</button>';
    root.innerHTML=`<h2>Your score: ${correct}/${questions.length}</h2>`+rows;
    document.querySelectorAll('.retry').forEach(btn=>btn.addEventListener('click',()=>startQuiz(btn.dataset.type)));
    document.getElementById('restart').addEventListener('click',renderStart);
    document.getElementById('retry-wrong').addEventListener('click',()=>{
      const wrong=userAnswers.filter(a=>!a.correct).map(a=>a.q);
      if(wrong.length===0){startQuiz();return;}
      questions=shuffle(wrong);
      currentIndex=0;
      userAnswers=[];
      renderQuestion();
    });
  } 
})();

(function(){
  const panel=document.getElementById('calc-panel');
  const toggle=document.getElementById('calc-toggle');
  if(!panel||!toggle) return;

  panel.innerHTML=`<section id="calculator" role="dialog" aria-modal="true"><button id="calc-close" aria-label="Close calculator">×</button><div id="calc-display"><div class="expr"></div><div class="res" role="status" aria-live="polite"></div></div><div id="calc-buttons"><button data-key="7" aria-label="7">7</button><button data-key="8" aria-label="8">8</button><button data-key="9" aria-label="9">9</button><button data-key="/" aria-label="divide">÷</button><button data-key="4" aria-label="4">4</button><button data-key="5" aria-label="5">5</button><button data-key="6" aria-label="6">6</button><button data-key="*" aria-label="multiply">×</button><button data-key="1" aria-label="1">1</button><button data-key="2" aria-label="2">2</button><button data-key="3" aria-label="3">3</button><button data-key="-" aria-label="subtract">−</button><button data-key="0" aria-label="0">0</button><button data-key="." aria-label="decimal point">.</button><button data-key="%" aria-label="percent">%</button><button data-key="+" aria-label="add">+</button><button data-key="(" aria-label="left parenthesis">(</button><button data-key=")" aria-label="right parenthesis">)</button><button data-key="C" aria-label="clear">C</button><button data-key="⌫" aria-label="backspace">⌫</button><button data-key="=" aria-label="equals">=</button><button data-key="paste" id="paste-answer" aria-label="paste result to answer">Paste to answer</button></div></section>`;

  const exprEl=panel.querySelector('.expr');
  const resEl=panel.querySelector('.res');
  let expr='';
  let lastFocused=null;

  function updateDisplay(){
    exprEl.textContent=expr.replace(/\*/g,'×').replace(/\//g,'÷');
  }
  function clear(){expr='';resEl.textContent='';updateDisplay();}
  function backspace(){expr=expr.slice(0,-1);updateDisplay();}
  function append(ch){expr+=ch;updateDisplay();}
  function evaluate(){
    const val=safeEval(expr);
    if(val===null){resEl.textContent='Invalid expression';return null;}
    const r=Math.round(val*1e6)/1e6;
    resEl.textContent=r.toString();
    return r;
  }
  function paste(){
    const result=evaluate();
    if(result===null) return;
    const input=document.querySelector('#quiz-root input');
    if(input){input.value=result;input.focus();}
  }
  function safeEval(str){
    if(!/^[0-9+\-*/().%\s]+$/.test(str)) return null;
    if(/([+\-*/%.]{2,})|(^[*/%])|([+\-*/%]$)|([0-9]\s+[0-9])/.test(str)) return null;
    try{
      const sanitized=str.replace(/%/g,'/100');
      const r=Function('"use strict";return ('+sanitized+')')();
      return (typeof r==='number'&&isFinite(r))?r:null;
    }catch(e){return null;}
  }
  function handleInput(key){
    if(key==='C'){clear();return;}
    if(key==='⌫'){backspace();return;}
    if(key==='='){evaluate();return;}
    if(key==='paste'){paste();return;}
    append(key);
  }
  panel.querySelectorAll('#calc-buttons button').forEach(btn=>{
    btn.addEventListener('click',()=>handleInput(btn.dataset.key));
  });

  function handleKeyboard(e){
    const k=e.key;
    if(k==='Escape'){close();return;}
    if(k==='Enter'){e.preventDefault();evaluate();return;}
    if(k==='Backspace'){e.preventDefault();backspace();return;}
    if(/[0-9+\-*/().%]/.test(k)){e.preventDefault();append(k);}
  }

  function open(){
    if(!panel.hasAttribute('hidden')) return;
    lastFocused=document.activeElement;
    panel.removeAttribute('hidden');
    panel.classList.add('open');
    document.addEventListener('keydown',handleKeyboard);
    trapFocus();
    const first=panel.querySelector('button');
    if(first) first.focus();
    toggle.setAttribute('aria-expanded','true');
  }
  function close(){
    panel.classList.remove('open');
    panel.setAttribute('hidden','');
    document.removeEventListener('keydown',handleKeyboard);
    releaseFocus();
    toggle.setAttribute('aria-expanded','false');
    if(lastFocused) lastFocused.focus();
  }
  toggle.addEventListener('click',()=>{panel.hasAttribute('hidden')?open():close();});
  panel.querySelector('#calc-close').addEventListener('click',close);

  function trapFocus(){
    const focusable=panel.querySelectorAll('button, [tabindex]');
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    panel.addEventListener('keydown',focusTrap);
    function focusTrap(e){
      if(e.key!=='Tab') return;
      if(e.shiftKey){
        if(document.activeElement===first){e.preventDefault();last.focus();}
      } else {
        if(document.activeElement===last){e.preventDefault();first.focus();}
      }
    }
    panel._focusTrap=focusTrap;
  }
  function releaseFocus(){
    panel.removeEventListener('keydown',panel._focusTrap);
    delete panel._focusTrap;
  }
})();
