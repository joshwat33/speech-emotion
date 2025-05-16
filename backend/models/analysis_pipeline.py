# backend/models/analysis_pipeline.py
import os
import torch
import librosa
import numpy as np
from pydub import AudioSegment
from transformers import pipeline as hf_pipeline
# Explicitly import Wav2Vec2FeatureExtractor
from transformers import AutoProcessor, AutoModelForAudioClassification, Wav2Vec2FeatureExtractor # Keep AutoProcessor for now, might remove later if not used
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F
from pyannote.audio import Pipeline as DiarizationPipeline
from wordcloud import WordCloud
import base64
from io import BytesIO
import logging
import traceback
from collections import Counter
import json
from datetime import datetime,timezone
from pathlib import Path

# --- Configuration ---
HF_TOKEN = "<add your token>"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"INFO: Using device: {DEVICE}")

# --- Global Model Variables ---
asr_pipeline_global = None
sentiment_tokenizer = None
sentiment_model = None
GO_ID2LABEL = None
ehcalabres_emotion_feature_extractor = None
ehcalabres_emotion_model = None
# For gender model, we'll use feature_extractor explicitly
gender_feature_extractor_new = None # CHANGED from processor
gender_model_new = None
diarization_pipeline_global = None
models_loaded_successfully = False

# --- Constants ---
# (Keep TARGET_EMOTIONS and GO_TO_8_MAP as they are)
TARGET_EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral", "Other"]
GO_TO_8_MAP = {
    "anger": "Angry", "annoyance": "Angry", "disapproval": "Angry", "disgust": "Disgust",
    "fear": "Fear", "nervousness": "Fear", "joy": "Happy", "amusement": "Happy",
    "excitement": "Happy", "admiration": "Happy", "love": "Happy", "approval": "Happy",
    "gratitude": "Happy", "optimism": "Happy", "pride": "Happy", "relief": "Happy",
    "sadness": "Sad", "grief": "Sad", "remorse": "Sad", "disappointment": "Sad",
    "surprise": "Surprise", "realization": "Surprise", "confusion": "Surprise",
    "neutral": "Neutral", "curiosity": "Other", "desire": "Other", "caring": "Other",
    "embarrassment": "Other"
}

HISTORY_FILE = Path("historical_transcriptions.json")
DATA_FILE = Path("call_data.json")

# --- Model Loading Function ---
def load_models():
    global asr_pipeline_global, sentiment_tokenizer, sentiment_model, GO_ID2LABEL, \
           ehcalabres_emotion_feature_extractor, ehcalabres_emotion_model, \
           gender_feature_extractor_new, gender_model_new, \
           diarization_pipeline_global, models_loaded_successfully

    if models_loaded_successfully:
        print("INFO: Models already loaded.")
        return True
    try:
        print("INFO: Loading ASR model (facebook/wav2vec2-base-960h)...")
        asr_pipeline_global = hf_pipeline("automatic-speech-recognition", model="facebook/wav2vec2-base-960h", device=0 if DEVICE.type == 'cuda' else -1)

        print("INFO: Loading GoEmotions Sentiment model (bhadresh-savani/bert-base-go-emotion)...")
        sentiment_model_name = "bhadresh-savani/bert-base-go-emotion"
        sentiment_tokenizer = AutoTokenizer.from_pretrained(sentiment_model_name)
        sentiment_model = AutoModelForSequenceClassification.from_pretrained(sentiment_model_name).to(DEVICE)
        GO_ID2LABEL = sentiment_model.config.id2label

        print("INFO: Loading Speech Emotion model (ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition)...")
        ehcalabres_model_name = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
        print(f"INFO: Attempting to load feature extractor for {ehcalabres_model_name}...")
        ehcalabres_emotion_feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(ehcalabres_model_name)
        print(f"INFO: Attempting to load model weights for {ehcalabres_model_name}...")
        ehcalabres_emotion_model = AutoModelForAudioClassification.from_pretrained(ehcalabres_model_name).to(DEVICE)
        print("INFO: ehcalabres emotion model config.id2label:", ehcalabres_emotion_model.config.id2label)


        print("INFO: Loading Gender model (alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech)...")
        gender_model_id = "alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech"
        # --- MODIFIED: Load Feature Extractor explicitly for Gender Model ---
        print(f"INFO: Attempting to load feature extractor for {gender_model_id}...")
        gender_feature_extractor_new = Wav2Vec2FeatureExtractor.from_pretrained(gender_model_id) # Add token=HF_TOKEN if needed
        # --- End MODIFIED ---
        print(f"INFO: Attempting to load model weights for {gender_model_id}...")
        gender_model_new = AutoModelForAudioClassification.from_pretrained(gender_model_id).to(DEVICE) # Add token=HF_TOKEN if needed
        print("INFO: New gender model config.id2label:", gender_model_new.config.id2label)


        print("INFO: Loading Diarization pipeline (pyannote/speaker-diarization-3.1)...")
        if not HF_TOKEN or HF_TOKEN == "YOUR_HF_TOKEN":
             print("WARNING: Hugging Face Token not set for diarization. Diarization might fail if model needs auth.")
        diarization_pipeline_global = DiarizationPipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HF_TOKEN if HF_TOKEN and HF_TOKEN != "YOUR_HF_TOKEN" else None
        ).to(DEVICE)

        print("INFO: All models loaded successfully.")
        models_loaded_successfully = True
        return True

    except Exception as e:
        print(f"FATAL ERROR during model loading: {e}")
        traceback.print_exc()
        models_loaded_successfully = False
        return False

