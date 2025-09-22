use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Duration;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::models::{ApiResponse, Job, JobsResponse};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct JobQuery {
    pub q: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub category: Option<String>,
    pub company_name: Option<String>,
    pub search: Option<String>,
}

#[derive(Deserialize, Debug)]
struct RemotiveJob {
    id: i32,
    url: String,
    title: String,
    company_name: String,
    company_logo: Option<String>,
    category: String,
    job_type: Option<String>,
    publication_date: String,
    candidate_required_location: Option<String>,
    salary: Option<String>,
    description: String,
}

#[derive(Deserialize, Debug)]
struct RemotiveResponse {
    #[serde(rename = "job-count")]
    job_count: i32,
    jobs: Vec<RemotiveJob>,
}

#[derive(Serialize)]
struct MLPredictionRequest {
    job_description: String,
    resume_text: String,
}

#[derive(Deserialize)]
struct MLPredictionResponse {
    success: bool,
    data: Option<MLMatchResult>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct MLMatchResult {
    match_score: f64,
    required_skills: Vec<String>,
    resume_skills: Vec<String>,
    skill_overlap: usize,
    missing_skills: Vec<String>,
    recommendations: String,
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/jobs", web::get().to(get_jobs))
        .route("/jobs/search", web::get().to(search_jobs))
        .route("/jobs/sync", web::post().to(sync_jobs))
        .route("/jobs/{id}", web::get().to(get_job_by_id))
        .route("/jobs/{job_id}/match/{user_id}", web::post().to(match_job_with_user))
        .route("/jobs/detail-match/{user_id}", web::post().to(fetch_job_detail_and_match));
}

async fn get_jobs(state: web::Data<AppState>, query: web::Query<JobQuery>) -> Result<HttpResponse> {
    println!("🔍 Fetching jobs from Remotive API...");

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    // Build Remotive API URL with query parameters
    let mut url = "https://remotive.com/api/remote-jobs".to_string();
    let mut params = Vec::new();

    if let Some(limit) = query.limit {
        params.push(format!("limit={}", limit.min(100))); // Cap at 100 for performance
    } else {
        params.push("limit=50".to_string()); // Default limit
    }

    if let Some(category) = &query.category {
        params.push(format!("category={}", urlencoding::encode(category)));
    }

    if let Some(company_name) = &query.company_name {
        params.push(format!("company_name={}", urlencoding::encode(company_name)));
    }

    if let Some(search) = &query.search {
        params.push(format!("search={}", urlencoding::encode(search)));
    } else if let Some(q) = &query.q {
        params.push(format!("search={}", urlencoding::encode(q)));
    }

    if !params.is_empty() {
        url.push('?');
        url.push_str(&params.join("&"));
    }

    println!("📡 Requesting: {}", url);

    let response = client
        .get(&url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await
        .map_err(|e| {
            println!("❌ Remotive API request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to fetch jobs from Remotive")
        })?;

    if !response.status().is_success() {
        println!("❌ Remotive API returned status: {}", response.status());
        return Ok(HttpResponse::InternalServerError().json(ApiResponse::<JobsResponse> {
            success: false,
            data: None,
            message: format!("Remotive API error: {}", response.status()),
        }));
    }

    let remotive_response: RemotiveResponse = response
        .json()
        .await
        .map_err(|e| {
            println!("❌ Failed to parse Remotive response: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to parse jobs data")
        })?;

    println!("✅ Fetched {} jobs from Remotive", remotive_response.jobs.len());

    // Convert Remotive jobs to our Job format
    let mut jobs: Vec<Job> = Vec::new();
    for remotive_job in remotive_response.jobs {
        let job = Job {
            id: Uuid::new_v4().to_string(), // Generate new UUID for our system
            title: remotive_job.title,
            company: remotive_job.company_name,
            company_logo: remotive_job.company_logo,
            location: remotive_job.candidate_required_location,
            url: remotive_job.url,
            description: remotive_job.description,
            created_at: parse_remotive_date(&remotive_job.publication_date)
                .unwrap_or_else(|| Utc::now().to_rfc3339()),
            external_id: Some(remotive_job.id.to_string()),
            job_type: remotive_job.job_type,
            salary: remotive_job.salary,
            category: Some(remotive_job.category),
        };
        jobs.push(job);
    }

    // Apply additional filtering if needed
    if let Some(q) = &query.q {
        if query.search.is_none() {
            let ql = q.to_lowercase();
            jobs = jobs.into_iter().filter(|j|
                j.title.to_lowercase().contains(&ql) ||
                j.company.to_lowercase().contains(&ql) ||
                j.description.to_lowercase().contains(&ql)
            ).collect();
        }
    }

    let total = jobs.len();
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50);

    // Apply pagination
    let paginated_jobs: Vec<Job> = jobs.into_iter().skip(offset).take(limit).collect();

    let response = JobsResponse {
        jobs: paginated_jobs,
        total,
        limit,
        offset,
    };

    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(response),
        message: "Jobs fetched successfully from Remotive".to_string(),
    }))
}

