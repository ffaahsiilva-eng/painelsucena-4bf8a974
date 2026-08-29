const ExcelJS = require('exceljs');
const fs = require('fs');

async function generateSql() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('DATA BOOK -RESPONSÁVEIS.xlsx');
    const worksheet = workbook.worksheets[0];
    
    let sql = `-- Migration: Create data_book_hydro table and seed data
CREATE TABLE IF NOT EXISTS public.data_book_hydro (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_number TEXT NOT NULL,
    content TEXT,
    responsible TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.data_book_hydro ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated full access to data_book_hydro'
    ) THEN
        CREATE POLICY "Allow authenticated full access to data_book_hydro"
        ON public.data_book_hydro
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;

-- Seed Data
`;
    
    // Rows to insert
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Row 1 and 2 are headers/titles
      if (rowNumber > 2) {
        let item_number = row.getCell(1).text || '';
        let content = row.getCell(2).text || '';
        let responsible = row.getCell(3).text || '';
        
        // Escape quotes
        item_number = item_number.replace(/'/g, "''");
        content = content.replace(/'/g, "''");
        responsible = responsible.replace(/'/g, "''");
        
        if (item_number || content) {
          sql += `INSERT INTO public.data_book_hydro (item_number, content, responsible) VALUES ('${item_number}', '${content}', '${responsible}');\n`;
        }
      }
    });
    
    fs.writeFileSync('supabase/migrations/20260828212100_create_data_book_hydro.sql', sql);
    console.log("SQL Migration with seed data generated successfully!");
  } catch (err) {
    console.error(err);
  }
}

generateSql();
