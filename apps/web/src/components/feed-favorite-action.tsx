'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiFetchJson, type FavoriteItem } from '@/lib/api';
import { listingLoginHref } from '@/lib/listing-presentation';

/** Share one server read across feed cards, but never guess saved status. */
const cache=new Map<string,{at:number,value:Promise<Set<string>>}>();
const EVENT='barter:favorite:changed';
function load(userId:string,force=false) {
  const cur=cache.get(userId);
  if(!force&&cur&&Date.now()-cur.at<30000)return cur.value;
  const value=apiFetchJson<FavoriteItem[]>('/favorites',{signal:AbortSignal.timeout(15000)})
    .then(r=>{if(!r.ok)throw Error('Favorite request failed');return new Set(r.data.map(i=>i.listing.id));})
    .catch(e=>{cache.delete(userId);throw e;});
  cache.set(userId,{at:Date.now(),value});
  return value;
}
export default function FeedFavoriteAction({listingId}:{listingId:string}) {
  const {user,ready}=useAuth();
  const uid=user?.id;
  const [saved,setSaved]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!ready||!uid)return;
    let alive=true;
    void load(uid,retry>0).then(ids=>{if(alive){setSaved(ids.has(listingId));setFailed(false)}})
      .catch(()=>{if(alive){setSaved(null);setFailed(true)}});
    const sync=(ev:Event)=>{
      const d=(ev as CustomEvent<{uid:string,id:string,value:boolean}>).detail;
      if(d.uid===uid&&d.id===listingId&&alive)setSaved(d.value);
    };
    window.addEventListener(EVENT,sync);
    return()=>{alive=false;window.removeEventListener(EVENT,sync)};
  },[uid,ready,listingId,retry]);
  const stop=(e:React.SyntheticEvent)=>e.stopPropagation();
  if(!ready)return null;
  if(!uid)return <Link href={listingLoginHref(listingId)} onClick={stop} onPointerDown={stop}
    className="listing-feed-favorite" aria-label="Войти, чтобы добавить в избранное">
    <Heart size={18} aria-hidden />
  </Link>;
  const toggle=async()=>{
    if(busy)return;
    if(saved===null){setRetry(v=>v+1);return}
    setBusy(true);
    try {
      const value=!saved;
      const result=await apiFetchJson('/favorites/'+listingId,{method:value?'POST':'DELETE',signal:AbortSignal.timeout(15000)});
      if(!result.ok){setFailed(true);return}
      const prev=await load(uid).catch(()=>new Set<string>());
      const updated=new Set(prev);
      if(value)updated.add(listingId);else updated.delete(listingId);
      cache.set(uid,{at:Date.now(),value:Promise.resolve(updated)});
      setSaved(value);setFailed(false);
      window.dispatchEvent(new CustomEvent(EVENT,{detail:{uid,id:listingId,value}}));
    }catch{setFailed(true)}finally{setBusy(false)}
  };
  return <button type="button" className="listing-feed-favorite"
    aria-label={failed?'Повторить сохранение в избранное':saved?'Убрать из избранного':'Добавить в избранное'}
    aria-pressed={saved??undefined} aria-busy={busy||(saved===null&&!failed)}
    disabled={busy||(saved===null&&!failed)}
    onPointerDown={stop} onClick={e=>{stop(e);void toggle()}}>
    <Heart size={18} fill={saved?'currentColor':'none'} aria-hidden />
  </button>;
}
