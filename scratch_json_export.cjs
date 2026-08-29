const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('crypto');

// polyfill uuid if crypto doesn't have it (using a simple generator for seed data)
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function exportJson() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('DATA BOOK -RESPONSÁVEIS.xlsx');
    const worksheet = workbook.worksheets[0];
    
    const items = [];
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 2) {
        const item_number = row.getCell(1).text || '';
        const content = row.getCell(2).text || '';
        const responsible = row.getCell(3).text || '';
        
        if (item_number || content) {
          items.push({
            id: uuid(),
            item_number,
            content,
            responsible
          });
        }
      }
    });
    
    const dir = 'src/data';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync('src/data/dataBookHydroSeed.json', JSON.stringify(items, null, 2));
    console.log("JSON Seed generated successfully!");
  } catch (err) {
    console.error(err);
  }
}

exportJson();
