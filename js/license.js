;(function(){
    'use strict';
    const _K='cf_lic_v1',_I=604800000;
    function _h(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0}return Math.abs(h).toString(36)}
    function _d(){try{return location.hostname.replace(/^www\./,'')}catch(e){return'localhost'}}
    function _loc(){const h=_d();return h==='localhost'||h==='127.0.0.1'||h===''||h.endsWith('.local')||h.endsWith('.test')}
    function _gs(){try{const r=localStorage.getItem(_K);return r?JSON.parse(atob(r)):null}catch(e){return null}}
    function _ss(d){try{localStorage.setItem(_K,btoa(JSON.stringify(d)))}catch(e){}}
    function _cs(){try{localStorage.removeItem(_K)}catch(e){}}
    async function _vs(code){
        const ep=CHROMAFORGE_CONFIG.VERIFY_ENDPOINT||'server/verify.php';
        try{const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({purchase_code:code,domain:_d(),product_id:'chromaforge-ai'})});if(!r.ok)return{valid:false,error:'Server error'};return await r.json()}catch(e){return{valid:true,offline:true}}
    }
    async function check(){
        const C=typeof CHROMAFORGE_CONFIG!=='undefined'?CHROMAFORGE_CONFIG:{};
        const key=C.LICENSE_KEY||'',ld=C.LICENSED_DOMAIN||'';
        if(_loc())return{valid:true,type:'dev'};
        if(!key||key==='YOUR_PURCHASE_CODE_HERE')return{valid:false,type:'missing',message:'Purchase code not configured. Open js/config.js and set your LICENSE_KEY.'};
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))return{valid:false,type:'invalid',message:'Invalid purchase code format.'};
        if(ld&&_d()!==ld.replace(/^www\./,''))return{valid:false,type:'domain',message:'License not valid for this domain.'};
        const st=_gs();
        if(st&&st.k===_h(key)&&(Date.now()-st.t)<_I)return{valid:true,type:'cached'};
        const r=await _vs(key);
        if(r.valid){_ss({k:_h(key),d:_d(),t:Date.now()});return{valid:true,type:'verified'}}
        return{valid:false,type:'invalid',message:r.error||'Invalid license.'};
    }
    function showModal(msg){
        if(document.getElementById('cf-lic-modal'))return;
        const m=document.createElement('div');m.id='cf-lic-modal';
        m.innerHTML=`<div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);padding:20px"><div style="background:#16161a;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;max-width:440px;width:100%;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,0.5)"><div style="width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#ec4899);display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" opacity="0.3"/><path d="M3 17l9 5 9-5M3 12l9 5 9-5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div><h2 style="font-family:system-ui;font-size:22px;font-weight:800;color:white;margin-bottom:8px">License Activation</h2><p style="font-family:system-ui;font-size:13px;color:#94a3b8;margin-bottom:24px;line-height:1.6">${msg||'Enter your Envato purchase code to activate.'}</p><input type="text" id="cf-lic-inp" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-family:monospace;font-size:13px;text-align:center;margin-bottom:12px;outline:none"><button onclick="window._cfAct()" id="cf-lic-btn" style="width:100%;padding:12px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;font-family:system-ui;font-size:14px;font-weight:700;border:none;cursor:pointer;margin-bottom:16px">Activate License</button><p id="cf-lic-err" style="font-family:system-ui;font-size:11px;color:#f87171;display:none;margin-bottom:12px"></p><div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px"><p style="font-family:system-ui;font-size:10px;color:#475569;line-height:1.6">Find your code at: <a href="https://codecanyon.net/downloads" target="_blank" style="color:#6366f1">codecanyon.net</a> → Downloads → License Certificate</p></div></div></div>`;
        document.body.appendChild(m);
    }
    window._cfAct=async function(){
        const inp=document.getElementById('cf-lic-inp'),btn=document.getElementById('cf-lic-btn'),err=document.getElementById('cf-lic-err');
        const code=(inp?.value||'').trim();
        if(!code){err.textContent='Enter your purchase code';err.style.display='block';return}
        btn.textContent='Verifying...';btn.disabled=true;err.style.display='none';
        try{const r=await _vs(code);if(r.valid){_ss({k:_h(code),d:_d(),t:Date.now()});const m=document.getElementById('cf-lic-modal');if(m)m.remove();setTimeout(()=>location.reload(),500)}else{err.textContent=r.error||'Invalid code.';err.style.display='block'}}catch(e){err.textContent='Verification failed.';err.style.display='block'}
        btn.textContent='Activate License';btn.disabled=false;
    };
    window._cfDeactivate=function(){_cs();location.reload()};
    window._cfLicenseReady=new Promise(async resolve=>{const r=await check();if(!r.valid){showModal(r.message);resolve(false)}else{resolve(true)}});
    window.CFLicense={check,deactivate:window._cfDeactivate,isActive:()=>{const s=_gs();return!!s&&!!s.k}};
})();
