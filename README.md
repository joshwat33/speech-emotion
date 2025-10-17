# speech-emotion

🎙️ Speech Emotion Recognition and Analysis System

A comprehensive speech analysis system that combines multiple deep learning models to extract rich insights from human speech.
The backend performs speaker diarization, speech-to-text transcription, emotion and sentiment analysis, gender detection, and word cloud generation, while the frontend provides an interactive interface for users to visualize and explore the results.

🧠 Overview

This project processes speech audio files to identify:
Who spoke (Speaker Diarization)
What was said (Automatic Speech Recognition)
How it was said (Speech Emotion Recognition)
How it felt (Text Sentiment & Emotion Analysis)
Who might be speaking (Gender Prediction)
Visual representation of key emotions and words (Word Cloud Generation)
It leverages Wav2Vec2, Pyannote, and Transformers to achieve accurate and explainable speech analysis.

🧩 System Architecture

Workflow

Upload audio — The user uploads an audio sample.

Process audio — The backend performs speaker diarization, ASR, and emotion prediction.

Generate insights — Transcribed text undergoes sentiment and emotion analysis, with word clouds visualized.

Display results — Emotions, speakers, and insights are displayed on the frontend.

Historical analysis — Stores previous sessions for tracking emotional patterns.

Chatbot query — Allows querying for summarized emotion insights via Groq-powered chatbot.

🏗️ Repository Structure
