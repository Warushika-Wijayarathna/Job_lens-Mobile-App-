# JobLens ML Service

This is the machine learning microservice for the JobLens assignment project. It provides job matching and skill extraction APIs using Python, Flask, and scikit-learn.

## Features
- **Job matching**: Predicts how well a user's skills and experience match a job description.
- **Skill extraction**: Extracts technical skills from resume or job text.
- **Model info**: Reports model status, features, and semantic model usage.
- **Retraining**: Supports retraining the model with new data.

## Technologies
- Python 3.13
- Flask
- scikit-learn
- pandas
- sentence-transformers (optional, for semantic matching)

## Setup
1. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv ml_env
   source ml_env/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Ensure `dataset/job_descriptions.csv` exists for training.

## Running the Service
Start the Flask server:
```bash
JOBLENS_SKIP_SENTENCE_MODEL=false ./ml_env/bin/python app.py
```

## API Endpoints
- `GET /health` — Service health and model status
- `POST /predict` — Predict job match score
- `POST /skills/extract` — Extract skills from text
- `GET /model-info` — Model details (includes semantic model status)
- `POST /train` — Train a new model
- `POST /retrain` — Retrain the model

## Testing
Run the comprehensive test suite:
```bash
./ml_env/bin/python test_service.py
```
All tests should pass for assignment submission.

## Assignment Notes
- This service is designed for demonstration and assignment purposes, not production.
- Model accuracy is based on synthetic data and basic features.
- The code is modular and well-commented for clarity.

## Authors
- Assignment submission by Warushika-Wijayarathna

## License
For educational use only.

