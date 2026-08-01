import time
import sys
import os
import re

workspace_dir = r"c:\Users\HP\Downloads\custom_rag_chatbot"
if workspace_dir not in sys.path:
    sys.path.insert(0, workspace_dir)

from backend.api.chat import find_grounded_answer

test_questions = [
    ("Q1", "What is the tuition fee for B.Tech CSE AI & ML?", "2,50,000"),
    ("Q2", "What is the hostel curfew time?", "10:00 PM"),
    ("Q3", "What is the library borrowing limit?", "3 books"),
    ("Q4", "What are the annual campus fests?", "Codechamp"),
    ("Q5", "What is the highest placement package?", "28 LPA"),
    ("Q6", "What is the EAPCET counseling code for MITS?", "MITS"),
    ("Q7", "Does JVD cover hostel fees?", "hostel"),
    ("Q8", "What is the fee for EEE?", "1,00,000"),
    ("Q9", "Who is the President of Quantum Computing Club?", "campusiq@gmail.com"),
    ("Q10", "Tell me about campus space shuttles", "campusiq@gmail.com")
]

rounds = 5
results = []
total_tests = 0
passed_tests = 0

def clean_str(s: str) -> str:
    return re.sub(r'[^\x00-\x7F]+', ' Rs. ', s)

print("=" * 95)
print(f"STARTING 5x CONSISTENCY AUTOMATED TEST SUITE ({rounds} Rounds x {len(test_questions)} Questions = {rounds * len(test_questions)} Queries)")
print("=" * 95)

start_suite = time.time()

for r in range(1, rounds + 1):
    print(f"\n--- ROUND {r} of {rounds} ---")
    for q_id, query, expected_snippet in test_questions:
        total_tests += 1
        t0 = time.time()
        
        answer_text, citations, max_score, debug_info, is_error = find_grounded_answer(query, chat_id=f"test-round-{r}")
        latency_ms = (time.time() - t0) * 1000
        
        is_pass = (expected_snippet.lower() in answer_text.lower()) and not is_error
        if is_pass:
            passed_tests += 1
            status = "PASS"
        else:
            status = "FAIL"
            
        snippet_clean = clean_str(answer_text[:60].replace("\n", " ")) + "..."
        results.append({
            "round": r,
            "q_id": q_id,
            "query": query,
            "status": status,
            "latency_ms": latency_ms,
            "answer_snippet": snippet_clean
        })
        
        print(f"Round {r} | {q_id} | {status} | Latency: {latency_ms:.1f}ms | Output: {snippet_clean[:50]}...")

elapsed_suite = time.time() - start_suite

print("\n" + "=" * 95)
print("RAW CONSISTENCY TEST RESULTS TABLE (50 / 50 EXECUTIONS)")
print("=" * 95)
print(f"{'Round':<6} | {'QID':<5} | {'Status':<6} | {'Latency (ms)':<12} | {'Question & Output Summary':<50}")
print("-" * 95)

for res in results:
    print(f"{res['round']:<6} | {res['q_id']:<5} | {res['status']:<6} | {res['latency_ms']:<12.1f} | {res['q_id']}: {res['answer_snippet']:<45}")

print("=" * 95)
print(f"SUMMARY: {passed_tests} / {total_tests} PASSED ({(passed_tests / total_tests) * 100:.1f}% Success Rate)")
print(f"Total Execution Time: {elapsed_suite:.2f}s | Average Latency: {(elapsed_suite * 1000) / total_tests:.1f}ms per query")
print("=" * 95)
