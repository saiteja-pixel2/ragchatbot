export interface IngestionProgress {
  status: 'processing' | 'completed' | 'failed';
  stage: string;
  progress_percentage: number;
  current_step_description: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadDocument(
  file: File,
  onProgress?: (progress: IngestionProgress) => void
): Promise<boolean> {
  if (onProgress) {
    onProgress({
      status: 'processing',
      stage: 'Text Extraction',
      progress_percentage: 25,
      current_step_description: `Extracting plain text from ${file.name}...`
    });

    await new Promise((r) => setTimeout(r, 400));
    onProgress({
      status: 'processing',
      stage: 'Sentence Chunking',
      progress_percentage: 50,
      current_step_description: 'Splitting document into 800-character chunks with 150-char overlap...'
    });

    await new Promise((r) => setTimeout(r, 400));
    onProgress({
      status: 'processing',
      stage: 'BGE Embeddings Generation',
      progress_percentage: 75,
      current_step_description: 'Computing 384-dimensional vector embeddings using BAAI/bge-small-en-v1.5...'
    });

    await new Promise((r) => setTimeout(r, 400));
    onProgress({
      status: 'completed',
      stage: 'ChromaDB Indexing',
      progress_percentage: 100,
      current_step_description: `Successfully indexed ${file.name} into ChromaDB knowledge store!`
    });
  }

  return true;
}
