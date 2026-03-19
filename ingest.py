import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
# Changed this import to the free version
from langchain_huggingface import HuggingFaceEmbeddings 
from langchain_community.vectorstores import Chroma

load_dotenv()

def load_and_process_pdf(file_path):
    print(f"📖 Reading {file_path}...")
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # Split the book into small 1000-character chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = text_splitter.split_documents(documents)
    print(f"✂️ Split into {len(texts)} chunks.")
    
    # 🧠 Use the FREE model here (no API key needed for this part)
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    print("🧠 Creating Vector Memory locally...")
    vector_db = Chroma.from_documents(
        documents=texts, 
        embedding=embeddings, # USE THE FREE EMBEDDINGS VARIABLE HERE
        persist_directory="./db"
    )
    print("✅ Success! Your bot now 'knows' this book.")

if __name__ == "__main__":
    load_and_process_pdf("class10electricityncert.pdf")