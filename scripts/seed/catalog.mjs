// Taxonomy, profile, settings and projects for the seed data.
import { bold, doc, h2, p, ul } from './content-builders.mjs';

export const topics = [
  {
    slug: 'clinical-research',
    name: 'Clinical Research',
    name_pt: 'Pesquisa Clínica',
    description: 'Trial design, phases, endpoints and how evidence about medicines is generated in people.',
    description_pt: 'Desenho de ensaios, fases, desfechos e como a evidência sobre medicamentos é gerada em pessoas.',
    icon: 'clipboard-list',
  },
  {
    slug: 'biostatistics',
    name: 'Biostatistics',
    name_pt: 'Bioestatística',
    description: 'Confidence intervals, hazard ratios, survival analysis and the numbers behind clinical results.',
    description_pt: 'Intervalos de confiança, hazard ratios, análise de sobrevida e os números por trás dos resultados clínicos.',
    icon: 'sigma',
  },
  {
    slug: 'pharmacology',
    name: 'Pharmacology',
    name_pt: 'Farmacologia',
    description: 'Mechanisms of action, pharmacokinetics and how drugs behave in the body.',
    description_pt: 'Mecanismos de ação, farmacocinética e como os fármacos se comportam no organismo.',
    icon: 'pill',
  },
  {
    slug: 'evidence-based-medicine',
    name: 'Evidence-Based Medicine',
    name_pt: 'Medicina Baseada em Evidências',
    description: 'Critical appraisal of studies and how research findings become clinical practice.',
    description_pt: 'Leitura crítica de estudos e como os resultados de pesquisa chegam à prática clínica.',
    icon: 'scale',
  },
  {
    slug: 'medical-affairs',
    name: 'Medical Affairs',
    name_pt: 'Medical Affairs',
    description: 'Scientific communication between industry, healthcare professionals and patients.',
    description_pt: 'Comunicação científica entre a indústria, os profissionais de saúde e os pacientes.',
    icon: 'message-square-text',
  },
  {
    slug: 'data-analysis',
    name: 'Data Analysis',
    name_pt: 'Análise de Dados',
    description: 'Health data projects with R, Python and Power BI — from cleaning to visualisation.',
    description_pt: 'Projetos com dados de saúde em R, Python e Power BI, da limpeza à visualização.',
    icon: 'chart-line',
  },
];

export const categories = [
  { slug: 'concept-explainer', name: 'Concept Explainer', name_pt: 'Explicação de conceito', description: 'One statistical or clinical concept, explained with examples.' },
  { slug: 'paper-review', name: 'Paper Review', name_pt: 'Revisão de estudo', description: 'Structured appraisal of a published clinical study.' },
  { slug: 'research-note', name: 'Research Note', name_pt: 'Nota de pesquisa', description: 'Short notes from ongoing study and reading.' },
  { slug: 'guide', name: 'Guide', name_pt: 'Guia', description: 'Practical, step-by-step methods.' },
];

// Sample profile — replace every value from /admin/profile.
export const siteProfile = {
  full_name: 'Fernando Osman',
  headline: 'Pharmacy Student',
  focus_areas: ['Clinical Research', 'Medical Affairs', 'Data Analysis'],
  short_bio: 'Scientific communication, clinical evidence and data-driven learning in pharmacy.',
  bio: [
    'I am a pharmacy student interested in how clinical evidence is generated, appraised and communicated.',
    'This site collects my study notes on clinical research and biostatistics, structured reviews of clinical papers and small data projects. Writing about a concept is how I check that I actually understand it.',
    'I am looking for opportunities in clinical research, medical affairs and evidence generation within the pharmaceutical industry.',
  ].join('\n\n'),
  course: 'Pharmacy',
  university: '',
  current_semester: 6,
  total_semesters: 10,
  location: 'Brazil',
  languages: [
    { name: 'Portuguese', level: 'Native' },
    { name: 'English', level: 'Advanced' },
  ],
  interests: [
    'Clinical Research',
    'Medical Affairs',
    'Biostatistics',
    'Evidence-Based Medicine',
    'Pharmacology',
    'Health Data Analysis',
  ],
  education: [
    {
      institution: 'University (edit in /admin/profile)',
      degree: 'Bachelor of Pharmacy',
      start: '2023',
      end: 'Expected 2028',
      description: 'Coursework in pharmacology, pharmacokinetics, biostatistics and clinical pharmacy.',
    },
  ],
  experience: [],
  skills: [
    { group: 'Clinical evidence', items: ['Critical appraisal', 'CONSORT', 'ICH-GCP fundamentals', 'Scientific writing'] },
    { group: 'Data', items: ['R', 'Python (pandas)', 'Power BI', 'SQL'] },
    { group: 'Statistics', items: ['Survival analysis', 'Confidence intervals', 'Regression'] },
  ],
  certifications: [],
};