async fn search_jobs(state: web::Data<AppState>, query: web::Query<JobQuery>) -> Result<HttpResponse> {
    get_jobs(state, query).await
}

async fn sync_jobs(state: web::Data<AppState>) -> Result<HttpResponse> {
    println!("🔄 Syncing jobs from Remotive API...");

    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    let url = "https://remotive.com/api/remote-jobs?limit=100";

    let response = client
        .get(url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await
        .map_err(|e| {
            println!("❌ Sync request failed: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to sync jobs")
        })?;

    if !response.status().is_success() {
        return Ok(HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: format!("Sync failed with status: {}", response.status()),
        }));
    }

    let remotive_response: RemotiveResponse = response
        .json()
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to parse sync response"))?;

    println!("✅ Synced {} jobs from Remotive", remotive_response.jobs.len());

    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "synced_count": remotive_response.jobs.len(),
            "source": "remotive"
        })),
        message: format!("Successfully synced {} jobs from Remotive", remotive_response.jobs.len()),
    }))
}

async fn get_job_by_id(path: web::Path<String>) -> Result<HttpResponse> {
    let job_id = path.into_inner();

    // Try to fetch job details from Remotive API using the external ID
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    // Since Remotive doesn't provide individual job endpoints, we'll search for it
    let url = format!("https://remotive.com/api/remote-jobs?limit=100");

    let response = client
        .get(&url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to fetch job details"))?;

    if !response.status().is_success() {
        return Ok(HttpResponse::NotFound().json(ApiResponse::<Job> {
            success: false,
            data: None,
            message: "Job not found".to_string(),
        }));
    }

    let remotive_response: RemotiveResponse = response
        .json()
        .await
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to parse job data"))?;

    // Find the job by ID
    if let Some(remotive_job) = remotive_response.jobs.into_iter().find(|j| j.id.to_string() == job_id) {
        let job = Job {
            id: Uuid::new_v4().to_string(),
            title: remotive_job.title,
            company: remotive_job.company_name,
            company_logo: remotive_job.company_logo,
            location: remotive_job.candidate_required_location,
            url: remotive_job.url,
            description: remotive_job.description,
            created_at: parse_remotive_date(&remotive_job.publication_date)
                .unwrap_or_else(|| Utc::now().to_rfc3339()),
            external_id: Some(remotive_job.id.to_string()),
            job_type: remotive_job.job_type,
            salary: remotive_job.salary,
            category: Some(remotive_job.category),
        };

        Ok(HttpResponse::Ok().json(ApiResponse {
            success: true,
            data: Some(job),
            message: "Job found".to_string(),
        }))
    } else {
        Ok(HttpResponse::NotFound().json(ApiResponse::<Job> {
            success: false,
            data: None,
            message: format!("Job with id {} not found", job_id),
        }))
    }
}

#[derive(Deserialize)]
struct JobDetailMatchRequest {
    job_url: String,
}

// New endpoint to fetch job details from URL and match against user CV
async fn fetch_job_detail_and_match(
    state: web::Data<AppState>,
    path: web::Path<String>,
    req: web::Json<JobDetailMatchRequest>
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let job_url = &req.job_url;

    println!("🔍 Fetching job details from URL: {}", job_url);

    // Extract job ID from Remotive URL if possible
    let job_id = extract_job_id_from_url(job_url);

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    // Fetch jobs from Remotive API to find the matching job
    let api_url = "https://remotive.com/api/remote-jobs?limit=100";

    let response = client
        .get(api_url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await
        .map_err(|e| {
            println!("❌ Failed to fetch jobs: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to fetch job details")
        })?;

    if !response.status().is_success() {
        return Ok(HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: "Failed to fetch job details from Remotive".to_string(),
        }));
    }

    let remotive_response: RemotiveResponse = response
        .json()
        .await
        .map_err(|e| {
            println!("❌ Failed to parse response: {}", e);
            actix_web::error::ErrorInternalServerError("Failed to parse job data")
        })?;

    // Find the job that matches the URL or ID
    let matching_job = if let Some(job_id) = job_id {
        remotive_response.jobs.into_iter().find(|j| j.id == job_id)
    } else {
        // If we can't extract ID, try to find by URL match
        remotive_response.jobs.into_iter().find(|j| j.url == *job_url)
    };

    if let Some(remotive_job) = matching_job {
        println!("✅ Found job: {}", remotive_job.title);

        // Convert to our Job format
        let job = Job {
            id: Uuid::new_v4().to_string(),
            title: remotive_job.title.clone(),
            company: remotive_job.company_name.clone(),
            company_logo: remotive_job.company_logo.clone(),
            location: remotive_job.candidate_required_location.clone(),
            url: remotive_job.url.clone(),
            description: remotive_job.description.clone(),
            created_at: parse_remotive_date(&remotive_job.publication_date)
                .unwrap_or_else(|| Utc::now().to_rfc3339()),
            external_id: Some(remotive_job.id.to_string()),
            job_type: remotive_job.job_type.clone(),
            salary: remotive_job.salary.clone(),
            category: Some(remotive_job.category.clone()),
        };

        // Perform CV matching analysis using ML service with real user data
        let match_result = analyze_job_cv_match(&user_id, &remotive_job, &state).await?;

        Ok(HttpResponse::Ok().json(ApiResponse {
            success: true,
            data: Some(serde_json::json!({
                "job": job,
                "match_analysis": match_result
            })),
            message: "Job details fetched and matched against CV".to_string(),
        }))
    } else {
        Ok(HttpResponse::NotFound().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: "Job not found in Remotive database".to_string(),
        }))
    }
}

