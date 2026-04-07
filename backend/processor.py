import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import ChatOllama
from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

# 1. Setup Embeddings & LLM
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
llm = ChatOllama(model="gemma2:2b", temperature=0.3)

def process_pdf(file_path):
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    OFFSET = 14
    for doc in docs:
        # If 'page' is 0 (Intro), it becomes 1.
        doc.metadata["page"] = doc.metadata.get("page", 0) + 1 + OFFSET
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    splits = text_splitter.split_documents(docs)
    
    # Create Vector Store
    vector_db = Chroma.from_documents(
        documents=splits, 
        embedding=embeddings, 
        persist_directory="./db"
    )
    
    return splits # Return splits to build the BM25 retriever

def get_rag_chain(splits):
    # Vector Retriever
    vector_db = Chroma(persist_directory="./db", embedding_function=embeddings)
    vector_retriever = vector_db.as_retriever(search_kwargs={"k": 3})
    
    # Keyword Retriever (BM25)
    bm25_retriever = BM25Retriever.from_documents(splits)
    bm25_retriever.k = 2
    
    # Hybrid Search (Ensemble)
    hybrid_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, vector_retriever], 
        weights=[0.4, 0.6]
    )

    system_prompt = (
       "You are a strict academic tutor for VidyaSetu. "
    "Use ONLY the following pieces of retrieved context to answer the question. "
    "If the answer is not contained within the context, say: 'I cannot find that in the uploaded textbook.' "
    "Do not use your outside knowledge. Provide the page number in your response."
    "\n\n"
    "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(hybrid_retriever, question_answer_chain)