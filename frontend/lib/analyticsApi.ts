export interface AnalyticsSummary {
  total_queries: number;
  avg_latency_ms: number;
  successful_rag_rate: number;
  unanswered_queries_count: number;
}

export interface UnansweredLog {
  id: string;
  query_text: string;
  highest_score: number;
  timestamp: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}

  return {
    total_queries: 1240,
    avg_latency_ms: 185,
    successful_rag_rate: 94.2,
    unanswered_queries_count: 14
  };
}

export async function getUnansweredLogs(): Promise<UnansweredLog[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/unanswered`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}

  return [
    {
      id: "u1",
      query_text: "What are the rules for inter-college transfer in 3rd semester?",
      highest_score: 0.62,
      timestamp: "2026-07-28 16:45:10"
    },
    {
      id: "u2",
      query_text: "Is there any fee waiver for sports quota candidates?",
      highest_score: 0.58,
      timestamp: "2026-07-27 11:20:04"
    }
  ];
}
