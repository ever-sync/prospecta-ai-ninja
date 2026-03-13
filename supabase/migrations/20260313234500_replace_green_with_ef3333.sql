-- Replace green pipeline stage defaults with #EF3333

ALTER TABLE public.pipeline_stages
  ALTER COLUMN color SET DEFAULT '#EF3333';

UPDATE public.pipeline_stages
SET color = '#EF3333'
WHERE color IN ('#22c55e', '#25D366', '#22C55E', '#25d366');
