# backend/main.py
from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
import logging
import traceback
from contextlib import asynccontextmanager
import shutil
import mimetypes
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

HISTORY_FILE = Path("historical_transcriptions.json")
DATA_FILE = Path("call_data.json")

# Load API key from .env
load_dotenv()
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Attempt to import analysis functions and load models early
try:
    # Import necessary functions from the pipeline module
    from models.analysis_pipeline import analyze_audio, generate_word_cloud_base64, load_models
    # Attempt to load models on startup
    models_loaded = load_models()
except ImportError as ie:
     print(f"FATAL: Import Error: {ie}. Check file paths and dependencies.")
     models_loaded = False
     traceback.print_exc()
except Exception as e:
    print(f"FATAL: Failed during initial import or model loading: {e}")
    models_loaded = False
    traceback.print_exc()

# Define dummy functions if loading failed (allows API to start but analysis will fail)
if not models_loaded:
    def analyze_audio(original_audio_path: str, task_id: str, original_filename: str):
        print("WARNING: analyze_audio - Models not loaded. Returning error state.")
        return { "error": "Backend models failed to load. Analysis not possible.", "taskId": task_id, "fileName": original_filename }
    def generate_word_cloud_base64(text):
         print("WARNING: generate_word_cloud_base64 - Models likely not loaded. Returning None.")
         return None

# --- Configuration ---
UPLOAD_DIR = os.path.join("data", "uploads")
SEGMENT_BASE_DIR = os.path.join("data", "speaker_segments")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SEGMENT_BASE_DIR, exist_ok=True)

# --- Application State (In-Memory) ---
analysis_status_store = {} # task_id -> "pending" | "processing" | "complete" | "error"
analysis_results_store = {} # task_id -> results_dict

# --- FastAPI App Setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FastAPI application startup...")
    if models_loaded:
        print("INFO: Models seem to have loaded based on import/load call.")
    else:
        print("CRITICAL WARNING: Model loading failed during startup. Analysis endpoints will return errors.")
    yield
    print("FastAPI application shutdown.")

app = FastAPI(lifespan=lifespan, title="Customer Call Analyzer API")

# --- CORS Middleware ---
origins = [
    "http://localhost:5173", # Vite default (adjust if different)
    "http://localhost:3000", # CRA default
    # Add deployed frontend URL later
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Background Task Runner ---
def run_analysis_background(task_id: str, file_path: str, original_filename: str):
    global analysis_status_store, analysis_results_store
    print(f"Background task started for task_id: {task_id}, file: {original_filename}")
    if not models_loaded:
        print(f"Error: Cannot run analysis for task {task_id}, models not loaded.")
        analysis_status_store[task_id] = "error"
        analysis_results_store[task_id] = {"error": "Backend models unavailable.", "taskId": task_id, "fileName": original_filename}
        return # Exit early if models aren't ready

    analysis_status_store[task_id] = "processing"
    try:
        # Call the main analysis function, passing the path to the saved file
        results = analyze_audio(file_path, task_id, original_filename)
        analysis_results_store[task_id] = results
        if results.get("error"):
             analysis_status_store[task_id] = "error"
             print(f"Analysis task {task_id} completed with error: {results['error']}")
        else:
            analysis_status_store[task_id] = "complete"
            print(f"Analysis task {task_id} completed successfully.")
    except Exception as e:
        print(f"Unhandled exception in background task {task_id}: {e}")
        traceback.print_exc()
        analysis_status_store[task_id] = "error"
        analysis_results_store[task_id] = {"error": f"Unhandled background task exception: {e}", "taskId": task_id, "fileName": original_filename}
    # Consider cleanup of original file here or via separate mechanism

# --- Historical Data ---
def load_historical_data(timeframe="last_7_days"):
    if not HISTORY_FILE.exists():
        return []
    with open(HISTORY_FILE, "r") as f:
        history = json.load(f)
    cutoff = {
        "last_24_hours": datetime.now(timezone.utc) - timedelta(days=1),
        "last_7_days": datetime.now(timezone.utc) - timedelta(days=7),
        "last_30_days": datetime.now(timezone.utc) - timedelta(days=30),
        "last_90_days": datetime.now(timezone.utc) - timedelta(days=90),
        "all_time": datetime.min
    }.get(timeframe, datetime.now(timezone.utc) - timedelta(days=7))
    # Filter by timeframe
    filtered = [
        entry["transcription"]
        for entry in history
        if datetime.fromisoformat(entry["timestamp"]) >= cutoff
    ]
    return filtered

class UserMessage(BaseModel):
    message: str

def load_call_data():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

# --- API Endpoints ---
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Customer Call Analyzer API"}

@app.post("/upload")
async def upload_audio_for_analysis(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not models_loaded:
         # Return 503 Service Unavailable if models aren't ready
         raise HTTPException(status_code=503, detail="Backend models unavailable. Cannot process uploads.")

    task_id = str(uuid.uuid4())
    original_filename = file.filename if file.filename else "audio_upload"
    file_extension = os.path.splitext(original_filename)[1].lower() # Use lower case extension
    # Basic check for common audio extensions (can be improved)
    allowed_extensions = ['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac']
    if file_extension not in allowed_extensions:
         raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}")

    saved_filename = f"{task_id}{file_extension}" # File saved on disk
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"File '{original_filename}' saved as '{saved_filename}'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save uploaded file: {e}")
    finally:
        await file.close()

    analysis_status_store[task_id] = "pending"
    analysis_results_store[task_id] = None
    background_tasks.add_task(run_analysis_background, task_id, file_path, original_filename)
    print(f"Analysis task {task_id} queued for file: {original_filename}")

    return {"message": "File uploaded successfully, analysis started.", "task_id": task_id, "filename": original_filename}

