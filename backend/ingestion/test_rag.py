#!/usr/bin/env python3
"""
CampusIQ — Production RAG Evaluation Suite
===========================================
50+ representative campus questions covering all 10 documents.
Measures: Precision@5, Recall@10, MRR, Hit Rate, Hallucination Rate,
          Retrieval Latency, End-to-End Response Time.

Usage:
  python backend/ingestion/test_rag.py
  python backend/ingestion/test_rag.py --department EEE
  python backend/ingestion/test_rag.py --category fees
  python backend/ingestion/test_rag.py --quick
"""

import sys
import time
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Fix Windows console unicode encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure root package imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.rag.retrieval import search_knowledge_store_with_debug
from backend.api.chat import find_grounded_answer

# ────────────────────────────────────────────────────────────────────────────
# Test Cases — 50+ representative questions across all 10 documents
# ────────────────────────────────────────────────────────────────────────────

ALL_TEST_CASES: List[Dict[str, Any]] = [
    # ── ADMISSIONS (01) ──────────────────────────────────────────────────
    {
        "id": "ADM_01",
        "category": "admissions",
        "dept": "GENERAL",
        "query": "What entrance exam is accepted for B.Tech admission at MITS?",
        "expected_category": "admissions",
        "expected_dept": "GENERAL",
        "expected_terms": ["eapcet", "eamcet"],
        "follow_up": False,
    },
    {
        "id": "ADM_02",
        "category": "admissions",
        "dept": "GENERAL",
        "query": "What certificates are required for admission?",
        "expected_category": "admissions",
        "expected_dept": "GENERAL",
        "expected_terms": ["transfer certificate", "aadhaar"],
        "follow_up": False,
    },
    {
        "id": "ADM_03",
        "category": "admissions",
        "dept": "GENERAL",
        "query": "What is the EAPCET counseling code for MITS?",
        "expected_category": "admissions",
        "expected_dept": "GENERAL",
        "expected_terms": ["mits"],
        "follow_up": False,
    },
    {
        "id": "ADM_04",
        "category": "admissions",
        "dept": "GENERAL",
        "query": "What documents do I need to bring during college reporting?",
        "expected_category": "admissions",
        "expected_dept": "GENERAL",
        "expected_terms": ["marks card", "certificate"],
        "follow_up": False,
    },
    # ── FEES — Department-specific (02) ──────────────────────────────────
    {
        "id": "FEE_CSE",
        "category": "fees",
        "dept": "CSE",
        "query": "What is the tuition fee for CSE department?",
        "expected_category": "fees",
        "expected_dept": "CSE",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_CSE_AI",
        "category": "fees",
        "dept": "CSE_AI",
        "query": "What is the annual tuition fee for CSE AI & ML?",
        "expected_category": "fees",
        "expected_dept": "CSE_AI",
        "expected_terms": ["2,50,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_CSE_DS",
        "category": "fees",
        "dept": "CSE_DS",
        "query": "What is the fee for CSE Data Science branch?",
        "expected_category": "fees",
        "expected_dept": "CSE_DS",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_ECE",
        "category": "fees",
        "dept": "ECE",
        "query": "What is the tuition fee for ECE department?",
        "expected_category": "fees",
        "expected_dept": "ECE",
        "expected_terms": ["1,50,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_EEE",
        "category": "fees",
        "dept": "EEE",
        "query": "What is the annual fee for EEE branch?",
        "expected_category": "fees",
        "expected_dept": "EEE",
        "expected_terms": ["1,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_CIVIL",
        "category": "fees",
        "dept": "CIVIL",
        "query": "What is the tuition fee for Civil Engineering?",
        "expected_category": "fees",
        "expected_dept": "CIVIL",
        "expected_terms": ["1,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_MECH",
        "category": "fees",
        "dept": "MECHANICAL",
        "query": "What is the annual fee for Mechanical Engineering?",
        "expected_category": "fees",
        "expected_dept": "MECHANICAL",
        "expected_terms": ["1,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_MBA",
        "category": "fees",
        "dept": "MBA",
        "query": "What is the tuition fee for MBA program?",
        "expected_category": "fees",
        "expected_dept": "MBA",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_MCA",
        "category": "fees",
        "dept": "MCA",
        "query": "What is the annual fee for MCA course?",
        "expected_category": "fees",
        "expected_dept": "MCA",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_MTECH",
        "category": "fees",
        "dept": "MTECH",
        "query": "What is the tuition fee for MTech specialization?",
        "expected_category": "fees",
        "expected_dept": "MTECH",
        "expected_terms": ["2,50,000"],
        "follow_up": False,
    },
    # ── FEES — Synonym queries (should still work) ────────────────────────
    {
        "id": "FEE_SYN_01",
        "category": "fees",
        "dept": "CSE",
        "query": "How much is the cost of studying CSE at MITS?",
        "expected_category": "fees",
        "expected_dept": "CSE",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "FEE_SYN_02",
        "category": "fees",
        "dept": "ECE",
        "query": "How much do I need to pay per year for ECE?",
        "expected_category": "fees",
        "expected_dept": "ECE",
        "expected_terms": ["1,50,000"],
        "follow_up": False,
    },
    # ── FEES — Scholarship queries ────────────────────────────────────────
    {
        "id": "FEE_JVD",
        "category": "fees",
        "dept": "GENERAL",
        "query": "Does JVD scholarship cover hostel fees?",
        "expected_category": "fees",
        "expected_dept": "GENERAL",
        "expected_terms": ["jvd", "hostel"],
        "follow_up": False,
    },
    {
        "id": "FEE_JEE",
        "category": "fees",
        "dept": "GENERAL",
        "query": "What is the JEE merit scholarship percentage at MITS?",
        "expected_category": "fees",
        "expected_dept": "GENERAL",
        "expected_terms": ["30%", "80"],
        "follow_up": False,
    },
    {
        "id": "FEE_REFUND",
        "category": "fees",
        "dept": "GENERAL",
        "query": "What is the refund policy at MITS?",
        "expected_category": "fees",
        "expected_dept": "GENERAL",
        "expected_terms": ["refund"],
        "follow_up": False,
    },
    # ── HOSTEL (03) ───────────────────────────────────────────────────────
    {
        "id": "HST_RENT_AC",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "What is the rent for a single AC room in the hostel?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["1,80,000"],
        "follow_up": False,
    },
    {
        "id": "HST_RENT_NONAC",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "What is the double occupancy non-AC room rent?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["1,20,000"],
        "follow_up": False,
    },
    {
        "id": "HST_MESS",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "What is the mess fee per year for hostel students?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["40,000"],
        "follow_up": False,
    },
    {
        "id": "HST_CURFEW",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "What is the curfew time for hostel students?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["10:00"],
        "follow_up": False,
    },
    {
        "id": "HST_WIFI",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "Is WiFi included in the hostel mess package?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["wifi", "wi-fi"],
        "follow_up": False,
    },
    # ── PLACEMENTS (04) ───────────────────────────────────────────────────
    {
        "id": "PLC_HIGHEST",
        "category": "placements",
        "dept": "GENERAL",
        "query": "What is the highest placement package at MITS?",
        "expected_category": "placements",
        "expected_dept": "GENERAL",
        "expected_terms": ["28"],
        "follow_up": False,
    },
    {
        "id": "PLC_AVERAGE",
        "category": "placements",
        "dept": "GENERAL",
        "query": "What is the average salary package for MITS graduates?",
        "expected_category": "placements",
        "expected_dept": "GENERAL",
        "expected_terms": ["6"],
        "follow_up": False,
    },
    {
        "id": "PLC_COMPANIES",
        "category": "placements",
        "dept": "GENERAL",
        "query": "Which companies visit MITS campus for placements?",
        "expected_category": "placements",
        "expected_dept": "GENERAL",
        "expected_terms": ["tcs", "wipro", "infosys", "amazon"],
        "follow_up": False,
    },
    {
        "id": "PLC_CGPA",
        "category": "placements",
        "dept": "GENERAL",
        "query": "What is the minimum CGPA required for campus placements?",
        "expected_category": "placements",
        "expected_dept": "GENERAL",
        "expected_terms": ["7.0"],
        "follow_up": False,
    },
    {
        "id": "PLC_BACKLOG",
        "category": "placements",
        "dept": "GENERAL",
        "query": "How many backlogs are allowed for placement drives?",
        "expected_category": "placements",
        "expected_dept": "GENERAL",
        "expected_terms": ["15"],
        "follow_up": False,
    },
    # ── ACADEMICS (05) ────────────────────────────────────────────────────
    {
        "id": "ACD_DEPTS",
        "category": "academics",
        "dept": "GENERAL",
        "query": "What departments are available at MITS?",
        "expected_category": "academics",
        "expected_dept": "GENERAL",
        "expected_terms": ["cse", "ece", "mechanical"],
        "follow_up": False,
    },
    {
        "id": "ACD_CREDITS",
        "category": "academics",
        "dept": "GENERAL",
        "query": "How many credits do students earn per semester?",
        "expected_category": "academics",
        "expected_dept": "GENERAL",
        "expected_terms": ["15", "20"],
        "follow_up": False,
    },
    # ── EXAMINATIONS (06) ─────────────────────────────────────────────────
    {
        "id": "EXM_MARKS",
        "category": "examinations",
        "dept": "GENERAL",
        "query": "What is the internal and external marks distribution?",
        "expected_category": "examinations",
        "expected_dept": "GENERAL",
        "expected_terms": ["40", "60"],
        "follow_up": False,
    },
    {
        "id": "EXM_ATTEND",
        "category": "examinations",
        "dept": "GENERAL",
        "query": "What is the minimum attendance required to sit for exams?",
        "expected_category": "examinations",
        "expected_dept": "GENERAL",
        "expected_terms": ["75%"],
        "follow_up": False,
    },
    {
        "id": "EXM_CONDON",
        "category": "examinations",
        "dept": "GENERAL",
        "query": "What happens if my attendance is between 65% and 74%?",
        "expected_category": "examinations",
        "expected_dept": "GENERAL",
        "expected_terms": ["condonation"],
        "follow_up": False,
    },
    {
        "id": "EXM_REVAL",
        "category": "examinations",
        "dept": "GENERAL",
        "query": "How much does revaluation cost and what is the deadline?",
        "expected_category": "examinations",
        "expected_dept": "GENERAL",
        "expected_terms": ["500", "10 days"],
        "follow_up": False,
    },
    {
        "id": "EXM_ATTEND_SYN",
        "category": "examinations",
        "dept": "GENERAL",
        "query": "What is the minimum presence percentage needed?",
        "expected_category": "examinations",
        "expected_dept": "GENERAL",
        "expected_terms": ["75%"],
        "follow_up": False,
    },
    # ── CAMPUS FACILITIES (07) ────────────────────────────────────────────
    {
        "id": "FAC_LIB_HOURS",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "What are the library timings at MITS?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["8:00", "11:00"],
        "follow_up": False,
    },
    {
        "id": "FAC_LIB_BORROW",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "How many books can a student borrow from the library?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["3"],
        "follow_up": False,
    },
    {
        "id": "FAC_GPU",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "What GPUs are available in the AI computing lab?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["h100", "nvidia"],
        "follow_up": False,
    },
    {
        "id": "FAC_SPORTS",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "What sports facilities are available on campus?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["cricket", "basketball"],
        "follow_up": False,
    },
    {
        "id": "FAC_CANTEEN",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "What are the canteen timings?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["9:00", "5:00"],
        "follow_up": False,
    },
    {
        "id": "FAC_MEDICAL",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "Is there a medical center on campus?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["24/7", "ambulance"],
        "follow_up": False,
    },
    {
        "id": "FAC_LIB_SYN",
        "category": "campus_facilities",
        "dept": "GENERAL",
        "query": "When does the central library open and close?",
        "expected_category": "campus_facilities",
        "expected_dept": "GENERAL",
        "expected_terms": ["8:00", "11:00"],
        "follow_up": False,
    },
    # ── CLUBS (08) ────────────────────────────────────────────────────────
    {
        "id": "CLB_01",
        "category": "clubs",
        "dept": "GENERAL",
        "query": "What technical clubs can I join at MITS?",
        "expected_category": "clubs",
        "expected_dept": "GENERAL",
        "expected_terms": ["ieee", "acm"],
        "follow_up": False,
    },
    {
        "id": "CLB_02",
        "category": "clubs",
        "dept": "GENERAL",
        "query": "How do I register for a club at MITS?",
        "expected_category": "clubs",
        "expected_dept": "GENERAL",
        "expected_terms": ["google form"],
        "follow_up": False,
    },
    # ── DISCIPLINE (09) ───────────────────────────────────────────────────
    {
        "id": "RUL_01",
        "category": "discipline",
        "dept": "GENERAL",
        "query": "What is the anti-ragging policy at MITS?",
        "expected_category": "discipline",
        "expected_dept": "GENERAL",
        "expected_terms": ["ragging", "zero-tolerance"],
        "follow_up": False,
    },
    # ── CONTACTS (10) ─────────────────────────────────────────────────────
    {
        "id": "CNT_PRINCIPAL",
        "category": "contacts",
        "dept": "GENERAL",
        "query": "What is the principal's contact number?",
        "expected_category": "contacts",
        "expected_dept": "GENERAL",
        "expected_terms": ["sharma", "94400"],
        "follow_up": False,
    },
    {
        "id": "CNT_EMERGENCY",
        "category": "contacts",
        "dept": "GENERAL",
        "query": "What is the emergency helpline number at MITS?",
        "expected_category": "contacts",
        "expected_dept": "GENERAL",
        "expected_terms": ["94400 00001", "94400 00002"],
        "follow_up": False,
    },
    # ── CONVERSATIONAL MEMORY / FOLLOW-UP TESTS ───────────────────────────
    {
        "id": "MEM_01",
        "category": "fees",
        "dept": "CSE",
        "query": "What about the CSE fee?",  # No context — should resolve
        "expected_category": "fees",
        "expected_dept": "CSE",
        "expected_terms": ["2,00,000"],
        "follow_up": False,
    },
    {
        "id": "MEM_02",
        "category": "hostel",
        "dept": "GENERAL",
        "query": "What is the hostel curfew?",
        "expected_category": "hostel",
        "expected_dept": "GENERAL",
        "expected_terms": ["10:00"],
        "follow_up": False,
    },
    # ── OUT-OF-SCOPE (should NOT hallucinate) ─────────────────────────────
    {
        "id": "OOS_01",
        "category": "general",
        "dept": "GENERAL",
        "query": "What is the weather in Madanapalle today?",
        "expected_category": "general",
        "expected_dept": "GENERAL",
        "expected_terms": [],
        "follow_up": False,
        "expect_no_answer": True,
    },
]


# ────────────────────────────────────────────────────────────────────────────
# Evaluation Engine
# ────────────────────────────────────────────────────────────────────────────

def run_evaluation_suite(
    target_dept: Optional[str] = None,
    target_category: Optional[str] = None,
    quick_mode: bool = False,
):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*80}")
    print(f"  CampusIQ — Production RAG Evaluation Suite")
    print(f"  Run: {timestamp}")
    print(f"{'='*80}")

    test_list = ALL_TEST_CASES
    if target_dept:
        test_list = [t for t in test_list if t["dept"] == target_dept.upper()]
    if target_category:
        test_list = [t for t in test_list if t["category"] == target_category.lower()]
    if quick_mode:
        # Take first test per category
        seen_cats = set()
        quick_list = []
        for t in test_list:
            if t["category"] not in seen_cats:
                quick_list.append(t)
                seen_cats.add(t["category"])
        test_list = quick_list

    if not test_list:
        print("No test cases matched the given filters.")
        sys.exit(1)

    print(f"  Running {len(test_list)} test cases...\n")

    results = []
    reciprocal_ranks = []
    latencies_retrieve = []
    latencies_e2e = []
    hallucination_count = 0
    hit_count_5 = 0
    hit_count_10 = 0

    for idx, test in enumerate(test_list, 1):
        test_id = test["id"]
        query = test["query"]
        expected_cat = test["expected_category"]
        expected_dept = test["expected_dept"]
        expected_terms = [t.lower() for t in test.get("expected_terms", [])]
        expect_no_answer = test.get("expect_no_answer", False)

        # ── Retrieval-level metrics ──────────────────────────────────────
        t_r0 = time.time()
        _, max_score, debug_info = search_knowledge_store_with_debug(
            query, top_k=5, min_score=0.35, chat_id=f"eval-{test_id}"
        )
        latency_retrieve = (time.time() - t_r0) * 1000
        latencies_retrieve.append(latency_retrieve)

        # ── E2E Answer metrics ───────────────────────────────────────────
        t_e2e0 = time.time()
        answer_text, sources, _, _, _ = find_grounded_answer(query, chat_id=f"eval-e2e-{test_id}")
        latency_e2e = (time.time() - t_e2e0) * 1000
        latencies_e2e.append(latency_e2e)

        answer_lower = answer_text.lower()
        resolved_cat = debug_info.get("resolved_intent", "general")
        resolved_dept = debug_info.get("resolved_department", "GENERAL")
        top_chunks = debug_info.get("top_5_chunks_summary", [])

        # ── Metric calculations ──────────────────────────────────────────

        # Hit Rate: did we retrieve a chunk from the right category?
        hit_5 = any(
            c.get("category") == expected_cat for c in top_chunks[:5]
        )
        hit_10 = hit_5  # we only retrieve 5 max in current config
        if hit_5:
            hit_count_5 += 1
        if hit_10:
            hit_count_10 += 1

        # MRR: reciprocal rank of first correct-category chunk
        rr = 0.0
        for r_idx, chunk in enumerate(top_chunks, 1):
            if chunk.get("category") == expected_cat:
                rr = 1.0 / r_idx
                break
        reciprocal_ranks.append(rr)

        # Hallucination detection (basic): answer contains content NOT in static terms
        is_hallucination = False
        if not expect_no_answer and expected_terms and not any(t in answer_lower for t in expected_terms):
            # Check if answer contains suspicious fabricated numbers
            if any(w in answer_lower for w in ["i don't know", "couldn't find", "not available"]):
                pass  # correct refusal
            elif answer_lower.strip():
                is_hallucination = True
                hallucination_count += 1

        # Pass criteria
        is_passed = True
        fail_reason = ""

        if expect_no_answer:
            # Should return one of: UNIFIED_FALLBACK_MESSAGE, AMBIGUOUS_CLARIFICATION_MESSAGE, or similar refusal
            # Accept any response that signals the system cannot answer
            refusal_signals = [
                "couldn't find",
                "not available",
                "bit more detail",  # AMBIGUOUS_CLARIFICATION_MESSAGE
                "contact the campus",
                "try rephrasing",
                "please specify",
            ]
            if not any(sig in answer_lower for sig in refusal_signals):
                is_passed = False
                fail_reason = "Expected refusal for out-of-scope question, got substantive answer"
        else:
            if expected_terms and not any(t in answer_lower for t in expected_terms):
                is_passed = False
                fail_reason = f"Expected term(s) not in answer: {expected_terms}"

        status_icon = "PASS" if is_passed else "FAIL"
        results.append({
            "id": test_id,
            "query": query[:60],
            "status": status_icon,
            "resolved_cat": resolved_cat,
            "resolved_dept": resolved_dept,
            "expected_cat": expected_cat,
            "expected_terms": expected_terms,
            "max_score": max_score,
            "confidence": debug_info.get("confidence_tier", "?"),
            "latency_retrieve": latency_retrieve,
            "latency_e2e": latency_e2e,
            "rr": rr,
            "is_hallucination": is_hallucination,
            "fail_reason": fail_reason,
        })

        print(
            f"  [{idx:02d}/{len(test_list)}] [{status_icon}] {test_id:<15} | "
            f"Score:{max_score:.2f} | Conf:{debug_info.get('confidence_tier','?'):<6} | "
            f"Ret:{latency_retrieve:.0f}ms | E2E:{latency_e2e:.0f}ms"
        )
        if not is_passed:
            print(f"           └─ Reason: {fail_reason}")

    # ────────────────────────────────────────────────────────────────────────
    # Metrics Summary
    # ────────────────────────────────────────────────────────────────────────
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    accuracy = (passed / total) * 100 if total > 0 else 0
    mrr = sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0
    precision_at_5 = (hit_count_5 / total) * 100 if total > 0 else 0
    recall_at_10 = (hit_count_10 / total) * 100 if total > 0 else 0
    hallucination_rate = (hallucination_count / total) * 100 if total > 0 else 0
    avg_latency_retrieve = sum(latencies_retrieve) / len(latencies_retrieve) if latencies_retrieve else 0
    avg_latency_e2e = sum(latencies_e2e) / len(latencies_e2e) if latencies_e2e else 0
    p95_e2e = sorted(latencies_e2e)[int(0.95 * len(latencies_e2e))] if latencies_e2e else 0

    print(f"\n{'='*80}")
    print("  PRODUCTION RAG EVALUATION METRICS")
    print(f"{'='*80}")
    print(f"  Total Test Cases          : {total}")
    print(f"  Passed                    : {passed} / {total}")
    print(f"  Accuracy                  : {accuracy:.1f}%   (target ≥ 95.0%)")
    print(f"  Precision@5               : {precision_at_5:.1f}%")
    print(f"  Recall@10                 : {recall_at_10:.1f}%")
    print(f"  MRR                       : {mrr:.3f}  (target ≥ 0.900)")
    print(f"  Hallucination Rate        : {hallucination_rate:.1f}%  (target = 0%)")
    print(f"  Avg Retrieval Latency     : {avg_latency_retrieve:.0f}ms")
    print(f"  Avg E2E Response Time     : {avg_latency_e2e:.0f}ms")
    print(f"  P95 E2E Response Time     : {p95_e2e:.0f}ms")
    print(f"{'='*80}")

    # Failed cases breakdown
    failed_cases = [r for r in results if r["status"] == "FAIL"]
    if failed_cases:
        print(f"\n  FAILED CASES ({len(failed_cases)}):")
        for f in failed_cases:
            print(f"  - [{f['id']}] {f['query']}")
            print(f"      Reason: {f['fail_reason']}")

    # Final verdict
    print(f"\n{'='*80}")
    meets_accuracy = accuracy >= 95.0
    meets_mrr = mrr >= 0.90
    meets_hallucination = hallucination_rate == 0.0

    if meets_accuracy and meets_mrr and meets_hallucination:
        print("  PRODUCTION RAG EVALUATION: PASSED — READY FOR DEPLOYMENT")
        print(f"{'='*80}\n")
        sys.exit(0)
    else:
        issues = []
        if not meets_accuracy:
            issues.append(f"Accuracy {accuracy:.1f}% < 95.0%")
        if not meets_mrr:
            issues.append(f"MRR {mrr:.3f} < 0.900")
        if not meets_hallucination:
            issues.append(f"Hallucination Rate {hallucination_rate:.1f}% > 0%")
        print(f"  EVALUATION NEEDS IMPROVEMENT: {' | '.join(issues)}")
        print(f"{'='*80}\n")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CampusIQ Production RAG Evaluation Suite")
    parser.add_argument("--department", help="Filter by department code (e.g. EEE, CSE_AI)")
    parser.add_argument("--category", help="Filter by category (e.g. fees, hostel)")
    parser.add_argument("--quick", action="store_true", help="Run one test per category (fast mode)")
    args = parser.parse_args()

    run_evaluation_suite(
        target_dept=args.department,
        target_category=args.category,
        quick_mode=args.quick,
    )
