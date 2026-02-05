import { NextRequest, NextResponse } from 'next/server';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  weight: number;
}

// Popular brands for typosquatting detection
const POPULAR_BRANDS = [
  'paypal',
  'amazon',
  'google',
  'apple',
  'microsoft',
  'facebook',
  'instagram',
  'netflix',
  'twitter',
  'linkedin',
  'ebay',
  'walmart',
  'target',
  'bestbuy',
  'chase',
  'bankofamerica',
  'wellsfargo',
  'citibank',
  'americanexpress',
  'dropbox',
  'spotify',
  'adobe',
  'oracle',
  'salesforce',
  'zoom',
  'slack',
  'github',
  'gitlab',
  'bitbucket',
  'stackoverflow',
  'reddit',
  'youtube',
  'whatsapp',
  'telegram',
  'discord',
  'twitch',
  'tiktok',
  'snapchat',
];

// URL shorteners
const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  't.co',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'adf.ly',
  'bit.do',
  'short.io',
  'rebrand.ly',
  'cutt.ly',
  'tiny.cc',
  'shorturl.at',
  'bl.ink',
  'lnkd.in',
  'soo.gd',
  'clicky.me',
  's2r.co',
];

// Suspicious TLDs (expanded list)
const SUSPICIOUS_TLDS = [
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'top',
  'xyz',
  'club',
  'work',
  'date',
  'racing',
  'win',
  'bid',
  'stream',
  'download',
  'loan',
  'cricket',
  'science',
  'party',
  'gdn',
  'link',
  'men',
  'click',
  'country',
  'kim',
  'review',
  'faith',
  'accountant',
  'trade',
  'webcam',
  'pw',
  'cc',
  'ws',
  'buzz',
];

// Helper to extract domain from URL
function extractDomain(urlString: string): string | null {
  try {
    // Add protocol if missing
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return null;
  }
}

// Calculate Levenshtein distance for typosquatting detection
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Check for homograph attacks (IDN homograph)
function checkHomograph(domain: string): CheckResult {
  // Check for mixed scripts (e.g., Cyrillic + Latin)
  const hasLatin = /[a-zA-Z]/.test(domain);
  const hasCyrillic = /[\u0400-\u04FF]/.test(domain);
  const hasGreek = /[\u0370-\u03FF]/.test(domain);

  if ((hasLatin && hasCyrillic) || (hasLatin && hasGreek)) {
    return {
      name: 'Homograph Attack',
      status: 'fail',
      detail: 'Mixed character sets detected (potential spoofing)',
      weight: 35,
    };
  }

  // Check for suspicious Unicode characters that look like ASCII
  const suspiciousChars = /[а-яА-Я]|[α-ωΑ-Ω]|[０-９]|[Ａ-Ｚａ-ｚ]/;
  if (suspiciousChars.test(domain)) {
    return {
      name: 'Homograph Attack',
      status: 'warn',
      detail: 'Contains look-alike Unicode characters',
      weight: 20,
    };
  }

  // Check for punycode (xn--)
  if (domain.includes('xn--')) {
    return {
      name: 'Homograph Attack',
      status: 'warn',
      detail: 'Uses internationalized domain (punycode)',
      weight: 15,
    };
  }

  return {
    name: 'Homograph Attack',
    status: 'pass',
    detail: 'No homograph patterns detected',
    weight: 0,
  };
}

// Check for typosquatting
function checkTyposquatting(domain: string): CheckResult {
  const domainLower = domain.toLowerCase().replace(/^www\./, '');
  const baseDomain = domainLower.split('.')[0];

  for (const brand of POPULAR_BRANDS) {
    // Exact match with different TLD
    if (baseDomain === brand) {
      const tld = domainLower.split('.').pop();
      if (tld && !['com', 'org', 'net', 'edu', 'gov'].includes(tld)) {
        return {
          name: 'Typosquatting',
          status: 'warn',
          detail: `Exact brand match with unusual TLD (.${tld})`,
          weight: 20,
        };
      }
    }

    // Close match (Levenshtein distance)
    const distance = levenshteinDistance(baseDomain, brand);
    if (distance > 0 && distance <= 2 && baseDomain.length >= 4) {
      return {
        name: 'Typosquatting',
        status: 'fail',
        detail: `Very similar to "${brand}" (possible typosquatting)`,
        weight: 30,
      };
    }

    // Contains brand with extra characters
    if (baseDomain.includes(brand) && baseDomain !== brand) {
      const extra = baseDomain.replace(brand, '');
      if (extra.length <= 4) {
        return {
          name: 'Typosquatting',
          status: 'warn',
          detail: `Contains "${brand}" with extra characters`,
          weight: 25,
        };
      }
    }
  }

  return {
    name: 'Typosquatting',
    status: 'pass',
    detail: 'No typosquatting patterns detected',
    weight: 0,
  };
}

