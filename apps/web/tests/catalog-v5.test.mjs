import test from 'node:test';
import assert from 'node:assert/strict';
import {
  withCatalogFieldDefinitions,withCatalogOptions,changeCatalogAttribute,
  getListingAttrSectionsForCategorySlug,
} from '../src/lib/listing-attributes-config.ts';

test('new vertical schema sections are rendered and number/text fields preserved',()=>{
  const schema={version:5,optionsQueryVersion:1,fields:[
    {key:'device_brand',label:'Бренд',fieldType:'select',sectionId:'details',sectionTitle:'Характеристики'},
    {key:'device_model',label:'Модель',fieldType:'select',parentKey:'device_brand',sectionId:'details',sectionTitle:'Характеристики'},
    {key:'manufacture_year',label:'Год',fieldType:'number',sectionId:'details',sectionTitle:'Характеристики'},
    {key:'brand_text',label:'Другой бренд',fieldType:'text',sectionId:'details',sectionTitle:'Характеристики'},
  ]};
  const sections=withCatalogFieldDefinitions(getListingAttrSectionsForCategorySlug('electronics'),schema);
  const extra=sections.find(section=>section.id==='details');
  assert(extra);
  assert.equal(extra.fields.find(field=>field.key==='device_brand').type,'select');
  assert.equal(extra.fields.find(field=>field.key==='device_model').dependsOn,'device_brand');
  assert.equal(extra.fields.find(field=>field.key==='manufacture_year').type,'number');
  assert.equal(extra.fields.find(field=>field.key==='brand_text').type,'text');
  const choices=[
    {fieldKey:'device_brand',value:'apple',label:'Apple'},
    {fieldKey:'device_brand',value:'samsung',label:'Samsung'},
    {fieldKey:'device_model',value:'apple/iphone-13',label:'iPhone 13',parentFieldKey:'device_brand',parentValue:'apple'},
    {fieldKey:'device_model',value:'samsung/galaxy-s23',label:'Galaxy S23',parentFieldKey:'device_brand',parentValue:'samsung'},
  ];
  const selected={device_brand:'apple',device_model:'apple/iphone-13'};
  const populated=withCatalogOptions(sections,choices,selected);
  const models=populated.find(section=>section.id==='details').fields.find(field=>field.key==='device_model');
  assert.deepEqual(models.options.map(row=>row.label),['iPhone 13']);
  const changed=changeCatalogAttribute(selected,'device_brand','samsung',choices,schema);
  assert.equal(changed.device_model,undefined);
});
