import { PrismaService } from '../prisma/prisma.service';
import { MARKETPLACE_CATEGORY_TREE, MARKETPLACE_REQUIRED_ROOTS, MARKETPLACE_CATALOG_REVISION } from './marketplace-category-tree';
import { fieldsForCategory, fieldsForRoot, CATALOG_FIELD_GROUPS, FieldPreset } from './marketplace-attribute-presets';
import { ELECTRONICS_MODELS, ELECTRONICS_BRAND_LABELS, electronicModelId } from './electronics-model-catalog';

/**
 * Reentrant, append-only catalog bootstrap. Existing UUIDs, listings and
 * published category slugs remain stable. Batches keep startup manageable.
 * A root/group revision is committed only after fields/options exist.
 */
export async function ensureMarketplaceCatalog(prisma: PrismaService): Promise<void> {
  await prisma.category.createMany({
    data: MARKETPLACE_REQUIRED_ROOTS.map(slug=>({slug, title: ({
      auto:'Авто',realty:'Недвижимость',electronics:'Электроника',
      home:'Для дома и дачи',clothes:'Одежда и обувь',kids:'Детские товары',
      hobby:'Хобби и отдых',services:'Услуги',job:'Работа',
    } as Record<string,string>)[slug]})),
    skipDuplicates: true,
  });
  const roots = new Set<string>(MARKETPLACE_REQUIRED_ROOTS);
  const first = MARKETPLACE_CATEGORY_TREE.filter(row=>roots.has(row.parent));
  const rootRows = await prisma.category.findMany({where:{slug:{in:[...roots]}},select:{id:true,slug:true}});
  const bySlug = new Map(rootRows.map(row=>[row.slug,row.id]));
  if(rootRows.length!==roots.size) throw new Error('catalog_roots_incomplete');

  await prisma.category.createMany({
    data:first.map(row=>({slug:row.slug,title:row.title,parentId:bySlug.get(row.parent)!})),
    skipDuplicates:true,
  });
  const groups = await prisma.category.findMany({
    where:{slug:{in:first.map(row=>row.slug)}},select:{id:true,slug:true,parentId:true},
  });
  if(groups.length!==first.length) throw new Error('catalog_groups_incomplete');
  for(const node of first){
    const found=groups.find(row=>row.slug===node.slug);
    if(!found || found.parentId!==bySlug.get(node.parent))
      throw new Error('catalog_group_parent_conflict:'+node.slug);
  }
  groups.forEach(row=>bySlug.set(row.slug,row.id));

  const leaves = MARKETPLACE_CATEGORY_TREE.filter(row=>!roots.has(row.parent));
  await prisma.category.createMany({
    data:leaves.map(row=>({slug:row.slug,title:row.title,parentId:bySlug.get(row.parent)!})),
    skipDuplicates:true,
  });
  const registered = await prisma.category.findMany({
    where:{slug:{in:leaves.map(row=>row.slug)}},
    select:{slug:true,parentId:true},
  });
  if(registered.length!==leaves.length) throw new Error('catalog_leaves_incomplete');
  for(const leaf of leaves) {
    if(registered.find(x=>x.slug===leaf.slug)?.parentId!==bySlug.get(leaf.parent))
      throw new Error('catalog_leaf_parent_conflict:'+leaf.slug);
  }

  // Existing auto root holds a verified vehicle hierarchy; don't overwrite it.
  for(const root of MARKETPLACE_REQUIRED_ROOTS) {
    if(root==='auto') continue;
    await publishFields(prisma,bySlug.get(root)!,fieldsForRoot(root));
  }
  for(const name of CATALOG_FIELD_GROUPS) {
    const ownerId=bySlug.get(name);
    if(!ownerId) throw new Error('catalog_special_group_missing:'+name);
    const root=name.split('-')[0];
    await publishFields(prisma,ownerId,fieldsForCategory(root,name));
  }
  await seedElectronicsModelOptions(prisma,bySlug);
}

async function publishFields(prisma:PrismaService,categoryId:string, fields:readonly FieldPreset[]) {
  if(fields.length===0)return;
  const existing=await prisma.category.findUniqueOrThrow({
    where:{id:categoryId},select:{catalogRevision:true},
  });
  if(existing.catalogRevision>=MARKETPLACE_CATALOG_REVISION)return;
  await prisma.$transaction(async tx=>{
    await tx.categoryAttributeField.createMany({
      data:fields.map((field,sortOrder)=>({
        categoryId,key:field.key,label:field.label,
        fieldType:field.fieldType??'select',
        sectionId:field.sectionId,sectionTitle:field.sectionTitle,
        parentKey:field.parentKey??null,sortOrder,
      })),skipDuplicates:true,
    });
    const options=fields.flatMap(field=>(field.options??[]).map(([value,label],sortOrder)=>({
      categoryId,fieldKey:field.key,value,label,sortOrder,
    })));
    if(options.length>0) await tx.categoryAttributeOption.createMany({
      data:options,skipDuplicates:true,
    });
    await tx.category.update({
      where:{id:categoryId},
      data:{catalogRevision:MARKETPLACE_CATALOG_REVISION},
    });
  },{timeout:15000});
}

async function seedElectronicsModelOptions(
 prisma:PrismaService,bySlug:ReadonlyMap<string,string>,
) {
 for(const [group,brands] of Object.entries(ELECTRONICS_MODELS)) {
   const categoryId=bySlug.get(group);
   if(!categoryId)throw new Error('electronics_group_missing:'+group);
   const entries=Object.entries(brands);
   await prisma.categoryAttributeOption.createMany({
     data:entries.map(([brand],sortOrder)=>({
       categoryId,fieldKey:'device_brand',value:brand,
       label:ELECTRONICS_BRAND_LABELS[brand],sortOrder,
     })),skipDuplicates:true,
   });
   const parents=await prisma.categoryAttributeOption.findMany({
     where:{categoryId,fieldKey:'device_brand'},
     select:{id:true,value:true},
   });
   const parentIds=new Map(parents.map(row=>[row.value,row.id]));
   const models=entries.flatMap(([brand,items])=>items.map((label,sortOrder)=>({
     categoryId,fieldKey:'device_model',value:electronicModelId(brand,label),
     label,parentOptionId:parentIds.get(brand)!,sortOrder,
   })));
   if(models.some(model=>!model.parentOptionId))
     throw new Error('electronics_brand_missing:'+group);
   for(let offset=0;offset<models.length;offset+=200)
     await prisma.categoryAttributeOption.createMany({
       data:models.slice(offset,offset+200),skipDuplicates:true,
     });
   const loaded=await prisma.categoryAttributeOption.count({
     where:{categoryId,fieldKey:'device_model',value:{in:models.map(row=>row.value)}},
   });
   if(loaded!==models.length)throw new Error('electronics_models_incomplete:'+group);
 }
}
