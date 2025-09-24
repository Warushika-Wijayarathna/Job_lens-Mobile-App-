from flask import Flask, request, jsonify
# Tolerate missing heavy dependencies; fall back gracefully
try:
    import joblib  # type: ignore
    import numpy as np  # type: ignore
    import pandas as pd  # type: ignore
except Exception:
    joblib = None  # type: ignore
    np = None      # type: ignore
    pd = None      # type: ignore
import os
import logging
from datetime import datetime
import traceback
import re
from pathlib import Path

# Try to import Config for diagnostics
try:
    from config import Config  # type: ignore
except Exception:
    class Config:  # minimal fallback
        MODEL_PATH = "joblens_model.joblib"

# NOTE: Do not import JobMatchingModel at module import time; we'll import lazily inside functions.

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global model instance
model = None
model_loaded = False


def load_model():
    """Load the trained ML model"""
    global model, model_loaded

    try:
        # Try to import dependencies first
        try:
            import joblib  # noqa: F401
            import numpy as np  # noqa: F401
            import pandas as pd  # noqa: F401
            from train_model import JobMatchingModel  # Lazy import guarded by deps
            dependencies_available = True
        except ImportError as e:
            logger.warning(f"ML dependencies not available: {e}")
            dependencies_available = False
            JobMatchingModel = None  # type: ignore

        model_path = getattr(Config, 'MODEL_PATH', 'joblens_model.joblib')

        if dependencies_available and os.path.exists(model_path):
            try:
                logger.info(f"Loading model from {model_path}")
                model_inst = JobMatchingModel()  # type: ignore
                model_inst.load_model(model_path)
                model = model_inst
                model_loaded = True
                logger.info("Model loaded successfully!")
                return
            except Exception as e:
                logger.warning(f"Failed loading saved model, using fallback. Error: {e}")

        if dependencies_available:
            logger.warning("Model file not found or failed to load. Trying to train a new model...")
            # Train a new model if possible, else fallback
            if not train_new_model():
                logger.info("Training unavailable; using fallback matcher")
                model = create_fallback_matcher()
                model_loaded = True
        else:
            # Use fallback matching when dependencies are not available
            logger.info("Using fallback job matching algorithm")
            model = create_fallback_matcher()
            model_loaded = True

    except Exception as e:
        logger.error(f"Error loading model: {e}")
        logger.info("Falling back to simple matching")
        model = create_fallback_matcher()
        model_loaded = True


def create_fallback_matcher():
    """Create a fallback matcher when ML dependencies are not available"""
    class FallbackMatcher:
        def __init__(self):
            self.tech_skills = [
                'python', 'java', 'javascript', 'react', 'node.js', 'angular', 'vue', 'typescript',
                'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
                'html', 'css', 'bootstrap', 'django', 'flask', 'spring', 'express',
                'machine learning', 'ai', 'data science', 'tensorflow', 'pytorch'
            ]

        def predict_match(self, user_skills, user_experience, job_description, job_requirements="", job_responsibilities=""):
            # Combine all job text
            full_job_text = f"{job_description} {job_requirements} {job_responsibilities}".lower()

            # Extract job skills
            job_skills = [skill for skill in self.tech_skills if skill.lower() in full_job_text]

            # Calculate matches
            if not user_skills or not job_skills:
                return {
                    'match_score': 30.0,
                    'user_skills': user_skills or [],
                    'job_skills': job_skills,
                    'skill_overlap': 0,
                    'missing_skills': job_skills,
                    'experience_match': 0.5,
                    'recommendations': 'Please ensure your resume contains relevant technical skills'
                }

            user_skills_lower = [skill.lower() for skill in user_skills]
            job_skills_lower = [skill.lower() for skill in job_skills]

            overlapping = [skill for skill in job_skills_lower if skill in user_skills_lower]
            missing = [skill for skill in job_skills_lower if skill not in user_skills_lower]

            # Calculate score
            skill_match = len(overlapping) / len(job_skills_lower) if job_skills_lower else 0
            exp_match = min(1.0, user_experience / 5.0)

            overall_score = (skill_match * 0.7 + exp_match * 0.3) * 100

            # Generate recommendations
            recommendations = []
            if missing:
                recommendations.append(f"Consider learning: {', '.join(missing[:3])}")
            if user_experience < 3:
                recommendations.append("Build more hands-on experience with relevant technologies")
            if overlapping:
                recommendations.append(f"Highlight your experience with: {', '.join(overlapping[:2])}")

            return {
                'match_score': round(overall_score, 1),
                'user_skills': user_skills,
                'job_skills': job_skills,
                'skill_overlap': len(overlapping),
                'missing_skills': missing,
                'experience_match': exp_match,
                'recommendations': '; '.join(recommendations) if recommendations else "Good match for this position!"
            }

    return FallbackMatcher()


