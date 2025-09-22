import pandas as pd
import numpy as np
import pickle
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sentence_transformers import SentenceTransformer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
import re
import os
from pathlib import Path

# Download NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    # NLTK 3.9+ splits tokenizer tables into 'punkt_tab'
    nltk.download('punkt_tab', quiet=True)
except:
    pass

class JobMatchingModel:
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.8
        )
        self.skill_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 1)
        )
        self.sentence_model = None
        self.match_model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=15,
            min_samples_split=5
        )
        self.salary_model = GradientBoostingRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=6
        )
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.stemmer = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))

    def preprocess_text(self, text):
        """Clean and preprocess text data"""
        if pd.isna(text) or text is None:
            return ""

        # Convert to lowercase and remove special characters
        text = str(text).lower()
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()

        # Tokenize and remove stopwords
        tokens = word_tokenize(text)
        tokens = [self.stemmer.stem(token) for token in tokens
                 if token not in self.stop_words and len(token) > 2]

        return ' '.join(tokens)

    def extract_skills(self, text):
        """Extract skills from job description or resume text"""
        if pd.isna(text) or text is None:
            return []

        # Common tech skills and keywords
        skill_patterns = [
            r'\b(python|java|javascript|react|node\.?js|angular|vue|typescript)\b',
            r'\b(sql|mysql|postgresql|mongodb|redis|elasticsearch)\b',
            r'\b(aws|azure|gcp|docker|kubernetes|jenkins|git)\b',
            r'\b(html|css|bootstrap|sass|less|webpack|babel)\b',
            r'\b(django|flask|spring|express|laravel|rails)\b',
            r'\b(machine learning|ai|data science|deep learning|nlp)\b',
            r'\b(tensorflow|pytorch|scikit-learn|pandas|numpy)\b',
            r'\b(agile|scrum|kanban|devops|ci/cd|testing)\b'
        ]

        text = str(text).lower()
        skills = []

        for pattern in skill_patterns:
            matches = re.findall(pattern, text)
            skills.extend(matches)

        return list(set(skills))

    def create_features(self, jobs_df):
        """Create feature matrix from job data"""
        print("Creating features from job data...")

        # Preprocess text fields
        jobs_df['processed_description'] = jobs_df['Job Description'].apply(self.preprocess_text)
        jobs_df['processed_requirements'] = jobs_df['Qualifications'].apply(self.preprocess_text)
        jobs_df['processed_responsibilities'] = jobs_df['Responsibilities'].apply(self.preprocess_text)

        # Extract skills
        jobs_df['extracted_skills'] = jobs_df['Job Description'].apply(self.extract_skills)
        jobs_df['skill_count'] = jobs_df['extracted_skills'].apply(len)

        # Combine text features
        jobs_df['combined_text'] = (
            jobs_df['processed_description'] + ' ' +
            jobs_df['processed_requirements'] + ' ' +
            jobs_df['processed_responsibilities']
        )

        # Encode categorical features
        categorical_features = ['Work Type', 'Company Size', 'Country']
        for feature in categorical_features:
            if feature in jobs_df.columns:
                le = LabelEncoder()
                jobs_df[f'{feature}_encoded'] = le.fit_transform(jobs_df[feature].fillna('Unknown'))
                self.label_encoders[feature] = le

        # Extract experience requirements
        jobs_df['experience_numeric'] = jobs_df['Experience'].apply(self.extract_experience_years)

        # Extract salary information
        jobs_df['salary_min'], jobs_df['salary_max'] = zip(*jobs_df['Salary Range'].apply(self.extract_salary_range))

        return jobs_df

    def extract_experience_years(self, exp_text):
        """Extract numeric experience requirements"""
        if pd.isna(exp_text):
            return 0

        exp_text = str(exp_text).lower()

        # Look for patterns like "3+ years", "2-5 years", etc.
        patterns = [
            r'(\d+)\+?\s*years?',
            r'(\d+)\s*to\s*\d+\s*years?',
            r'(\d+)-\d+\s*years?'
        ]

        for pattern in patterns:
            match = re.search(pattern, exp_text)
            if match:
                return int(match.group(1))

        return 0

    def extract_salary_range(self, salary_text):
        """Extract salary range from text"""
        if pd.isna(salary_text):
            return 0, 0

        salary_text = str(salary_text).lower()

        # Remove currency symbols and common words
        salary_text = re.sub(r'[^0-9\s\-k]', '', salary_text)

        # Look for patterns like "50k-80k", "50000-80000"
        patterns = [
            r'(\d+)k?\s*-\s*(\d+)k?',
            r'(\d+),?(\d{3})?\s*-\s*(\d+),?(\d{3})?'
        ]

        for pattern in patterns:
            match = re.search(pattern, salary_text)
            if match:
                try:
                    min_sal = int(match.group(1))
                    max_sal = int(match.group(2)) if len(match.groups()) >= 2 else min_sal

                    # Convert k notation
                    if 'k' in salary_text:
                        min_sal *= 1000
                        max_sal *= 1000

                    return min_sal, max_sal
                except:
                    continue

        return 0, 0

    def generate_synthetic_user_interactions(self, jobs_df, n_interactions=10000):
        """Generate synthetic user interaction data for training"""
        print("Generating synthetic user interaction data...")

        interactions = []

        for _ in range(n_interactions):
            # Random job selection
            job_idx = np.random.randint(0, len(jobs_df))
            job = jobs_df.iloc[job_idx]

            # Simulate user profile
            user_skills = np.random.choice(
                ['python', 'javascript', 'react', 'sql', 'aws', 'docker', 'git',
                 'java', 'node.js', 'mongodb', 'typescript', 'angular'],
                size=np.random.randint(3, 8),
                replace=False
            ).tolist()

            user_experience = np.random.exponential(4)
            user_location = np.random.choice(['Remote', 'New York', 'San Francisco', 'Austin'])

            # Calculate match features
            job_skills = job['extracted_skills']
            skill_overlap = len(set(user_skills) & set(job_skills))
            skill_ratio = skill_overlap / max(len(user_skills), 1)

            experience_match = min(user_experience / max(job['experience_numeric'], 1), 2.0)

            # Calculate target satisfaction score
            satisfaction = (
                skill_ratio * 50 +  # Skill match importance
                min(experience_match, 1.0) * 30 +  # Experience match
                np.random.normal(0, 10)  # Random noise
            )
            satisfaction = max(0, min(100, satisfaction))

            interactions.append({
                'job_id': job['Job Id'],
                'user_skills': ','.join(user_skills),
                'user_experience': user_experience,
                'user_location': user_location,
                'skill_overlap': skill_overlap,
                'skill_ratio': skill_ratio,
                'experience_match': experience_match,
                'satisfaction_score': satisfaction
            })

        return pd.DataFrame(interactions)

    def train(self, jobs_df):
        """Train the job matching model"""
        print("Training JobLens ML Model...")

        # Optional: sample jobs to speed up training
        try:
            sample_size = int(os.environ.get('JOBLENS_SAMPLE_JOBS', '0') or '0')
        except ValueError:
            sample_size = 0
        if sample_size > 0 and len(jobs_df) > sample_size:
            print(f"Sampling {sample_size} jobs from {len(jobs_df)} for faster training...")
            jobs_df = jobs_df.sample(n=sample_size, random_state=42).reset_index(drop=True)

        # Create features
        jobs_df = self.create_features(jobs_df)

        # Generate training data
        try:
            n_inter = int(os.environ.get('JOBLENS_SYN_INTERACTIONS', '5000') or '5000')
        except ValueError:
            n_inter = 5000
        interactions_df = self.generate_synthetic_user_interactions(jobs_df, n_interactions=n_inter)
        print(f"Generated {len(interactions_df)} synthetic interactions")

        # Merge job features with interactions
        training_data = interactions_df.merge(
            jobs_df[['Job Id', 'combined_text', 'skill_count', 'experience_numeric',
                    'Work Type_encoded', 'Company Size_encoded', 'Country_encoded',
                    'salary_min', 'salary_max']]
            if all(col in jobs_df.columns for col in ['Work Type_encoded', 'Company Size_encoded', 'Country_encoded'])
            else jobs_df[['Job Id', 'combined_text', 'skill_count', 'experience_numeric', 'salary_min', 'salary_max']],
            left_on='job_id',
            right_on='Job Id',
            how='left'
        )

        # Fit text vectorizers
        print("Fitting text vectorizers...")
        job_text_features = self.tfidf_vectorizer.fit_transform(training_data['combined_text'].fillna(''))

        # Create feature matrix
        feature_columns = [
            'skill_overlap', 'skill_ratio', 'experience_match',
            'skill_count', 'experience_numeric',
            'Work Type_encoded', 'Company Size_encoded', 'Country_encoded',
            'salary_min', 'salary_max', 'user_experience'
        ]

        # Safely select columns that exist
        available_feature_columns = [c for c in feature_columns if c in training_data.columns]
        numerical_features = training_data[available_feature_columns].fillna(0)
        numerical_features = self.scaler.fit_transform(numerical_features)

        # Combine features
        from scipy.sparse import hstack
        X = hstack([numerical_features, job_text_features])
        y = training_data['satisfaction_score']

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Train model
        print("Training Random Forest model...")
        self.match_model.fit(X_train, y_train)

        # Evaluate
        train_pred = self.match_model.predict(X_train)
        test_pred = self.match_model.predict(X_test)

        print(f"Training R² Score: {r2_score(y_train, train_pred):.3f}")
        print(f"Testing R² Score: {r2_score(y_test, test_pred):.3f}")
        print(f"Training RMSE: {np.sqrt(mean_squared_error(y_train, train_pred)):.3f}")
        print(f"Testing RMSE: {np.sqrt(mean_squared_error(y_test, test_pred)):.3f}")

        # Initialize sentence transformer for semantic matching (optional)
        skip_semantic = os.environ.get('JOBLENS_SKIP_SENTENCE_MODEL', 'true').lower() in ('1', 'true', 'yes')
        if skip_semantic:
            print("Skipping sentence transformer load (JOBLENS_SKIP_SENTENCE_MODEL=true)")
            self.sentence_model = None
        else:
            try:
                print("Loading sentence transformer model...")
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("Sentence transformer loaded successfully!")
            except Exception as e:
                print(f"Warning: Could not load sentence transformer: {e}")
                self.sentence_model = None

        print("Model training completed successfully!")

        return {
            'train_r2': r2_score(y_train, train_pred),
            'test_r2': r2_score(y_test, test_pred),
            'train_rmse': np.sqrt(mean_squared_error(y_train, train_pred)),
            'test_rmse': np.sqrt(mean_squared_error(y_test, test_pred))
        }

    def predict_match(self, user_skills, user_experience, job_description,
                     job_requirements="", job_responsibilities=""):
        """Predict job match score for a user"""

        # Combine job text
        combined_job_text = f"{job_description} {job_requirements} {job_responsibilities}"
        processed_job_text = self.preprocess_text(combined_job_text)

        # Extract job skills
        job_skills = self.extract_skills(combined_job_text)

        # Calculate basic features
        skill_overlap = len(set(user_skills) & set(job_skills))
        skill_ratio = skill_overlap / max(len(user_skills), 1)

        # Create feature vector for prediction
        try:
            # Text features
            job_text_features = self.tfidf_vectorizer.transform([processed_job_text])

            # Numerical features (using defaults for missing data)
            numerical_features = np.array([[
                skill_overlap,      # skill_overlap
                skill_ratio,        # skill_ratio
                1.0,               # experience_match (default)
                len(job_skills),   # skill_count
                0,                 # experience_numeric (default)
                0,                 # Work Type_encoded (default)
                0,                 # Company Size_encoded (default)
                0,                 # Country_encoded (default)
                0,                 # salary_min (default)
                0,                 # salary_max (default)
                user_experience    # user_experience
            ]])

            # Scale numerical features
            numerical_features = self.scaler.transform(numerical_features)

            # Combine features
            from scipy.sparse import hstack
            X = hstack([numerical_features, job_text_features])

            # Make prediction
            match_score = self.match_model.predict(X)[0]
            match_score = max(0, min(100, match_score))  # Clamp to 0-100

        except Exception as e:
            print(f"Error in prediction: {e}")
            # Fallback to simple skill-based matching
            match_score = skill_ratio * 100

        # Generate missing skills
        missing_skills = list(set(job_skills) - set(user_skills))

        # Generate recommendations
        recommendations = self._generate_recommendations(
            user_skills, job_skills, missing_skills, match_score
        )

        return {
            'match_score': round(match_score, 2),
            'job_skills': job_skills,
            'user_skills': user_skills,
            'skill_overlap': skill_overlap,
            'missing_skills': missing_skills,
            'experience_match': min(user_experience / max(1, 3), 1.0),  # Assume 3 years requirement
            'recommendations': recommendations
        }

    def _generate_recommendations(self, user_skills, job_skills, missing_skills, match_score):
        """Generate personalized recommendations"""
        recommendations = []

        if match_score < 30:
            recommendations.append("This role may be challenging given your current skill set.")
        elif match_score < 60:
            recommendations.append("Consider developing some missing skills before applying.")
        else:
            recommendations.append("You're a good match for this role!")

        if missing_skills:
            top_missing = missing_skills[:3]  # Top 3 missing skills
            recommendations.append(f"Consider learning: {', '.join(top_missing)}")

        return " ".join(recommendations)

    def save_model(self, filepath):
        """Save the trained model"""
        model_data = {
            'tfidf_vectorizer': self.tfidf_vectorizer,
            'skill_vectorizer': self.skill_vectorizer,
            'match_model': self.match_model,
            'salary_model': self.salary_model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'stemmer': self.stemmer,
            'stop_words': self.stop_words
        }
        joblib.dump(model_data, filepath)
        print(f"Model saved to {filepath}")

    def load_model(self, filepath):
        """Load a trained model"""
        model_data = joblib.load(filepath)

        self.tfidf_vectorizer = model_data['tfidf_vectorizer']
        self.skill_vectorizer = model_data['skill_vectorizer']
        self.match_model = model_data['match_model']
        self.salary_model = model_data['salary_model']
        self.scaler = model_data['scaler']
        self.label_encoders = model_data['label_encoders']
        self.stemmer = model_data['stemmer']
        self.stop_words = model_data['stop_words']

        # Try to load sentence transformer (optional)
        skip_semantic = os.environ.get('JOBLENS_SKIP_SENTENCE_MODEL', 'false').lower() in ('1', 'true', 'yes')
        if skip_semantic:
            self.sentence_model = None
            print("Sentence transformer loading skipped (JOBLENS_SKIP_SENTENCE_MODEL=true)")
        else:
            try:
                print("Attempting to load sentence transformer model (JOBLENS_SKIP_SENTENCE_MODEL=false)...")
                self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("Sentence transformer loaded successfully!")
            except Exception as e:
                print(f"Warning: Could not load sentence transformer: {e}")
                self.sentence_model = None

        print(f"Model loaded from {filepath}")

