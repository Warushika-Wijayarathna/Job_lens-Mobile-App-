use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

pub fn make_tokens(user_id: &str, jwt_secret: &str) -> (String, String, String, String) {
    let access_exp = Utc::now() + Duration::minutes(60);
    let refresh_exp = Utc::now() + Duration::days(30);

    let access_claims = Claims { sub: user_id.to_string(), exp: access_exp.timestamp() as usize };
    let refresh_claims = Claims { sub: user_id.to_string(), exp: refresh_exp.timestamp() as usize };

    let access_token = encode(&Header::new(Algorithm::HS256), &access_claims, &EncodingKey::from_secret(jwt_secret.as_ref())).unwrap();
    let refresh_token = encode(&Header::new(Algorithm::HS256), &refresh_claims, &EncodingKey::from_secret(jwt_secret.as_ref())).unwrap();

    (access_token, refresh_token, access_exp.to_rfc3339(), refresh_exp.to_rfc3339())
}

pub fn verify_token(token: &str, jwt_secret: &str) -> Result<String, String> {
    let validation = Validation::new(Algorithm::HS256);
    match decode::<Claims>(token, &DecodingKey::from_secret(jwt_secret.as_ref()), &validation) {
        Ok(data) => Ok(data.claims.sub),
        Err(e) => Err(format!("Invalid token: {}", e)),
    }
}

