use actix_web::{web, HttpResponse, Result};
use actix_multipart::Multipart;
use futures::{StreamExt, TryStreamExt};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;
use chrono::Utc;
use reqwest::Client;
use std::time::Duration;
use std::process::Command;
use std::collections::HashMap;
use tokio::io::AsyncWriteExt; // added for async file writes

use crate::models::{ApiResponse, Job, JobRecommendation};
use crate::state::AppState;

#[derive(Serialize, Deserialize, Debug)]
pub struct ResumeProcessResponse {
    recommendations: Vec<JobRecommendation>,
    resume_text: String,
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/resume/process")
            .route(web::post().to(process_resume))
    );
}

/// Process a resume file and return job recommendations based on content analysis
///
/// This endpoint:
/// 1. Receives an uploaded resume file (PDF)
/// 2. Extracts text content from the PDF
/// 3. Sends the extracted content to the ML service
/// 4. Returns matching jobs with their match percentages
async fn process_resume(mut payload: Multipart, state: web::Data<AppState>) -> Result<HttpResponse> {
    println!("📄 Processing uploaded resume...");

    let mut user_id = String::new();
    let mut extract_content = false;
    let mut file_path = None;
    let mut file_name = None;
    let mut resume_text_override: Option<String> = None; // NEW: accept text directly

    // Process the multipart form data
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();

        if let Some(name) = content_disposition.get_name() {
            match name {
                "userId" => {
                    let mut id = Vec::new();
                    while let Some(chunk) = field.next().await {
                        id.extend_from_slice(&chunk?);
                    }
                    user_id = String::from_utf8(id).unwrap_or_default();
                },
                "extractContent" => {
                    let mut value = Vec::new();
                    while let Some(chunk) = field.next().await {
                        value.extend_from_slice(&chunk?);
                    }
                    let extract_str = String::from_utf8(value).unwrap_or_default();
                    extract_content = extract_str == "true";
                },
                "resume_text" => { // NEW: handle direct resume text from client
                    let mut buf: Vec<u8> = Vec::new();
                    while let Some(chunk) = field.next().await {
                        buf.extend_from_slice(&chunk?);
                    }
                    let text = String::from_utf8(buf).unwrap_or_default();
                    if !text.trim().is_empty() {
                        resume_text_override = Some(text);
                    }
                },
                "resume" => {
                    // Get filename
                    if let Some(filename) = content_disposition.get_filename() {
                        let sanitized_filename = sanitize_filename(filename);
                        let timestamp = Utc::now().timestamp();

                        // Create directory if it doesn't exist
                        let upload_dir = Path::new("uploads/user_resumes");
                        if !upload_dir.exists() {
                            fs::create_dir_all(upload_dir)?;
                        }

                        // Generate a unique filename for the uploaded file
                        let file_id = format!("{}_{}", user_id, timestamp);
                        let safe_filename = format!("{}_{}", file_id, sanitized_filename);
                        let file_path_str = format!("uploads/user_resumes/{}", safe_filename);
                        let path = Path::new(&file_path_str);

                        // Create file and write uploaded data to it
                        let mut file = tokio::fs::File::create(&path)
                            .await
                            .map_err(|e| {
                                println!("❌ File creation error: {:?}", e);
                                actix_web::error::ErrorInternalServerError("Could not create file")
                            })?;

                        // Process file data
                        while let Some(chunk) = field.next().await {
                            let data = chunk.map_err(|e| {
                                println!("❌ File data error: {:?}", e);
                                actix_web::error::ErrorInternalServerError("Error while uploading file")
                            })?;

                            file
                                .write_all(&data)
                                .await
                                .map_err(|e| {
                                    println!("❌ File write error: {:?}", e);
                                    actix_web::error::ErrorInternalServerError("Error while writing file")
                                })?;
                        }

                        println!("✅ Resume file saved: {}", file_path_str);
                        file_path = Some(file_path_str);
                        file_name = Some(sanitized_filename.to_string());
                    }
                },
                _ => {
                    // Skip other fields
                    while let Some(_) = field.next().await {
                        // Consume field data
                    }
                }
            }
        }
    }

    // Validate user ID
    if user_id.is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<ResumeProcessResponse> {
            success: false,
            data: None,
            message: "User ID is required".to_string(),
        }));
    }

    // Validate file upload or text content
    if file_path.is_none() && resume_text_override.as_deref().unwrap_or("").is_empty() {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<ResumeProcessResponse> {
            success: false,
            data: None,
            message: "No resume file or text provided".to_string(),
        }));
    }

    // Extract text from resume if requested and text not already provided
    let resume_text = if let Some(text) = resume_text_override {
        text
    } else if extract_content {
        match extract_text_from_pdf(file_path.as_deref().unwrap_or("")) {
            Ok(text) => {
                println!("✅ Successfully extracted text from PDF");
                text
            },
            Err(e) => {
                println!("⚠️ Failed to extract text from PDF: {}. Proceeding without extracted text.", e);
                String::new()
            }
        }
    } else {
        // Default empty text if extraction not requested
        String::new()
    };

    // Process the resume with ML service for job recommendations
    let recommendations = match get_job_recommendations(&user_id, &resume_text, &state).await {
        Ok(recs) => recs,
        Err(e) => {
            println!("⚠️ Failed to get job recommendations: {}", e);
            return Ok(HttpResponse::InternalServerError().json(ApiResponse::<ResumeProcessResponse> {
                success: false,
                data: None,
                message: format!("Failed to process resume: {}", e),
            }));
        }
    };

    // Return response with recommendations and extracted text
    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(ResumeProcessResponse {
            recommendations,
            resume_text,
        }),
        message: "Resume processed successfully".to_string(),
    }))
}