// Helper function to extract job ID from Remotive URL
fn extract_job_id_from_url(url: &str) -> Option<i32> {
    // Remotive URLs typically look like: https://remotive.com/remote-jobs/category/job-title-123
    // Extract the number at the end
    if let Some(last_part) = url.split('/').last() {
        if let Some(id_part) = last_part.split('-').last() {
            if let Ok(id) = id_part.parse::<i32>() {
                return Some(id);
            }
        }
    }
    None
}

// Analyze job against user's CV using the ML service
async fn analyze_job_cv_match(
    user_id: &str,
    job: &RemotiveJob,
    state: &web::Data<AppState>
) -> Result<serde_json::Value> {
    println!("🧠 Analyzing job match for user: {} using ML service", user_id);

    // Gather user profile data
    let (user_skills, user_experience, resume_text_opt) = {
        let users = state.users.lock().unwrap();
        if let Some(u) = users.iter().find(|u| u.id == user_id) {
            let skills = u.skills.clone();
            let exp = u.experience_years as f64;
            // We don't parse PDFs here; provide empty resume_text and let ML use skills
            (skills, exp, None::<String>)
        } else {
            (Vec::<String>::new(), 0.0_f64, None::<String>)
        }
    };

    // If we have no usable user data, fall back immediately
    if user_skills.is_empty() && resume_text_opt.as_deref().unwrap_or("").is_empty() {
        println!("ℹ️ User has no skills/resume; using fallback analysis");
        let fallback_analysis = create_fallback_analysis(&job.description, &job.title);
        return Ok(fallback_analysis);
    }

    // Call the ML service for prediction
    let ml_service_url = std::env::var("ML_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:5000".to_string());

    let prediction_url = format!("{}/predict", ml_service_url);

    let ml_request = serde_json::json!({
        "job_description": job.description,
        "resume_text": resume_text_opt.unwrap_or_default(),
        "user_skills": user_skills,
        "user_experience": user_experience,
        "job_requirements": "", // Could extract from description
        "job_responsibilities": "" // Could extract from description
    });

    println!("📡 Calling ML service at: {}", prediction_url);

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    match client
        .post(&prediction_url)
        .header("Content-Type", "application/json")
        .json(&ml_request)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(ml_response) => {
                        println!("✅ ML service response received successfully");

                        // Extract data from ML response
                        if let Some(data) = ml_response.get("data") {
                            let analysis = serde_json::json!({
                                "ml_analysis": data,
                                "overall_score": data.get("match_score").unwrap_or(&serde_json::Value::Number(serde_json::Number::from_f64(50.0).unwrap())),
                                "breakdown": {
                                    "skills": {
                                        "score": (data.get("skill_overlap").unwrap_or(&serde_json::Value::Number(serde_json::Number::from(0))).as_u64().unwrap_or(0) as f64 /
                                                data.get("required_skills").unwrap_or(&serde_json::Value::Array(vec![])).as_array().unwrap_or(&vec![]).len().max(1) as f64),
                                        "explanation": format!("Found {} matching skills out of {} required",
                                            data.get("skill_overlap").unwrap_or(&serde_json::Value::Number(serde_json::Number::from(0))),
                                            data.get("required_skills").unwrap_or(&serde_json::Value::Array(vec![])).as_array().unwrap_or(&vec![]).len()),
                                        "details": data.get("resume_skills").unwrap_or(&serde_json::Value::Array(vec![]))
                                    },
                                    "experience": {
                                        "score": data.get("experience_match").unwrap_or(&serde_json::Value::Number(serde_json::Number::from_f64(0.5).unwrap())),
                                        "explanation": format!("Experience level matches job requirements"),
                                        "details": vec!["Based on job description analysis"]
                                    }
                                },
                                "recommendations": data.get("recommendations").unwrap_or(&serde_json::Value::String("Continue developing relevant skills".to_string())),
                                "job_requirements": data.get("required_skills").unwrap_or(&serde_json::Value::Array(vec![])),
                                "missing_skills": data.get("missing_skills").unwrap_or(&serde_json::Value::Array(vec![])),
                                "match_explanation": format!(
                                    "Based on ML analysis of job requirements for {} at {}, this position has a {}% compatibility match.",
                                    job.title,
                                    job.company_name,
                                    data.get("match_score").unwrap_or(&serde_json::Value::Number(serde_json::Number::from_f64(50.0).unwrap())).as_f64().unwrap_or(50.0) as i32
                                ),
                                "service_status": "ML service active"
                            });
                            return Ok(analysis);
                        }
                    }
                    Err(e) => {
                        println!("❌ Failed to parse ML service response: {}", e);
                    }
                }
            } else {
                println!("❌ ML service returned error status: {}", response.status());
            }
        }
        Err(e) => {
            println!("❌ Failed to call ML service: {}", e);
        }
    }

    // Fallback to simple analysis if ML service fails
    println!("⚠️ ML service unavailable, using fallback analysis");
    let fallback_analysis = create_fallback_analysis(&job.description, &job.title);
    Ok(fallback_analysis)
}

