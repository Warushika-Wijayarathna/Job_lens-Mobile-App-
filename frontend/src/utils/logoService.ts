/**
 * Company Logo Service
 * Generates company logo URLs using various logo services
 */

// Logo API services - these provide company logos based on company names or domains
const LOGO_SERVICES = {
  // Clearbit Logo API - free tier available
  clearbit: (company: string) => {
    const domain = getCompanyDomain(company);
    return `https://logo.clearbit.com/${domain}`;
  },

  // Logo.dev API - free service
  logodev: (company: string) => {
    const domain = getCompanyDomain(company);
    return `https://img.logo.dev/${domain}?token=pk_X1pRF4qTRmWEHHUoOE6L7A`;
  },

  // Google Favicon API - always available
  favicon: (company: string) => {
    const domain = getCompanyDomain(company);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  },

  // DuckDuckGo Icons API - free and reliable
  duckduckgo: (company: string) => {
    const domain = getCompanyDomain(company);
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  }
};

/**
 * Convert company name to likely domain
 */
function getCompanyDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/inc|corp|llc|ltd|company|co$/g, '')
    + '.com';
}

/**
 * Get company logo URL with fallback options
 */
export function getCompanyLogoUrl(company: string): string {
  if (!company) return '';

  // Try Clearbit first (best quality)
  return LOGO_SERVICES.clearbit(company);
}

/**
 * Get multiple logo URL options for fallback
 */
export function getCompanyLogoUrls(company: string): string[] {
  if (!company) return [];

  return [
    LOGO_SERVICES.clearbit(company),
    LOGO_SERVICES.logodev(company),
    LOGO_SERVICES.favicon(company),
    LOGO_SERVICES.duckduckgo(company)
  ];
}

/**
 * Company logo mapping for known companies
 */
const KNOWN_COMPANY_LOGOS: Record<string, string> = {
  'google': 'https://logo.clearbit.com/google.com',
  'microsoft': 'https://logo.clearbit.com/microsoft.com',
  'apple': 'https://logo.clearbit.com/apple.com',
  'amazon': 'https://logo.clearbit.com/amazon.com',
  'meta': 'https://logo.clearbit.com/meta.com',
  'netflix': 'https://logo.clearbit.com/netflix.com',
  'spotify': 'https://logo.clearbit.com/spotify.com',
  'stripe': 'https://logo.clearbit.com/stripe.com',
  'airbnb': 'https://logo.clearbit.com/airbnb.com',
  'uber': 'https://logo.clearbit.com/uber.com',
  'openai': 'https://logo.clearbit.com/openai.com'
};

/**
 * Get company logo with known company mapping
 */
export function getCompanyLogo(company: string): string {
  if (!company) return '';

  const normalizedCompany = company.toLowerCase().trim();

  // Check known companies first
  if (KNOWN_COMPANY_LOGOS[normalizedCompany]) {
    return KNOWN_COMPANY_LOGOS[normalizedCompany];
  }

  // Fall back to generated URL
  return getCompanyLogoUrl(company);
}
