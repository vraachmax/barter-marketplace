import { BadRequestException } from '@nestjs/common';
import {parseCatalogSelection,suggestCatalogTitle} from './catalog-autofill';
describe('Catalog editor prefill',()=>{
 it('generates a vehicle title using verified selected catalog labels',()=>{
  const result=suggestCatalogTitle({
   rootSlug:'auto',categoryTitle:'Легковые автомобили',
   selected:{auto_make:'bmw',auto_model:'bmw/x5',auto_generation:'bmw/x5/gen-g05'},
   labels:new Map([['auto_make','BMW'],['auto_model','X5'],['auto_generation','IV · G05']]),
  });
  expect(result.suggestedTitle).toContain('BMW');
  expect(result.suggestedTitle).toContain('X5');
  expect(result.requiresReview).toBe(true);
 });
 it('does not invent a hardware model where none was selected',()=>{
  const result=suggestCatalogTitle({rootSlug:'electronics',categoryTitle:'Смартфоны',
   selected:{brand_text:'Samsung',storage_gb:'128 ГБ'},labels:new Map()});
  expect(result.suggestedTitle).toContain('Смартфоны');
  expect(result.suggestedTitle).not.toContain('Galaxy');
 });
 it('includes actual apartment area but not a guessed address',()=>{
  const result=suggestCatalogTitle({rootSlug:'realty',categoryTitle:'Квартиры',
   selected:{rooms:'2',area_m2:64},labels:new Map()});
  expect(result.suggestedTitle).toContain('64 м²');
 });
 it('rejects oversized, malformed and prototype-pollution selections',()=>{
  for(const raw of ['{', '[]',JSON.stringify({a:'x'.repeat(180)}),
    JSON.stringify({'__proto__':'x','item_condition':'Новое'}),
    '{"__proto__":"bad"}']){
    expect(()=>parseCatalogSelection(raw)).toThrow(BadRequestException);
  }
 });
 it('returns clean attributes instead of accepting complex forged objects',()=>{
  expect(parseCatalogSelection(JSON.stringify({item_condition:'Новое',storage_gb:'128 ГБ'})))
   .toEqual({item_condition:'Новое',storage_gb:'128 ГБ'});
 });
});