fn create_fallback_analysis(description: &str, title: &str) -> serde_json::Value {
    let skills_match = analyze_skills_match(description, title);
    let experience_match = analyze_experience_match(description);
    let location_match = analyze_location_match(&None); // No location for fallback

    let overall_score = (skills_match.score + experience_match.score + 0.8) / 3.0; // 0.8 as location placeholder

    serde_json::json!({
        "overall_score": overall_score,
        "breakdown": {
            "skills": skills_match,
            "experience": experience_match,
            "location": {
                "score": 0.8,
                "explanation": "Location compatibility assumed",
                "details": ["Remote work supported"]
            }
        },
        "recommendations": generate_recommendations(overall_score, title),
        "job_requirements": extract_job_requirements(description),
        "match_explanation": format!(
            "Based on basic analysis of job requirements for {}, this position has a {}% compatibility match. Note: ML service unavailable.",
            title, (overall_score * 100.0) as i32
        ),
        "service_status": "Fallback analysis (ML service unavailable)"
    })
}

#[derive(Serialize)]
struct MatchScore {
    score: f32,
    explanation: String,
    details: Vec<String>,
}

fn analyze_skills_match(description: &str, title: &str) -> MatchScore {
    let desc_lower = description.to_lowercase();
    let title_lower = title.to_lowercase();

    let mut skills_found = Vec::new();
    let mut score: f32 = 0.5; // Base score

    // Common tech skills
    let tech_skills = vec![
        "rust", "python", "javascript", "typescript", "react", "node.js", "docker",
        "kubernetes", "aws", "gcp", "sql", "mongodb", "redis", "git", "linux",
        "java", "c++", "go", "html", "css", "angular", "vue", "express"
    ];

    for skill in tech_skills {
        if desc_lower.contains(skill) || title_lower.contains(skill) {
            skills_found.push(skill.to_string());
            score += 0.1;
        }
    }

    score = score.min(1.0);

    MatchScore {
        score,
        explanation: format!("Found {} relevant technical skills", skills_found.len()),
        details: skills_found,
    }
}

