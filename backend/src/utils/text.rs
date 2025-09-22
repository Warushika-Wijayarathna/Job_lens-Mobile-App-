pub fn normalize_token(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '+')
        .collect::<String>()
}

pub fn tokenize(text: &str) -> Vec<String> {
    let norm = normalize_token(text);
    norm.split_whitespace()
        .filter(|t| !t.is_empty())
        .map(|t| t.trim_matches(|c: char| !c.is_alphanumeric()))
        .filter(|t| !t.is_empty())
        .map(|t| t.to_string())
        .collect()
}

