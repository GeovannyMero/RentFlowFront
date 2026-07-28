/*
# Agregar tipo de gasto a la tabla expenses

1. Modificación de tablas
- Agregar columna `expense_type` a la tabla `expenses`
- Valores permitidos: 'vacancy_maintenance' (mantenimiento cuando está desocupado), 'rented' (cuando está alquilado)
- Valor por defecto: 'rented' para compatibilidad con registros existentes

2. Notas
- Esta modificación permite clasificar los gastos según el estado del departamento
- Los gastos de mantenimiento por vacancia son aquellos realizados cuando el departamento está desocupado
- Los gastos normales son aquellos realizados cuando el departamento está alquilado
*/

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS expense_type VARCHAR(30) NOT NULL DEFAULT 'rented'
CHECK (expense_type IN ('vacancy_maintenance', 'rented'));

CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);