// Check if URL is a shortener
function checkUrlShortener(domain: string): CheckResult {
  const domainLower = domain.toLowerCase();

  for (const shortener of URL_SHORTENERS) {
    if (domainLower === shortener || domainLower === `www.${shortener}`) {
      return {
        name: 'URL Shortener',
        status: 'warn',
        detail: 'URL shortener detected (destination unknown)',
        weight: 15,
      };
    }
  }

  return {
    name: 'URL Shortener',
    status: 'pass',
    detail: 'Not a known URL shortener',
    weight: 0,
  };
}

// Check domain age using RDAP
async function checkDomainAge(domain: string): Promise<CheckResult> {
  try {
    const rdapUrl = `https://rdap.org/domain/${domain}`;

    const response = await fetch(rdapUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/rdap+json' },
    });

    if (!response.ok) {
      return {
        name: 'Domain Age',
        status: 'warn',
        detail: 'Could not verify domain age',
        weight: 10,
      };
    }

    const data = await response.json();

    const events = data.events || [];
    const registration = events.find(
      (e: any) => e.eventAction === 'registration',
    );

    if (registration?.eventDate) {
      const regDate = new Date(registration.eventDate);
      const ageInDays =
        (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      const ageInYears = Math.floor(ageInDays / 365);
      const ageInMonths = Math.floor(ageInDays / 30);

      if (ageInDays < 30) {
        return {
          name: 'Domain Age',
          status: 'fail',
          detail: `Registered ${Math.floor(ageInDays)} days ago (very new!)`,
          weight: 35,
        };
      } else if (ageInDays < 90) {
        return {
          name: 'Domain Age',
          status: 'warn',
          detail: `Registered ${ageInMonths} months ago (relatively new)`,
          weight: 20,
        };
      } else if (ageInDays < 180) {
        return {
          name: 'Domain Age',
          status: 'warn',
          detail: `Registered ${ageInMonths} months ago`,
          weight: 10,
        };
      } else {
        return {
          name: 'Domain Age',
          status: 'pass',
          detail: `Registered ${ageInYears > 0 ? ageInYears + ' years' : ageInMonths + ' months'} ago`,
          weight: 0,
        };
      }
    }

    return {
      name: 'Domain Age',
      status: 'warn',
      detail: 'Registration date not found',
      weight: 10,
    };
  } catch (error) {
    return {
      name: 'Domain Age',
      status: 'warn',
      detail: 'Could not check domain age',
      weight: 10,
    };
  }
}

// Check SSL certificate
async function checkSSL(urlString: string): Promise<CheckResult> {
  try {
    if (!urlString.startsWith('https://')) {
      if (urlString.startsWith('http://')) {
        return {
          name: 'SSL Certificate',
          status: 'fail',
          detail: 'No HTTPS - connection not encrypted',
          weight: 30,
        };
      }
      urlString = 'https://' + urlString;
    }

    const response = await fetch(urlString, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });

    return {
      name: 'SSL Certificate',
      status: 'pass',
      detail: 'Valid HTTPS certificate',
      weight: 0,
    };
  } catch (error: any) {
    if (error?.cause?.code === 'CERT_HAS_EXPIRED') {
      return {
        name: 'SSL Certificate',
        status: 'fail',
        detail: 'SSL certificate expired',
        weight: 35,
      };
    }
    if (error?.cause?.code?.includes('CERT')) {
      return {
        name: 'SSL Certificate',
        status: 'fail',
        detail: 'Invalid SSL certificate',
        weight: 30,
      };
    }
    return {
      name: 'SSL Certificate',
      status: 'warn',
      detail: 'Could not verify SSL',
      weight: 10,
    };
  }
}

