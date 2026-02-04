import { NextRequest, NextResponse } from 'next/server';

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  weight: number;
}

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

// Check domain age using RDAP (free, no API key needed)
async function checkDomainAge(domain: string): Promise<CheckResult> {
  try {
    // Try to get WHOIS-like data from RDAP
    const tld = domain.split('.').pop()?.toLowerCase();
    let rdapUrl = `https://rdap.org/domain/${domain}`;
    
    const response = await fetch(rdapUrl, { 
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/rdap+json' }
    });
    
    if (!response.ok) {
      return { name: 'Domain Age', status: 'warn', detail: 'Could not verify domain age', weight: 10 };
    }

    const data = await response.json();
    
    // Find registration date
    const events = data.events || [];
    const registration = events.find((e: any) => e.eventAction === 'registration');
    
    if (registration?.eventDate) {
      const regDate = new Date(registration.eventDate);
      const ageInDays = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      const ageInYears = Math.floor(ageInDays / 365);
      const ageInMonths = Math.floor(ageInDays / 30);

      if (ageInDays < 30) {
        return { name: 'Domain Age', status: 'fail', detail: `Registered ${Math.floor(ageInDays)} days ago (very new!)`, weight: 30 };
      } else if (ageInDays < 180) {
        return { name: 'Domain Age', status: 'warn', detail: `Registered ${ageInMonths} months ago (relatively new)`, weight: 15 };
      } else {
        return { name: 'Domain Age', status: 'pass', detail: `Registered ${ageInYears > 0 ? ageInYears + ' years' : ageInMonths + ' months'} ago`, weight: 0 };
      }
    }

    return { name: 'Domain Age', status: 'warn', detail: 'Registration date not found', weight: 10 };
  } catch (error) {
    return { name: 'Domain Age', status: 'warn', detail: 'Could not check domain age', weight: 10 };
  }
}

// Check SSL certificate
async function checkSSL(urlString: string): Promise<CheckResult> {
  try {
    if (!urlString.startsWith('https://')) {
      if (urlString.startsWith('http://')) {
        return { name: 'SSL Certificate', status: 'fail', detail: 'No HTTPS - connection not encrypted', weight: 25 };
      }
      urlString = 'https://' + urlString;
    }

    const response = await fetch(urlString, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });

    // If we got here with HTTPS, SSL is valid
    return { name: 'SSL Certificate', status: 'pass', detail: 'Valid HTTPS certificate', weight: 0 };
  } catch (error: any) {
    if (error?.cause?.code === 'CERT_HAS_EXPIRED') {
      return { name: 'SSL Certificate', status: 'fail', detail: 'SSL certificate expired', weight: 30 };
    }
    if (error?.cause?.code?.includes('CERT')) {
      return { name: 'SSL Certificate', status: 'fail', detail: 'Invalid SSL certificate', weight: 25 };
    }
    return { name: 'SSL Certificate', status: 'warn', detail: 'Could not verify SSL', weight: 10 };
  }
}

// Check against Google Safe Browsing (if API key available) or URLhaus
async function checkReputation(domain: string): Promise<CheckResult> {
  try {
    // Check URLhaus (free, no API key)
    const urlhausResponse = await fetch('https://urlhaus-api.abuse.ch/v1/host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `host=${encodeURIComponent(domain)}`,
      signal: AbortSignal.timeout(5000),
    });

    const urlhausData = await urlhausResponse.json();

    if (urlhausData.query_status === 'ok' && urlhausData.urls && urlhausData.urls.length > 0) {
      return { name: 'Reputation', status: 'fail', detail: `Found in URLhaus malware database (${urlhausData.urls.length} reports)`, weight: 40 };
    }

    return { name: 'Reputation', status: 'pass', detail: 'Not found in malware databases', weight: 0 };
  } catch {
    return { name: 'Reputation', status: 'warn', detail: 'Could not check reputation databases', weight: 5 };
  }
}

// Check for suspicious patterns in URL
function checkUrlPatterns(urlString: string, domain: string): CheckResult {
  const suspiciousPatterns = [
    { pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, reason: 'Uses IP address instead of domain' },
    { pattern: /@/, reason: 'Contains @ symbol (potential redirect trick)' },
    { pattern: /\.(zip|exe|scr|bat|cmd|msi|jar)$/i, reason: 'Links directly to executable file' },
    { pattern: /(login|signin|account|secure|update|verify|confirm).*\.(tk|ml|ga|cf|gq)/i, reason: 'Suspicious keywords with free TLD' },
    { pattern: /([a-z0-9]+\.){4,}/, reason: 'Excessive subdomains' },
    { pattern: /(paypal|amazon|google|apple|microsoft|facebook|instagram|netflix)[^.]*\./i, reason: 'Potential brand impersonation' },
  ];

  for (const { pattern, reason } of suspiciousPatterns) {
    if (pattern.test(urlString) || pattern.test(domain)) {
      return { name: 'URL Patterns', status: 'fail', detail: reason, weight: 25 };
    }
  }

  // Check for suspicious TLDs
  const suspiciousTlds = ['tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'club', 'work', 'date', 'racing', 'win', 'bid', 'stream'];
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld && suspiciousTlds.includes(tld)) {
    return { name: 'URL Patterns', status: 'warn', detail: `Uses .${tld} TLD (commonly abused)`, weight: 15 };
  }

  return { name: 'URL Patterns', status: 'pass', detail: 'No suspicious patterns detected', weight: 0 };
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

    while (redirectCount < maxRedirects) {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      });

      if (response.status >= 300 && response.status < 400) {
        redirectCount++;
        const location = response.headers.get('location');
        if (!location) break;
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
      } else {
        break;
      }
    }

    if (redirectCount >= 5) {
      return { name: 'Redirects', status: 'fail', detail: `${redirectCount} redirects (excessive)`, weight: 20 };
    } else if (redirectCount >= 2) {
      return { name: 'Redirects', status: 'warn', detail: `${redirectCount} redirects`, weight: 10 };
    }

    return { name: 'Redirects', status: 'pass', detail: redirectCount === 0 ? 'No redirects' : `${redirectCount} redirect(s)`, weight: 0 };
  } catch {
    return { name: 'Redirects', status: 'warn', detail: 'Could not check redirects', weight: 5 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url: inputUrl } = await request.json();

    if (!inputUrl || typeof inputUrl !== 'string') {
      return NextResponse.json({ error: 'Please provide a URL' }, { status: 400 });
    }

    // Clean and validate URL
    let cleanUrl = inputUrl.trim();
    const domain = extractDomain(cleanUrl);

    if (!domain) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Run all checks in parallel
    const [domainAge, ssl, reputation, redirects] = await Promise.all([
      checkDomainAge(domain),
      checkSSL(cleanUrl),
      checkReputation(domain),
      checkRedirects(cleanUrl),
    ]);

    // URL patterns check is sync
    const urlPatterns = checkUrlPatterns(cleanUrl, domain);

    const checks = [domainAge, ssl, reputation, urlPatterns, redirects];

    // Calculate sus score (0-100)
    const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
    const score = Math.min(100, totalWeight);

    // Determine verdict
    let verdict: 'safe' | 'caution' | 'danger';
    if (score <= 30) {
      verdict = 'safe';
    } else if (score <= 60) {
      verdict = 'caution';
    } else {
      verdict = 'danger';
    }

    return NextResponse.json({
      url: cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`,
      score,
      verdict,
      checks: checks.map(({ name, status, detail }) => ({ name, status, detail })),
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Scan failed. Please try again.' }, { status: 500 });
  }
}
