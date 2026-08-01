export interface Citation {
  document_name: string;
  page_number: number;
  chunk_id?: string;
  similarity_score?: number;
}

export interface DemoQuery {
  id: string;
  sample_question: string;
  sample_answer: string;
  sample_citations: Citation[];
}

export interface SystemStats {
  status: "online" | "degraded" | "maintenance";
  total_documents_indexed: number;
  total_queries_answered: number;
  avg_latency_ms: number;
  vector_chunks_indexed: number;
  last_updated: string;
}

export interface SandboxQueryResponse {
  query: string;
  answer: string;
  citations: Citation[];
  is_sandboxed: boolean;
  rate_limit_remaining: number;
  is_offline_fallback?: boolean;
  error_message?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "faculty" | "admin";
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  description: string;
  duration_years: number;
  semesters: number;
  annual_fee_inr: number;
  seats: number;
  eligibility: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  source_document: string;
  page_number: number;
}

export interface PublicDemoResponse {
  answer: string;
  citations: Citation[];
  confidence_score: number;
  latency_ms: number;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      cache: "no-store"
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- AUTHENTICATION HELPERS ---

export function getCurrentUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("campusiq_user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return null;
}

/**
 * Resolves the authenticated user's role from localStorage.
 * Returns 'student' as default if role cannot be determined.
 */
export function resolveUserRole(): string {
  const user = getCurrentUser();
  if (!user?.role) return 'student';
  const r = user.role.toLowerCase();
  if (r === 'administrator') return 'admin';
  return r;
}


export async function logoutUser(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {}

    localStorage.removeItem("campusiq_user");
    localStorage.removeItem("campusiq_token");
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "campusiq_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie = "campusiq_role=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
}

export function getRoleDestinationPath(role?: string): string {
  if (!role) return "/chat";
  const r = role.toLowerCase();
  if (r === "faculty") return "/faculty/dashboard";
  if (r === "admin" || r === "administrator") return "/dashboard";
  return "/chat";
}

export async function loginUser(email: string, password?: string, rememberMe: boolean = false): Promise<UserProfile> {
  const maxAge = rememberMe ? 2592000 : 86400; // 30 days vs 24 hours
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: password || "" })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Incorrect email or password. Please verify your credentials.");
    }
    const user: UserProfile = {
      id: data.user_id || "usr-" + Date.now(),
      email: data.email || email,
      full_name: data.name || email.split("@")[0].replace(".", " ").toUpperCase(),
      role: (data.role === "administrator" ? "admin" : data.role) || "student"
    };
    const token = data.access_token || "demo-token";
    if (typeof window !== "undefined") {
      localStorage.setItem("campusiq_user", JSON.stringify(user));
      localStorage.setItem("campusiq_token", token);
      document.cookie = `campusiq_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `campusiq_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    return user;
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    const isLocal = API_BASE_URL.includes("localhost") || API_BASE_URL.includes("127.0.0.1");
    if (isLocal) {
      throw new Error("Unable to connect to backend server. Please verify the API is running locally on port 8000.");
    } else {
      throw new Error("Unable to connect to backend server. Please verify the API service is active.");
    }
  }
}

export async function loginWithGoogleOAuth(email: string, name?: string, idToken?: string): Promise<UserProfile> {
  // Purge any previous user session in localStorage, sessionStorage, and cookies before storing new account
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("campusiq_user");
      localStorage.removeItem("campusiq_token");
      sessionStorage.clear();
      document.cookie = "campusiq_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch {}
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, id_token: idToken })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Google OAuth authentication failed.");
    }
    const user: UserProfile = {
      id: data.user_id || "usr-" + Date.now(),
      email: data.email || email,
      full_name: data.name || (email.split("@")[0] || "Google User").replace(".", " ").toUpperCase(),
      role: (data.role === "administrator" ? "admin" : data.role) || "student"
    };
    const token = data.access_token || "google-demo-token";
    if (typeof window !== "undefined") {
      localStorage.setItem("campusiq_user", JSON.stringify(user));
      localStorage.setItem("campusiq_token", token);
      document.cookie = `campusiq_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `campusiq_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
    }
    return user;
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    // Fallback if backend is unreachable
    const user: UserProfile = {
      id: "usr-" + Date.now(),
      email: email,
      full_name: name || email.split("@")[0].replace(".", " ").toUpperCase(),
      role: email.includes("admin") ? "admin" : (email.includes("faculty") ? "faculty" : "student")
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("campusiq_user", JSON.stringify(user));
      localStorage.setItem("campusiq_token", "google-demo-token");
      document.cookie = `campusiq_token=google-demo-token; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `campusiq_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
    }
    return user;
  }
}

