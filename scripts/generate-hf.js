const { HfInference } = require('@huggingface/inference');
const fs = require('fs');

const HF_TOKEN = 'REPLACE_WITH_TOKEN';
const hf = new HfInference(HF_TOKEN);

const CATEGORIES = [
  {
    name: 'auto',
    prompt: 'a shiny red sports car, pure white background, product photography, studio shot, centered, no shadows, isolated object, commercial photo, 8k'
  },
  {
    name: 'realty',
    prompt: 'a modern house building, pure white background, product photography, studio shot, centered, isolated object, architectural model, 8k'
  },
  {
    name: 'electronics',
    prompt: 'a modern black iPhone smartphone, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
  {
    name: 'clothes',
    prompt: 'a pair of colorful Nike sneakers shoes, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
  {
    name: 'home',
    prompt: 'a modern grey sofa couch, pure white background, product photography, studio shot, centered, isolated object, furniture catalog, 8k'
  },
  {
    name: 'kids',
    prompt: 'a cute brown teddy bear toy, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
  {
    name: 'job',
    prompt: 'a brown leather briefcase bag, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
  {
    name: 'hobby',
    prompt: 'a blue mountain bicycle, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
  {
    name: 'services',
    prompt: 'a set of tools wrench screwdriver hammer, pure white background, product photography, studio shot, centered, isolated object, 8k'
  },
  {
    name: 'animals',
    prompt: 'a cute golden retriever puppy dog, pure white background, product photography, studio shot, centered, isolated object, commercial photo, 8k'
  },
];

async function generate(category) {
  console.log(`\nGenerating ${category.name}...`);
  try {
    const blob = await hf.textToImage({
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      inputs: category.prompt,
      parameters: {
        negative_prompt: 'gray background, gradient background, dark background, shadows, text, watermark, blurry, ugly, colored background, studio background, grey, black background',
        width: 512,
        height: 512,
        num_inference_steps: 30,
        guidance_scale: 9.0,
      },
    });

    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.mkdirSync('apps/web/public/categories', { recursive: true });
    const dest = `apps/web/public/categories/${category.name}.png`;
    fs.writeFileSync(dest, buffer);
    const kb = Math.round(buffer.length / 1024);
    console.log(`✓ ${category.name} saved (${kb}KB)`);
    return true;
  } catch (err) {
    console.log(`✗ ${category.name} failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting HuggingFace image generation (white bg)...');
  console.log('Model: stable-diffusion-xl-base-1.0');
  console.log('Guidance: 9.0, Steps: 30\n');

  const results = [];

  for (const cat of CATEGORIES) {
    const success = await generate(cat);
    results.push({ name: cat.name, success });
    await new Promise(r => setTimeout(r, success ? 3000 : 8000));
  }

  console.log('\n=== RESULTS ===');
  results.forEach(r => console.log(`${r.success ? '✓' : '✗'} ${r.name}`));

  console.log('\nFiles in categories folder:');
  try {
    const files = fs.readdirSync('apps/web/public/categories');
    files.forEach(f => {
      const size = fs.statSync(`apps/web/public/categories/${f}`).size;
      console.log(`  ${f}: ${Math.round(size / 1024)}KB`);
    });
  } catch (e) {
    console.log('  No files found');
  }
}

main().catch(console.error);
