'use strict';
function seedState(){
  const st={today:'2026-09-04',user:CEO,strict:false,theme:'light',procs:[],tasks:[],audit:[],seq:{BSD:7,BR:21,SS:6,VH:12,EG:0},dn:0};
  S=st;
  let dn=0;
  const dc=(p,rows)=>rows.forEach(r=>{p.docs.push({id:'d'+(++dn),key:r[0],ver:r[1],name:r[2],size:r[5]||Math.round(40+Math.random()*900)*1024,by:r[3],ts:r[4],bid:r[6],note:'',content:r[7]||''});});
  const B=(id,name,email,st_,o)=>Object.assign({id,name,email,type:'Céges',isNew:false,status:st_,invited:null,recv:null,sender:'',msgId:'',late:false,formal:null,tech:null,price:null,pay:null,lead:null,warr:null,note:''},o||{});
  const base=o=>Object.assign({docs:[],bidders:[],appr:{},f:{},due:{},mail:[],ifs:false,maint:false,it:false,prepay:false,owner:SCM,round:1,closed:null,nego:null,bidDeadline:null,contractType:null,reclass:false,vhDate:null},o);
  const ap=(by,ts)=>({req:{by,ts},decisions:[]});
  const dec=(a,by,dc_,ts,ver,c)=>a.decisions.push({by,dec:dc_,ts,ver,c:c||''});
  const F=(by,ts,note)=>({by,ts,note:note||''});

  /* --- BSD-2026/003 --- */
  const p3=base({id:'BSD-2026/003',subject:'Csányi új PET palackozó gépsor',org:'Csány – termelés',cc:'1255BS3400',value:3250000000,cat:'CAPEX',proc:'Tender',requester:'Szilágyi László',stage:4,created:'2026-07-06',desired:'2027-03-31',due:{4:'2026-09-08'},bidDeadline:'2026-08-21'});
  p3.bidders=[B('b1','Krones Hungária Kft.','sales@krones-hu.example','beérkezett',{recv:'2026-08-20 15:41',sender:'sales@krones-hu.example',msgId:'<7f2a91@krones-hu.example>',formal:true,tech:88,price:3420000000,pay:60,lead:34,warr:24}),
    B('b2','KHS Packaging GmbH','offer@khs.example','beérkezett',{recv:'2026-08-21 09:12',sender:'offer@khs.example',msgId:'<c1d044@khs.example>',formal:true,tech:82,price:3610000000,pay:45,lead:38,warr:24}),
    B('b3','Sidel Central Europe Kft.','tender@sidel.example','beérkezett',{recv:'2026-08-21 11:03',sender:'tender@sidel.example',msgId:'<93bb12@sidel.example>',formal:true,tech:79,price:3780000000,pay:30,lead:32,warr:36}),
    B('b4','Sacmi Hungary Kft.','info@sacmi.example','lemondó',{recv:'2026-08-14 10:00',note:'Kapacitáshiány miatt nem ad ajánlatot.'})];
  dc(p3,[['spec',1,'Igeny_palackozo_gepsor_v1.docx',p3.requester,'2026-07-06 09:30'],['bsd',1,'BSD_BSD-2026-003_v1.docx',SCM,'2026-07-20 11:00'],['rfq',1,'RFQ_palackozo_gepsor.docx',SCM,'2026-07-21 09:40'],['qty',1,'Mennyiseg_utemterv.xlsx',SCM,'2026-07-21 09:41'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-07-21 09:42'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-07-21 09:43'],['contractDraft',1,'Szerzodes_tervezet_gepsor.docx',SCM,'2026-07-22 14:10'],['nda',1,'Titoktartasi_nyilatkozat.pdf',ADM,'2026-07-22 14:20'],
    ['bid',1,'Krones_ajanlat.pdf',ADM,'2026-08-20 15:41',null,'b1'],['bid',1,'KHS_ajanlat.pdf',ADM,'2026-08-21 09:12',null,'b2'],['bid',1,'Sidel_ajanlat.pdf',ADM,'2026-08-21 11:03',null,'b3'],['bid',1,'Sacmi_lemondo_nyilatkozat.pdf',ADM,'2026-08-14 10:00',null,'b4'],
    ['opening',1,'Bontasi_jegyzokonyv_BSD-2026-003.docx',ADM,'2026-08-21 14:00'],['matrix',1,'Kiertekelesi_matrix_BSD-2026-003.xlsx',SCM,'2026-09-02 15:50'],
    ['tco',1,'TCO_kalkulacio_v1.xlsx',CFO,'2026-08-28 10:00'],['tco',2,'TCO_kalkulacio_v2.xlsx',CFO,'2026-09-01 09:30'],['tco',3,'TCO_kalkulacio_v3.xlsx',CFO,'2026-09-03 10:21'],
    ['nego',1,'Targyalasi_jegyzokonyv.docx',SCM,'2026-09-03 12:00'],['revised',1,'Krones_modositott_ajanlat.pdf',SCM,'2026-09-03 13:45'],['ssd',1,'SSD-2026-003_tervezet.docx',SCM,'2026-09-02 17:00'],['ssd',2,'SSD-2026-003_tervezet.docx',SCM,'2026-09-03 16:12']]);
  p3.appr.igeny=ap(p3.requester,'2026-07-07 08:00');dec(p3.appr.igeny,CEO,'approve','2026-07-08 10:05',1);dec(p3.appr.igeny,SCM,'approve','2026-07-08 10:40',1);
  p3.appr.tender=ap(SCM,'2026-07-27 09:00');dec(p3.appr.tender,CEO,'approve','2026-07-28 08:50',1);dec(p3.appr.tender,CFO,'approve','2026-07-28 09:15',1);
  p3.appr.ssd=ap(SCM,'2026-09-03 16:20');
  p3.f={strategy:F(SCM,'2026-07-18 10:00'),sent:{by:SCM,ts:'2026-07-29 10:00',to:['Krones Hungária Kft.','KHS Packaging GmbH','Sidel Central Europe Kft.','Sacmi Hungary Kft.']},opened:F(ADM,'2026-08-21 14:00'),commDone:F(SCM,'2026-09-02 15:48','3 érvényes ajánlat'),ndaSigned:F(ADM,'2026-08-21 13:30')};
  p3.nego={winner:'b1',winnerName:'Krones Hungária Kft.',initial:3420000000,final:3250000000,rebate:0,saving:170000000,isNew:false,note:'Ártárgyalás után módosított írásos ajánlat.',ts:'2026-09-03 12:00',by:SCM};
  p3.tcoData={c0:3250000000,k:210000000,n:12,r:.09,res:400000000,result:4632000000};

  /* --- BSD-2026/007 --- */
  const p7=base({id:'BSD-2026/007',subject:'2027. évi PET preform keretszerződés',org:'HQ – Supply Chain',cc:'1255BS1400',value:1150000000,cat:'Direkt',proc:'Tender',ifs:true,prepay:true,requester:SCM,stage:2,created:'2026-08-10',desired:'2027-01-02',due:{2:'2026-09-05'}});
  p7.bidders=[B('b1','Retal Hungary Kft.','sales@retal.example','meghívva'),B('b2','Resilux Central Europe Kft.','tender@resilux.example','meghívva'),B('b3','Alpla Hungary Kft.','offer@alpla.example','meghívva'),B('b4','Indorama Ventures Poland','bids@indorama.example','meghívva',{isNew:true})];
  dc(p7,[['spec',1,'Igeny_preform_2027.docx',SCM,'2026-08-10 09:00'],['bsd',1,'BSD_BSD-2026-007_v1.docx',SCM,'2026-08-24 11:02'],['bsd',2,'BSD_BSD-2026-007_v2.docx',SCM,'2026-09-02 16:40'],['rfq',1,'RFQ_preform.docx',SCM,'2026-08-25 10:00'],['qty',1,'Mennyiseg_utemterv.xlsx',SCM,'2026-08-25 10:05'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-25 10:06'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-25 10:07'],['contractDraft',1,'FCO_tervezet_preform.docx',SCM,'2026-08-27 15:00'],['nda',1,'Titoktartasi_nyilatkozat.pdf',ADM,'2026-08-27 15:10'],['ifsReq',1,'IFS_kovetelmenyek_preform.pdf',MI,'2026-08-26 09:00'],['msds',1,'DoC_preform_EU10-2011.pdf',MI,'2026-08-26 09:10'],['supplierForm',1,'Beszallitoi_adatlap_Indorama.docx',SCM,'2026-08-28 12:00']]);
  p7.appr.igeny=ap(SCM,'2026-08-10 09:10');dec(p7.appr.igeny,CEO,'approve','2026-08-11 08:00',1);dec(p7.appr.igeny,SCM,'approve','2026-08-10 09:20',1);
  p7.appr.tender=ap(SCM,'2026-09-03 13:30');dec(p7.appr.tender,CFO,'approve','2026-09-04 08:27',2);
  p7.f={strategy:F(SCM,'2026-08-20 10:00'),ifsRisk:F(MI,'2026-08-24 14:00')};

  /* --- BR-2026/021 --- */
  const p21=base({id:'BR-2026/021',subject:'Somogyvári rágcsálómentesítési szolgáltatás',org:'Somogyvár – termelés',cc:'1255BS2400',value:12800000,cat:'Indirekt',proc:'Tender',ifs:true,requester:'Klujber László',stage:3,created:'2026-08-18',desired:'2026-11-01',due:{3:'2026-09-11'},bidDeadline:'2026-09-11'});
  p21.bidders=[B('b1','Bábolna Bio Kft.','ajanlat@babolnabio.example','beérkezett',{invited:'2026-08-31 10:15',recv:'2026-09-03 09:22',sender:'ajanlat@babolnabio.example',msgId:'<5e10ad@babolnabio.example>'}),B('b2','Rentokil Hungária Kft.','tender@rentokil.example','meghívva',{invited:'2026-08-31 10:15'}),B('b3','Pest Control Somogy Kft.','iroda@pcsomogy.example','meghívva',{invited:'2026-08-31 10:15'})];
  dc(p21,[['spec',1,'Igeny_racsalomentesites.docx','Klujber László','2026-08-18 09:00'],['rfq',1,'RFQ_racsalomentesites.docx',SCM,'2026-08-24 10:00'],['qty',1,'Szolgaltatasi_terv.xlsx',SCM,'2026-08-24 10:02'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-24 10:03'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-24 10:04'],['ifsReq',1,'IFS_szolgaltato_kovetelmenyek.pdf',MI,'2026-08-24 10:30'],['bid',1,'Babolna_Bio_ajanlat.pdf',ADM,'2026-09-03 09:22',null,'b1']]);
  p21.appr.igeny=ap('Klujber László','2026-08-18 09:10');dec(p21.appr.igeny,CEO,'approve','2026-08-19 08:30',1);
  p21.appr.tender=ap(SCM,'2026-08-28 09:00');dec(p21.appr.tender,CEO,'approve','2026-08-28 15:00',1);dec(p21.appr.tender,CFO,'approve','2026-08-29 08:10',1);
  p21.f={strategy:F(SCM,'2026-08-24 09:00'),ifsRisk:F(MI,'2026-08-24 11:00'),sent:{by:SCM,ts:'2026-08-31 10:15',to:p21.bidders.map(b=>b.name)}};
  p21.mail=[{dir:'out',ts:'2026-08-31 10:15',from:'arajanlat@fonteviva.hu',to:p21.bidders.map(b=>b.email).join(', '),subj:'Ajánlatkérés – Somogyvári rágcsálómentesítési szolgáltatás (BR-2026/021)',body:'Tisztelt Partnerünk! Mellékelten küldjük ajánlatkérésünket. Ajánlattételi határidő: 2026. 09. 11.',att:['RFQ_racsalomentesites.docx','Szolgaltatasi_terv.xlsx','Arazasi_struktura.xlsx']},{dir:'in',ts:'2026-09-03 09:22',from:'ajanlat@babolnabio.example',to:'arajanlat@fonteviva.hu',subj:'RE: Ajánlatkérés – BR-2026/021',body:'',att:['Babolna_Bio_ajanlat.pdf'],bid:'b1'}];

  /* --- BR-2026/019 --- */
  const p19=base({id:'BR-2026/019',subject:'Rámpa kültéri üzemi kijelzők',org:'Somogyvár – termelés',cc:'1255BS2400',value:6200000,cat:'Indirekt',proc:'Tender',requester:'Klujber László',stage:3,created:'2026-08-05',desired:'2026-10-15',due:{3:'2026-09-09'},bidDeadline:'2026-08-31'});
  p19.bidders=[B('b1','LED-Tech Hungary Kft.','sales@ledtech.example','beérkezett',{invited:'2026-08-20 09:00',recv:'2026-08-28 10:10',sender:'sales@ledtech.example',msgId:'<a88c01@ledtech.example>',formal:true,tech:84,price:5840000,pay:30,lead:6,warr:24}),B('b2','Signum Display Zrt.','info@signum.example','beérkezett',{invited:'2026-08-20 09:00',recv:'2026-08-31 08:45',sender:'info@signum.example',msgId:'<11f9be@signum.example>',formal:true,tech:78,price:6190000,pay:45,lead:4,warr:36}),B('b3','Display Partner Kft.','iroda@displaypartner.example','lemondó',{invited:'2026-08-20 09:00',recv:'2026-08-27 14:00',note:'Nem ad ajánlatot.'})];
  dc(p19,[['spec',1,'Igeny_kijelzok.docx','Klujber László','2026-08-05 09:00'],['rfq',1,'RFQ_kijelzok.docx',SCM,'2026-08-19 10:00'],['qty',1,'Mennyiseg.xlsx',SCM,'2026-08-19 10:01'],['pricing',1,'Arazasi_struktura.xlsx',SCM,'2026-08-19 10:02'],['matrixTpl',1,'Kiertekelesi_matrix_sablon.xlsx',SCM,'2026-08-19 10:03'],['bid',1,'LEDTech_ajanlat.pdf',ADM,'2026-08-28 10:10',null,'b1'],['bid',1,'Signum_ajanlat.pdf',ADM,'2026-08-31 08:45',null,'b2'],['bid',1,'DisplayPartner_lemondo.pdf',ADM,'2026-08-27 14:00',null,'b3'],['opening',1,'Bontasi_jegyzokonyv_BR-2026-019.docx',ADM,'2026-09-01 10:00']]);
  p19.appr.igeny=ap('Klujber László','2026-08-05 09:10');dec(p19.appr.igeny,CEO,'approve','2026-08-06 08:00',1);
  p19.appr.tender=ap(SCM,'2026-08-18 09:00');dec(p19.appr.tender,CEO,'approve','2026-08-18 15:00',1);dec(p19.appr.tender,CFO,'approve','2026-08-19 08:00',1);
  p19.f={strategy:F(SCM,'2026-08-18 08:00'),sent:{by:SCM,ts:'2026-08-20 09:00',to:p19.bidders.map(b=>b.name)},opened:F(ADM,'2026-09-01 10:00')};

  /* --- SS-2026/006 (lezárt) --- */
  const p6=base({id:'SS-2026/006',subject:'KHS kupakzáró egyedi hajtóműalkatrész',org:'Somogyvár – karbantartás',cc:'1255BS2300',value:1700000,cat:'OPEX',proc:'SS',maint:true,requester:'Klujber László',stage:6,created:'2026-07-20',desired:'2026-08-28',due:{6:'2026-08-28'},closed:{ts:'2026-08-28 14:10',by:SCM,failed:false}});
  p6.bidders=[B('b1','KHS Packaging GmbH','service@khs.example','beérkezett',{formal:true,price:1700000,recv:'2026-07-22 10:00'})];
  dc(p6,[['spec',1,'Igeny_hajtomualkatresz.docx','Klujber László','2026-07-20 09:00'],['ssForm',1,'SS_indoklas_hajtomualkatresz.docx',SCM,'2026-07-21 10:00'],['ssd',1,'SSD-2026-006.docx',SCM,'2026-07-24 11:00'],['contractFinal',1,'PO_tervezet.docx',SCM,'2026-07-25 09:00'],['contractSigned',1,'PO_alairt.pdf',SCM,'2026-07-27 15:00'],['po',1,'PO_4500018831.pdf',SCM,'2026-07-27 15:30'],['perfCert',1,'Teljesitesigazolas.pdf','Klujber László','2026-08-26 10:00'],['invoice',1,'Szamla_2026-8841.pdf',PENZ,'2026-08-27 09:00']]);
  p6.appr.igeny=ap('Klujber László','2026-07-20 09:10');dec(p6.appr.igeny,CEO,'approve','2026-07-20 12:00',1);
  p6.appr.ss=ap(SCM,'2026-07-21 10:10');dec(p6.appr.ss,CEO,'approve','2026-07-21 14:00',1);
  p6.appr.ssd=ap(SCM,'2026-07-24 11:10');dec(p6.appr.ssd,CEO,'approve','2026-07-24 16:00',1);
  p6.appr.sign=ap(SCM,'2026-07-25 09:10');dec(p6.appr.sign,CEO,'approve','2026-07-26 09:00',1);dec(p6.appr.sign,CFO,'approve','2026-07-26 10:00',1);
  p6.contractType='PO';p6.f={strategy:F(SCM,'2026-07-21 09:00'),mdm:F(MDM,'2026-07-27 12:00'),po:F(SCM,'2026-07-27 15:30','4500018831'),goods:F(RAKT,'2026-08-25 13:00'),invoice:F(PENZ,'2026-08-27 09:10')};
  p6.nego={winner:'b1',winnerName:'KHS Packaging GmbH',initial:1700000,final:1700000,rebate:0,saving:0,isNew:false,note:'',ts:'2026-07-23 10:00',by:SCM};

  /* --- VH-2026/012 --- */
  const p12=base({id:'VH-2026/012',subject:'Csányi kompresszor sürgősségi javítása',org:'Csány – karbantartás',cc:'1255BS3300',value:4800000,cat:'OPEX',proc:'Vészhelyzeti',maint:true,requester:'Szilágyi László',stage:6,created:'2026-08-28',desired:'2026-09-04',vhDate:'2026-08-28',due:{6:'2026-09-04'}});
  p12.bidders=[B('b1','Atlas Copco Kompresszor Kft.','service@atlas.example','beérkezett',{recv:'2026-08-28 09:30',formal:true,price:4800000,invited:'2026-08-28 08:50'})];
  dc(p12,[['vhReason',1,'Veszhelyzeti_indoklas_kompresszor.docx','Szilágyi László','2026-08-28 08:40'],['po',1,'PO_utolagos_kompresszor.pdf',SCM,'2026-08-28 12:00'],['bid',1,'Atlas_ajanlat.pdf',SCM,'2026-08-28 09:30',null,'b1']]);
  p12.appr.vh=ap('Szilágyi László','2026-08-28 08:45');dec(p12.appr.vh,CEO,'approve','2026-08-28 09:00',1,'Szóbeli jóváhagyás, utólagos írásos megerősítéssel.');
  p12.f={};

  st.procs=[p3,p7,p21,p19,p12,p6];
  st.procs.sort((a,b)=>['BSD-2026/003','BSD-2026/007','BR-2026/021','BR-2026/019','SS-2026/006','VH-2026/012'].indexOf(a.id)-['BSD-2026/003','BSD-2026/007','BR-2026/021','BR-2026/019','SS-2026/006','VH-2026/012'].indexOf(b.id));
  st.dn=dn;

  st.tasks=[
   {id:'t1',pid:'BSD-2026/003',title:'Kiemelt SSD előzetes átnézése',desc:'A tárgyalási megtakarítás és a TCO-eredmény ellenőrzése a jóváhagyás előtt.',owner:CEO,by:SCM,due:'2026-09-07',done:null},
   {id:'t2',pid:'VH-2026/012',title:'Vészhelyzeti jegyzőkönyv (6. melléklet) elkészítése',desc:'Az 5 munkanapos határidő ma jár le. Csatolni: PO, ajánlat, SS indoklás.',owner:SCM,by:CEO,due:'2026-09-04',done:null},
   {id:'t3',pid:'BR-2026/021',title:'Zárt postafiók megnyitásának előkészítése',desc:'Az ajánlatbontás időpontjának egyeztetése az adminisztrátorral és az igénylővel.',owner:ADM,by:SCM,due:'2026-09-11',done:null},
   {id:'t4',pid:'BSD-2026/007',title:'Költségkeret előzetes ellenőrzése',desc:'Az előrevásárlási keret és az előleg cash flow hatása.',owner:PENZ,by:SCM,due:'2026-09-05',done:null},
   {id:'t5',pid:'BR-2026/019',title:'Műszaki értékelés lezárása',desc:'Mindkét érvényes ajánlat pontozása.',owner:'Klujber László',by:SCM,due:'2026-09-02',done:'2026-09-02 13:50'}];

  /* --- audit seed --- */
  const A=[
   ['2026-07-06 09:12','Szilágyi László','BSD-2026/003','Létrehozás','Beszerzés létrehozva','Csányi új PET palackozó gépsor · CAPEX · 3 250 000 000 Ft · besorolás: Kiemelt'],
   ['2026-07-08 10:40','Sándor Dávid','BSD-2026/003','Jóváhagyás','Beszerzési igény jóváhagyva','Haász Róbert, Sándor Dávid · Specifikáció v1'],
   ['2026-07-09 08:00','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC1 → PROC2'],
   ['2026-07-28 09:15','Török András','BSD-2026/003','Jóváhagyás','Tenderkiírás jóváhagyva','CEO + CFO · BSD v1'],
   ['2026-07-29 10:00','Sándor Dávid','BSD-2026/003','Levelezés','Tender kiküldve','arajanlat@fonteviva.hu · 4 címzett · határidő: 2026. 08. 21.'],
   ['2026-07-29 10:01','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC2 → PROC3'],
   ['2026-08-21 14:00','Kovács Eszter','BSD-2026/003','Ajánlat','Ajánlatbontás','Bontási jegyzőkönyv · 3 érvényes ajánlat, 1 lemondó nyilatkozat'],
   ['2026-09-02 15:48','Sándor Dávid','BSD-2026/003','Értékelés','Kereskedelmi értékelés lezárva','Három formailag érvényes ajánlat rangsorolva.'],
   ['2026-09-02 15:49','Sándor Dávid','BSD-2026/003','Státusz','Státuszváltás','PROC3 → PROC4'],
   ['2026-09-03 10:21','Török András','BSD-2026/003','Dokumentum','TCO-kalkuláció frissítve','TCO_kalkulacio_v3.xlsx · v3'],
   ['2026-09-03 16:12','Sándor Dávid','BSD-2026/003','Dokumentum','SSD-tervezet feltöltve','SSD-2026-003_tervezet.docx · v2'],
   ['2026-09-03 16:20','Sándor Dávid','BSD-2026/003','Jóváhagyás','Jóváhagyás elindítva','SSD · CEO + CFO együttes döntés szükséges.'],
   ['2026-08-10 09:00','Sándor Dávid','BSD-2026/007','Létrehozás','Beszerzés létrehozva','2027. évi PET preform keretszerződés · Direkt · IFS-kritikus · 1 150 000 000 Ft'],
   ['2026-08-11 08:00','Haász Róbert','BSD-2026/007','Jóváhagyás','Beszerzési igény jóváhagyva','Specifikáció v1'],
   ['2026-09-02 16:40','Sándor Dávid','BSD-2026/007','Dokumentum','BSD feltöltve','BSD_BSD-2026-007_v2.docx · v2'],
   ['2026-09-03 13:30','Sándor Dávid','BSD-2026/007','Jóváhagyás','Jóváhagyás elindítva','CEO + CFO együttes döntés szükséges.'],
   ['2026-09-04 08:27','Török András','BSD-2026/007','Jóváhagyás','Tenderkiírás jóváhagyva','CFO-jóváhagyás · BSD v2'],
   ['2026-08-18 09:00','Klujber László','BR-2026/021','Létrehozás','Beszerzés létrehozva','Somogyvári rágcsálómentesítési szolgáltatás · Indirekt · IFS · 12 800 000 Ft · Egyszerű'],
   ['2026-08-31 10:15','Sándor Dávid','BR-2026/021','Levelezés','Tender kiküldve','arajanlat@fonteviva.hu · 3 címzett · határidő: 2026. 09. 11.'],
   ['2026-09-03 09:22','Kovács Eszter','BR-2026/021','Ajánlat','Ajánlat beérkezett','Bábolna Bio Kft. · formailag megfelelő.'],
   ['2026-08-05 09:00','Klujber László','BR-2026/019','Létrehozás','Beszerzés létrehozva','Rámpa kültéri üzemi kijelzők · Indirekt · 6 200 000 Ft · Egyszerű'],
   ['2026-09-01 10:00','Kovács Eszter','BR-2026/019','Ajánlat','Ajánlatbontás','Bontási jegyzőkönyv · 2 érvényes ajánlat, 1 lemondó nyilatkozat'],
   ['2026-09-02 14:00','Sándor Dávid','BR-2026/019','Értékelés','Értékelés megkezdve','2 érvényes ajánlat; a hiányzó válasz ténye az SSD-ben rögzítendő.'],
   ['2026-07-20 09:00','Klujber László','SS-2026/006','Létrehozás','Beszerzés létrehozva','KHS kupakzáró egyedi hajtóműalkatrész · OPEX · Sole Source · 1 700 000 Ft'],
   ['2026-07-21 14:00','Haász Róbert','SS-2026/006','Jóváhagyás','Sole Source indoklás jóváhagyva','SS indoklás v1'],
   ['2026-08-28 14:10','Sándor Dávid','SS-2026/006','Státusz','Beszerzés lezárva','Dokumentumtár zárolva · megőrzés: szerződés lejárta + 8 év'],
   ['2026-08-28 08:40','Szilágyi László','VH-2026/012','Létrehozás','Vészhelyzeti beszerzés indítva','Csányi kompresszor sürgősségi javítása · 4 800 000 Ft · Vészhelyzeti'],
   ['2026-08-28 09:00','Haász Róbert','VH-2026/012','Jóváhagyás','Vészhelyzeti beszerzés jóváhagyva','Szóbeli jóváhagyás, utólagos írásos megerősítéssel.'],
   ['2026-08-28 12:00','Sándor Dávid','VH-2026/012','Dokumentum','Visszamenőleges PO rögzítve','PO_utolagos_kompresszor.pdf · v1']];
  A.map((r,i)=>({r,i})).sort((a,b)=>a.r[0]<b.r[0]?-1:a.r[0]>b.r[0]?1:a.i-b.i).forEach(x=>log(x.r[2],x.r[3],x.r[4],x.r[5],x.r[1],x.r[0]));
  return st;
}