# --- Helper Functions ---
# --- MODIFIED predict_gender to use gender_feature_extractor_new ---
def predict_gender(audio_segment_path, sampling_rate=16000): # Default sampling rate, will be overridden
    global gender_feature_extractor_new, gender_model_new # Use new variable names
    if not models_loaded_successfully: return "Unknown (Models Failed)"
    try:
        audio_input, loaded_sr = librosa.load(audio_segment_path, sr=None)
        # Use the feature extractor's configured sampling rate
        target_sr = gender_feature_extractor_new.sampling_rate
        if loaded_sr != target_sr:
            audio_input = librosa.resample(audio_input, orig_sr=loaded_sr, target_sr=target_sr)
        
        # Use the explicit feature extractor
        inputs = gender_feature_extractor_new(
            audio_input, 
            sampling_rate=target_sr, 
            return_tensors="pt", 
            padding=True
        )
        inputs = {key: val.to(DEVICE) for key, val in inputs.items()}
        
        with torch.no_grad():
            logits = gender_model_new(**inputs).logits
        
        predicted_id = torch.argmax(logits, dim=-1).item()
        predicted_label_raw = gender_model_new.config.id2label[predicted_id]

        # print(f"Raw gender label: '{predicted_label_raw}' for {os.path.basename(audio_segment_path)}") # Debug
        if "female" in predicted_label_raw.lower():
            return "Female"
        elif "male" in predicted_label_raw.lower():
            return "Male"
        else:
            print(f"Warning: Unexpected gender label '{predicted_label_raw}' from model.")
            return predicted_label_raw.capitalize() 

    except Exception as e:
        print(f"Warning: Gender prediction failed for {os.path.basename(audio_segment_path)}. Error: {type(e).__name__} - {e}")
        return "Unknown"

# (predict_speech_emotion, get_text_sentiment, generate_word_cloud_base64, and analyze_audio
#  remain the same as the last full version you provided in the previous response,
#  assuming predict_speech_emotion was already correctly using its feature_extractor)
# ... Ensure predict_speech_emotion also uses its explicit feature_extractor ...

def predict_speech_emotion(audio_segment_path):
    global ehcalabres_emotion_feature_extractor, ehcalabres_emotion_model
    if not models_loaded_successfully: return "N/A (Models Failed)"
    try:
        speech_array, loaded_sr = librosa.load(audio_segment_path, sr=None)
        target_sr = ehcalabres_emotion_feature_extractor.sampling_rate
        if loaded_sr != target_sr:
            speech_array = librosa.resample(speech_array, orig_sr=loaded_sr, target_sr=target_sr)
        
        inputs = ehcalabres_emotion_feature_extractor(
            speech_array, 
            sampling_rate=target_sr, 
            return_tensors="pt", 
            padding=True
        )
        inputs = {key: val.to(DEVICE) for key, val in inputs.items()}

        with torch.no_grad(): 
            logits = ehcalabres_emotion_model(**inputs).logits

        predicted_id = torch.argmax(logits, dim=-1).item()
        predicted_label = ehcalabres_emotion_model.config.id2label[predicted_id]
        
        label_map_ehcalabres = {
            "angry": "Angry", "calm": "Calm", "disgust": "Disgust", 
            "fearful": "Fear", "happy": "Happy", "neutral": "Neutral", 
            "sad": "Sad", "surprised": "Surprise",
            # Add short forms if model outputs them
            "ang": "Angry", "cal": "Calm", "dis": "Disgust", 
            "fea": "Fear", "hap": "Happy", "neu": "Neutral", 
            "sadness": "Sad", "sur": "Surprise" 
        }
        final_label = label_map_ehcalabres.get(predicted_label.lower(), predicted_label.capitalize())
        return final_label
    except Exception as e:
        print(f"Warning: ehcalabres speech emotion prediction failed for {os.path.basename(audio_segment_path)}. Error: {e}")
        return "Unknown"

