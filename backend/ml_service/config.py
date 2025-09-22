import os
from pathlib import Path

class Config:
    """Configuration settings for JobLens ML Service"""

    # Model settings
    MODEL_PATH = "joblens_model.joblib"
    MAX_FEATURES = 5000
    NGRAM_RANGE = (1, 2)
    MIN_DF = 2
    MAX_DF = 0.8

    # Training settings
    N_ESTIMATORS = 100
    MAX_DEPTH = 15
    MIN_SAMPLES_SPLIT = 5
    RANDOM_STATE = 42
    TEST_SIZE = 0.2
    N_SYNTHETIC_INTERACTIONS = 10000

    # Dataset paths (in order of preference)
    DATASET_PATHS = [
        "job_descriptions.csv",
        "../job_descriptions.csv",
        "../../dataset/job_descriptions.csv",
        "../dataset/job_descriptions.csv"
    ]

    # Expected dataset columns
    REQUIRED_COLUMNS = [
        'Job Id', 'Job Description', 'Qualifications', 'Responsibilities',
        'Experience', 'Salary Range', 'Work Type', 'Company Size', 'Country'
    ]

    # Skill extraction patterns (unified across the system)
    SKILL_PATTERNS = [
        r'\b(python|java|javascript|react|node\.?js|angular|vue|typescript|go|rust|c\+\+|c#|kotlin|swift)\b',
        r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|cassandra|dynamodb|oracle|sqlite)\b',
        r'\b(aws|azure|gcp|google cloud|docker|kubernetes|jenkins|git|github|gitlab|bitbucket)\b',
        r'\b(html|css|bootstrap|sass|less|webpack|babel|npm|yarn|gulp|grunt)\b',
        r'\b(django|flask|spring|express|laravel|rails|fastapi|nestjs|asp\.net)\b',
        r'\b(machine learning|ai|data science|deep learning|nlp|computer vision|ml)\b',
        r'\b(tensorflow|pytorch|scikit-learn|pandas|numpy|matplotlib|seaborn|jupyter)\b',
        r'\b(agile|scrum|kanban|devops|ci/cd|testing|junit|jest|pytest|selenium)\b',
        r'\b(linux|unix|windows|macos|shell|bash|powershell|cmd)\b',
        r'\b(rest|api|graphql|microservices|serverless|lambda|restful)\b',
        r'\b(redis|memcached|nginx|apache|tomcat|iis)\b',
        r'\b(jira|confluence|slack|teams|trello|asana)\b'
    ]

    # Flask settings
    FLASK_HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    FLASK_PORT = int(os.environ.get('FLASK_PORT', 5000))
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

    @classmethod
    def get_dataset_path(cls):
        """Find the first available dataset path"""
        for path in cls.DATASET_PATHS:
            if os.path.exists(path):
                return path
        return None

    @classmethod
    def validate_dataset(cls, df):
        """Validate that the dataset has required columns"""
        missing_columns = [col for col in cls.REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Dataset missing required columns: {missing_columns}")
        return True
