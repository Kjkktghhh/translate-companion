export type Batch = {
  id: string;
  name: string;
  status: string;
  total_images: number;
  processed_images: number;
  avg_confidence: number | null;
  created_at: string;
  target_languages: string[];
};

export type OcrBlock = {
  korean: string;
  zh_hant: string;
  english: string;
};

export type ImageJob = {
  id: string;
  filename: string;
  status: string;
  confidence_score: number | null;
  ocr_data: { total_blocks: number } | null;
  output_path_zh_hant: string | null;
  output_path_en: string | null;
  thumbnail?: string;
  translated_zh_hant?: string;
  translated_en?: string;
  ocr_blocks?: OcrBlock[];
};

export type Glossary = {
  id: string;
  name: string;
  description: string;
  entry_count: number;
};

export type GlossaryEntry = {
  korean: string;
  zh_hant: string;
  english: string;
  category: string;
  do_not_translate: boolean;
};

const MOCK_BATCHES: Batch[] = [
  {
    id: '0',
    name: "d'Alba UV Essence Cover-Up",
    status: 'review_ready',
    total_images: 1,
    processed_images: 1,
    avg_confidence: 92.1,
    created_at: '2026-03-13T08:00:00Z',
    target_languages: ['zh-Hant', 'en'],
  },
  {
    id: '1',
    name: 'Brand X Summer 2026',
    status: 'review_ready',
    total_images: 24,
    processed_images: 24,
    avg_confidence: 87.3,
    created_at: '2026-03-10T10:00:00Z',
    target_languages: ['zh-Hant', 'en'],
  },
  {
    id: '2',
    name: 'Skincare Line Autumn',
    status: 'translating',
    total_images: 50,
    processed_images: 32,
    avg_confidence: 91.2,
    created_at: '2026-03-11T14:30:00Z',
    target_languages: ['zh-Hant'],
  },
  {
    id: '3',
    name: 'Cosmetics Promo Set',
    status: 'complete',
    total_images: 12,
    processed_images: 12,
    avg_confidence: 94.5,
    created_at: '2026-03-08T09:15:00Z',
    target_languages: ['zh-Hant', 'en'],
  },
];

import dalbaImage from '@/assets/sample-dalba.png';
import dalbaZhHant from '@/assets/sample-dalba-zh-hant.png';
import dalbaEn from '@/assets/sample-dalba-en.png';

const DALBA_OCR_BLOCKS: OcrBlock[] = [
  { korean: '내추럴 커버 베이지 선크림', zh_hant: '自然遮瑕米色防曬霜', english: 'Natural Cover Beige Sunscreen' },
  { korean: '산뜻', zh_hant: '清爽', english: 'Fresh' },
  { korean: '윤광', zh_hant: '光澤', english: 'Radiant Glow' },
  { korean: '얼룩덜룩한 피부에 자연스러운 피부톤&잡티 커버', zh_hant: '為不均勻膚色帶來自然膚色遮瑕效果', english: 'Natural skin tone & blemish coverage for uneven skin' },
  { korean: '커버력', zh_hant: '遮瑕力', english: 'Coverage' },
  { korean: '에센스 선크림 (투명 선크림)', zh_hant: '精華防曬霜（透明防曬霜）', english: 'Essence Sunscreen (Clear Sunscreen)' },
  { korean: '글로우 세럼 커버 쿠션', zh_hant: '光澤精華遮瑕氣墊', english: 'Glow Serum Cover Cushion' },
  { korean: '수분감', zh_hant: '保濕度', english: 'Moisture Level' },
  { korean: '파우더', zh_hant: '粉餅', english: 'Powder' },
  { korean: '수분 크림', zh_hant: '保濕霜', english: 'Moisture Cream' },
  { korean: '유분감', zh_hant: '油脂感', english: 'Oil Level' },
];

const MOCK_DALBA_IMAGE: ImageJob = {
  id: 'img-dalba',
  filename: 'dalba-uv-essence-cover-up.png',
  status: 'high_confidence',
  confidence_score: 92,
  ocr_data: { total_blocks: 11 },
  output_path_zh_hant: '/mock',
  output_path_en: '/mock',
  thumbnail: dalbaImage,
  translated_zh_hant: dalbaZhHant,
  translated_en: dalbaEn,
  ocr_blocks: DALBA_OCR_BLOCKS,
};