def get_text_sentiment(text):
    global sentiment_tokenizer, sentiment_model, GO_ID2LABEL, GO_TO_8_MAP, TARGET_EMOTIONS
    if not models_loaded_successfully: return {"dominant": "N/A (Models Failed)", "scores": {}}
    if not text or not text.strip(): return {"dominant": "Neutral", "scores": {emo: 0.0 for emo in TARGET_EMOTIONS}}
    try:
        inputs = sentiment_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512).to(DEVICE)
        with torch.no_grad(): outputs = sentiment_model(**inputs)
        logits = outputs.logits
        probs = F.softmax(logits, dim=1).detach().cpu().numpy()[0]
        sentiment_scores = {emotion: 0.0 for emotion in TARGET_EMOTIONS}
        for idx, prob in enumerate(probs):
            go_label = GO_ID2LABEL.get(idx, "unknown").lower()
            mapped_emotion = GO_TO_8_MAP.get(go_label, "Other")
            sentiment_scores[mapped_emotion] += prob
        dominant_sentiment = max(sentiment_scores, key=sentiment_scores.get) if sentiment_scores else "Neutral"
        total_score = sum(sentiment_scores.values())
        normalized_scores = {k: v / total_score if total_score > 0 else 0 for k, v in sentiment_scores.items()}
        return {"dominant": dominant_sentiment, "scores": normalized_scores}
    except Exception as e:
        print(f"Warning: Text sentiment analysis failed for text: '{text[:50]}...'. Error: {e}")
        return {"dominant": "N/A", "scores": {}}

def generate_word_cloud_base64(text):
    if not text or not text.strip(): return None
    try:
        wordcloud = WordCloud(width=400, height=200, background_color='white', collocations=False).generate(text)
        buffered = BytesIO()
        wordcloud.to_image().save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        print(f"Warning: Word cloud generation failed. Error: {e}")
        return None

def save_transcription_to_history(transcription_text):
    timestamp = datetime.now(timezone.utc).isoformat()
    # Load existing data
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, "r") as f:
            history = json.load(f)
    else:
        history = []
    # Append new record
    history.append({
        "timestamp": timestamp,
        "transcription": transcription_text
    })
    # Save back
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)

def save_call_data(output_data):
    timestamp = datetime.now(timezone.utc).isoformat()
    output_data["timestamp"] = timestamp  # Add timestamp to the data
    # Load existing data
    if DATA_FILE.exists():
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
    else:
        data = []
    # Append new record
    data.append(output_data)
    # Save back
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

