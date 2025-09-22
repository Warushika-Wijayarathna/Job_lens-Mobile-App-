import requests
import json
import time
import sys
import os
from pathlib import Path

# Add the ml_service directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from train_model import JobMatchingModel
from config import Config
import pandas as pd

def test_model_training():
    """Test the model training functionality"""
    print("🧪 Testing Model Training...")

    try:
        # Find dataset
        dataset_path = Config.get_dataset_path()
        if not dataset_path:
            print("❌ Dataset not found!")
            return False

        print(f"✅ Found dataset: {dataset_path}")

        # Load a small sample for testing
        df = pd.read_csv(dataset_path, nrows=100)  # Just test with 100 rows
        print(f"✅ Loaded {len(df)} job records for testing")

        # Validate dataset structure
        Config.validate_dataset(df)
        print("✅ Dataset structure validation passed")

        # Initialize and test training
        model = JobMatchingModel()
        print("✅ Model initialized")

        # Test with small dataset
        metrics = model.train(df)
        print(f"✅ Training completed - Test R²: {metrics['test_r2']:.3f}")

        # Test prediction
        test_prediction = model.predict_match(
            user_skills=['python', 'javascript', 'react'],
            user_experience=3.0,
            job_description="We need a Python developer with React experience",
            job_requirements="3+ years experience required",
            job_responsibilities="Build web applications"
        )

        print(f"✅ Test prediction - Match Score: {test_prediction['match_score']}%")

        # Test save/load
        model.save_model("test_model.joblib")
        print("✅ Model saved successfully")

        # Test loading
        new_model = JobMatchingModel()
        new_model.load_model("test_model.joblib")
        print("✅ Model loaded successfully")

        # Clean up
        if os.path.exists("test_model.joblib"):
            os.remove("test_model.joblib")

        return True

    except Exception as e:
        print(f"❌ Training test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_ml_service_endpoints(base_url="http://localhost:5000"):
    """Test the ML service API endpoints"""
    print(f"🧪 Testing ML Service Endpoints at {base_url}...")

    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health check passed - Model loaded: {health_data.get('model_loaded', False)}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False

        # Test skill extraction
        skill_test_data = {
            "text": "I have experience with Python, React, JavaScript, Docker, and AWS. I've worked with machine learning and data science projects."
        }

        response = requests.post(f"{base_url}/skills/extract",
                               json=skill_test_data,
                               timeout=10)

        if response.status_code == 200:
            skills_data = response.json()
            extracted_skills = skills_data.get('data', {}).get('skills', [])
            print(f"✅ Skill extraction passed - Found {len(extracted_skills)} skills: {extracted_skills}")
        else:
            print(f"❌ Skill extraction failed: {response.status_code}")

        # Test prediction endpoint
        prediction_data = {
            "job_description": "We are looking for a Python developer with experience in React and machine learning.",
            "user_skills": ["python", "react", "javascript", "docker"],
            "user_experience": 3,
            "job_requirements": "3+ years of Python experience required",
            "job_responsibilities": "Develop ML applications using Python and React"
        }

        response = requests.post(f"{base_url}/predict",
                               json=prediction_data,
                               timeout=30)

        if response.status_code == 200:
            pred_data = response.json()
            if pred_data.get('success'):
                match_score = pred_data.get('data', {}).get('match_score', 0)
                print(f"✅ Prediction passed - Match Score: {match_score}%")
            else:
                print(f"❌ Prediction failed: {pred_data.get('error')}")
                return False
        else:
            print(f"❌ Prediction endpoint failed: {response.status_code}")
            return False

        # Test model info endpoint
        response = requests.get(f"{base_url}/model-info", timeout=10)
        if response.status_code == 200:
            info_data = response.json()
            print(f"✅ Model info passed - Model size: {info_data.get('data', {}).get('model_size_mb', 0)}MB")
        else:
            print(f"❌ Model info failed: {response.status_code}")

        return True

    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to ML service at {base_url}")
        print("   Make sure the ML service is running: python app.py")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_data_consistency():
    """Test data consistency across components"""
    print("🧪 Testing Data Consistency...")

    try:
        # Test skill extraction consistency
        test_text = "Python React JavaScript Docker AWS machine learning"

        # Test with config patterns
        from config import Config
        import re

        skills_found = []
        for pattern in Config.SKILL_PATTERNS:
            matches = re.findall(pattern, test_text, re.IGNORECASE)
            skills_found.extend(matches)

        config_skills = list(set(skills_found))
        print(f"✅ Config-based extraction found: {config_skills}")

        # Test with model extraction
        model = JobMatchingModel()
        model_skills = model.extract_skills(test_text)
        print(f"✅ Model-based extraction found: {model_skills}")

        # Check overlap
        overlap = set(config_skills) & set(model_skills)
        print(f"✅ Skill extraction overlap: {len(overlap)}/{max(len(config_skills), len(model_skills))} skills")

        return True

    except Exception as e:
        print(f"❌ Data consistency test failed: {e}")
        return False

def run_comprehensive_tests():
    """Run all tests"""
    print("🚀 Starting JobLens ML Service Comprehensive Tests")
    print("=" * 60)

    tests = [
        ("Model Training", test_model_training),
        ("Data Consistency", test_data_consistency),
        ("ML Service API", test_ml_service_endpoints),
    ]

    results = {}

    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} Tests...")
        print("-" * 40)

        start_time = time.time()
        success = test_func()
        end_time = time.time()

        results[test_name] = {
            'success': success,
            'duration': round(end_time - start_time, 2)
        }

        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} ({results[test_name]['duration']}s)")

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)

    total_tests = len(tests)
    passed_tests = sum(1 for r in results.values() if r['success'])

    for test_name, result in results.items():
        status = "✅ PASSED" if result['success'] else "❌ FAILED"
        print(f"{test_name:<20} {status:<10} ({result['duration']}s)")

    print("-" * 60)
    print(f"Overall: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print("🎉 All tests passed! JobLens ML Service is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the issues above.")

    return passed_tests == total_tests

if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)