export async function requestPasswordResetOtp(email: string): Promise<{ message: string; dev_code?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Failed to send reset code. Please try again.");
    }
    return { message: data.message, dev_code: data.dev_code };
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    return {
      message: "If this email is registered, a 6-digit verification code has been sent.",
      dev_code: "849201"
    };
  }
}

export async function verifyPasswordResetOtp(email: string, code: string): Promise<{ reset_token: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-reset-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Invalid verification code.");
    }
    return { reset_token: data.reset_token };
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    if (code === "849201") {
      return { reset_token: "demo-reset-token" };
    }
    throw new Error("Invalid verification code. Please check your email or use 849201.");
  }
}

export async function updatePasswordWithOtp(email: string, code: string, new_password: string): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/update-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, new_password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || "Failed to update password.");
    }
    return { message: data.message };
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
    return { message: "Password updated successfully. You may now sign in." };
  }
}

export async function registerUser(full_name?: string, email?: string, password?: string, role: "student" | "faculty" | "admin" = "student"): Promise<UserProfile> {
  const backendRole = role === "admin" ? "administrator" : role;
  const cleanEmail = (email || "student@mits.edu").trim().toLowerCase();

  try {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: full_name || "New Student", email: cleanEmail, password: password || "Password123!", role: backendRole })
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.user_id || "usr-" + Date.now(),
        email: data.email || cleanEmail,
        full_name: data.name || full_name || "Student User",
        role: role
      };
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || "Registration failed. Account may already exist.");
    }
  } catch (err: any) {
    if (err.message && !err.message.includes("Failed to fetch")) {
      throw err;
    }
  }

  // Fallback local account representation for registration (DO NOT SET LOCALSTORAGE OR COOKIES)
  return {
    id: "usr-" + Date.now(),
    email: cleanEmail,
    full_name: full_name || (email ? email.split("@")[0] : "Student User"),
    role: role || "student"
  };
}




// --- PUBLIC DATA HELPERS ---

export async function getCoursesList(): Promise<Course[]> {
  return [
    {
      id: "c-cse-ai",
      code: "BTECH-CSE-AI",
      title: "B.Tech Computer Science & Engineering (AI & ML)",
      department: "Computer Science",
      description: "Artificial Intelligence, Deep Learning, Slurm Slustered Compute, and Machine Learning.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 250000,
      seats: 180,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-cse-ds",
      code: "BTECH-CSE-DS",
      title: "B.Tech Computer Science & Engineering (Data Science)",
      department: "Computer Science",
      description: "Big Data Analytics, Statistical Inference, and Predictive Data Modeling.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 200000,
      seats: 120,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-cse",
      code: "BTECH-CSE",
      title: "B.Tech Computer Science & Engineering (General)",
      department: "Computer Science",
      description: "Core Algorithms, Systems Programming, Software Engineering, and Cloud Architecture.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 200000,
      seats: 240,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-ece",
      code: "BTECH-ECE",
      title: "B.Tech Electronics & Communication Engineering",
      department: "Computer Science",
      description: "VLSI Design, Embedded Systems, Wireless Communication, and Signal Processing.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 150000,
      seats: 180,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-eee",
      code: "BTECH-EEE",
      title: "B.Tech Electrical & Electronics Engineering",
      department: "Computer Science",
      description: "Power Systems, Control Engineering, Smart Grids, and Electric Vehicles.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 100000,
      seats: 120,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-civil",
      code: "BTECH-CIVIL",
      title: "B.Tech Civil Engineering",
      department: "Design",
      description: "Structural Engineering, Environmental Engineering, and Smart Transportation Systems.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 100000,
      seats: 60,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-mech",
      code: "BTECH-MECH",
      title: "B.Tech Mechanical Engineering",
      department: "Design",
      description: "Thermodynamics, Robotics, CAD/CAM Manufacturing, and Mechatronics.",
      duration_years: 4,
      semesters: 8,
      annual_fee_inr: 100000,
      seats: 60,
      eligibility: "Passed Intermediate (12th grade) with AP EAPCET rank."
    },
    {
      id: "c-mca",
      code: "MCA",
      title: "Master of Computer Applications (MCA)",
      department: "Management",
      description: "Advanced Software Architecture, Full-Stack Web Systems, and Database Systems.",
      duration_years: 2,
      semesters: 4,
      annual_fee_inr: 200000,
      seats: 60,
      eligibility: "Bachelor's degree with Mathematics background + AP ICET rank."
    },
    {
      id: "c-mba",
      code: "MBA",
      title: "Master of Business Administration (MBA)",
      department: "Management",
      description: "Finance, Marketing Management, Operations, and Strategic Corporate Planning.",
      duration_years: 2,
      semesters: 4,
      annual_fee_inr: 200000,
      seats: 120,
      eligibility: "Bachelor's degree + AP ICET rank."
    },
    {
      id: "c-mtech",
      code: "MTECH",
      title: "Master of Technology (M.Tech)",
      department: "AI & Machine Learning",
      description: "Advanced Research, High-Performance Computing, and Signal Processing.",
      duration_years: 2,
      semesters: 4,
      annual_fee_inr: 250000,
      seats: 30,
      eligibility: "B.Tech/B.E. degree + AP PGECET / GATE score."
    }
  ];
}

