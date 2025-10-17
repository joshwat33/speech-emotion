# 🎙️ Speech Emotion Recognition and Analysis System

A comprehensive speech analysis system that combines multiple deep learning models to extract rich insights from human speech.
The backend performs speaker diarization, speech-to-text transcription, emotion and sentiment analysis, gender detection, and word cloud generation, while the frontend provides an interactive interface for users to visualize and explore the results.

## 🧠 Overview

This project processes speech audio files to identify:
- Who spoke (Speaker Diarization)
- What was said (Automatic Speech Recognition)
- How it was said (Speech Emotion Recognition)
- How it felt (Text Sentiment & Emotion Analysis)
- Who might be speaking (Gender Prediction)
- Visual representation of key emotions and words (Word Cloud Generation)

It leverages Wav2Vec2, Pyannote, and Transformers to achieve accurate and explainable speech analysis.

## 🧩 System Architecture

Workflow
1. Upload audio — The user uploads an audio sample.
2. Process audio — The backend performs speaker diarization, ASR, and emotion prediction.
3. Generate insights — Transcribed text undergoes sentiment and emotion analysis, with word clouds visualized.
4. Display results — Emotions, speakers, and insights are displayed on the frontend.
5. Historical analysis — Stores previous sessions for tracking emotional patterns.
6. Chatbot query — Allows querying for summarized emotion insights via Groq-powered chatbot.

## 🏗️ Repository Structure
``` bash
Speech-Emotion-Recognition/
│
├── backend/
│   ├── data/
│   ├── models/
│   ├── pretrained_models/
│   │   └── speechbrain_emotion/
│   │   │  └── __pycache__/
│   ├── utils/
│   ├── wav2vec2_checkpoints/
│   │   └── models--facebook--wav2vec2-base/
│   ├── call_data.json
│   ├── historical_transcriptions.json
│   ├── custom_interface.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── public
│   ├── src
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```
## ⚙️ Installation Guide
### 🖥️ Backend Setup

1. Create a virtual environment
```
cd backend
python -m venv venv
```
Activate it:

- Command Prompt:
```
venv\Scripts\activate
```
- PowerShell:
```
venv\Scripts\Activate.ps1
```
2. Install dependencies
```
pip install -r requirements.txt
```
3. Create a Hugging Face token\
Get it from https://huggingface.co/settings/tokens

5. Assign it in <mark>backend/models/analysis_pipeline.py</mark>
```
HF_TOKEN = "your_huggingface_token"
```

5. Generate a Groq API key\
Get it from https://console.groq.com/keys

6. Create a <amrk>.env</mark> file inside <mark>backend/</mark> and add:
```
GROQ_API_KEY=your_groq_api_key

7. Run the backend server
```
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
