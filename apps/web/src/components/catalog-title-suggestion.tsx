'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';

type CatalogPrefill = { suggestedTitle:string; requiresReview:boolean; source:string };
export function CatalogTitleSuggestion({
  categoryId,attributes,currentTitle,onApply,
}:{
  categoryId:string;attributes:Record<string,string>;
  currentTitle:string;onApply:(title:string)=>void;
}) {
  const [suggestion,setSuggestion]=useState('');
  const selected=useMemo(()=>JSON.stringify(Object.fromEntries(
    Object.entries(attributes).filter(([,value])=>value.trim()),
  )),[attributes]);
  useEffect(()=>{
    if(!categoryId||selected==='{}'){return;}
    let alive=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      void apiFetchJson<CatalogPrefill>(
        '/categories/'+encodeURIComponent(categoryId)+'/auto-fill?selected='+encodeURIComponent(selected),
        {signal:controller.signal},
      ).then(result=>{
        if(alive) setSuggestion(result.ok ? result.data.suggestedTitle : '');
      }).catch(()=>{if(alive)setSuggestion('');});
    },350);
    return ()=>{alive=false;clearTimeout(timer);controller.abort();};
  },[categoryId,selected]);
  if(!categoryId||selected==='{}'||!suggestion||suggestion===currentTitle.trim())return null;
  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-950">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-orange-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">Название по выбранным характеристикам</div>
        <div className="mt-1 break-words font-medium">{suggestion}</div>
        <button type="button" className="mt-2 min-h-10 rounded-lg bg-orange-500 px-3 font-semibold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500" onClick={()=>onApply(suggestion)}>
          Подставить название
        </button>
      </div>
    </div>
  );
}
