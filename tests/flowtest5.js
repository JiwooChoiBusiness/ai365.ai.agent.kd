const {JSDOM}=require('jsdom');
const html=require('fs').readFileSync('mockup/knowledge-agent-v2.html','utf8');
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window,E=s=>w.eval(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log("FAIL:",m);}};
(async()=>{
await sleep(120);
// 설정 화면 신규 그룹 렌더
E("openSettings()");
let m=w.document.getElementById("modalroot").innerHTML;
ok(m.indexOf("폴더 매칭 신뢰도 임계값")>=0,"policy: folder threshold");
ok(m.indexOf("알림 채널")>=0&&m.indexOf("kb-admin@ai365.example")>=0,"policy: notify");
E("switchMTab('sources')");
m=w.document.getElementById("modalroot").innerHTML;
ok(m.indexOf("조직 도메인 설명")>=0&&m.indexOf("관련성 판정")>=0,"sources: domain desc");
ok(m.indexOf("수집 키워드")>=0&&m.indexOf("히트펌프")>=0,"sources: keywords");
E("closeSettings()");
// R15: CC 문서 법무 확정 → staged → 유예 만료 강제 → 자동 업로드 '보류'되는가
E("legalConfirm('CC-BY-NC-4.0')");
await sleep(150);
const cc="DB.docs.find(d=>d.catalogId==='CC-BY-NC-4.0')";
ok(E(cc+".state")==="staged"&&E(cc+".folderConf")===68,"CC staged with low folderConf");
E(cc+".stagedUntil=Date.now()-1");
await sleep(1300);
ok(E(cc+".state")==="staged","R15: auto-upload held (still staged)");
ok(E("DB.audit.some(a=>a.move.indexOf('자동 업로드 보류')>=0)"),"R15 hold audited");
// 스테이징 카드 플래그 표시
E("setView('staging')");
ok(w.document.getElementById("view").innerHTML.indexOf("자동 업로드 보류")>=0,"staging card R15 chip");
// 체크리스트에서 폴더 행이 ✕로 표시되지만 사람 확정은 가능
E("openUploadConfirm("+cc+".id)");
const dd=w.document.getElementById("dlgroot").innerHTML;
ok(dd.indexOf("폴더 매칭")>=0&&dd.indexOf("직접 확인하셨습니까")>=0,"checklist dynamic folder row");
E("dialog.ack=true");E("confirmUpload()");
ok(E(cc+".state")==="uploaded","human confirm overrides R15 hold");
// 임계 하향 시 다른 staged는 자동 업로드 유지 (seed staged folderConf 94)
ok(E("DB.docs.filter(d=>d.state==='staged').length")<=1,"seed staged unaffected");
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
})().catch(e=>{console.error("ERROR:",e.stack);process.exit(1)});
