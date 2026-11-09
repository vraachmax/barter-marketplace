#!/usr/bin/env node
'use strict';
/**
 * Snapshot a CC BY 4.0 versioned upstream catalog. Never invent missing
 * generations. This file runs in CI (network), not in the live web process.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {setTimeout:sleep}=require('node:timers/promises');
const upstream='https://raw.githubusercontent.com/vehiclesdb/vehiclesdb';
const ref=process.env.VEHICLESDB_REF||'main';
if(!/^(main|[0-9]{4}\.[0-9]{2}\.[0-9]+|[a-f0-9]{40})$/.test(ref))throw Error('Invalid pinned upstream ref');
const kinds=['car','motorcycle','moped','van','truck','bus'];
const idOk=s=>typeof s==='string'&&s.length<=150&&/^[a-z0-9][a-z0-9/-]*$/.test(s);
async function json(relative) {
 const url=upstream+'/'+ref+'/'+relative;
 for(let attempt=0;attempt<4;attempt++){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),25000);
   try{
     const res=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Barter-CCBY-Catalog-Importer/1.0','Accept':'application/json'}});
     if(res.ok){
       const size=Number(res.headers.get('content-length')||0);
       if(size>25000000)throw Error('Upstream file too large: '+relative);
       const body=await res.text();
       if(body.length>25000000)throw Error('Upstream response exceeds cap');
       return JSON.parse(body);
     }
     if(![429,502,503,504].includes(res.status)||attempt===3)throw Error(relative+' HTTP '+res.status);
   } finally{clearTimeout(timer);}
   await sleep(1500*(attempt+1));
 }
 throw Error('Fetch failed '+relative);
}
(async()=>{
 const manifest=await json('manifest.json');
 if(manifest.license!=='CC-BY-4.0'||manifest.attribution?.required!==true)
   throw Error('Upstream license or attribution changed');
 if(manifest.schema_version!==3)throw Error('Unsupported upstream schema');
 const generated={source:'VehiclesDB',license:'CC-BY-4.0',
   attribution:'Vehicle data by VehiclesDB',url:'https://vehiclesdb.com',
   version:manifest.version,ref,kinds:{}};
 for(const kind of kinds){
   const [makes,models]=await Promise.all([json('catalog/'+kind+'/makes.json'),json('catalog/'+kind+'/models.json')]);
   if(!Array.isArray(makes)||!Array.isArray(models))throw Error('Invalid arrays for '+kind);
   if(makes.length<20||models.length<80)throw Error('Incomplete catalog '+kind);
   const byId=new Map();
   for(const make of makes){
     if(!idOk(make.id)||typeof make.name!=='string'||!make.name.trim())throw Error('Invalid make in '+kind);
     if(byId.has(make.id))throw Error('Duplicate make '+make.id);
     byId.set(make.id,{id:make.id,name:make.name.trim().slice(0,120)});
   }
   const seen=new Set();const normalized=[];
   for(const m of models){
     if(!idOk(m.id)||!idOk(m.make_id)||!byId.has(m.make_id)||
         typeof m.name!=='string'||!m.name.trim()||!m.id.startsWith(m.make_id+'/'))
       throw Error('Invalid model parent in '+kind+': '+JSON.stringify(m).slice(0,140));
     if(seen.has(m.id))throw Error('Duplicate model '+m.id);
     seen.add(m.id);
     normalized.push({id:m.id,makeId:m.make_id,name:m.name.trim().slice(0,140)});
   }
   const expected=Number(manifest.kinds?.[kind]?.models||0);
   if(expected>0&&expected!==normalized.length)
     throw Error('Manifest count mismatch '+kind+': expected '+expected+', got '+normalized.length);
   generated.kinds[kind]={makes:[...byId.values()],models:normalized};
   console.log(kind,byId.size,'makes',normalized.length,'models');
 }
 // Re-fetch at the end to detect if the upstream 'main' moved during a build.
 const finalManifest=await json('manifest.json');
 if(finalManifest.version!==manifest.version)throw Error('Upstream changed mid-snapshot; retry');
 const output=path.resolve(__dirname,'../data/vehiclesdb-snapshot.json');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const text=JSON.stringify(generated);
 if(text.length<200000||text.length>12000000)throw Error('Unexpected dataset volume '+text.length);
 fs.writeFileSync(output,text+'\n');
 console.log('Snapshot',output,'bytes',text.length,'sha256',crypto.createHash('sha256').update(text).digest('hex'));
})().catch(error=>{console.error(error);process.exitCode=1;});
