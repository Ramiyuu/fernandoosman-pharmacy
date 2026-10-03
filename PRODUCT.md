# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Fernando Osman is a Pharmacy student. The site serves three audiences with no fixed priority between them:

- **Industry recruiters and hiring managers** at pharmaceutical companies and CROs (Medical Affairs, Clinical Research), deciding whether to call him for an internship or job.
- **Academics**: professors, research groups and graduate programmes judging his scientific maturity.
- **Readers of the articles**: students and health professionals who arrive through a specific explainer and may come back to learn more.

There is one more user, the site owner, who works privately in the admin panel. He writes and publishes articles, keeps the profile, CV, certificates and projects up to date, and reads analytics and contact messages.

Because no audience is ranked first, the site cannot be optimised for one visitor at the expense of the others. A recruiter must reach the profile and CV fast. A reader must be able to read an article without career content getting in the way. An academic must find references, method and rigour.

## Product Purpose

The site is an academic and professional portfolio combined with a scientific publishing platform. It turns Fernando's study of clinical evidence into public, well-referenced articles. Those articles sit next to a verifiable record of his education, experience, certificates and projects.

**Success, 1–2 year horizon:** landing an internship or job interview in the pharmaceutical industry, a CRO or Medical Affairs. Everything else on the site, including article reach and academic credibility, counts mainly as evidence toward that goal.

## Positioning

Most student portfolios only claim competence. This one demonstrates it: the articles explain clinical-research concepts (hazard ratios, trial design, biostatistics, evidence-based medicine) with structured references, DOI/PMID, formulas and study-review sections. A hiring manager in Medical Affairs evaluates exactly this skill: reading evidence and communicating it accurately. The writing itself is the proof.

## Operating Context

- Visitors usually arrive in one of two ways: directly from a CV, LinkedIn or an application link (career intent), or through a single article found via search or sharing (reading intent).
- Recruiters typically spend little time and want profile, CV (PDF), experience and certificates in reach.
- The owner publishes through a private CMS: a Tiptap editor with autosave, drafts, publishing, a trash bin, references, footnotes, KaTeX math, tables, images, video and PDF attachments.
- Content is organised by topics (Clinical Research, Biostatistics, Pharmacology, Evidence-Based Medicine, Medical Affairs…), categories and tags, with full-text search, RSS and a sitemap.
- Hosting: Railway (Next.js and PostgreSQL), files on private Cloudflare R2. The domain `cobaltteam.com.br` is **provisional**; the brand stays Fernando Osman / FO.

## Capabilities and Constraints

- Public: home, articles (list, reading, topics, search), projects, about, CV, experience, certificates, contact, privacy, RSS, OG images, JSON-LD (Person/Article/ScholarlyArticle).
- Admin: a single private account with no public sign-up, mandatory TOTP and backup codes; profile/CV, education, experience, certificates, media library, analytics (views/downloads), audit log, messages, taxonomies, settings.
- PDFs are private and served through 60-second signed URLs. Analytics stores no IP, user agent or referrer, and respects Do Not Track. Contact messages follow a retention period under LGPD.
- Stack is fixed by the existing codebase: Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, PostgreSQL with RLS, Better Auth, R2.
- **Language: bilingual (English and Portuguese), implemented.** Decided on 2026-10-02:
  - URLs carry the locale: `/en/...` and `/pt/...`, with Portuguese path segments (`/pt/artigos`). `/` and old unprefixed links follow the visitor's saved choice, then the browser language, then English.
  - Each article or project may have one version per language, linked to the original, each with its own slug and publication status. A text may exist in only one language; visitors then see it with a language label.
  - Topics, categories, profile and settings have optional Portuguese fields that fall back to English.
  - The admin panel's interface stays in English; only content is bilingual.
- Undecided: the final domain.

## Brand Commitments

- Name and mark: **Fernando Osman / FO**. Assets in `public/brand/` (`fo-logo.png`, `fo-icon.png`) and the original references in `identidade_fernandoosman_portfolio/`. The site is not Cobalt-branded, even though it currently lives on a Cobalt domain.
- Voice: scientific, precise and calm. It explains what a number does and does not mean, without hype or exaggerated claims.

## Evidence on Hand

- In production, an install without seed creates only a minimal editable profile. Real profile, education, experience, certificates, projects and articles have to be entered by the owner in the admin panel.
- `db/seed.sql` holds **sample** content (topics and explainer articles such as hazard ratio) meant for development only; it is blocked in production. Do not present it as published work.
- Do not invent statistics, testimonials, employers, grades, publications, metrics or achievements. Public metrics are computed from published content in the database.

## Product Principles

1. **Proof over claim.** Every competence the site suggests should be backed by an article, project, certificate or document the visitor can open.
2. **Two entrances, two tempos.** Serve both the quick career scan (who he is, CV, experience) and deep reading of an article, without one getting in the way of the other.
3. **Scientific rigour is the brand.** References, method, limitations and correct reading of evidence carry more weight than decoration; nothing on the site should contradict that rigour.
4. **Privacy and security by default.** Minimal data, private files, a protected admin panel; trust is part of the professional profile.
5. **Owner autonomy.** Everything public must be editable in the admin panel without touching code.

## Accessibility & Inclusion

The audience includes health professionals and academics reading long, technical content (formulas, tables, references). Requirements already established in the project: visible focus, contrast in the brand colours, status never conveyed by colour alone, `prefers-reduced-motion` respected, keyboard navigation (including the mobile menu), alt text on images, and captions/transcripts expected for videos. There is no formal certification; validation so far has been Chromium only.