def main():
    """Main training function"""
    print("JobLens ML Model Training")
    print("=" * 50)

    # Load dataset
    dataset_path = "../job_descriptions.csv"
    if not os.path.exists(dataset_path):
        dataset_path = "../../dataset/job_descriptions.csv"

    if not os.path.exists(dataset_path):
        print("Error: job_descriptions.csv not found!")
        print("Please ensure the dataset is available in the dataset folder.")
        return

    try:
        # Optional: limit rows for faster training
        nrows_env = os.environ.get('JOBLENS_READ_NROWS')
        nrows = int(nrows_env) if nrows_env and nrows_env.isdigit() else None
        print(f"Loading dataset from {dataset_path}..." + (f" (nrows={nrows})" if nrows else ""))
        jobs_df = pd.read_csv(dataset_path, nrows=nrows)
        print(f"Loaded {len(jobs_df)} job records")

        # Initialize and train model
        model = JobMatchingModel()
        metrics = model.train(jobs_df)

        # Save model
        model_path = "joblens_model.joblib"
        model.save_model(model_path)

        print("\n" + "=" * 50)
        print("Training completed successfully!")
        print(f"Model saved as: {model_path}")
        print(f"Final Test R² Score: {metrics['test_r2']:.3f}")
        print(f"Final Test RMSE: {metrics['test_rmse']:.3f}")

    except Exception as e:
        print(f"Error during training: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
