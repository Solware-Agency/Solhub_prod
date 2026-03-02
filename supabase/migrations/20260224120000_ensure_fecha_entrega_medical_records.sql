-- Fecha de entrega: editable para marihorgen (entrega presencial).
-- Ya usada en app al enviar email; asegurar que la columna exista.
ALTER TABLE public.medical_records_clean
ADD COLUMN IF NOT EXISTS fecha_entrega date;
