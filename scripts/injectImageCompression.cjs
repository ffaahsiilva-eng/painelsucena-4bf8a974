const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = findTsxFiles(srcDir);

const importStatement = `import { compressImage } from "@/utils/imageCompression";\n`;

let modifiedCount = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Find all .upload(...) calls. It usually looks like .upload(path, file, { ... }) or .upload(path, blob)
  // Regex to match .upload(arg1, arg2
  const uploadRegex = /\.upload\(\s*([^,]+)\s*,\s*([^,)]+)/g;
  
  let match;
  let fileWasModified = false;
  
  let newContent = content;
  
  // We need to replace .upload(X, Y  with .upload(X, await compressImage(Y)
  // BUT we only want to do it if it's not already wrapped in compressImage
  newContent = newContent.replace(uploadRegex, (match, arg1, arg2) => {
    if (arg2.includes('compressImage')) return match;
    // se for um arquivo ou blob, colocamos compressImage
    fileWasModified = true;
    return `.upload(${arg1}, await compressImage(${arg2})`;
  });

  if (fileWasModified && content !== newContent) {
    // Add import if not exists
    if (!newContent.includes('import { compressImage }')) {
      // Find the last import line
      const importMatches = [...newContent.matchAll(/^import .* from .*$/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const index = lastMatch.index + lastMatch[0].length;
        newContent = newContent.slice(0, index) + '\n' + importStatement + newContent.slice(index);
      } else {
        newContent = importStatement + newContent;
      }
    }
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${filePath}`);
  }
}

console.log(`Successfully modified ${modifiedCount} files.`);
