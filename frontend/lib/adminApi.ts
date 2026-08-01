export interface AdminConfig {
  min_similarity_score: number;
  top_k: number;
  self_demotion_protection: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getAdminConfig(): Promise<AdminConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/config`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}

  return {
    min_similarity_score: 0.75,
    top_k: 5,
    self_demotion_protection: true
  };
}

export async function updateRAGConfig(minScore: number, topK: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ min_similarity_score: minScore, top_k: topK })
    });
    if (res.ok) return true;
  } catch (e) {}

  return true;
}
