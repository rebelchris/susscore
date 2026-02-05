# susscore 🔍

**Instant scam detection for suspicious URLs.**

Paste a link. Get a sus score. It's that simple.

⚠️ **Important:** This tool provides automated analysis only. Always use common sense and verify suspicious links independently. No tool can guarantee 100% accuracy.

## What It Checks

- 🕐 **Domain Age** — New domains are sus (enhanced thresholds)
- 🔒 **SSL Certificate** — Missing or invalid = red flag
- 🚨 **Reputation** — Checks URLhaus malware & PhishTank phishing databases
- 🔗 **URL Patterns** — Detects phishing tricks, suspicious TLDs, & malicious patterns
- ↪️ **Redirect Chains** — Too many redirects = sketchy (with loop detection)
- 🌐 **DNS Records** — Validates domain resolution & checks for suspicious IPs
- 🎭 **Homograph Attacks** — Detects Unicode spoofing & look-alike characters
- 🎯 **Typosquatting** — Identifies domains impersonating popular brands
- 🔗 **URL Shorteners** — Flags shortened URLs with unknown destinations
- 🔐 **WHOIS Privacy** — Detects privacy-protected domain registrations
- 🔍 **Content Analysis** — Inspects HTML/JavaScript for malicious patterns

## Tech Stack

- Next.js 15
- Tailwind CSS
- Framer Motion
- Free APIs (no keys needed!)

## Getting Started

```bash
# Clone it
git clone https://github.com/rebelchris/susscore.git
cd susscore

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

One-click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rebelchris/susscore)

## Features

### Advanced Detection

- **11 comprehensive checks** covering multiple attack vectors
- **Sophisticated scoring algorithm** with category weighting and multipliers
- **40+ popular brands** monitored for typosquatting
- **34 suspicious TLDs** flagged for abuse patterns
- **19 URL shorteners** detected
- **Homograph attack detection** for Unicode spoofing
- **DNS validation** with private IP detection
- **Redirect loop detection** with cycle prevention
- **WHOIS privacy detection** for hidden domain ownership
- **Content analysis** for malicious HTML/JavaScript patterns

### Smart Analysis

- Levenshtein distance algorithm for typosquatting detection
- Vowel ratio analysis for random domain detection
- Mixed character set detection (Cyrillic/Greek/Latin)
- Punycode (xn--) internationalized domain flagging
- Executable file extension detection
- Phishing keyword pattern matching
- WHOIS privacy service detection (privacy/proxy indicators)
- Suspicious JavaScript pattern detection (eval, obfuscation)
- Fake login form detection with legitimacy indicators
- External script analysis for malware distribution

## Contributing

PRs welcome! Some ideas:

- [ ] Screenshot preview of suspicious sites
- [ ] Browser extension
- [ ] Historical data / trending scams
- [ ] Machine learning model for pattern detection
- [x] WHOIS privacy detection
- [x] Content analysis (HTML/JavaScript inspection)

## License

MIT — do whatever you want with it.

---

Made with 🔍 by [@BongersChris1](https://x.com/BongersChris1)
