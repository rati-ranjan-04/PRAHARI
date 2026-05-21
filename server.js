/**
 * PRAHARI v5.0 + ARIA v8.0 — Unified Backend Server (FIXED)
 * Run:  node server.js
 * Deps: npm install express cors dotenv node-fetch
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const AI_BASE_URL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';
const AI_API_KEY  = process.env.AI_API_KEY;
const AI_MODEL    = process.env.AI_MODEL || 'gemini-2.0-flash';

// ── MIDDLEWARE ────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── SYSTEM PROMPTS ────────────────────────────────
const SYSTEM_PROMPTS = {
  defensive: `You are ARIA (Adaptive Response Intelligence Agent) v8.0, the AI core of PRAHARI — India's premier cybersecurity intelligence platform.

ROLE: Defensive cybersecurity expert, cyber-law advisor, and digital fraud counsellor focused on protecting Indian citizens and organisations.

EXPERTISE:
• Indian Cyber Law: IT Act 2000/2008 (§43, §66, §66A-F, §79), DPDP Act 2023, Article 19 & 21 digital rights, CERT-In advisories
• Cyber Fraud: Digital arrest scams, UPI/SIM-swap fraud, phishing, vishing, blackmail/sextortion, investment scams
• Incident Response: Step-by-step victim guidance, evidence preservation, reporting to cybercrime.gov.in and helpline 1930
• Security Fundamentals: CIA triad, Zero Trust, Defense-in-Depth, NIST CSF, encryption, MFA, SIEM, IDS/IPS
• Networking: OSI model, TCP/IP, DNS, firewalls, VPN, IDS/IPS, NIDS/HIDS
• Malware: Ransomware, spyware, rootkits, firmware malware, keyloggers, botnets
• Data Privacy: DPDP Act 2023, GDPR, CCPA — rights and obligations

RESPONSE STYLE:
• Be direct, practical, and actionable
• Use structured sections with clear headings using ═══ markers
• Use ▸ for bullet points
• For fraud victims: lead with IMMEDIATE action steps
• Reference Indian law sections by number
• End critical fraud responses with: helpline 1930 and cybercrime.gov.in

CONSTRAINTS:
• Never assist with unauthorized system access
• Never provide weaponised exploits for live systems`,

  offensive: `You are ARIA (Adaptive Response Intelligence Agent) v8.0 — Offensive Security Mode for PRAHARI platform.

ROLE: Senior penetration tester and ethical hacker advisor for authorised security professionals.

EXPERTISE:
• Penetration Testing: Full methodology — Recon, Scanning, Exploitation, Post-Exploitation, Reporting
• Web Security: OWASP Top 10, SQLi (all types), XSS, SSRF, XXE, IDOR, JWT attacks, API security
• Network: Nmap, Wireshark, sniffing, MITM, ARP poisoning, DDoS types
• Active Directory: Kerberoasting, Pass-the-Hash, Golden Ticket, DCSync, BloodHound
• Malware Analysis: Static (Ghidra, IDA, YARA), Dynamic (x64dbg, Cuckoo, Procmon)
• Linux: Security commands, privilege escalation, forensic commands
• Cryptography: AES, RSA, hashing algorithms, post-quantum crypto
• Digital Forensics: Chain of custody, Volatility, FTK Imager, Autopsy, memory forensics
• Wireless: WPA2 attacks, PMKID, Evil Twin, Karma attacks
• Tools: Metasploit, Burp Suite, SQLMap, Hashcat, Hydra, Nmap, Nikto

RESPONSE STYLE:
• Technical depth with commands, tool flags, and code snippets
• Include MITRE ATT&CK TTP codes where applicable
• Structure: Technique → How it works → Tools/Commands → Detection → Mitigation

ETHICAL CONSTRAINTS:
• ALWAYS include authorisation reminder for exploitation content
• Focus on education and authorised lab/CTF environments only`
};

// ── RATE LIMITING ─────────────────────────────────
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now  = Date.now();
  const data = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - data.start > 60000) { data.count = 0; data.start = now; }
  data.count++;
  rateLimitMap.set(ip, data);
  return data.count <= 20;
}

// ── CHAT ROUTE ────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  }

  if (!AI_API_KEY) {
    return res.status(500).json({ error: 'Server not configured: AI_API_KEY missing in .env file.' });
  }

  const { messages, mode = 'defensive' } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  const safeMessages = messages
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .slice(-20)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, 4000)
    }));

  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.defensive;

  // FIX: declare before use in payload
  const modelName = AI_MODEL.replace(/^models\//, '');
  const apiUrl    = AI_BASE_URL.replace(/\/$/, '') + '/chat/completions';

  const payload = {
    model:       modelName,
    messages:    [{ role: 'system', content: systemPrompt }, ...safeMessages],
    max_tokens:  1024,
    temperature: 0.7,
  };

  try {
    console.log(`[ARIA] Sending to: ${apiUrl} | Model: ${modelName} | Mode: ${mode}`);

    const upstream = await fetch(apiUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[ARIA] Upstream error:', upstream.status, errText);
      return res.status(upstream.status).json({
        error: `AI API error: ${upstream.status}`,
        detail: errText
      });
    }

    const data    = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.json({ content, model: data.model, usage: data.usage });

  } catch (err) {
    console.error('[ARIA] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to reach AI service. Check your API key and network.' });
  }
});

// ── HEALTH CHECK ──────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'online',
    version:   '8.0',
    ai_ready:  !!AI_API_KEY,
    model:     AI_MODEL,
    base_url:  AI_BASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// ── STATIC FILE SERVING ───────────────────────────
// This MUST come AFTER all API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h2>PRAHARI: 404 — index.html not found</h2>
      <p>Make sure you have a <strong>public/</strong> folder with <strong>index.html</strong> inside it.</p>
      <p>Current path checked: ${indexPath}</p>
    `);
  }
});

// ── START ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   PRAHARI v5.0  ·  ARIA v8.0  Backend            ║
║   http://localhost:${PORT}                           ║
║   Model:   ${AI_MODEL.padEnd(34)}║
║   Key:     ${AI_API_KEY ? '✓ Loaded' : '✗ MISSING — set AI_API_KEY in .env'}${AI_API_KEY ? ''.padEnd(27) : ''.padEnd(14)}║
║   Base URL: ${AI_BASE_URL.slice(0,37).padEnd(37)}║
╚══════════════════════════════════════════════════╝
  `);
});