// Check against URLhaus and PhishTank
async function checkReputation(
  domain: string,
  fullUrl: string,
): Promise<CheckResult> {
  try {
    // Check URLhaus (malware database)
    const urlhausPromise = fetch('https://urlhaus-api.abuse.ch/v1/host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `host=${encodeURIComponent(domain)}`,
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => res.json())
      .catch(() => null);

    // Check PhishTank (phishing database)
    const phishTankPromise = fetch('https://checkurl.phishtank.com/checkurl/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'phishtank/susscore',
      },
      body: `url=${encodeURIComponent(fullUrl)}&format=json`,
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => res.json())
      .catch(() => null);

    const [urlhausData, phishTankData] = await Promise.all([
      urlhausPromise,
      phishTankPromise,
    ]);

    // Check URLhaus results
    if (urlhausData?.query_status === 'ok' && urlhausData?.urls?.length > 0) {
      return {
        name: 'Reputation',
        status: 'fail',
        detail: `Found in URLhaus malware database (${urlhausData.urls.length} reports)`,
        weight: 50,
      };
    }

    // Check PhishTank results
    if (phishTankData?.results?.in_database && phishTankData?.results?.valid) {
      return {
        name: 'Reputation',
        status: 'fail',
        detail: 'Listed in PhishTank phishing database',
        weight: 50,
      };
    }

    return {
      name: 'Reputation',
      status: 'pass',
      detail: 'Not found in threat databases',
      weight: 0,
    };
  } catch {
    return {
      name: 'Reputation',
      status: 'warn',
      detail: 'Could not check reputation databases',
      weight: 5,
    };
  }
}

// Enhanced URL pattern checking
function checkUrlPatterns(urlString: string, domain: string): CheckResult {
  const suspiciousPatterns = [
    {
      pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      reason: 'Uses IP address instead of domain',
      weight: 30,
    },
    {
      pattern: /@/,
      reason: 'Contains @ symbol (potential redirect trick)',
      weight: 25,
    },
    {
      pattern: /\.(zip|exe|scr|bat|cmd|msi|jar|apk|dmg|pkg)$/i,
      reason: 'Links directly to executable file',
      weight: 35,
    },
    {
      pattern:
        /(login|signin|account|secure|update|verify|confirm|suspend|locked|alert).*\.(tk|ml|ga|cf|gq|top|xyz)/i,
      reason: 'Phishing keywords with suspicious TLD',
      weight: 40,
    },
    {
      pattern: /([a-z0-9]+\.){5,}/,
      reason: 'Excessive subdomains (5+)',
      weight: 25,
    },
    {
      pattern: /[0-9]{4,}/,
      reason: 'Contains long number sequence',
      weight: 15,
    },
    { pattern: /-{2,}/, reason: 'Multiple consecutive hyphens', weight: 10 },
    {
      pattern: /\.(php|asp|jsp|cgi)\?.*=/i,
      reason: 'Suspicious query parameters',
      weight: 15,
    },
  ];

  for (const { pattern, reason, weight } of suspiciousPatterns) {
    if (pattern.test(urlString) || pattern.test(domain)) {
      return { name: 'URL Patterns', status: 'fail', detail: reason, weight };
    }
  }

  // Check for suspicious TLDs
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld && SUSPICIOUS_TLDS.includes(tld)) {
    return {
      name: 'URL Patterns',
      status: 'warn',
      detail: `Uses .${tld} TLD (commonly abused)`,
      weight: 20,
    };
  }

  // Check for excessive length
  if (domain.length > 50) {
    return {
      name: 'URL Patterns',
      status: 'warn',
      detail: 'Unusually long domain name',
      weight: 15,
    };
  }

  // Check for random-looking strings
  const domainPart = domain.split('.')[0];
  const vowelRatio =
    (domainPart.match(/[aeiou]/gi) || []).length / domainPart.length;
  if (vowelRatio < 0.15 && domainPart.length > 8) {
    return {
      name: 'URL Patterns',
      status: 'warn',
      detail: 'Domain has very few vowels (possibly random)',
      weight: 15,
    };
  }

  return {
    name: 'URL Patterns',
    status: 'pass',
    detail: 'No suspicious patterns detected',
    weight: 0,
  };
}

// Check redirect chain
async function checkRedirects(urlString: string): Promise<CheckResult> {
  try {
    if (!urlString.startsWith('http')) {
      urlString = 'https://' + urlString;
    }

    let redirectCount = 0;
    let currentUrl = urlString;
    const maxRedirects = 10;
    const visitedUrls = new Set<string>();

    while (redirectCount < maxRedirects) {
      if (visitedUrls.has(currentUrl)) {
        return {
          name: 'Redirects',
          status: 'fail',
          detail: 'Redirect loop detected',
          weight: 30,
        };
      }
      visitedUrls.add(currentUrl);

      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      });

      if (response.status >= 300 && response.status < 400) {
        redirectCount++;
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = location.startsWith('http')
          ? location
          : new URL(location, currentUrl).toString();
      } else {
        break;
      }
    }

    if (redirectCount >= 5) {
      return {
        name: 'Redirects',
        status: 'fail',
        detail: `${redirectCount} redirects (excessive)`,
        weight: 25,
      };
    } else if (redirectCount >= 3) {
      return {
        name: 'Redirects',
        status: 'warn',
        detail: `${redirectCount} redirects`,
        weight: 15,
      };
    } else if (redirectCount >= 1) {
      return {
        name: 'Redirects',
        status: 'warn',
        detail: `${redirectCount} redirect(s)`,
        weight: 5,
      };
    }

    return {
      name: 'Redirects',
      status: 'pass',
      detail: 'No redirects',
      weight: 0,
    };
  } catch {
    return {
      name: 'Redirects',
      status: 'warn',
      detail: 'Could not check redirects',
      weight: 5,
    };
  }
}

