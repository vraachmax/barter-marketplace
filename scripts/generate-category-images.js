const Replicate = require('replicate');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

const CATEGORIES = [
  {
    name: 'auto',
    prompt: '3D render of a shiny modern red sedan car, isometric angle, floating on white background, studio lighting, product visualization, ultra realistic, 8k'
  },
  {
    name: 'realty',
    prompt: '3D render of a modern apartment building, isometric view, pastel colors, floating on white background, studio lighting, architectural, ultra realistic'
  },
  {
    name: 'electronics',
    prompt: '3D render of a modern black smartphone, floating on white background, studio product shot, glossy, ultra realistic, 8k'
  },
  {
    name: 'clothes',
    prompt: '3D render of colorful sneakers shoes pair, floating on white background, studio product shot, ultra realistic, 8k'
  },
  {
    name: 'home',
    prompt: '3D render of a modern grey sofa couch, isometric view, floating on white background, studio lighting, interior design, ultra realistic'
  },
  {
    name: 'kids',
    prompt: '3D render of colorful cute teddy bear toy, floating on white background, studio lighting, soft colors, ultra realistic, 8k'
  },
  {
    name: 'job',
    prompt: '3D render of a brown leather briefcase, floating on white background, studio product shot, professional, ultra realistic, 8k'
  },
  {
    name: 'hobby',
    prompt: '3D render of a modern blue bicycle, isometric view, floating on white background, studio lighting, ultra realistic, 8k'
  },
  {
    name: 'services',
    prompt: '3D render of orange wrench and hammer tools, isometric view, floating on white background, studio lighting, ultra realistic'
  },
  {
    name: 'animals',
    prompt: '3D render of a cute golden retriever dog, floating on white background, studio lighting, soft, ultra realistic, 8k'
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function generateImage(category) {
  console.log(`\nGenerating: ${category.name}...`);
  try {
    const output = await replicate.run(
      "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      {
        input: {
          prompt: category.prompt,
          negative_prompt: "dark background, text, watermark, blurry, low quality, gradient background, colored background",
          width: 512,
          height: 512,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }
      }
    );

    const url = Array.isArray(output) ? output[0] : output;
    console.log(`URL received: ${url}`);

    const dest = path.join('apps/web/public/categories', `${category.name}.png`);
    await downloadFile(url, dest);
    console.log(`✓ Saved: ${dest}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed ${category.name}:`, err.message);
    return false;
  }
}

async function main() {
  fs.mkdirSync('apps/web/public/categories', { recursive: true });
  console.log('Starting generation...\n');

  for (const category of CATEGORIES) {
    await generateImage(category);
    await new Promise(r => setTimeout(r, 12000));
  }

  console.log('\nDone! Check apps/web/public/categories/');
  const files = fs.readdirSync('apps/web/public/categories');
  files.forEach(f => {
    const size = fs.statSync(path.join('apps/web/public/categories', f)).size;
    console.log(`  ${f}: ${Math.round(size/1024)}KB`);
  });
}

main().catch(console.error);
