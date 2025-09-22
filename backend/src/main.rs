// src/main.rs

mod models;
mod state;
mod utils;
mod routes;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware::Logger};
use dotenv::dotenv;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string());

    let app_state = state::init_state(jwt_secret);

    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .app_data(app_state.clone())
            .wrap(Logger::default())
            .wrap(cors)
            .service(routes::health::hello)
            .route("/health", web::get().to(routes::health::simple_health_check))
            .service(
                web::scope("/api")
                    .configure(routes::health::config)
                    .configure(routes::auth::config)
                    .configure(routes::users::config)
                    .configure(routes::jobs::config)
                    .configure(routes::resume::config)
            )
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
