use actix_web::{web, HttpResponse};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;
use bcrypt::{hash, verify as bcrypt_verify, DEFAULT_COST};
use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::models::{ApiResponse, AuthResponse, User};
use crate::state::{AppState, save_users};
use crate::utils::jwt::{make_tokens, verify_token};

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub first_name: String,
    pub last_name: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginPayload { pub email: String, pub password: String }
#[derive(Deserialize)]
pub struct VerifyPayload { pub token: String }
#[derive(Deserialize)]
pub struct RefreshPayload { pub refresh_token: String }
#[derive(Deserialize)]
pub struct GooglePayload { pub id_token: String }

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg
        .route("/auth/register", web::post().to(register))
        .route("/auth/login", web::post().to(login))
        .route("/auth/verify", web::post().to(verify_token_handler))
        .route("/auth/refresh", web::post().to(refresh))
        .route("/auth/google", web::post().to(google));
}

async fn register(state: web::Data<AppState>, payload: web::Json<RegisterPayload>) -> HttpResponse {
    let mut users = state.users.lock().unwrap();
    if users.iter().any(|u| u.email.eq_ignore_ascii_case(&payload.email)) {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "Email already registered".into() });
    }
    let now = Utc::now().to_rfc3339();
    let user = User {
        id: Uuid::new_v4().to_string(),
        email: payload.email.trim().to_lowercase(),
        password_hash: Some(hash(&payload.password, DEFAULT_COST).unwrap()),
        first_name: payload.first_name.trim().to_string(),
        last_name: payload.last_name.trim().to_string(),
        skills: vec![],
        experience_years: 0,
        location: "".into(),
        created_at: now.clone(),
        updated_at: now.clone(),
        resume_filename: None,
    };
    users.push(user.clone());
    let _ = save_users(&users);

    let (access, refresh_tok, exp, refresh_exp) = make_tokens(&user.id, &state.jwt_secret);
    state.refresh_tokens.lock().unwrap().insert(refresh_tok.clone(), user.id.clone());

    let mut user_resp = user.clone(); user_resp.password_hash = None;
    HttpResponse::Ok().json(ApiResponse { success: true, data: Some(AuthResponse {
        access_token: access,
        refresh_token: refresh_tok,
        user: user_resp,
        expires_at: exp,
        refresh_expires_at: refresh_exp,
    }), message: "Registered successfully".into() })
}

async fn login(state: web::Data<AppState>, payload: web::Json<LoginPayload>) -> HttpResponse {
    let users = state.users.lock().unwrap();
    if let Some(user) = users.iter().find(|u| u.email.eq_ignore_ascii_case(&payload.email)) {
        if let Some(ph) = &user.password_hash {
            if bcrypt_verify(&payload.password, ph).unwrap_or(false) {
                let (access, refresh_tok, exp, refresh_exp) = make_tokens(&user.id, &state.jwt_secret);
                state.refresh_tokens.lock().unwrap().insert(refresh_tok.clone(), user.id.clone());
                let mut user_resp = user.clone(); user_resp.password_hash = None;
                return HttpResponse::Ok().json(ApiResponse { success: true, data: Some(AuthResponse {
                    access_token: access, refresh_token: refresh_tok, user: user_resp, expires_at: exp, refresh_expires_at: refresh_exp,
                }), message: "Login successful".into() });
            }
        }
    }
    HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "Invalid email or password".into() })
}

async fn verify_token_handler(state: web::Data<AppState>, payload: web::Json<VerifyPayload>) -> HttpResponse {
    match verify_token(&payload.token, &state.jwt_secret) {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::<serde_json::Value> { success: true, data: None, message: "Token valid".into() }),
        Err(msg) => HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: msg }),
    }
}

async fn refresh(state: web::Data<AppState>, payload: web::Json<RefreshPayload>) -> HttpResponse {
    match verify_token(&payload.refresh_token, &state.jwt_secret) {
        Ok(user_id) => {
            let map = state.refresh_tokens.lock().unwrap();
            let valid = map.contains_key(&payload.refresh_token);
            drop(map);
            if !valid {
                return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "Invalid refresh token".into() });
            }
            let (access, refresh_tok, exp, refresh_exp) = make_tokens(&user_id, &state.jwt_secret);
            state.refresh_tokens.lock().unwrap().insert(refresh_tok.clone(), user_id.clone());
            HttpResponse::Ok().json(ApiResponse { success: true, data: Some(serde_json::json!({
                "access_token": access,
                "refresh_token": refresh_tok,
                "expires_at": exp,
                "refresh_expires_at": refresh_exp,
            })), message: "Token refreshed".into() })
        }
        Err(msg) => HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: msg }),
    }
}

async fn google(state: web::Data<AppState>, payload: web::Json<GooglePayload>) -> HttpResponse {
    // NOTE: minimal parsing; in production validate against Google.
    let parts: Vec<&str> = payload.id_token.split('.').collect();
    let email_opt: Option<String> = if parts.len() == 3 {
        match STANDARD.decode(parts[1].replace('-', "+").replace('_', "/")) {
            Ok(bytes) => match serde_json::from_slice::<serde_json::Value>(&bytes) {
                Ok(val) => val.get("email").and_then(|e| e.as_str()).map(|s| s.to_string()),
                Err(_) => None,
            },
            Err(_) => None,
        }
    } else { None };

    let email = match email_opt { Some(e) => e.to_lowercase(), None => {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> { success: false, data: None, message: "Invalid Google id_token".into() });
    }};

    let mut users = state.users.lock().unwrap();
    let now = Utc::now().to_rfc3339();
    let user = if let Some(u) = users.iter_mut().find(|u| u.email.eq_ignore_ascii_case(&email)) {
        u.updated_at = now.clone();
        u.clone()
    } else {
        let new_user = User {
            id: Uuid::new_v4().to_string(),
            email: email.clone(),
            password_hash: None,
            first_name: "".into(),
            last_name: "".into(),
            skills: vec![],
            experience_years: 0,
            location: "".into(),
            created_at: now.clone(),
            updated_at: now.clone(),
            resume_filename: None,
        };
        users.push(new_user.clone());
        let _ = save_users(&users);
        new_user
    };

    let (access, refresh_tok, exp, refresh_exp) = make_tokens(&user.id, &state.jwt_secret);
    state.refresh_tokens.lock().unwrap().insert(refresh_tok.clone(), user.id.clone());

    let mut user_resp = user.clone(); user_resp.password_hash = None;
    HttpResponse::Ok().json(ApiResponse { success: true, data: Some(AuthResponse {
        access_token: access,
        refresh_token: refresh_tok,
        user: user_resp,
        expires_at: exp,
        refresh_expires_at: refresh_exp,
    }), message: "Google sign-in successful".into() })
}
