import os
from dotenv import load_dotenv
from langchain_ollama import ChatOllama  # Switched to Ollama
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# 1. Load the Memory (Still local, still free)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vector_db = Chroma(persist_directory="./db", embedding_function=embeddings)

# 2. Setup the OFFLINE Brain (Ollama)
# Make sure you ran 'ollama run gemma2:2b' first!
llm = ChatOllama(model="gemma2:2b", temperature=0.3)

# 3. Prompt Structure
system_prompt = (
    "You are VidyaSetu, a friendly Indian Study Assistant. "
    "Use the following pieces of retrieved context to answer the question. "
    "If you don't know the answer, say that you don't know. "
    "Explain simply with examples. \n\n"
    "{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# 4. Create the Chain
question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(vector_db.as_retriever(), question_answer_chain)

print("\n🚀 VidyaSetu is OFFLINE and UNLIMITED! 🚀")

while True:
    user_q = input("\nStudent: ")
    if user_q.lower() in ['exit', 'quit']: break
    
    try:
        response = rag_chain.invoke({"input": user_q})
        print(f"\nVidyaSetu: {response['answer']}")
    except Exception as e:
        print(f"\n❌ Error: {e}")