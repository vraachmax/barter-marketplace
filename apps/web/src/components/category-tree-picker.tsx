'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Category } from '@/lib/api';

/** Three-level category navigation, without a 200-row flat mobile dropdown. */
export default function CategoryTreePicker({
 categories,selectedId,onPick,
}:{categories:Category[];selectedId:string;onPick:(id:string)=>void}) {
 const [openRoot,setOpenRoot]=useState<string|null>(null);
 const [openGroup,setOpenGroup]=useState<string|null>(null);
 const byParent=useMemo(()=>{
   const map=new Map<string|null,Category[]>();
   for(const category of categories){
     const parent=category.parentId??null;
     const entries=map.get(parent)??[];
     entries.push(category);
     map.set(parent,entries);
   }
   return map;
 },[categories]);
 const roots=byParent.get(null)??[];
 const selectedClass=(id:string)=>id===selectedId
   ? 'bg-orange-50 text-orange-700 font-semibold'
   : 'hover:bg-muted text-foreground';
 return (
  <div className="space-y-1 border-t border-border p-2" role="group" aria-label="Дерево категорий">
   {roots.map(root=>{
     const groups=byParent.get(root.id)??[];
     const expanded=openRoot===root.id;
     return <div key={root.id}>
       <div className="flex items-center gap-1 rounded-xl">
         <button type="button" aria-expanded={expanded}
           onClick={()=>{setOpenRoot(expanded?null:root.id);setOpenGroup(null);}}
           className="flex min-h-12 min-w-0 flex-1 items-center justify-between rounded-lg px-3 text-left text-sm font-semibold hover:bg-muted">
           <span className="truncate">{root.title}</span>
           <ChevronDown size={18} className={'shrink-0 transition-transform '+(expanded?'rotate-180':'')} aria-hidden/>
         </button>
         {expanded && <button type="button" onClick={()=>onPick(root.id)}
           className={'min-h-10 rounded-lg px-2 text-xs '+selectedClass(root.id)}
           aria-label={'Выбрать раздел '+root.title}>
           {selectedId===root.id?'Выбрано':'Весь раздел'}
         </button>}
       </div>
       {expanded && <div className="ml-3 space-y-1 border-l border-orange-200 pl-2">
         {groups.map(group=>{
           const children=byParent.get(group.id)??[];
           const groupExpanded=openGroup===group.id;
           return <div key={group.id}>
             <div className="flex items-center gap-1">
               <button type="button" aria-expanded={children.length?groupExpanded:undefined}
                 onClick={()=>children.length?setOpenGroup(groupExpanded?null:group.id):onPick(group.id)}
                 className={'flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-lg px-2 text-left text-sm '+selectedClass(group.id)}>
                 <span className="truncate">{group.title}</span>
                 {children.length? <ChevronDown size={16} className={'shrink-0 transition-transform '+(groupExpanded?'rotate-180':'')} aria-hidden/>
                   :selectedId===group.id?<Check size={16} aria-hidden/>:null}
               </button>
               {children.length && groupExpanded?<button type="button" onClick={()=>onPick(group.id)}
                 className="min-h-10 shrink-0 rounded-lg px-2 text-xs text-orange-700 hover:bg-orange-50">
                 {selectedId===group.id?'Выбрано':'Весь раздел'}
               </button>:null}
             </div>
             {children.length>0 && groupExpanded && (
               <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                 {children.map(child=><button key={child.id} type="button" onClick={()=>onPick(child.id)}
                   className={'flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm '+selectedClass(child.id)}>
                   <span>{child.title}</span>
                   {selectedId===child.id?<Check size={16} className="shrink-0" aria-hidden/>:null}
                 </button>)}
               </div>
             )}
           </div>;
         })}
       </div>}
     </div>;
   })}
   <p className="px-3 pt-3 text-[11px] text-muted-foreground">
     Данные о транспорте: <a className="underline underline-offset-2" href="https://vehiclesdb.com" target="_blank" rel="noopener noreferrer">Vehicle data by VehiclesDB</a> (CC BY 4.0).
     <a className="ml-1 underline underline-offset-2" href="https://github.com/vehiclesdb/vehiclesdb/blob/main/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Источники</a>
   </p>
  </div>
 );
}
