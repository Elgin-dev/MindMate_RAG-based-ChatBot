import os
import shutil
import json
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from processor import process_pdf, get_rag_chain

# --- 0. CLEANUP LOGIC ---
# This deletes old uploads and the vector database folder every time the server starts
def clear_old_data():
    folders_to_clear = ["uploads", "chroma_db"]  # Ensure "chroma_db" matches your vector folder name
    for folder in folders_to_clear:
        if os.path.exists(folder):
            try:
                shutil.rmtree(folder)
                print(f"🧹 Successfully cleared: {folder}")
            except Exception as e:
                print(f"⚠️ Could not clear {folder}: {e}")

clear_old_data()

# 1. Initialize App
app = FastAPI()

# 2. CORS Settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Models
class QuestionRequest(BaseModel):
    prompt: str

class MapNode(BaseModel):
    id: str
    label: str

class MapEdge(BaseModel):
    source: str
    target: str

class ConceptMapResponse(BaseModel):
    nodes: List[MapNode]
    edges: List[MapEdge]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]

# Global variable for RAG chain
current_chain = None

# 4. Routes
@app.get("/")
def read_root():
    return {"status": "VidyaSetu Backend is Online"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        global current_chain
        splits = process_pdf(file_path)
        current_chain = get_rag_chain(splits)
        
        return {"message": f"Successfully indexed {file.filename}", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: QuestionRequest):
    global current_chain
    if not current_chain:
        return {"answer": "Please upload a textbook first!"}
    
    try:
        # STRICT PROMPT: Stops AI from talking about unrelated topics (like mountains)
        strict_input = (
            f"STRICT INSTRUCTION: Answer the question ONLY using the provided textbook context. "
            f"If the answer is not in the text, say 'I'm sorry, but that information is not in the uploaded book.' "
            f"Question: {request.prompt}"
        )
        
        response = current_chain.invoke({"input": strict_input})
        sources = []
        for doc in response.get("context", []):
            page = doc.metadata.get("page", "Unknown")
            sources.append({"page": page, "content": doc.page_content[:200] + "..."})

        return {"answer": response["answer"], "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-map", response_model=ConceptMapResponse)
async def generate_map(request: QuestionRequest):
    global current_chain
    if not current_chain:
        raise HTTPException(status_code=400, detail="Upload a book first!")
    
    # STRICT PROMPT: Forces map to be based on PDF concepts
    map_prompt = (
        f"Analyze the textbook content regarding '{request.prompt}'. "
        "Extract exactly 5 core technical concepts and their relationships. "
        "Return ONLY a valid JSON object. No prose. "
        "Format: {\"nodes\": [{\"id\": \"1\", \"label\": \"Concept\"}], \"edges\": [{\"source\": \"1\", \"target\": \"2\"}]}"
    )
    
    try:
        response = current_chain.invoke({"input": map_prompt})
        json_match = re.search(r'(\{.*\}|\[.*\])', response["answer"], re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            raise ValueError("No JSON found")
    except Exception as e:
        return {"nodes": [{"id": "1", "label": "Map error - Check PDF context"}], "edges": []}

@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz():
    global current_chain
    if not current_chain:
        raise HTTPException(status_code=400, detail="Please upload a book first!")

    # STRICT PROMPT: Forces quiz to be based on PDF content
    quiz_prompt = (
        "Based ONLY on the uploaded textbook, generate 5 Multiple Choice Questions. "
        "Each question must be factually supported by the book. "
        "Return ONLY a valid JSON object. "
        "Format: {\"questions\": [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"Correct Option\", \"explanation\": \"...\"}]}"
    )

    try:
        response = current_chain.invoke({"input": quiz_prompt})
        json_match = re.search(r'(\{.*\}|\[.*\])', response["answer"], re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            raise ValueError("AI failed to output JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate quiz from PDF content.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)