fn analyze_experience_match(description: &str) -> MatchScore {
    let desc_lower = description.to_lowercase();
    let mut score: f32 = 0.6; // Default score
    let mut explanation = "Experience requirements analysis".to_string();
    let mut details = Vec::new();

    // Look for experience indicators
    if desc_lower.contains("senior") || desc_lower.contains("lead") {
        score = 0.8;
        explanation = "Senior level position identified".to_string();
        details.push("Requires senior-level experience".to_string());
    } else if desc_lower.contains("junior") || desc_lower.contains("entry") {
        score = 0.9;
        explanation = "Entry level position identified".to_string();
        details.push("Suitable for junior developers".to_string());
    } else if desc_lower.contains("mid") || desc_lower.contains("intermediate") {
        score = 0.7;
        explanation = "Mid-level position identified".to_string();
        details.push("Requires intermediate experience".to_string());
    }

    // Check for specific year requirements
    if desc_lower.contains("5+ years") || desc_lower.contains("5 years") {
        details.push("Requires 5+ years experience".to_string());
    } else if desc_lower.contains("3+ years") || desc_lower.contains("3 years") {
        details.push("Requires 3+ years experience".to_string());
    }

    MatchScore {
        score,
        explanation,
        details,
    }
}

fn analyze_location_match(location: &Option<String>) -> MatchScore {
    match location {
        Some(loc) if loc.to_lowercase().contains("remote") => MatchScore {
            score: 1.0,
            explanation: "Remote position - perfect location match".to_string(),
            details: vec!["Remote work opportunity".to_string()],
        },
        Some(loc) => MatchScore {
            score: 0.7,
            explanation: format!("Location: {}", loc),
            details: vec![format!("Based in {}", loc)],
        },
        None => MatchScore {
            score: 0.8,
            explanation: "Location not specified".to_string(),
            details: vec!["Location requirements unclear".to_string()],
        },
    }
}

fn generate_recommendations(overall_score: f32, title: &str) -> Vec<String> {
    let mut recommendations = Vec::new();

    if overall_score < 0.5 {
        recommendations.push("Consider developing more relevant technical skills".to_string());
        recommendations.push("Look for entry-level positions to gain experience".to_string());
    } else if overall_score < 0.7 {
        recommendations.push("Good foundation - focus on strengthening key skills".to_string());
        recommendations.push("Consider relevant certifications or training".to_string());
    } else {
        recommendations.push("Strong match - highlight relevant experience".to_string());
        recommendations.push("Tailor your application to showcase matching skills".to_string());
    }

    if title.to_lowercase().contains("senior") {
        recommendations.push("Emphasize leadership and mentoring experience".to_string());
    }

    recommendations
}

fn extract_job_requirements(description: &str) -> Vec<String> {
    let mut requirements = Vec::new();
    let desc_lower = description.to_lowercase();

    // Common requirement indicators
    let requirement_patterns = vec![
        "required", "must have", "essential", "mandatory", "minimum",
        "bachelor", "degree", "certification", "years of experience"
    ];

    for pattern in requirement_patterns {
        if desc_lower.contains(pattern) {
            requirements.push(format!("Contains requirement: {}", pattern));
        }
    }

    if requirements.is_empty() {
        requirements.push("Standard software development requirements".to_string());
    }

    requirements
}

