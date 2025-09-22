use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use futures_util::TryStreamExt as _;
use serde::Deserialize;
use std::fs;
use std::io::Write;
use chrono::Utc;

use crate::models::{ApiResponse, User};
use crate::state::{AppState, save_users, load_jobs_cache};
use crate::utils::matching::compute_weighted_match;

#[derive(Deserialize)]
pub struct UpdateUserPayload {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub skills: Option<Vec<String>>,
    pub experience_years: Option<i32>,
    pub location: Option<String>,
}

#[derive(Deserialize)]
pub struct RecQuery { pub limit: Option<usize> }

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/users/{id}", web::get().to(get_user))
        .route("/users/{id}", web::put().to(update_user))
        .route("/users/{id}/resume", web::post().to(upload_user_resume))
        .route("/users/{id}/resume", web::get().to(get_user_resume))
        .route("/users/{id}/resume/match", web::post().to(upload_resume_for_matching))
        .route("/users/{id}/recommendations", web::get().to(user_recommendations))
        .route("/users/{id}/recommendations/skills", web::post().to(get_ai_job_recommendations));
}

async fn get_user(state: web::Data<AppState>, path: web::Path<String>) -> HttpResponse {
    let id = path.into_inner();
    let users = state.users.lock().unwrap();
    if let Some(u) = users.iter().find(|u| u.id == id) {
        let mut resp = u.clone();
        resp.password_hash = None;
        return HttpResponse::Ok().json(ApiResponse { success: true, data: Some(resp), message: "User fetched".into() });
    }
    HttpResponse::NotFound().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "User not found".into() })
}

async fn update_user(state: web::Data<AppState>, path: web::Path<String>, payload: web::Json<UpdateUserPayload>) -> HttpResponse {
    let id = path.into_inner();
    let mut users = state.users.lock().unwrap();
    let mut updated: Option<User> = None;
    if let Some(u) = users.iter_mut().find(|u| u.id == id) {
        if let Some(v) = &payload.first_name { u.first_name = v.clone(); }
        if let Some(v) = &payload.last_name { u.last_name = v.clone(); }
        if let Some(v) = &payload.skills { u.skills = v.clone(); }
        if let Some(v) = payload.experience_years { u.experience_years = v; }
        if let Some(v) = &payload.location { u.location = v.clone(); }
        u.updated_at = Utc::now().to_rfc3339();
        updated = Some(u.clone());
    }
    let _ = save_users(&users);

    if let Some(mut resp) = updated { resp.password_hash = None; return HttpResponse::Ok().json(ApiResponse { success: true, data: Some(resp), message: "User updated".into() }); }
    HttpResponse::NotFound().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "User not found".into() })
}

async fn upload_user_resume(state: web::Data<AppState>, path: web::Path<String>, mut payload: Multipart) -> Result<HttpResponse, actix_web::Error> {
    let user_id = path.into_inner();
    let mut file_path: Option<std::path::PathBuf> = None;

    while let Some(item) = payload.try_next().await? {
        let mut field = item;
        let content_disposition = field.content_disposition().clone();
        let filename = content_disposition.get_filename().map(|f| f.to_string()).unwrap_or_else(|| "resume.pdf".into());
        let sanitized = filename.replace('/', "_").replace('\\', "_");
        let target_name = format!("{}_{}_{}", user_id, Utc::now().timestamp(), sanitized);
        let save_path = state.uploads_dir.join(target_name);
        let mut f = fs::File::create(&save_path).map_err(actix_web::error::ErrorInternalServerError)?;
        while let Some(chunk) = field.try_next().await? { f.write_all(&chunk).map_err(actix_web::error::ErrorInternalServerError)?; }
        file_path = Some(save_path);
    }

    if let Some(path) = file_path {
        let mut users = state.users.lock().unwrap();
        if let Some(u) = users.iter_mut().find(|u| u.id == user_id) {
            u.resume_filename = Some(path.file_name().unwrap().to_string_lossy().to_string());
            u.updated_at = Utc::now().to_rfc3339();
        }
        let _ = save_users(&users);
        let meta = serde_json::json!({ "filename": path.file_name().unwrap().to_string_lossy(), "uploaded_at": Utc::now().to_rfc3339() });
        Ok(HttpResponse::Ok().json(ApiResponse { success: true, data: Some(meta), message: "Resume uploaded".into() }))
    } else {
        Ok(HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "No file received".into() }))
    }
}