#main analysis function
def analyze_audio(original_audio_path: str, task_id: str, original_filename: str):
    global asr_pipeline_global, diarization_pipeline_global
    if not models_loaded_successfully:
         return {"error": "Backend models are not loaded. Cannot perform analysis.", "taskId": task_id, "fileName": original_filename}

    print(f"[Task {task_id}] Starting analysis for: {original_filename}")
    TASK_DATA_DIR = os.path.join("data", "speaker_segments", task_id)
    os.makedirs(TASK_DATA_DIR, exist_ok=True)
    saved_file_extension = os.path.splitext(original_filename)[1]
    saved_filename_on_disk = f"{task_id}{saved_file_extension}"

    results = {
        "taskId": task_id, "fileName": original_filename, "audioDuration": 0.0,
        "originalAudioUrl": f"/api/audio/{task_id}/{saved_filename_on_disk}",
        "transcription": None, "speakers": [], "speechEmotionOverall": {},
        "speechEmotionTimeline": [], "textSentimentOverall": {}, "textEmotionTimeline": [],
        "wordCloudData": None, "emotionComparison": [],
        "satisfactionPrediction": {"value": 0.5, "label": "Neutral"}, "error": None
    }

    try:
        # 1. Load Audio
        print(f"[Task {task_id}] Loading audio: {original_audio_path}")
        y, sr = librosa.load(original_audio_path, sr=None)
        audio_duration = librosa.get_duration(y=y, sr=sr)
        results["audioDuration"] = round(audio_duration, 2)
        print(f"[Task {task_id}] Audio Duration: {results['audioDuration']}s")
        try:
            audio_segment_full = AudioSegment.from_file(original_audio_path)
        except Exception as e:
            raise Exception(f"Pydub failed to load audio file ({type(e).__name__}): {e}. Is ffmpeg installed and working?") from e

        # 2. Diarization
        print(f"[Task {task_id}] Running diarization...")
        if not diarization_pipeline_global: raise Exception("Diarization pipeline not loaded.")
        diarization = diarization_pipeline_global({"uri": task_id, "audio": original_audio_path})
        print(f"[Task {task_id}] Diarization found {len(diarization.labels())} unique speaker labels.")

        # 3. Process Speakers and Segments
        speaker_data_map = {}
        if diarization:
            for turn, _, speaker_id in diarization.itertracks(yield_label=True):
                start_ms, end_ms = int(turn.start * 1000), int(turn.end * 1000)
                start_s, end_s = round(turn.start, 2), round(turn.end, 2)
                start_ms = max(0, start_ms); end_ms = min(len(audio_segment_full), end_ms)
                if start_ms >= end_ms: continue
                segment_audio = audio_segment_full[start_ms:end_ms]
                segment_filename = f"{speaker_id}_{start_ms}-{end_ms}.wav"
                segment_filepath = os.path.join(TASK_DATA_DIR, segment_filename)
                try:
                    segment_audio.export(segment_filepath, format="wav")
                    segment_url = f"/api/audio/{task_id}/{segment_filename}"
                    if speaker_id not in speaker_data_map:
                         speaker_data_map[speaker_id] = {"id": speaker_id, "gender": "Unknown", "segments": [], "segment_paths_temp": []}
                    speaker_data_map[speaker_id]["segments"].append({"start": start_s, "end": end_s, "audioUrl": segment_url})
                    speaker_data_map[speaker_id]["segment_paths_temp"].append(segment_filepath)
                except Exception as e:
                    print(f"Warning: Failed to export segment {segment_filename}. Error: {e}")
        
        # 4. Transcription (on original full audio)
        print(f"[Task {task_id}] Running ASR...")
        try:
            if not asr_pipeline_global: raise Exception("ASR pipeline not loaded.")
            audio_16k, _ = librosa.load(original_audio_path, sr=16000)
            asr_result = asr_pipeline_global(audio_16k) 
            results["transcription"] = asr_result["text"].strip() if asr_result and asr_result.get("text") else "Transcription not available."
            print(f"[Task {task_id}] ASR: {results['transcription'][:100]}...")
        except Exception as e:
            results["transcription"] = f"Transcription error: {type(e).__name__}"
            print(f"Error during ASR: {e}")
        # Save transcription to history
        save_transcription_to_history(results["transcription"])

        # 5. Text Sentiment (Overall)
        print(f"[Task {task_id}] Analyzing overall text sentiment...")
        results["textSentimentOverall"] = get_text_sentiment(results["transcription"])
        print(f"[Task {task_id}] Overall Text Sentiment: {results['textSentimentOverall'].get('dominant', 'N/A')}")

        # 6. Word Cloud
        print(f"[Task {task_id}] Generating word cloud...")
        results["wordCloudData"] = generate_word_cloud_base64(results["transcription"])

        # --- Speaker Specific Analysis ---
        all_speech_emotions = []
        for speaker_id, data in speaker_data_map.items():
            # 7. Gender Prediction
            print(f"[Task {task_id}] Analyzing speaker: {speaker_id}")
            if data["segment_paths_temp"]:
                data["gender"] = predict_gender(data["segment_paths_temp"][0])
            else:
                data["gender"] = "Unknown (No Segments)"

            # 8. Speech Emotion Timeline
            for i, segment_info in enumerate(data["segments"]):
                segment_filepath = data["segment_paths_temp"][i]
                if os.path.exists(segment_filepath):
                    emotion = predict_speech_emotion(segment_filepath)
                    results["speechEmotionTimeline"].append({
                        "speaker": speaker_id, "start": segment_info["start"],
                        "end": segment_info["end"], "emotion": emotion
                    })
                    if emotion not in ["Unknown", "N/A (Models Failed)", "OOM Error"]:
                         all_speech_emotions.append(emotion)
            # Add speaker data to final results (excluding temp paths)
            results["speakers"].append({"id": data["id"], "gender": data["gender"], "segments": data["segments"]})

        # 9. Calculate Overall Speech Emotion Distribution
        print(f"[Task {task_id}] Calculating overall speech emotion...")
        if all_speech_emotions:
            emotion_counts = Counter(all_speech_emotions)
            total_valid = len(all_speech_emotions)
            results["speechEmotionOverall"] = {
                emo: round(count / total_valid, 3) for emo, count in emotion_counts.items()
            }
        print(f"[Task {task_id}] Overall Speech Emotion Dist: {results['speechEmotionOverall']}")

        # 10. Text Emotion Timeline (Approx)
        print(f"[Task {task_id}] Analyzing text emotion timeline (approx)...")
        if results["transcription"] and results["transcription"].lower() != "transcription not available." and not results["transcription"].startswith("Transcription error") and audio_duration > 0:
             sentences = [s.strip() for s in results["transcription"].split('.') if s.strip()]
             num_sentences = len(sentences)
             time_per_sentence = audio_duration / num_sentences if num_sentences > 0 else 0
             current_time = 0.0
             for sent in sentences:
                 start_approx = round(current_time, 2)
                 end_approx = round(current_time + time_per_sentence, 2)
                 sent_sentiment = get_text_sentiment(sent)["dominant"]
                 results["textEmotionTimeline"].append({"start": start_approx, "end": end_approx, "emotion": sent_sentiment})
                 current_time = end_approx
             if results["textEmotionTimeline"]: results["textEmotionTimeline"][-1]["end"] = results["audioDuration"]

        # 11. Emotion Comparison (Simplified)
        print(f"[Task {task_id}] Generating simplified emotion comparison...")
        if results["speechEmotionTimeline"] and results["textEmotionTimeline"]:
            processed_speech_indices = set()
            results["emotionComparison"] = [] 
            for text_seg in results["textEmotionTimeline"]:
                 best_overlap = 0; best_speech_seg = None; best_speech_idx = -1
                 for idx, speech_seg in enumerate(results["speechEmotionTimeline"]):
                     overlap_start = max(text_seg['start'], speech_seg['start'])
                     overlap_end = min(text_seg['end'], speech_seg['end'])
                     overlap_duration = max(0, overlap_end - overlap_start)
                     if overlap_duration > 0.1 and idx not in processed_speech_indices:
                          if overlap_duration > best_overlap:
                              best_overlap = overlap_duration; best_speech_seg = speech_seg; best_speech_idx = idx
                 if best_speech_seg:
                      results["emotionComparison"].append({
                          "segment": f"{best_speech_seg['start']:.1f}s-{best_speech_seg['end']:.1f}s ({best_speech_seg['speaker']})",
                          "speechEmotion": best_speech_seg['emotion'], "textEmotion": text_seg['emotion']
                      })
                      processed_speech_indices.add(best_speech_idx)
        
        # 12. Satisfaction Prediction (Placeholder Heuristic)
        print(f"[Task {task_id}] Predicting satisfaction...")
        scores = results["textSentimentOverall"].get("scores", {})
        happy_score = scores.get("Happy", 0); sad_score = scores.get("Sad", 0); angry_score = scores.get("Angry", 0)
        satisfaction_value = 0.5 + (happy_score * 0.3) - (sad_score * 0.2) - (angry_score * 0.4)
        satisfaction_value = max(0, min(1, satisfaction_value))
        if satisfaction_value >= 0.7: sat_label = "Satisfied"
        elif satisfaction_value <= 0.4: sat_label = "Unsatisfied"
        else: sat_label = "Neutral"
        results["satisfactionPrediction"] = {"value": round(satisfaction_value, 2), "label": sat_label}
        print(f"[Task {task_id}] Predicted Satisfaction: {results['satisfactionPrediction']}")

    except Exception as e:
        print(f"ERROR during analysis pipeline for task {task_id}: {e}")
        traceback.print_exc()
        results["error"] = f"Analysis pipeline failed: {type(e).__name__} - {e}"

    print(f"[Task {task_id}] Analysis function finished.")
    filtered = {}
    excluded_keys = ["taskId", "originalAudioUrl", "speakers", "speechEmotionTimeline", "textEmotionTimeline", "wordCloudData", "error","audioDuration", "textSentimentOverall", "emotionComparison", "satisfactionPrediction"]
    filtered = {k: v for k, v in results.items() if k not in excluded_keys}
    save_call_data(filtered)  # Save the results to call_data.json
    return results
