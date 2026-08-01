import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.api.chat import find_grounded_answer, UNIFIED_FALLBACK_MESSAGE

# Exact Unified Fallback Message String
EXPECTED_UNIFIED_FALLBACK = UNIFIED_FALLBACK_MESSAGE

class TestAmbiguousQueries:
    """Test suite ensuring ambiguous queries trigger the unified fallback message without guessing."""

    @pytest.mark.parametrize("query", [
        "what is fees of ee",
        "fees",
        "fee for e",
        "hostel cost",
        "tell me fees",
        "branch fee"
    ])
    def test_ambiguous_queries_return_unified_fallback(self, query):
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert answer == EXPECTED_UNIFIED_FALLBACK, f"Failed for query '{query}'"
        assert len(citations) == 0, f"Expected 0 citations for ambiguous query '{query}'"
        assert debug.get("is_ambiguous") is True, f"Expected is_ambiguous=True for query '{query}'"

class TestOutOfScopeQueries:
    """Test suite ensuring unrelated out-of-scope queries trigger the unified fallback message."""

    @pytest.mark.parametrize("query", [
        "what is the weather today in Madanapalle",
        "who is the president of United States",
        "tell me a joke about cats and dogs",
        "how to cook biryani"
    ])
    def test_out_of_scope_queries_return_unified_fallback(self, query):
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert answer == EXPECTED_UNIFIED_FALLBACK, f"Failed for query '{query}'"
        assert len(citations) == 0, f"Expected 0 citations for out-of-scope query '{query}'"

class TestValidGroundedQueries:
    """Test suite ensuring clear, valid queries return grounded answers with proper citations."""

    def test_eee_fee_query(self):
        query = "what is fee for EEE"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "Electrical & Electronics Engineering (EEE)" in answer or "₹1,00,000" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75
        assert "02_fees_and_scholarships" in citations[0]["filename"]

    def test_cse_ai_fee_query(self):
        query = "what is the tuition fee for CSE AI"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "₹2,50,000" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75

    def test_hostel_ac_single_room_query(self):
        query = "hostel single ac room fee"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "₹1,80,000" in answer
        assert len(citations) > 0
        assert "03_hostel" in citations[0]["filename"]

    def test_library_hours_query(self):
        query = "central library operating hours"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "8:00 AM - 11:00 PM" in answer
        assert len(citations) > 0
        assert "07_campus_facilities" in citations[0]["filename"]

    def test_eee_natural_language_cost_query(self):
        query = "how much does it cost to study EEE"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "₹1,00,000" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75

    def test_mechanical_natural_language_pay_query(self):
        query = "what will I pay per year in mechanical branch"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "₹1,00,000" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75

    def test_sports_facility_query(self):
        query = "which sports are available"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "Cricket Ground" in answer or "Gymnasium" in answer or "Basketball" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75

    def test_visiting_companies_query(self):
        query = "which campanys visiting for campus selections"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "TCS" in answer or "Wipro" in answer or "Amazon" in answer
        assert len(citations) > 0
        assert citations[0]["similarity_score"] >= 0.75

    def test_admission_documents_query(self):
        query = "what documents are required for admission"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "Intermediate" in answer or "Transfer Certificate" in answer or "Aadhaar" in answer
        assert len(citations) > 0

    def test_hostel_curfew_query(self):
        query = "what is the curfew time for hostel"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "10:00 PM" in answer
        assert len(citations) > 0

    def test_revaluation_fee_query(self):
        query = "what is the revaluation fee for exam"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "₹500" in answer
        assert len(citations) > 0

    def test_principal_contact_query(self):
        query = "who is the principal of the college"
        answer, citations, max_score, debug = find_grounded_answer(query)
        assert "Dr. K. V. Sharma" in answer
        assert len(citations) > 0


def run_summary():
    print("\n" + "="*110)
    print("                              RAG RETRIEVAL TEST SUITE SUMMARY                             ")
    print("="*110)

    test_cases = [
        ("Ambiguous Branch", "what is fees of ee", True),
        ("Ambiguous Query", "fees", True),
        ("Ambiguous Fragment", "fee for e", True),
        ("Ambiguous Vague", "hostel cost", True),
        ("Ambiguous Vague", "tell me fees", True),
        ("Ambiguous Vague", "branch fee", True),
        ("Out-of-Scope", "what is the weather today in Madanapalle", True),
        ("Out-of-Scope", "who is the president of United States", True),
        ("Out-of-Scope", "tell me a joke about cats and dogs", True),
        ("Out-of-Scope", "how to cook biryani", True),
        ("Valid Grounded", "what is fee for EEE", False),
        ("Valid Grounded", "what is the tuition fee for CSE AI", False),
        ("Valid Grounded", "hostel single ac room fee", False),
        ("Valid Grounded", "central library operating hours", False),
        ("Valid Natural Lang", "how much does it cost to study EEE", False),
        ("Valid Natural Lang", "what will I pay per year in mechanical branch", False),
        ("Valid Sports Query", "which sports are available", False),
        ("Valid Selection Query", "which campanys visiting for campus selections", False),
        ("Valid Admission Query", "what documents are required for admission", False),
        ("Valid Hostel Query", "what is the curfew time for hostel", False),
        ("Valid Exam Query", "what is the revaluation fee for exam", False),
        ("Valid Contact Query", "who is the principal of the college", False),
    ]

    passed_count = 0
    results_table = []

    for cat, query, expect_fallback in test_cases:
        ans, cits, score, debug = find_grounded_answer(query)
        is_fallback = (ans == EXPECTED_UNIFIED_FALLBACK)

        if is_fallback == expect_fallback:
            status = "PASS [OK]"
            passed_count += 1
        else:
            status = "FAIL [ERR]"

        top_doc = cits[0]['filename'] if cits else "None (Fallback)"
        score_str = f"{round(score*100)}%" if cits else "0%"
        
        results_table.append((cat, query, status, top_doc, score_str))

    print(f"\n{'Section / Category':<20} | {'Test Query':<35} | {'Result':<8} | {'Top Citation':<30} | {'Score':<6}")
    print("-" * 110)
    for cat, q, res, doc, sc in results_table:
        print(f"{cat:<20} | {q:<35} | {res:<8} | {doc:<30} | {sc:<6}")
    
    print("-" * 110)
    print(f"TOTAL TEST RESULTS: {passed_count}/{len(test_cases)} Passed ({round(passed_count/len(test_cases)*100)}% Success Rate)\n")

if __name__ == "__main__":
    run_summary()
