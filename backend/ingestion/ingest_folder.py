#!/usr/bin/env python3
"""
CampusIQ - Reusable Document Ingestion CLI Script
Supports directory batch ingestion and single-file re-ingestion.
"""

import os
import sys
import uuid
import argparse
from pathlib import Path

# Fix Windows console unicode encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure root package imports work
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.ingestion.pipeline import (
    extract_text,
    chunk_text,
    generate_embeddings,
    detect_category,
    store_in_chromadb
)

def ingest_single_file(file_path_str: str):
    file_path = Path(file_path_str)
    if not file_path.exists() or not file_path.is_file():
        print(f"Error: File '{file_path_str}' does not exist.")
        sys.exit(1)

    print(f"\n[Ingestion] Single-File Re-Ingestion Mode")
    print(f"------------------------------------")
    print(f"File: {file_path.resolve()}")

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        raw_text = extract_text(file_bytes, file_path.name)
        category = detect_category(file_path.name, raw_text[:1000])
        chunks = chunk_text(raw_text, filename=file_path.name, target_tokens=400, overlap_tokens=50)


        if not chunks:
            print(f"Warning: No valid text chunks extracted from {file_path.name}")
            return

        chunk_contents = [c["content"] for c in chunks]
        embeddings = generate_embeddings(chunk_contents)

        doc_id = f"doc_{file_path.stem}"
        store_in_chromadb(doc_id, file_path.name, chunks, embeddings, category=category)

        print(f"SUCCESS: Re-indexed [{category.upper()}] | Created {len(chunks)} chunks (300-500 tokens) | Embeddings: 384-dim BGE\n")
    except Exception as e:
        print(f"FAILED: Failed to process {file_path.name}: {str(e)}\n")
        sys.exit(1)

def ingest_directory(target_folder: str):
    folder_path = Path(target_folder)
    if not folder_path.exists() or not folder_path.is_dir():
        print(f"Error: Folder '{target_folder}' does not exist or is not a directory.")
        sys.exit(1)

    supported_extensions = [".pdf", ".docx", ".txt", ".md"]
    files = [f for f in folder_path.glob("**/*") if f.suffix.lower() in supported_extensions]

    if not files:
        print(f"Warning: No supported documents (.pdf, .docx, .txt, .md) found in '{target_folder}'.")
        return

    print(f"\n[Ingestion] CampusIQ Document Ingestion Pipeline")
    print(f"------------------------------------------------")
    print(f"Target Folder: {folder_path.resolve()}")
    print(f"Found {len(files)} document(s) to process...\n")

    total_chunks_processed = 0

    for idx, file_path in enumerate(files, 1):
        print(f"[{idx}/{len(files)}] Processing: {file_path.name}...")
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()

            raw_text = extract_text(file_bytes, file_path.name)
            category = detect_category(file_path.name, raw_text[:1000])
            chunks = chunk_text(raw_text, filename=file_path.name, target_tokens=400, overlap_tokens=50)


            if not chunks:
                print(f"   Warning: No valid text chunks extracted from {file_path.name}")
                continue

            chunk_contents = [c["content"] for c in chunks]
            embeddings = generate_embeddings(chunk_contents)

            doc_id = f"doc_{file_path.stem}"
            store_in_chromadb(doc_id, file_path.name, chunks, embeddings, category=category)

            total_chunks_processed += len(chunks)
            print(f"   SUCCESS: Category: [{category.upper()}] | Created {len(chunks)} chunks (300-500 tokens) | Embeddings: 384-dim BGE\n")

        except Exception as e:
            print(f"   FAILED: Failed to process {file_path.name}: {str(e)}\n")

    print(f"Pipeline Complete! Indexed {total_chunks_processed} chunks across {len(files)} files.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CampusIQ Document Ingestion CLI")
    parser.add_argument("folder", nargs="?", default="./campus_documents", help="Path to folder containing documents")
    parser.add_argument("--file", help="Path to a single document file for single-file re-ingestion")
    args = parser.parse_args()

    if args.file:
        ingest_single_file(args.file)
    else:
        ingest_directory(args.folder)