def train_new_model():
    """Train a new model if none exists"""
    global model, model_loaded

    try:
        # Ensure dependencies exist
        try:
            import pandas as pd  # noqa: F401
            from train_model import JobMatchingModel  # Lazy import
        except Exception as e:
            logger.warning(f"Cannot train model - dependencies missing: {e}")
            return False

        # Look for dataset
        dataset_paths = [
            "../job_descriptions.csv",
            "../../dataset/job_descriptions.csv",
            "../dataset/job_descriptions.csv"
        ]

        dataset_path = None
        for path in dataset_paths:
            if os.path.exists(path):
                dataset_path = path
                break

        if dataset_path is None:
            logger.error("Dataset not found! Cannot train model.")
            return False

        logger.info(f"Training new model with dataset: {dataset_path}")
        jobs_df = pd.read_csv(dataset_path)

        model_inst = JobMatchingModel()
        model_inst.train(jobs_df)
        model_inst.save_model(getattr(Config, 'MODEL_PATH', 'joblens_model.joblib'))

        model = model_inst
        model_loaded = True
        logger.info("New model trained and saved successfully!")
        return True

    except Exception as e:
        logger.error(f"Error training new model: {e}")
        return False


def extract_skills_from_text(text):
    """Extract skills from resume or profile text"""
    if not text:
        return []

    # Common technical skills patterns
    skill_patterns = [
        r'\b(python|java|javascript|react|node\.?js|angular|vue|typescript|go|rust|c\+\+|c#)\b',
        r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|cassandra|dynamodb)\b',
        r'\b(aws|azure|gcp|docker|kubernetes|jenkins|git|github|gitlab|bitbucket)\b',
        r'\b(html|css|bootstrap|sass|less|webpack|babel|npm|yarn)\b',
        r'\b(django|flask|spring|express|laravel|rails|fastapi|nestjs)\b',
        r'\b(machine learning|ai|data science|deep learning|nlp|computer vision)\b',
        r'\b(tensorflow|pytorch|scikit-learn|pandas|numpy|matplotlib|seaborn)\b',
        r'\b(agile|scrum|kanban|devops|ci/cd|testing|junit|jest|pytest)\b',
        r'\b(linux|unix|windows|macos|shell|bash|powershell)\b',
        r'\b(rest|api|graphql|microservices|serverless|lambda)\b'
    ]

    text = str(text).lower()
    skills = []

    for pattern in skill_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        skills.extend(matches)

    # Remove duplicates and return
    return list(set(skills))


@app.before_first_request
def _ensure_model_loaded_once():
    global model_loaded
    if not model_loaded:
        try:
            load_model()
        except Exception as e:
            logger.error(f"Model initialization failed: {e}")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'timestamp': datetime.now().isoformat(),
        'service': 'JobLens ML Service'
    })


@app.route('/model-info', methods=['GET'])
def model_info():
    """Return basic model diagnostics"""
    model_path = getattr(Config, 'MODEL_PATH', 'joblens_model.joblib')
    exists = os.path.exists(model_path)
    size_mb = 0.0
    try:
        if exists:
            size_mb = round(os.path.getsize(model_path) / (1024 * 1024), 2)
    except Exception:
        size_mb = 0.0
    return jsonify({
        'success': True,
        'data': {
            'model_loaded': model_loaded,
            'model_path': model_path,
            'model_exists': exists,
            'model_size_mb': size_mb,
            'timestamp': datetime.now().isoformat()
        }
    })


