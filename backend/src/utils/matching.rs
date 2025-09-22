use std::collections::{HashMap, HashSet};
use crate::utils::text::{normalize_token, tokenize};

pub fn compute_match(user_skills: &[String], job_text: &str) -> (f64, Vec<String>, Vec<String>) {
    let user_set: HashSet<String> = user_skills
        .iter()
        .map(|s| normalize_token(s))
        .filter(|s| !s.is_empty())
        .collect();

    if user_set.is_empty() {
        return (0.0, vec![], vec![]);
    }

    let job_tokens: HashSet<String> = tokenize(job_text).into_iter().collect();

    let matching: Vec<String> = user_set
        .intersection(&job_tokens)
        .cloned()
        .collect();

    let missing: Vec<String> = user_set
        .difference(&job_tokens)
        .cloned()
        .collect();

    let score = (matching.len() as f64) / (user_set.len() as f64) * 100.0;
    (score, matching, missing)
}

pub fn compute_weighted_match(user_skills: &[String], job_text: &str, idf: &HashMap<String, f64>) -> (f64, Vec<String>, Vec<String>) {
    if idf.is_empty() {
        return compute_match(user_skills, job_text);
    }
    let user_tokens: Vec<String> = user_skills
        .iter()
        .map(|s| normalize_token(s))
        .filter(|s| !s.is_empty())
        .collect();
    if user_tokens.is_empty() { return (0.0, vec![], vec![]); }

    let job_tokens: HashSet<String> = tokenize(job_text).into_iter().collect();

    let mut matching: Vec<String> = vec![];
    let mut missing: Vec<String> = vec![];
    let mut match_sum = 0.0;
    let mut denom_sum = 0.0;

    for token in user_tokens.iter() {
        let w = *idf.get(token).unwrap_or(&1.0);
        denom_sum += w;
        if job_tokens.contains(token) {
            matching.push(token.clone());
            match_sum += w;
        } else {
            missing.push(token.clone());
        }
    }

    let score = if denom_sum > 0.0 { (match_sum / denom_sum) * 100.0 } else { 0.0 };
    (score, matching, missing)
}

