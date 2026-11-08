import { BadRequestException } from '@nestjs/common';
export type CatalogSelection = Record<string,string|number|boolean>;
/** User attributes are only hints. The catalog does not fabricate specifications. */
export function parseCatalogSelection(raw:string|undefined): CatalogSelection {
 if(!raw)return {};
 if(raw.length>4096)throw new BadRequestException('catalog_selection_too_long');
 let input:unknown;
 try{input=JSON.parse(raw)}catch{throw new BadRequestException('invalid_catalog_selection')}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('invalid_catalog_selection');
 const entries=Object.entries(input);
 if(entries.length>32)throw new BadRequestException('catalog_selection_too_large');
 const result:CatalogSelection={};
 for(const [key,value] of entries){
   if(!/^[a-z][a-z0-9_]{0,48}$/.test(key)||
       !(typeof value==='string'||typeof value==='number'||typeof value==='boolean') ||
       (typeof value==='number'&&!Number.isFinite(value)))
     throw new BadRequestException('invalid_catalog_selection');
   if(typeof value==='string' && value.length>160)throw new BadRequestException('invalid_catalog_selection');
   result[key]=value;
 }
 return result;
}
export function suggestCatalogTitle(input:{
 categoryTitle:string; rootSlug:string; selected:CatalogSelection;
 labels:ReadonlyMap<string,string>;
}) {
 const {rootSlug,selected,labels,categoryTitle}=input;
 const cleaned=(key:string) => {
   const value=selected[key];
   return typeof value==='string' ? (labels.get(key)??value).trim() : '';
 };
 let parts:string[];
 if(rootSlug==='auto'&&selected.auto_make&&selected.auto_model) {
   parts=[cleaned('auto_make'),cleaned('auto_model'),cleaned('auto_generation')];
 }else if(rootSlug==='realty'){
   const rooms=cleaned('rooms');
   parts=[categoryTitle,rooms && (rooms==='Студия'?'':rooms+' комн.'),selected.area_m2?String(selected.area_m2)+' м²':''];
 }else if(rootSlug==='electronics'){
   parts=[cleaned('device_brand')||cleaned('brand_text')||cleaned('brand'),cleaned('device_model')||cleaned('model_text')||cleaned('model')||categoryTitle,cleaned('storage_gb')];
 }else{
   parts=[cleaned('brand_text'),categoryTitle,cleaned('item_condition')];
 }
 const title=parts.filter(Boolean).join(' · ').replace(/\s+/g,' ').slice(0,120);
 return { suggestedTitle:title, source:'catalog-and-user-selection', requiresReview:true,
   descriptionHint:'Проверьте название и самостоятельно укажите реальную комплектацию, состояние и параметры. Справочник не заполняет неподтверждённые характеристики.' };
}