/// Extract text content from a PDF file
fn extract_text_from_pdf(file_path: &str) -> Result<String, String> {
    // Try using pdftotext from poppler-utils if available
    let output = Command::new("pdftotext")
        .args(&["-q", file_path, "-"])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(text)
            } else {
                let error = String::from_utf8_lossy(&output.stderr).to_string();
                Err(format!("pdftotext error: {}", error))
            }
        }
        Err(_) => {
            // Fallback method if pdftotext is not available
            // This is a simplified fallback - in production, you might want
            // to integrate a PDF library or provide better error handling
            Err("PDF text extraction failed: pdftotext not available".to_string())
        }
    }
}

/// Get job recommendations based on resume text
async fn get_job_recommendations(
    user_id: &str,
    resume_text: &str,
    state: &web::Data<AppState>
) -> Result<Vec<JobRecommendation>, String> {
    println!("🧠 Getting job recommendations using ML service");

    // Call the ML service for prediction
    let ml_service_url = std::env::var("ML_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:5000".to_string());

    let prediction_url = format!("{}/predict", ml_service_url);

    // Gather all available jobs to match against
    let jobs = fetch_jobs().await?;
    let mut recommendations = Vec::new();

    // Get user skills if any
    let user_skills = {
        let users = state.users.lock().unwrap();
        users.iter()
            .find(|u| u.id == user_id)
            .map(|u| u.skills.clone())
            .unwrap_or_default()
    };

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Clone jobs to keep the original collection for fallback use
    let jobs_for_processing = jobs.clone();

    // Process each job through the ML service
    for job in jobs_for_processing {
        // Clean HTML tags from job description for better NLP/skill extraction
        let cleaned_description = strip_html(&job.description);
        let ml_request = serde_json::json!({
            "job_description": cleaned_description,
            "resume_text": resume_text,
            "user_skills": user_skills,
            "job_title": job.title
        });

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
                            if let Some(data) = ml_response.get("data") {
                                let match_score = data.get("match_score")
                                    .and_then(|v| v.as_f64())
                                    .unwrap_or(50.0);

                                // Only include jobs with a reasonable match score
                                if match_score > 30.0 {
                                    recommendations.push(JobRecommendation {
                                        job,
                                        // Round instead of truncating to int
                                        match_percentage: match_score.round() as i32,
                                        skills_matched: data.get("skill_overlap")
                                            .and_then(|v| v.as_u64())
                                            .unwrap_or(0) as i32,
                                        missing_skills: data.get("missing_skills")
                                            .and_then(|v| v.as_array())
                                            .map(|arr| arr.iter()
                                                .filter_map(|v| v.as_str())
                                                .map(String::from)
                                                .collect())
                                            .unwrap_or_default(),
                                    });
                                }
                            }
                        }
                        Err(_) => continue, // Skip this job on parse error
                    }
                }
            }
            Err(_) => continue, // Skip this job on request error
        }
    }

    // Sort recommendations by match percentage (highest first)
    recommendations.sort_by(|a, b| b.match_percentage.cmp(&a.match_percentage));

    // Limit to top 10 matches
    if recommendations.len() > 10 {
        recommendations.truncate(10);
    }

    // If no recommendations (possibly due to ML service failure), generate some basic ones
    if recommendations.is_empty() {
        println!("⚠️ No recommendations from ML service, generating fallback matches");
        recommendations = generate_fallback_recommendations(&jobs, resume_text);
    }

    Ok(recommendations)
}

