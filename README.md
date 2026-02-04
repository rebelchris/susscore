# susscore 🔍

**Instant scam detection for suspicious URLs.**

Paste a link. Get a sus score. It's that simple.

## What It Checks

- 🕐 **Domain Age** — New domains are sus
- 🔒 **SSL Certificate** — Missing or invalid = red flag
- 🚨 **Reputation** — Checks against URLhaus malware database
- 🔗 **URL Patterns** — Detects phishing tricks & suspicious TLDs
- ↪️ **Redirect Chains** — Too many redirects = sketchy

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

## Contributing

PRs welcome! Some ideas:

- [ ] Add more reputation APIs (PhishTank, Google Safe Browsing)
- [ ] Screenshot preview of suspicious sites
- [ ] Browser extension
- [ ] API endpoint for programmatic access
- [ ] Historical data / trending scams

## License

MIT — do whatever you want with it.

---

Made with 🔍 by [@ArunMichaelDsmo](https://twitter.com/ArunMichaelDsmo)