// Check DNS records
async function checkDNS(domain: string): Promise<CheckResult> {
  try {
    // Use DNS over HTTPS (Cloudflare)
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`;

    const response = await fetch(dnsUrl, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        name: 'DNS Records',
        status: 'warn',
        detail: 'Could not resolve DNS',
        weight: 15,
      };
    }

    const data = await response.json();

    if (!data.Answer || data.Answer.length === 0) {
      return {
        name: 'DNS Records',
        status: 'fail',
        detail: 'Domain does not resolve',
        weight: 40,
      };
    }

    // Check for suspicious DNS patterns
    const answers = data.Answer;
    const ips = answers
      .map((a: any) => a.data)
      .filter((ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));

    // Check for private IP ranges (suspicious for public domains)
    const privateIpPattern = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (ips.some((ip: string) => privateIpPattern.test(ip))) {
      return {
        name: 'DNS Records',
        status: 'fail',
        detail: 'Resolves to private IP address',
        weight: 35,
      };
    }

    return {
      name: 'DNS Records',
      status: 'pass',
      detail: `Resolves to ${ips.length} IP(s)`,
      weight: 0,
    };
  } catch {
    return {
      name: 'DNS Records',
      status: 'warn',
      detail: 'Could not check DNS records',
      weight: 10,
    };
  }
}

// Calculate sophisticated score with category weighting
function calculateScore(checks: CheckResult[]): number {
  // Group checks by category
  const categories = {
    critical: ['Reputation', 'Homograph Attack', 'DNS Records'],
    high: ['Domain Age', 'SSL Certificate', 'Typosquatting', 'URL Patterns'],
    medium: ['Redirects', 'URL Shortener'],
  };

  let score = 0;
  let criticalIssues = 0;
  let highIssues = 0;

  for (const check of checks) {
    score += check.weight;

    // Count critical and high severity issues
    if (categories.critical.includes(check.name) && check.status === 'fail') {
      criticalIssues++;
    }
    if (categories.high.includes(check.name) && check.status === 'fail') {
      highIssues++;
    }
  }

  // Apply multipliers for multiple critical issues
  if (criticalIssues >= 2) {
    score *= 1.3;
  }
  if (highIssues >= 3) {
    score *= 1.2;
  }

  return Math.min(100, Math.round(score));
}

export async function POST(request: NextRequest) {
  try {
    const { url: inputUrl } = await request.json();

    if (!inputUrl || typeof inputUrl !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a URL' },
        { status: 400 },
      );
    }

    // Clean and validate URL
    let cleanUrl = inputUrl.trim();
    const domain = extractDomain(cleanUrl);

    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 },
      );
    }

    // Normalize URL for full checks
    const fullUrl = cleanUrl.startsWith('http')
      ? cleanUrl
      : `https://${cleanUrl}`;

    // Run all checks in parallel
    const [domainAge, ssl, reputation, redirects, dns] = await Promise.all([
      checkDomainAge(domain),
      checkSSL(cleanUrl),
      checkReputation(domain, fullUrl),
      checkRedirects(cleanUrl),
      checkDNS(domain),
    ]);

    // Synchronous checks
    const urlPatterns = checkUrlPatterns(cleanUrl, domain);
    const homograph = checkHomograph(domain);
    const typosquatting = checkTyposquatting(domain);
    const urlShortener = checkUrlShortener(domain);

    const checks = [
      domainAge,
      ssl,
      reputation,
      urlPatterns,
      redirects,
      dns,
      homograph,
      typosquatting,
      urlShortener,
    ];

    // Calculate sophisticated score
    const score = calculateScore(checks);

    // Determine verdict with more nuanced thresholds
    let verdict: 'safe' | 'caution' | 'danger';
    if (score <= 25) {
      verdict = 'safe';
    } else if (score <= 55) {
      verdict = 'caution';
    } else {
      verdict = 'danger';
    }

    return NextResponse.json({
      url: fullUrl,
      score,
      verdict,
      checks: checks.map(({ name, status, detail }) => ({
        name,
        status,
        detail,
      })),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Scan failed. Please try again.' },
      { status: 500 },
    );
  }
}