@app.route('/predict', methods=['POST'])
def predict_match():
    """Main prediction endpoint"""
    global model

    try:
        if not model_loaded or model is None:
            # Attempt lazy load once more
            load_model()
            if not model_loaded or model is None:
                return jsonify({
                    'success': False,
                    'error': 'Model not loaded. Please check server logs.',
                    'data': None
                }), 500

        # Get request data
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided',
                'data': None
            }), 400

        # Extract required fields
        job_description = data.get('job_description', '')
        resume_text = data.get('resume_text', '')
        user_skills = data.get('user_skills', [])
        user_experience = data.get('user_experience', 0)
        job_requirements = data.get('job_requirements', '')
        job_responsibilities = data.get('job_responsibilities', '')

        # If user_skills is empty, try to extract from resume
        if not user_skills and resume_text:
            user_skills = extract_skills_from_text(resume_text)

        # Validate inputs
        if not job_description:
            return jsonify({
                'success': False,
                'error': 'job_description is required',
                'data': None
            }), 400

        if not user_skills:
            return jsonify({
                'success': False,
                'error': 'user_skills is required or resume_text must contain extractable skills',
                'data': None
            }), 400

        # Make prediction
        logger.info(f"Making prediction for {len(user_skills)} user skills")
        prediction = model.predict_match(
            user_skills=user_skills,
            user_experience=float(user_experience),
            job_description=job_description,
            job_requirements=job_requirements,
            job_responsibilities=job_responsibilities
        )

        # Format response
        response = {
            'success': True,
            'error': None,
            'data': {
                'match_score': prediction['match_score'],
                'required_skills': prediction['job_skills'],
                'resume_skills': prediction['user_skills'],
                'skill_overlap': prediction['skill_overlap'],
                'missing_skills': prediction['missing_skills'],
                'experience_match': prediction['experience_match'],
                'recommendations': prediction['recommendations'],
                'timestamp': datetime.now().isoformat()
            }
        }

        logger.info(f"Prediction successful: {prediction['match_score']}% match")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error making prediction: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Prediction failed: {str(e)}',
            'data': None
        }), 500


@app.route('/train', methods=['POST'])
def train_model():
    """Train a new model endpoint"""
    try:
        success = train_new_model()
        if success:
            return jsonify({
                'success': True,
                'message': 'Model trained successfully',
                'data': None
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Model training failed',
                'data': None
            }), 500
    except Exception as e:
        logger.error(f"Error training model: {e}")
        return jsonify({
            'success': False,
            'error': f'Training failed: {str(e)}',
            'data': None
        }), 500


@app.route('/skills/extract', methods=['POST'])
def extract_skills():
    """Extract skills from text endpoint"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text field is required',
                'data': None
            }), 400

        text = data['text']
        skills = extract_skills_from_text(text)

        return jsonify({
            'success': True,
            'error': None,
            'data': {
                'skills': skills,
                'count': len(skills)
            }
        })

    except Exception as e:
        logger.error(f"Error extracting skills: {e}")
        return jsonify({
            'success': False,
            'error': f'Skill extraction failed: {str(e)}',
            'data': None
        }), 500


@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Retrain the model with new data"""
    try:
        success = train_new_model()

        if success:
            return jsonify({
                'success': True,
                'message': 'Model retrained successfully',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to retrain model',
                'timestamp': datetime.now().isoformat()
            }), 500

    except Exception as e:
        logger.error(f"Error retraining model: {e}")
        return jsonify({
            'success': False,
            'error': f'Error retraining model: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'data': None
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'data': None
    }), 500

if __name__ == '__main__':
    # Load model on startup
    logger.info("Starting JobLens ML Service...")
    load_model()

    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting server on port {port}, debug={debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)