async fn get_user_resume(state: web::Data<AppState>, path: web::Path<String>) -> HttpResponse {
    let user_id = path.into_inner();
    let users = state.users.lock().unwrap();
    if let Some(u) = users.iter().find(|u| u.id == user_id) {
        if let Some(fname) = &u.resume_filename {
            let full = state.uploads_dir.join(fname);
            if full.exists() {
                let mime = mime_guess::from_path(&full).first_or_octet_stream();
                let data = match fs::read(&full) { Ok(d) => d, Err(_) => vec![] };
                return HttpResponse::Ok().insert_header((actix_web::http::header::CONTENT_TYPE, mime.to_string())).body(data);
            }
        }
    }
    HttpResponse::NotFound().finish()
}

async fn user_recommendations(state: web::Data<AppState>, path: web::Path<String>, query: web::Query<RecQuery>) -> HttpResponse {
    let user_id = path.into_inner();
    let limit = query.limit.unwrap_or(10);

    let user_opt = { let users = state.users.lock().unwrap(); users.iter().find(|u| u.id == user_id).cloned() };
    if user_opt.is_none() { return HttpResponse::NotFound().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "User not found".into() }); }
    let user = user_opt.unwrap();

    let mut jobs = state.jobs_cache.lock().unwrap().clone();
    if jobs.is_empty() { jobs = load_jobs_cache(); }

    let idf = state.idf.lock().unwrap();
    let mut scored: Vec<(f64, serde_json::Value)> = vec![];
    for j in jobs.into_iter() {
        let text = format!("{}\n{}", j.title, j.description);
        let (score, matching, missing) = compute_weighted_match(&user.skills, &text, &idf);
        if score > 0.0 {
            let rec = serde_json::json!({
                "job": j,
                "match_score": (score as i32),
                "explanation": "Weighted skill overlap using dataset IDF model",
                "matching_skills": matching,
                "missing_skills": missing,
            });
            scored.push((score, rec));
        }
    }
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    let results: Vec<serde_json::Value> = scored.into_iter().take(limit).map(|(_, v)| v).collect();

    HttpResponse::Ok().json(ApiResponse { success: true, data: Some(serde_json::json!(results)), message: "Recommendations".into() })
}

async fn upload_resume_for_matching(state: web::Data<AppState>, path: web::Path<String>, mut payload: Multipart) -> Result<HttpResponse, actix_web::Error> {
    let user_id = path.into_inner();
    let mut file_path: Option<std::path::PathBuf> = None;

    while let Some(item) = payload.try_next().await? {
        let mut field = item;
        let content_disposition = field.content_disposition().clone();
        let filename = content_disposition.get_filename().map(|f| f.to_string()).unwrap_or_else(|| "resume.pdf".into());
        let sanitized = filename.replace('/', "_").replace('\\', "_");
        let target_name = format!("{}_{}_{}", user_id, Utc::now().timestamp(), sanitized);
        let save_path = state.uploads_dir.join(target_name);
        let mut f = fs::File::create(&save_path).map_err(actix_web::error::ErrorInternalServerError)?;
        while let Some(chunk) = field.try_next().await? { f.write_all(&chunk).map_err(actix_web::error::ErrorInternalServerError)?; }
        file_path = Some(save_path);
    }

    if let Some(path) = file_path {
        let mut users = state.users.lock().unwrap();
        if let Some(u) = users.iter_mut().find(|u| u.id == user_id) {
            u.resume_filename = Some(path.file_name().unwrap().to_string_lossy().to_string());
            u.updated_at = Utc::now().to_rfc3339();
        }
        let _ = save_users(&users);
        let meta = serde_json::json!({ "filename": path.file_name().unwrap().to_string_lossy(), "uploaded_at": Utc::now().to_rfc3339() });
        Ok(HttpResponse::Ok().json(ApiResponse { success: true, data: Some(meta), message: "Resume uploaded and will be used for matching".into() }))
    } else {
        Ok(HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "No file received".into() }))
    }
}

async fn get_ai_job_recommendations(state: web::Data<AppState>, path: web::Path<String>, payload: web::Json<RecQuery>) -> HttpResponse {
    let user_id = path.into_inner();
    let limit = payload.limit.unwrap_or(10);

    let user_opt = { let users = state.users.lock().unwrap(); users.iter().find(|u| u.id == user_id).cloned() };
    if user_opt.is_none() { return HttpResponse::NotFound().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "User not found".into() }); }
    let user = user_opt.unwrap();

    // Here you would integrate with the AI model for recommendations
    // For now, we will just return the top N jobs based on some criteria
    let mut jobs = state.jobs_cache.lock().unwrap().clone();
    if jobs.is_empty() { jobs = load_jobs_cache(); }

    // Dummy AI integration: just take the first `limit` jobs
    let results: Vec<serde_json::Value> = jobs.into_iter().take(limit).map(|j| serde_json::json!({ "job": j, "match_score": 100, "explanation": "Top AI recommendation" })).collect();

    HttpResponse::Ok().json(ApiResponse { success: true, data: Some(serde_json::json!(results)), message: "AI Recommendations".into() })
}
