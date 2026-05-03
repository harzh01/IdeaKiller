"""
RAG Ingest Script
Run from backend/ with venv activated:
    python -m app.rag.ingest
"""
import chromadb
from pathlib import Path
from sentence_transformers import SentenceTransformer

EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
CHROMA_PATH = "./chroma_db"
CHUNK_SIZE = 400
CHUNK_OVERLAP = 50

AGENT_COLLECTIONS = {
    "realist":  "./data/realist",
    "logician": "./data/logician",
    "mirror":   "./data/mirror",
}

def chunk_text(text):
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if len(chunk) > 30:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

def ingest_collection(agent, data_dir, client, model):
    path = Path(data_dir)
    if not path.exists():
        print("  SKIP: " + data_dir + " not found")
        return

    try:
        client.delete_collection(agent)
        print("  Cleared old collection: " + agent)
    except Exception:
        pass

    collection = client.create_collection(
        name=agent,
        metadata={"hnsw:space": "cosine"}
    )

    all_chunks, all_ids, all_meta = [], [], []

    txt_files = sorted(path.glob("*.txt"))
    if not txt_files:
        print("  WARNING: no .txt files found in " + data_dir)
        return

    for file_path in txt_files:
        print("  Reading: " + file_path.name)
        text = file_path.read_text(encoding="utf-8")
        chunks = chunk_text(text)
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_ids.append(file_path.stem + "_" + str(i))
            all_meta.append({
                "source": file_path.name,
                "agent": agent,
                "chunk": i
            })

    if not all_chunks:
        print("  WARNING: no text content extracted")
        return

    print("  Embedding " + str(len(all_chunks)) + " chunks...")
    embeddings = model.encode(
        all_chunks,
        batch_size=32,
        show_progress_bar=True
    ).tolist()

    collection.add(
        documents=all_chunks,
        embeddings=embeddings,
        ids=all_ids,
        metadatas=all_meta
    )
    print("  Stored " + str(len(all_chunks)) + " chunks in collection: " + agent)

def main():
    print("Loading embedding model (downloads ~90MB on first run)...")
    model = SentenceTransformer(EMBED_MODEL_NAME)
    print("Model loaded.")

    client = chromadb.PersistentClient(path=CHROMA_PATH)

    for agent, data_dir in AGENT_COLLECTIONS.items():
        print("\nIngesting: " + agent)
        ingest_collection(agent, data_dir, client, model)

    print("\nIngestion complete.")
    print("Vector database saved at: " + CHROMA_PATH)

if __name__ == "__main__":
    main()