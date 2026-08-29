const ExcelJS = require('exceljs');

async function readExcel() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('DATA BOOK -RESPONSÁVEIS.xlsx');
    const worksheet = workbook.worksheets[0];
    
    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber <= 10) {
        const rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          rowData.push(cell.value);
        });
        rows.push({ rowNumber, data: rowData });
      }
    });
    
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

readExcel();