const MOCK_IMAGES: ImageJob[] = [
  { id: 'img1', filename: 'serum-front.jpg', status: 'high_confidence', confidence_score: 95, ocr_data: { total_blocks: 8 }, output_path_zh_hant: '/mock', output_path_en: '/mock' },
  { id: 'img2', filename: 'cream-back.png', status: 'medium_confidence', confidence_score: 78, ocr_data: { total_blocks: 12 }, output_path_zh_hant: '/mock', output_path_en: '/mock' },
  { id: 'img3', filename: 'toner-label.jpg', status: 'low_confidence', confidence_score: 62, ocr_data: { total_blocks: 5 }, output_path_zh_hant: '/mock', output_path_en: null },
  { id: 'img4', filename: 'mask-box.png', status: 'approved', confidence_score: 98, ocr_data: { total_blocks: 3 }, output_path_zh_hant: '/mock', output_path_en: '/mock' },
  { id: 'img5', filename: 'sunscreen-front.jpg', status: 'processing', confidence_score: null, ocr_data: null, output_path_zh_hant: null, output_path_en: null },
  { id: 'img6', filename: 'cleanser-side.png', status: 'high_confidence', confidence_score: 92, ocr_data: { total_blocks: 6 }, output_path_zh_hant: '/mock', output_path_en: '/mock' },
];

const MOCK_GLOSSARIES: Glossary[] = [
  { id: 'g1', name: 'Skincare Terms', description: 'Common skincare product terminology', entry_count: 45 },
  { id: 'g2', name: 'Brand X Official', description: 'Brand-specific terms and trademarks', entry_count: 12 },
];

const MOCK_ENTRIES: GlossaryEntry[] = [
  { korean: '세럼', zh_hant: '精華液', english: 'Serum', category: 'skincare', do_not_translate: false },
  { korean: '히알루론산', zh_hant: '玻尿酸', english: 'Hyaluronic Acid', category: 'ingredient', do_not_translate: false },
  { korean: 'SPF50+', zh_hant: 'SPF50+', english: 'SPF50+', category: 'label', do_not_translate: true },
  { korean: '토너', zh_hant: '化妝水', english: 'Toner', category: 'skincare', do_not_translate: false },
  { korean: '클렌저', zh_hant: '潔面乳', english: 'Cleanser', category: 'skincare', do_not_translate: false },
];

// Simple in-memory store
let batches = [...MOCK_BATCHES];
let glossaries = [...MOCK_GLOSSARIES];
let glossaryEntries: Record<string, GlossaryEntry[]> = {
  g1: [...MOCK_ENTRIES],
  g2: [MOCK_ENTRIES[0], MOCK_ENTRIES[1]],
};
let nextBatchId = 4;
let nextGlossaryId = 3;

export const mockAPI = {
  batches: {
    list: () => Promise.resolve(batches),
    get: (id: string) => Promise.resolve(batches.find(b => b.id === id) || null),
    getImages: (_id: string, _filter?: string | null) => {
      let imgs = _id === '0' ? [MOCK_DALBA_IMAGE] : [...MOCK_IMAGES];
      if (_filter === 'high') imgs = imgs.filter(i => i.status === 'high_confidence');
      if (_filter === 'medium') imgs = imgs.filter(i => i.status === 'medium_confidence');
      if (_filter === 'low') imgs = imgs.filter(i => i.status === 'low_confidence');
      if (_filter === 'flagged') imgs = imgs.filter(i => i.status === 'flagged');
      return Promise.resolve(imgs);
    },
    create: (name: string, targetLangs: string[], glossaryId: string, fileCount: number) => {
      const batch: Batch = {
        id: String(nextBatchId++),
        name,
        status: 'queued',
        total_images: fileCount,
        processed_images: 0,
        avg_confidence: null,
        created_at: new Date().toISOString(),
        target_languages: targetLangs,
      };
      batches = [batch, ...batches];
      return Promise.resolve(batch);
    },
    approve: (_batchId: string, _imageId: string) => Promise.resolve(true),
    exportZipUrl: (id: string) => `#export-${id}`,
  },
  glossaries: {
    list: () => Promise.resolve(glossaries),
    get: (id: string) => Promise.resolve(glossaries.find(g => g.id === id) || null),
    getEntries: (id: string) => Promise.resolve(glossaryEntries[id] || []),
    create: (name: string, description: string) => {
      const g: Glossary = { id: `g${nextGlossaryId++}`, name, description, entry_count: 0 };
      glossaries = [...glossaries, g];
      glossaryEntries[g.id] = [];
      return Promise.resolve(g);
    },
    addEntry: (id: string, entry: GlossaryEntry) => {
      if (!glossaryEntries[id]) glossaryEntries[id] = [];
      glossaryEntries[id].push(entry);
      const g = glossaries.find(g => g.id === id);
      if (g) g.entry_count++;
      return Promise.resolve(true);
    },
    delete: (id: string) => {
      glossaries = glossaries.filter(g => g.id !== id);
      delete glossaryEntries[id];
      return Promise.resolve(true);
    },
  },
};
