
-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  total_images INTEGER NOT NULL DEFAULT 0,
  processed_images INTEGER NOT NULL DEFAULT 0,
  avg_confidence NUMERIC,
  target_languages TEXT[] NOT NULL DEFAULT '{}',
  glossary_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create image_jobs table
CREATE TABLE public.image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  confidence_score NUMERIC,
  storage_path TEXT,
  thumbnail_url TEXT,
  output_path_zh_hant TEXT,
  output_path_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ocr_blocks table
CREATE TABLE public.ocr_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_job_id UUID NOT NULL REFERENCES public.image_jobs(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL DEFAULT 0,
  korean TEXT NOT NULL,
  zh_hant TEXT,
  english TEXT,
  confidence NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_blocks ENABLE ROW LEVEL SECURITY;

-- Public access policies for MVP
CREATE POLICY "Public read batches" ON public.batches FOR SELECT USING (true);
CREATE POLICY "Public insert batches" ON public.batches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update batches" ON public.batches FOR UPDATE USING (true);

CREATE POLICY "Public read image_jobs" ON public.image_jobs FOR SELECT USING (true);
CREATE POLICY "Public insert image_jobs" ON public.image_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update image_jobs" ON public.image_jobs FOR UPDATE USING (true);

CREATE POLICY "Public read ocr_blocks" ON public.ocr_blocks FOR SELECT USING (true);
CREATE POLICY "Public insert ocr_blocks" ON public.ocr_blocks FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_image_jobs_batch_id ON public.image_jobs(batch_id);
CREATE INDEX idx_ocr_blocks_image_job_id ON public.ocr_blocks(image_job_id);

-- Storage bucket for uploaded images
INSERT INTO storage.buckets (id, name, public) VALUES ('batch-images', 'batch-images', true);

CREATE POLICY "Public read batch images" ON storage.objects FOR SELECT USING (bucket_id = 'batch-images');
CREATE POLICY "Public upload batch images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'batch-images');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_image_jobs_updated_at BEFORE UPDATE ON public.image_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
