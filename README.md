# JobLens - AI-Powered Job Matching Platform

JobLens is an intelligent job finder application that uses AI to match user resumes with the best available job opportunities. The platform combines modern mobile technology with machine learning to provide personalized job recommendations.

## 🚀 Features

### Core Features
- **AI-Powered Resume Matching**: Upload your CV and get matched with the most suitable job opportunities
- **Job Search & Discovery**: Browse and search through thousands of job listings
- **Detailed Job Information**: View comprehensive job details including requirements, salary, and company information
- **One-Click Apply**: Apply to jobs directly through the platform
- **User Profiles**: Manage your professional profile and preferences
- **Firebase Authentication**: Secure user authentication and authorization
- **Real-time Notifications**: Stay updated with new job matches and application status

### AI & ML Features
- **Resume Analysis**: Extract skills and experience from uploaded CVs
- **Job Matching Algorithm**: Score and rank jobs based on resume compatibility
- **Skill Gap Analysis**: Identify missing skills for better job matches
- **Personalized Recommendations**: Get job suggestions tailored to your profile

## 🏗️ Architecture

The application follows a microservices architecture with three main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Native   │    │   Rust Backend  │    │  Python ML      │
│    Frontend     │◄──►│    (Actix-Web)  │◄──►│   Service       │
│                 │    │                 │    │   (Flask)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Firebase     │    │   PostgreSQL    │    │  ML Models      │
│  Authentication │    │    Database     │    │  (scikit-learn) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend (React Native + Expo)
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Authentication**: Firebase Auth
- **HTTP Client**: Axios

### Backend (Rust)
- **Framework**: Actix-Web
- **Database**: PostgreSQL with SQLx
- **Authentication**: JWT tokens
- **File Upload**: Resume storage and processing
- **External APIs**: Job listing integrations

