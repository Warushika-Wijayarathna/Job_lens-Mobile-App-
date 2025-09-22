use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::fs;
use actix_web::web::Data;
use chrono::Utc;
use crate::models::{User, Job};

pub struct AppState {
    pub users: Mutex<Vec<User>>,                   // simple JSON-backed store
    pub refresh_tokens: Mutex<HashMap<String, String>>, // refresh_token -> user_id
    pub jobs_cache: Mutex<Vec<Job>>,               // cached jobs from Remotive
    pub uploads_dir: PathBuf,
    pub data_dir: PathBuf,
    pub jwt_secret: String,
    pub idf: Mutex<HashMap<String, f64>>,         // optional IDF model
}

pub fn data_dir() -> PathBuf {
    PathBuf::from("./data")
}

pub fn users_db_path() -> PathBuf { data_dir().join("users.json") }
pub fn jobs_cache_path() -> PathBuf { data_dir().join("jobs_cache.json") }

pub fn ensure_dirs(state: &AppState) {
    if !state.data_dir.exists() { let _ = fs::create_dir_all(&state.data_dir); }
    if !state.uploads_dir.exists() { let _ = fs::create_dir_all(&state.uploads_dir); }
}

pub fn load_users() -> Vec<User> {
    let path = users_db_path();
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(users) = serde_json::from_str::<Vec<User>>(&content) { return users; }
    }
    vec![]
}

pub fn save_users(users: &Vec<User>) -> std::io::Result<()> {
    let path = users_db_path();
    if let Some(parent) = path.parent() { fs::create_dir_all(parent)?; }
    let content = serde_json::to_string_pretty(users).unwrap_or_else(|_| "[]".to_string());
    fs::write(path, content)
}

pub fn load_jobs_cache() -> Vec<Job> {
    let path = jobs_cache_path();
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(jobs) = serde_json::from_str::<Vec<Job>>(&content) { return jobs; }
    }
    vec![]
}

pub fn save_jobs_cache(jobs: &Vec<Job>) -> std::io::Result<()> {
    let path = jobs_cache_path();
    if let Some(parent) = path.parent() { fs::create_dir_all(parent)?; }
    let content = serde_json::to_string_pretty(jobs).unwrap_or_else(|_| "[]".to_string());
    fs::write(path, content)
}

pub fn load_idf_model() -> HashMap<String, f64> {
    let csv_path = Path::new("./dataset/job_descriptions.csv");
    if !csv_path.exists() { return HashMap::new(); }
    let mut rdr = match csv::ReaderBuilder::new().has_headers(true).from_path(csv_path) { Ok(r) => r, Err(_) => return HashMap::new(), };
    let mut doc_freq: HashMap<String, usize> = HashMap::new();
    let mut docs = 0usize;
    for result in rdr.records() {
        let rec = match result { Ok(r) => r, Err(_) => continue };
        // Try to find description column by header name; fallback to first column
        let mut desc: Option<String> = None;
        for (h, v) in rec.iter().enumerate() {
            // naive guess: use the longest column content as description
            if let Some(d) = &desc {
                if v.len() > d.len() { desc = Some(v.to_string()); }
            } else { desc = Some(v.to_string()); }
        }
        let desc = desc.unwrap_or_default();
        let tokens: std::collections::HashSet<String> = crate::utils::text::tokenize(&desc).into_iter().collect();
        if tokens.is_empty() { continue; }
        docs += 1;
        for t in tokens { *doc_freq.entry(t).or_insert(0) += 1; }
    }
    if docs == 0 { return HashMap::new(); }
    let mut idf: HashMap<String, f64> = HashMap::new();
    for (t, df) in doc_freq.into_iter() {
        let val = ((docs as f64 + 1.0) / (df as f64 + 1.0)).ln() + 1.0;
        idf.insert(t, val.max(0.1));
    }
    idf
}

pub fn init_state(jwt_secret: String) -> Data<AppState> {
    let state = AppState {
        users: Mutex::new(load_users()),
        refresh_tokens: Mutex::new(HashMap::new()),
        jobs_cache: Mutex::new(load_jobs_cache()),
        uploads_dir: PathBuf::from("./uploads/user_resumes"),
        data_dir: data_dir(),
        jwt_secret,
        idf: Mutex::new(load_idf_model()),
    };
    ensure_dirs(&state);
    Data::new(state)
}