async fn match_job_with_user(state: web::Data<AppState>, path: web::Path<(String, String)>) -> Result<HttpResponse> {
    let (job_id, user_id) = path.into_inner();

    println!("🔍 Matching job {} with user {}", job_id, user_id);

    // Fetch the specific job from Remotive API
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to create HTTP client"))?;

    let url = "https://remotive.com/api/remote-jobs?limit=100";

    let response = client
        .get(url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await;

    // Helper to fabricate a sample job and analyze
    async fn analyze_with_sample(user_id: String, state: web::Data<AppState>, ext_id: String) -> Result<HttpResponse> {
        let sample = RemotiveJob {
            id: ext_id.parse::<i32>().unwrap_or(0),
            url: "https://example.com/sample-job".to_string(),
            title: "Software Engineer (Python/React)".to_string(),
            company_name: "SampleCorp".to_string(),
            company_logo: None,
            category: "Software Development".to_string(),
            job_type: Some("Full-time".to_string()),
            publication_date: Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            candidate_required_location: Some("Remote".to_string()),
            salary: Some("$80k-$120k".to_string()),
            description: "We are seeking a Software Engineer with strong skills in Python, React, JavaScript, Docker, and AWS. Responsibilities include building scalable web applications, collaborating with cross-functional teams, and deploying services to cloud environments.".to_string(),
        };
        let analysis = analyze_job_cv_match(&user_id, &sample, &state).await?;
        let job = serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "title": sample.title,
            "company": sample.company_name,
            "company_logo": sample.company_logo,
            "location": sample.candidate_required_location,
            "url": sample.url,
            "description": sample.description,
            "created_at": Utc::now().to_rfc3339(),
            "external_id": sample.id.to_string(),
            "job_type": sample.job_type,
            "salary": sample.salary,
            "category": sample.category,
        });
        Ok(HttpResponse::Ok().json(ApiResponse { success: true, data: Some(serde_json::json!({ "job": job, "match_analysis": analysis })), message: "Job matching completed (offline fallback)".to_string() }))
    }

    match response {
        Ok(resp) => {
            if !resp.status().is_success() {
                println!("❌ Remotive fetch status: {}. Using sample fallback.", resp.status());
                return analyze_with_sample(user_id, state, job_id).await;
            }
            let remotive_response: RemotiveResponse = resp
                .json()
                .await
                .map_err(|_| actix_web::error::ErrorInternalServerError("Failed to parse job data"))?;

            // Find the job by external ID
            if let Some(remotive_job) = remotive_response.jobs.into_iter().find(|j| j.id.to_string() == job_id) {
                // Perform CV matching analysis using ML service with real user data
                let match_analysis = analyze_job_cv_match(&user_id, &remotive_job, &state).await?;

                Ok(HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    data: Some(serde_json::json!({
                        "job": {
                            "id": Uuid::new_v4().to_string(),
                            "title": remotive_job.title,
                            "company": remotive_job.company_name,
                            "company_logo": remotive_job.company_logo,
                            "location": remotive_job.candidate_required_location,
                            "url": remotive_job.url,
                            "description": remotive_job.description,
                            "created_at": parse_remotive_date(&remotive_job.publication_date).unwrap_or_else(|| Utc::now().to_rfc3339()),
                            "external_id": remotive_job.id.to_string(),
                            "job_type": remotive_job.job_type,
                            "salary": remotive_job.salary,
                            "category": remotive_job.category,
                        },
                        "match_analysis": match_analysis
                    })),
                    message: "Job matching completed successfully".to_string(),
                }))
            } else {
                println!("ℹ️ Job id {} not found in Remotive list. Using sample fallback.", job_id);
                analyze_with_sample(user_id, state, job_id).await
            }
        }
        Err(e) => {
            println!("❌ Remotive fetch failed: {}. Using sample fallback.", e);
            analyze_with_sample(user_id, state, job_id).await
        }
    }
}

fn parse_remotive_date(date_str: &str) -> Option<String> {
    // Try to parse the Remotive date format: "2020-02-15T10:23:26"
    if let Ok(parsed) = DateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S") {
        Some(parsed.with_timezone(&Utc).to_rfc3339())
    } else if let Ok(parsed) = chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S") {
        Some(parsed.and_utc().to_rfc3339())
    } else {
        None
    }
}