### ML Service (Python)
- **Framework**: Flask
- **ML Libraries**: scikit-learn, NLTK, sentence-transformers
- **Model**: Trained job matching model using TF-IDF and similarity scoring
- **Data Processing**: Resume parsing and job description analysis

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **Python** (3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Firebase Account** (for authentication)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Warushika-Wijayarathna/Job_lens-Mobile-App-.git
cd Job_lens-Mobile-App-
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb joblens_db

# Run migrations
cd backend
psql -d joblens_db -f migrations/jobs_table_migration.sql
```

### 3. Backend Setup (Rust)
```bash
cd backend

# Install dependencies
cargo build

# Set environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run the backend server
cargo run
```

**Environment Variables for Backend (.env):**
```env
DATABASE_URL=postgresql://username:password@localhost/joblens_db
JWT_SECRET=your-super-secret-jwt-key
HOST=0.0.0.0
PORT=8080
ML_SERVICE_URL=http://localhost:5000
```

### 4. ML Service Setup (Python)
```bash
cd backend/ml_service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train the model (optional - pre-trained model included)
python train_model.py

# Run the ML service
python app.py
```

### 5. Frontend Setup (React Native)
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase configuration and backend URL

# Start the development server
npm start

# Run on device/simulator
npm run ios     # For iOS
npm run android # For Android
npm run web     # For web
```

**Environment Variables for Frontend (.env):**
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 6. Firebase Setup
1. Create a new Firebase project
2. Enable Authentication with Email/Password
3. Add your app to Firebase and download the configuration
4. Update the environment variables in the frontend

## 🚀 Running the Application

1. **Start the database**: Ensure PostgreSQL is running
2. **Start the ML service**: `cd backend/ml_service && python app.py`
3. **Start the backend**: `cd backend && cargo run`
4. **Start the frontend**: `cd frontend && npm start`

The application will be available at:
- **Frontend**: Expo development server (scan QR code with Expo Go app)
- **Backend API**: http://localhost:8080
- **ML Service**: http://localhost:5000

## 📱 App Screens

### Authentication Screens
- **Login**: User authentication with Firebase
- **Register**: New user registration
- **Forgot Password**: Password reset functionality
- **Onboarding**: First-time user setup

### Main Application Screens
- **Home**: Dashboard with quick actions and recommendations
- **Jobs**: Browse and search job listings with filters
- **Job Details**: Detailed view of job postings with apply option
- **Resume Match**: Upload CV and get AI-powered job matches
- **Profile**: User profile management and preferences
- **Notifications**: Application updates and new job alerts

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

### Jobs
- `GET /api/jobs` - Get job listings with pagination and filters
- `GET /api/jobs/{id}` - Get specific job details
- `POST /api/jobs/search` - Search jobs with advanced filters

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-resume` - Upload user resume

### ML Service
- `POST /api/match-resume` - Get job matches for uploaded resume
- `POST /api/analyze-resume` - Extract skills from resume
- `GET /health` - Service health check

## 🧠 Machine Learning Features

The ML service provides several AI-powered features:

### Resume Analysis
- **Text Extraction**: Parse PDF resumes and extract text content
- **Skill Detection**: Identify technical and soft skills
- **Experience Level**: Determine years of experience
- **Education Parsing**: Extract educational qualifications

### Job Matching Algorithm
- **TF-IDF Vectorization**: Convert job descriptions and resumes to numerical vectors
- **Cosine Similarity**: Calculate similarity scores between resumes and jobs
- **Weighted Scoring**: Consider multiple factors (skills, experience, location)
- **Ranking System**: Sort jobs by match percentage

### Model Training
The system includes scripts to train custom models:
```bash
cd backend/ml_service
python train_model.py
```

## 🗄️ Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    company VARCHAR NOT NULL,
    location VARCHAR,
    url VARCHAR UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    external_id VARCHAR,
    job_type VARCHAR,
    salary VARCHAR,
    category VARCHAR
);
```

### Users Data
User data is stored in Firebase Authentication with additional profile information cached in JSON format.

## 🔒 Security Features

- **Firebase Authentication**: Secure user authentication and session management
- **JWT Tokens**: API access control with JSON Web Tokens
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: Secure resume upload and processing

## 🚀 Deployment

### Backend Deployment
The Rust backend can be deployed using Docker:
```bash
cd backend
docker build -t joblens-backend .
docker run -p 8080:8080 joblens-backend
```

### ML Service Deployment
```bash
cd backend/ml_service
docker build -t joblens-ml .
docker run -p 5000:5000 joblens-ml
```

### Frontend Deployment
Build for production:
```bash
cd frontend
expo build:web        # For web deployment
expo build:android     # For Android APK
expo build:ios         # For iOS build
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
cargo test
```

### ML Service Tests
```bash
cd backend/ml_service
python test_service.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📚 Additional Resources

### Key Dependencies

**Backend (Rust)**
- `actix-web`: Web framework
- `sqlx`: Database toolkit
- `serde`: Serialization framework
- `uuid`: UUID generation
- `chrono`: Date and time handling

**Frontend (React Native)**
- `@react-navigation/native`: Navigation
- `@reduxjs/toolkit`: State management
- `expo`: Development platform
- `firebase`: Authentication
- `axios`: HTTP client

**ML Service (Python)**
- `flask`: Web framework
- `scikit-learn`: Machine learning
- `pandas`: Data manipulation
- `nltk`: Natural language processing
- `sentence-transformers`: Text embeddings

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
- Check PostgreSQL connection
- Verify environment variables
- Ensure port 8080 is available

**ML Service errors**
- Install Python dependencies: `pip install -r requirements.txt`
- Check model file exists: `joblens_model.joblib`
- Verify Python version compatibility

**Frontend build issues**
- Clear cache: `expo r -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Expo CLI version

**Firebase authentication issues**
- Verify Firebase configuration
- Check API keys and project settings
- Ensure authentication is enabled in Firebase console

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting section

---

**JobLens** - Connecting talent with opportunity through AI-powered job matching. 🚀
