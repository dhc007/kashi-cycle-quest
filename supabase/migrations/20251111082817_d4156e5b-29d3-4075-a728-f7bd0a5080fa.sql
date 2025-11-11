-- Change specifications column from jsonb to text for proper string storage
ALTER TABLE public.cycles 
ALTER COLUMN specifications TYPE text USING COALESCE(specifications::text, '');

-- Update any specifications that might be stored as JSON strings
UPDATE public.cycles 
SET specifications = REPLACE(REPLACE(specifications, '"', ''), '\n', E'\n')
WHERE specifications IS NOT NULL AND specifications != '';