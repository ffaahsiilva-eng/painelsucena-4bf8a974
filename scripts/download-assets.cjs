const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const assetsDir = path.join(__dirname, '..', 'src', 'assets');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(assetsDir)) {
  console.log('No assets dir');
  process.exit(0);
}

const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.asset.json'));

const downloadFile = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`unexpected response ${res.statusText}`);
  await pipeline(res.body, fs.createWriteStream(dest));
};

const processAssets = async () => {
  let count = 0;
  for (const file of files) {
    const jsonPath = path.join(assetsDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data.url) {
        const remoteUrl = `https://painelsucena.lovable.app${data.url}`;
        const localPath = path.join(publicDir, data.url);
        
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        console.log(`Downloading ${data.url}...`);
        await downloadFile(remoteUrl, localPath);
        count++;
      }
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }
  console.log(`Successfully downloaded ${count} assets.`);
};

processAssets();
