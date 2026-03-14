import { supabase } from '@/integrations/supabase/client';

export type Batch = {
  id: string;
  name: string;
  status: string;
  total_images: number;
  processed_images: number;
  avg_confidence: number | null;
  created_at: string;
  target_languages: string[];
  glossary_id: string | null;
};

export type ImageJob = {
  id: string;
  batch_id: string;
  filename: string;
  status: string;
  confidence_score: number | null;
  storage_path: string | null;
  thumbnail_url: string | null;
  output_path_zh_hant: string | null;
  output_path_en: string | null;
};

export type OcrBlock = {
  id: string;
  image_job_id: string;
  block_index: number;
  korean: string;
  zh_hant: string | null;
  english: string | null;
  confidence: number | null;
};

export const api = {
  batches: {
    list: async (): Promise<Batch[]> => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    get: async (id: string): Promise<Batch | null> => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    },

    getImages: async (batchId: string, filter?: string | null): Promise<ImageJob[]> => {
      let query = supabase
        .from('image_jobs')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (filter === 'high') query = query.eq('status', 'high_confidence');
      if (filter === 'medium') query = query.eq('status', 'medium_confidence');
      if (filter === 'low') query = query.eq('status', 'low_confidence');
      if (filter === 'flagged') query = query.eq('status', 'flagged');

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    getOcrBlocks: async (imageJobId: string): Promise<OcrBlock[]> => {
      const { data, error } = await supabase
        .from('ocr_blocks')
        .select('*')
        .eq('image_job_id', imageJobId)
        .order('block_index', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    create: async (
      name: string,
      targetLangs: string[],
      glossaryId: string,
      files: File[]
    ): Promise<Batch> => {
      // 1. Create batch
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          name,
          target_languages: targetLangs,
          glossary_id: glossaryId || null,
          total_images: files.length,
          status: 'queued',
        })
        .select()
        .single();

      if (batchError || !batch) throw batchError || new Error('Failed to create batch');

      // 2. Upload images and create image jobs
      for (const file of files) {
        const storagePath = `${batch.id}/${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('batch-images')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL for thumbnail
        const { data: urlData } = supabase.storage
          .from('batch-images')
          .getPublicUrl(storagePath);

        // Create image job
        const { data: imageJob, error: jobError } = await supabase
          .from('image_jobs')
          .insert({
            batch_id: batch.id,
            filename: file.name,
            storage_path: storagePath,
            thumbnail_url: urlData?.publicUrl || null,
            status: 'pending',
          })
          .select()
          .single();

        if (jobError || !imageJob) {
          console.error('Job creation error:', jobError);
          continue;
        }

        // 3. Trigger processing (fire and forget)
        supabase.functions
          .invoke('process-image', {
            body: { image_job_id: imageJob.id, target_languages: targetLangs },
          })
          .then(({ error }) => {
            if (error) console.error('Process error for', file.name, error);
          });
      }

      // Update batch status
      await supabase
        .from('batches')
        .update({ status: 'translating' })
        .eq('id', batch.id);

      return { ...batch, status: 'translating' };
    },

    approve: async (imageId: string): Promise<void> => {
      await supabase
        .from('image_jobs')
        .update({ status: 'approved' })
        .eq('id', imageId);
    },
  },
};
