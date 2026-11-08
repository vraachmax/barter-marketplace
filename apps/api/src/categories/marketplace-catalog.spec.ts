import { MARKETPLACE_CATEGORY_TREE,MARKETPLACE_REQUIRED_ROOTS,validateCategorySeed } from './marketplace-category-tree';
import {fieldsForRoot,fieldsForCategory,CATALOG_OPTION_KEYS} from './marketplace-attribute-presets';
import generationCatalog from './car-generations-2026.10.05.json';
import {carCatalog} from './car-catalog';
import { ELECTRONICS_MODELS, ELECTRONICS_BRAND_LABELS, electronicModelId } from './electronics-model-catalog';
describe('Multi-vertical catalog v5',()=>{
 it('has a real two-level category hierarchy with unique stable slugs',()=>{
   expect(MARKETPLACE_CATEGORY_TREE.length).toBeGreaterThanOrEqual(199);
   expect(MARKETPLACE_REQUIRED_ROOTS).toHaveLength(9);
   expect(()=>validateCategorySeed(MARKETPLACE_CATEGORY_TREE)).not.toThrow();
   expect(new Set(MARKETPLACE_CATEGORY_TREE.map(x=>x.slug)).size).toBe(MARKETPLACE_CATEGORY_TREE.length);
   expect(MARKETPLACE_CATEGORY_TREE.some(x=>x.slug==='passenger-cars')).toBe(true);
   expect(MARKETPLACE_CATEGORY_TREE.some(x=>x.slug==='auto-passenger-cars')).toBe(false);
 });
 it('refuses unresolved ancestry or duplicated category slugs',()=>{
   expect(()=>validateCategorySeed([{slug:'orphan',title:'Orphan',parent:'missing'}])).toThrow('Unresolved');
   expect(()=>validateCategorySeed([{slug:'auto',title:'Duplicate',parent:'auto'}])).toThrow('Duplicate');
 });
 it('gives all non-auto roots at least one meaningful field',()=>{
   for(const root of MARKETPLACE_REQUIRED_ROOTS) {
     if(root==='auto')continue;expect(fieldsForRoot(root).length).toBeGreaterThan(0);
   }
 });
 it('supplies specific property fields for electronics, realty and special equipment',()=>{
   expect(fieldsForCategory('electronics','electronics-phones').map(f=>f.key)).toContain('storage_gb');
   expect(fieldsForCategory('realty','realty-apartments').map(f=>f.key)).toContain('rooms');
   expect(fieldsForCategory('auto','auto-special-equipment').map(f=>f.key)).toContain('operating_hours');
   expect(CATALOG_OPTION_KEYS).toContain('item_condition');
 });
 it('has scoped brand/model hierarchies in phones, laptops, tablets, games and televisions',()=>{
   expect(Object.keys(ELECTRONICS_MODELS)).toHaveLength(7);
   let count=0;
   for(const [,brands] of Object.entries(ELECTRONICS_MODELS)) {
     for(const [brand,models] of Object.entries(brands)) {
       expect(ELECTRONICS_BRAND_LABELS[brand]).toBeTruthy();
       expect(models.length).toBeGreaterThan(0);
       expect(new Set(models.map(model=>electronicModelId(brand,model))).size).toBe(models.length);
       count+=models.length;
     }
   }
   expect(count).toBeGreaterThanOrEqual(180);
   expect(fieldsForCategory('electronics','electronics-phones').map(field=>field.key))
    .toEqual(expect.arrayContaining(['device_brand','device_model']));
 });
  it('preserves automotive verified parent-model relationships',()=>{
   const models=new Set(carCatalog.models.map(x=>x.id));
   expect(carCatalog.makes.length).toBeGreaterThanOrEqual(308);
   expect(carCatalog.models.length).toBeGreaterThanOrEqual(5455);
   expect(generationCatalog.generations.every(x=>models.has(x.modelId))).toBe(true);
   expect(new Set(generationCatalog.generations.map(x=>x.id)).size).toBe(generationCatalog.generations.length);
   expect(new Set(generationCatalog.generations.map(x=>x.modelId))).toEqual(new Set(['bmw/3-series','bmw/x5','toyota/camry','volkswagen/golf','mercedes-benz/c-class','bmw/x3','volkswagen/passat','volkswagen/polo']));
 });
});