@app.get("/status/{task_id}")
async def get_analysis_status(task_id: str):
    status = analysis_status_store.get(task_id)
    if not status: raise HTTPException(status_code=404, detail="Task ID not found")
    return {"task_id": task_id, "status": status}

@app.get("/analysis/{task_id}")
async def get_analysis_result(task_id: str):
    status = analysis_status_store.get(task_id)
    result = analysis_results_store.get(task_id)
    if not status: raise HTTPException(status_code=404, detail="Task ID not found")

    if status == "complete":
        if result and not result.get("error"): return result
        else: raise HTTPException(status_code=422, detail=result.get("error", "Analysis complete but result invalid or missing."))
    elif status == "error":
        raise HTTPException(status_code=422, detail=result.get("error", "Analysis failed.")) # 422 Unprocessable Entity
    elif status in ["pending", "processing"]:
        # Return 200 OK with status, frontend handles polling
        return {"task_id": task_id, "status": status, "message": "Analysis in progress."}
    else:
         raise HTTPException(status_code=500, detail=f"Internal error: Invalid status '{status}'")


@app.get("/api/audio/{task_id}/{filename}")
async def get_audio_file(task_id: str, filename: str):
    # Basic security check
    if ".." in task_id or "/" in task_id or "\\" in task_id or \
       ".." in filename or filename.startswith(("/", "\\")) :
         raise HTTPException(status_code=400, detail="Invalid characters in task_id or filename")

    segment_path = os.path.abspath(os.path.join(SEGMENT_BASE_DIR, task_id, filename))
    original_path = os.path.abspath(os.path.join(UPLOAD_DIR, filename)) # Original file saved as task_id.ext

    file_to_serve = None

    # Check segment path first (more specific check)
    if filename.startswith("SPEAKER_") and os.path.commonpath([segment_path, os.path.abspath(SEGMENT_BASE_DIR)]) == os.path.abspath(SEGMENT_BASE_DIR):
         if os.path.exists(segment_path):
             file_to_serve = segment_path

    # Check original path (filename should match task_id.ext format)
    if not file_to_serve and filename.startswith(task_id) and os.path.commonpath([original_path, os.path.abspath(UPLOAD_DIR)]) == os.path.abspath(UPLOAD_DIR):
        if os.path.exists(original_path):
            file_to_serve = original_path

    if file_to_serve:
        print(f"Serving audio file: {file_to_serve}")
        media_type, _ = mimetypes.guess_type(file_to_serve)
        media_type = media_type or "application/octet-stream" # Fallback mime type
        return FileResponse(path=file_to_serve, media_type=media_type, filename=filename)
    else:
        print(f"Audio file not found: task={task_id}, filename={filename}")
        raise HTTPException(status_code=404, detail=f"Audio file '{filename}' not found")

