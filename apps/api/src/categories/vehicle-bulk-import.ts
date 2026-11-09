import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type Make={id:string;name:string};
type Model={id:string;makeId:string;name:string};
type Kind='car'|'motorcycle'|'moped'|'van'|'truck'|'bus';
type VehicleSnapshot={
  source:'VehiclesDB';license:'CC-BY-4.0';attribution:string;url:string;version:string;
  kinds:Record<Kind,{makes:Make[];models:Model[]}>;
};
const kinds:Kind[]=['car','motorcycle','moped','van','truck','bus'];
const path=resolve(process.cwd(),'data/vehiclesdb-snapshot.json');
const batch=350;
function slices<T>(array:readonly T[],size:number) {
  const result:T[][]=[];
  for(let i=0;i<array.length;i+=size)result.push(array.slice(i,i+size));
  return result;
}
export function readVehicleSnapshot():VehicleSnapshot {
  if(!existsSync(path))throw Error('Bulk catalog snapshot missing: '+path);
  const snapshot=JSON.parse(readFileSync(path,'utf8')) as VehicleSnapshot;
  if(snapshot.source!=='VehiclesDB'||snapshot.license!=='CC-BY-4.0'||
     snapshot.attribution!=='Vehicle data by VehiclesDB')
    throw Error('Unsupported vehicle catalog license');
  for(const kind of kinds) {
    const entry=snapshot.kinds[kind];
    if(!entry||entry.makes.length<20||entry.models.length<80)
      throw Error('Incomplete vehicle snapshot: '+kind);
    const makes=new Set(entry.makes.map(row=>row.id));
    if(makes.size!==entry.makes.length ||
      new Set(entry.models.map(row=>row.id)).size!==entry.models.length ||
      entry.models.some(row=>!makes.has(row.makeId)||!row.id.startsWith(row.makeId+'/')))
      throw Error('Invalid vehicle snapshot identity: '+kind);
  }
  return snapshot;
}
async function appendKind(prisma:PrismaService,categoryId:string,scope:Kind[],
    makesKey:string,modelsKey:string,snapshot:VehicleSnapshot) {
  const makes=new Map<string,Make>();
  const modelRows:{value:string;label:string;makeId:string}[]=[];
  for(const kind of scope){
    for(const make of snapshot.kinds[kind].makes){
      if(!makes.has(make.id))makes.set(make.id,make);
    }
    for(const model of snapshot.kinds[kind].models){
      modelRows.push({
        value:kind==='car'?model.id:kind+'/'+model.id,
        label:model.name,
        makeId:model.makeId,
      });
    }
  }
  const makeRows=[...makes.values()];
  for(const chunk of slices(makeRows,batch)) {
    await prisma.categoryAttributeOption.createMany({
      data:chunk.map((row,i)=>({
        categoryId,fieldKey:makesKey,value:row.id,label:row.name,sortOrder:i,
      })),skipDuplicates:true,
    });
  }
  const existing=await prisma.categoryAttributeOption.findMany({
    where:{categoryId,fieldKey:makesKey},
    select:{id:true,value:true},
  });
  const parentIds=new Map(existing.map(x=>[x.value,x.id]));
  if(makeRows.some(row=>!parentIds.has(row.id)))throw Error('Bulk make insertion incomplete');
  for(const chunk of slices(modelRows,batch)) {
    await prisma.categoryAttributeOption.createMany({
      data:chunk.map((row,i)=>({
        categoryId,fieldKey:modelsKey,value:row.value,label:row.label,
        parentOptionId:parentIds.get(row.makeId)!,sortOrder:i,
      })),skipDuplicates:true,
    });
  }
  // Confirm the source models are present; never claim import based on a successful batch.
  const count=await prisma.categoryAttributeOption.count({
    where:{categoryId,fieldKey:modelsKey,
      value:{in:modelRows.map(row=>row.value)}},
  });
  if(count!==modelRows.length)
    throw Error('Bulk models incomplete: '+scope.join(',')+' '+count+'/'+modelRows.length);
  return {sourceMakes:makeRows.length,sourceModels:modelRows.length,verifiedImported:count};
}
/**
 * Explicit opt-in only. Append-only, resumable and reentrant. Existing models
 * and listing attributes remain unchanged; this never deletes data.
 */
export async function importBulkVehicleCatalog(prisma:PrismaService) {
  const snapshot=readVehicleSnapshot();
  const auto=await prisma.category.findUniqueOrThrow({
    where:{slug:'auto'},select:{id:true},
  });
  const motor=await prisma.category.findUniqueOrThrow({
    where:{slug:'auto-motorcycles'},select:{id:true},
  });
  const commercial=await prisma.category.findUniqueOrThrow({
    where:{slug:'auto-commercial-vehicles'},select:{id:true},
  });
  for(const cat of [motor,commercial]) {
    await prisma.categoryAttributeField.createMany({
      data:[
        {categoryId:cat.id,key:'vehicle_make',label:'Марка',sectionId:'vehicle_main',
          sectionTitle:'Марка и модель',fieldType:'select',sortOrder:1},
        {categoryId:cat.id,key:'vehicle_model',label:'Модель',sectionId:'vehicle_main',
          sectionTitle:'Марка и модель',fieldType:'select',parentKey:'vehicle_make',sortOrder:2},
      ],skipDuplicates:true,
    });
  }
  const car=await appendKind(prisma,auto.id,['car'],'auto_make','auto_model',snapshot);
  console.info('[vehicle-bulk] car',JSON.stringify(car));
  const motorcycles=await appendKind(prisma,motor.id,['motorcycle','moped'],'vehicle_make','vehicle_model',snapshot);
  console.info('[vehicle-bulk] motorcycles+mopeds',JSON.stringify(motorcycles));
  const commercials=await appendKind(prisma,commercial.id,['van','truck','bus'],'vehicle_make','vehicle_model',snapshot);
  console.info('[vehicle-bulk] commercial',JSON.stringify(commercials));
  return {source:snapshot.source,version:snapshot.version,
    car,motorcycles,commercials,verified:true};
}
