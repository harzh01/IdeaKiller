import chromadb
from sentence_transformers import SentenceTransformer
from functools import lru_cache

CHROMA_PATH = "./chroma_db"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer(EMBED_MODEL_NAME)


@lru_cache(maxsize=1)
def get_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)


def retrieve_context(agent, query, n_results=3):
    try:
        client = get_client()
        model = get_model()
        collection = client.get_collection(agent)

        if collection.count() == 0:
            return ""

        query_embedding = model.encode([query]).tolist()

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(n_results, collection.count()),
            include=["documents", "metadatas", "distances"]
        )

        if not results["documents"] or not results["documents"][0]:
            return ""

        parts = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            if dist < 1.5:
                parts.append("[Source: " + meta["source"] + "]\n" + doc)

        return "\n\n".join(parts)

    except Exception as e:
        print("RAG retrieval failed for " + agent + ": " + str(e))
        return ""