# --- Placeholder Endpoints ---
@app.get("/historical")
async def get_historical_data(timeframe: str = "last_7_days"):
    # (Keep existing mock implementation)
    print(f"Received historical data request for timeframe: {timeframe}")
    # Ensure generate_word_cloud_base64 exists before calling
    mock_wordcloud_data = None
    if models_loaded: # Only try if models loaded
        #mock_wordcloud_data = generate_word_cloud_base64("historical data analysis trends common issues reports")
        texts = load_historical_data(timeframe)
        combined_text = " ".join(texts)
        mock_wordcloud_data = generate_word_cloud_base64(combined_text)
    return {
        "timeframe": timeframe,
        "wordCloudData": mock_wordcloud_data, # Use consistent key
        "averageSatisfaction": {"value": 0.65, "label": "Neutral"},
    }

@app.post("/chat")
async def chatbot_response(user_input: UserMessage):
    user_message = user_input.message.lower()
    call_data = load_call_data()
    # Prepare summarized data for the model
    call_summaries = [
        f"File: {call.get('fileName')}, "
        f"Transcription: {call.get('transcription')}, "
        f"Speech Emotion: {list(call.get('speechEmotionOverall', {}).keys())}, "
        #f"Text Sentiment: {call.get('textSentimentOverall', {}).get('dominant')}, "
        #f"Satisfaction: {call.get('satisfactionPrediction', {}).get('label')}"
        f"Timestamp: {call.get('timestamp')} "
        for call in call_data
    ]
    combined_context = "\n".join(call_summaries)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant who analyzes call center conversations. You are given structured analysis data for each call - including transcriptions, "
                "and sentiment. Your job is to answer the questions properly in natural language."
                "Avoid using numbers in general. Only give numerical answer when quantitative questions are asked. Otherwise use plain English. Be concise and conversational."
            )
        },
        {
            "role": "user",
            "content": f"Call Records:\n{combined_context}\n\nUser Question: {user_message}"
        }
    ]
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.7
    )
    reply = response.choices[0].message.content.strip()
    print(f"Chatbot response: {reply}")
    return {"reply": reply}

# --- Optional Cleanup Endpoint ---
@app.delete("/cleanup/{task_id}")
async def cleanup_task_data(task_id: str):
    segment_dir = os.path.join(SEGMENT_BASE_DIR, task_id)
    deleted_segments = False; deleted_upload = False
    upload_file_to_delete = None
    try: # Find original file based on task_id prefix
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(task_id):
                upload_file_to_delete = os.path.join(UPLOAD_DIR, fname); break
    except Exception as e: print(f"Error scanning upload dir: {e}")

    if os.path.exists(segment_dir):
        try: shutil.rmtree(segment_dir); deleted_segments = True; print(f"Deleted segment directory: {segment_dir}")
        except Exception as e: print(f"Error deleting segment dir {segment_dir}: {e}")
    if upload_file_to_delete and os.path.exists(upload_file_to_delete):
        try: os.remove(upload_file_to_delete); deleted_upload = True; print(f"Deleted upload file: {upload_file_to_delete}")
        except Exception as e: print(f"Error deleting upload file {upload_file_to_delete}: {e}")

    analysis_status_store.pop(task_id, None)
    analysis_results_store.pop(task_id, None)

    if deleted_segments or deleted_upload: return {"message": f"Cleanup successful for task {task_id}."}
    else: raise HTTPException(status_code=404, detail=f"No data found or failed to cleanup task {task_id}")

# Optional: Add entry point for direct run (though uvicorn is preferred)
# if __name__ == "__main__":
#    import uvicorn
#    print("Attempting to run with uvicorn...")
#    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)