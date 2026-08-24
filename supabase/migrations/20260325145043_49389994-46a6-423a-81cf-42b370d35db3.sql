-- Delete attendance records for employees not in RH, then delete those employees
DELETE FROM attendance_records WHERE employee_id IN (
  SELECT e.id FROM employees e
  WHERE UPPER(TRIM(e.name)) NOT IN (
    SELECT UPPER(TRIM(c->>'nome'))
    FROM rh_efetivo, jsonb_array_elements(colaboradores) c
  )
);

DELETE FROM employees WHERE UPPER(TRIM(name)) NOT IN (
  SELECT UPPER(TRIM(c->>'nome'))
  FROM rh_efetivo, jsonb_array_elements(colaboradores) c
);