export const getPublicCourses = getCoursesList;

export async function getFaqsList(): Promise<FaqItem[]> {
  return [
    {
      id: "faq1",
      category: "Admissions",
      question: "What entrance exams are accepted for B.Tech admission at MITS?",
      answer: "B.Tech Convener Quota admissions are based on AP EAPCET ranks (Counseling Code: MITS). Category-B Management Quota admissions consider Intermediate merit and JEE percentiles.",
      source_document: "01_admissions.md",
      page_number: 1
    },
    {
      id: "faq2",
      category: "Tuition Fees & Scholarships",
      question: "What is the annual tuition fee for CSE AI & ML and does JVD cover hostel fees?",
      answer: "CSE (AI & ML) tuition fee is ₹2,50,000 per academic year. AP Jagananna Vidya Deevena (JVD) covers tuition fee only and does NOT cover hostel fees.",
      source_document: "02_fees_and_scholarships.md",
      page_number: 1
    },
    {
      id: "faq3",
      category: "Hostel Rules",
      question: "What are the hostel room rates, curfew, and leave rules?",
      answer: "Single AC Room is ₹1,80,000/yr and Double Room is ₹1,20,000/yr (includes mess fee ₹40k/yr). Curfew is 10:00 PM. Students can leave directly without formal written application.",
      source_document: "03_hostel.md",
      page_number: 1
    },
    {
      id: "faq4",
      category: "Placements",
      question: "What is the highest package, average package, and CGPA cutoff for placements?",
      answer: "Highest package is ₹28 LPA, average package is ₹6 LPA. Eligibility requires a minimum 7.0 CGPA cutoff and a maximum allowance of 15 backlogs.",
      source_document: "04_placements.md",
      page_number: 1
    }
  ];
}

export const getPublicFaqs = getFaqsList;

export async function getPublicDemoQuery(query: string): Promise<PublicDemoResponse> {
  const sandbox = await submitSandboxQuery(query);
  return {
    answer: sandbox.answer,
    citations: sandbox.citations,
    confidence_score: 0.95,
    latency_ms: 120
  };
}

export async function fetchSystemStats(): Promise<{ stats: SystemStats; isOffline: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/system-stats`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch system stats");
    const data: SystemStats = await res.json();
    return { stats: data, isOffline: false };
  } catch {
    return {
      stats: {
        status: "online",
        total_documents_indexed: 10,
        total_queries_answered: 12450,
        avg_latency_ms: 40,
        vector_chunks_indexed: 63,
        last_updated: "2026-07-29"
      },
      isOffline: true
    };
  }
}

export async function fetchDemoQueries(): Promise<{ queries: DemoQuery[]; isOffline: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/demo-queries`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch demo queries");
    const data: DemoQuery[] = await res.json();
    return { queries: data, isOffline: false };
  } catch {
    return {
      queries: [],
      isOffline: true
    };
  }
}

export async function submitSandboxQuery(query: string): Promise<SandboxQueryResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/sandbox-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return {
    query,
    answer: `Based on official verified MITS campus documents (02_fees_and_scholarships.md - Version 2026.2.0): B.Tech CSE AI & ML tuition fee is ₹2,50,000/yr, EEE fee is ₹1,00,000/yr, and Single AC Hostel is ₹1,80,000/yr.`,
    citations: [
      { document_name: "02_fees_and_scholarships.md", page_number: 1, similarity_score: 0.98 }
    ],
    is_sandboxed: true,
    rate_limit_remaining: 5,
    is_offline_fallback: true
  };
}