export const settings = [
  {
    key: 'site',
    is_public: true,
    value: {
      name: 'Fernando Osman',
      tagline: 'Pharmacy student · Clinical Research · Medical Affairs · Data Analysis',
      description:
        'Scientific communication, clinical evidence and data-driven learning in pharmacy. Articles, paper reviews and data projects by Fernando Osman.',
      keywords: ['pharmacy', 'clinical research', 'medical affairs', 'biostatistics', 'evidence-based medicine'],
    },
  },
  {
    key: 'contact',
    is_public: true,
    value: {
      intro:
        'For internships, research collaborations or questions about an article, send a message. I usually reply within a few days.',
    },
  },
];

export const projects = [
  {
    slug: 'clinical-trial-dashboard',
    title: 'Clinical Trial Dashboard',
    summary:
      'An exploratory dashboard of registered clinical trials, filtered by phase, condition and status, built from public registry data.',
    progress: 'in_progress',
    technologies: ['Python', 'pandas', 'Plotly', 'ClinicalTrials.gov API'],
    tags: ['Clinical trials', 'Data visualisation'],
    started_on: '2026-03-01',
    featured: true,
    sort_order: 1,
    content: doc(
      h2('Goal'),
      p('Practise working with real registry data and describe the trial landscape for a therapeutic area.'),
      h2('Scope'),
      ul(
        'Download study records from the public ClinicalTrials.gov API.',
        'Clean phases, statuses and enrolment figures.',
        'Visualise trials by phase, sponsor type and recruitment status.',
      ),
      h2('Status'),
      p(bold('In progress. '), 'Data extraction and cleaning are done; the visual layer is being built.'),
    ),
  },
  {
    slug: 'power-bi-health-data-project',
    title: 'Power BI Health Data Project',
    summary:
      'A Power BI report exploring public health indicators, focused on data modelling, DAX measures and clear visual communication.',
    progress: 'completed',
    technologies: ['Power BI', 'DAX', 'Power Query'],
    tags: ['Public health', 'Data visualisation'],
    started_on: '2025-09-01',
    completed_on: '2025-12-15',
    featured: false,
    sort_order: 2,
    content: doc(
      h2('Goal'),
      p('Build an end-to-end report: import, model, measure and present health indicators.'),
      h2('What I practised'),
      ul('Star-schema data modelling', 'Time-intelligence DAX measures', 'Accessible chart design'),
    ),
  },
  {
    slug: 'biostatistics-learning-notes',
    title: 'Biostatistics Learning Notes',
    summary:
      'Reproducible notes and code for core biostatistics methods used in clinical research, written in R with Quarto.',
    progress: 'in_progress',
    technologies: ['R', 'Quarto', 'tidyverse'],
    tags: ['Statistics', 'Survival analysis'],
    started_on: '2026-01-10',
    featured: false,
    sort_order: 3,
    content: doc(
      h2('Goal'),
      p('Turn each statistics concept from the blog into a runnable, reproducible example.'),
      h2('Planned chapters'),
      ul('Confidence intervals by simulation', 'Kaplan–Meier and the log-rank test', 'Cox regression and proportional hazards'),
    ),
  },
  {
    slug: 'research-data-analysis',
    title: 'Research Data Analysis',
    summary:
      'Planned analysis of an open clinical dataset, from protocol-style analysis plan to a short written report.',
    progress: 'planned',
    technologies: ['R', 'survival', 'ggplot2'],
    tags: ['Survival analysis', 'Reproducibility'],
    featured: false,
    sort_order: 4,
    content: doc(
      h2('Goal'),
      p('Write a statistical analysis plan before touching the data, then follow it and report deviations.'),
    ),
  },
];
