use actix_web::{get, web, HttpResponse, Responder};
use serde_json::json;
use chrono::Utc;

#[get("/")]
pub async fn hello() -> impl Responder {
    "JobLens Backend Running!"
}

pub async fn simple_health_check() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "status": "running",
        "timestamp": Utc::now()
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(simple_health_check));
}