/// Generate fallback recommendations when ML service fails
fn generate_fallback_recommendations(jobs: &Vec<Job>, resume_text: &str) -> Vec<JobRecommendation> {
    let resume_lower = resume_text.to_lowercase();
    let mut scores = HashMap::new();

    // List of common tech skills to match against
    let tech_skills = vec![
        "rust", "python", "javascript", "typescript", "react", "node.js", "docker",
        "kubernetes", "aws", "gcp", "sql", "mongodb", "redis", "git", "linux",
        "java", "c++", "go", "html", "css", "angular", "vue", "express"
    ];

    // Calculate simple match scores based on keyword frequency
    for job in jobs {
        // Clean HTML before analysis
        let desc_lower = strip_html(&job.description).to_lowercase();
        let mut score = 50; // Base score

        // Check for skill matches in both resume and job description
        for skill in &tech_skills {
            if resume_lower.contains(skill) && desc_lower.contains(skill) {
                score += 5;
            }
        }

        // Simple title match boost
        if resume_lower.contains(&job.title.to_lowercase()) {
            score += 10;
        }

        // Cap at 100
        score = score.min(100);
        scores.insert(job.id.clone(), score);
    }

    // Create recommendations based on scores
    let mut recommendations: Vec<JobRecommendation> = jobs
        .iter()
        .filter_map(|job| {
            let score = *scores.get(&job.id).unwrap_or(&50);
            if score > 30 {
                Some(JobRecommendation {
                    job: job.clone(),
                    match_percentage: score,
                    skills_matched: 0,
                    missing_skills: Vec::new(),
                })
            } else {
                None
            }
        })
        .collect();

    // Sort by score
    recommendations.sort_by(|a, b| b.match_percentage.cmp(&a.match_percentage));

    // Limit to top 10
    if recommendations.len() > 10 {
        recommendations.truncate(10);
    }

    recommendations
}

/// Fetch jobs from the jobs service
async fn fetch_jobs() -> Result<Vec<Job>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Use the Remotive API to fetch jobs
    let url = "https://remotive.com/api/remote-jobs?limit=50";

    let response = client
        .get(url)
        .header("User-Agent", "JobLens-Backend/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch jobs: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch jobs: HTTP {}", response.status()));
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

    let remotive_response: RemotiveResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse jobs: {}", e))?;

    let jobs: Vec<Job> = remotive_response.jobs
        .into_iter()
        .map(|rj| Job {
            id: Uuid::new_v4().to_string(),
            title: rj.title,
            company: rj.company_name,
            company_logo: rj.company_logo,
            location: rj.candidate_required_location,
            url: rj.url,
            description: rj.description,
            created_at: Utc::now().to_rfc3339(),
            external_id: Some(rj.id.to_string()),
            job_type: rj.job_type,
            salary: rj.salary,
            category: Some(rj.category),
        })
        .collect();

    Ok(jobs)
}

/// Sanitize filename to prevent path traversal and other issues
fn sanitize_filename(filename: &str) -> String {
    let filename = Path::new(filename)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unnamed.pdf");

    // Replace potentially dangerous characters
    let re = regex::Regex::new(r"[^a-zA-Z0-9_.%-]").unwrap();
    let sanitized = re.replace_all(filename, "_").to_string();

    // Ensure filename isn't too long
    if sanitized.len() > 100 {
        sanitized[..100].to_string()
    } else {
        sanitized
    }
}

/// Strip HTML tags from a string to plain text
fn strip_html(input: &str) -> String {
    let re = regex::Regex::new(r"<[^>]+>").unwrap();
    re.replace_all(input, " ").to_string()
}
