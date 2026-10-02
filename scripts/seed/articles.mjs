// Sample articles used by db/seed.sql. Numerical examples that are not
// taken from a cited source are explicitly labelled as illustrative.
import {
  bold,
  callout,
  cite,
  doc,
  h2,
  h3,
  inlineMath,
  italic,
  math,
  ol,
  p,
  quote,
  table,
  ul,
} from './content-builders.mjs';

export const articles = [
  {
    slug: 'how-clinical-trials-work-phase-i-ii-iii-and-iv',
    title: 'How Clinical Trials Work: Phase I, II, III and IV',
    subtitle: 'From first-in-human dosing to post-marketing surveillance',
    excerpt:
      'A practical walkthrough of the clinical development pathway: what each phase is designed to answer, typical sample sizes, and why most candidate drugs never reach patients.',
    category: 'concept-explainer',
    topics: ['clinical-research', 'pharmacology'],
    tags: ['Clinical trials', 'Drug development', 'Regulatory science'],
    language: 'en',
    publishedAt: '2026-06-02T09:00:00Z',
    featured: false,
    seoDescription:
      'What Phase I, II, III and IV clinical trials are designed to answer, typical sample sizes and why most investigational drugs fail.',
    content: doc(
      h2('Why this matters'),
      p(
        'Every medicine dispensed in a pharmacy went through a sequence of studies designed to answer increasingly demanding questions: is it safe enough to give to people, does it seem to work, does it work better than what we already have, and what happens once millions of patients use it? Understanding this sequence is the starting point for reading any clinical paper.',
      ),
      p(
        'International guidance such as ICH E8(R1) describes development as a series of studies with distinct objectives rather than a rigid ladder ',
        cite(1),
        '. The classic phase labels are still the vocabulary used by sponsors, regulators and journals.',
      ),
      h2('Before humans: preclinical development'),
      p(
        'In vitro and animal studies characterise pharmacology, toxicology and a first estimate of a safe starting dose. Nothing here proves efficacy in humans; it justifies the risk of a first-in-human study.',
      ),
      h2('Phase I: is it safe, and how does the body handle it?'),
      ul(
        [bold('Question: '), 'safety, tolerability, pharmacokinetics (PK) and pharmacodynamics (PD).'],
        [bold('Participants: '), 'usually 20–100 healthy volunteers; in oncology, patients with the disease.'],
        [bold('Typical designs: '), 'single ascending dose (SAD) and multiple ascending dose (MAD) cohorts.'],
        [bold('Key outputs: '), 'half-life, exposure (AUC, Cmax), dose-limiting toxicities and a dose range for Phase II.'],
      ),
      h2('Phase II: is there a signal of efficacy?'),
      p(
        'Phase II studies enrol patients with the target condition, often a few hundred, to explore whether the drug has the intended effect and which dose offers the best balance of benefit and harm. Many use surrogate or intermediate endpoints (for example blood pressure or tumour response) because they respond faster than hard outcomes.',
      ),
      h2('Phase III: does it work in a confirmatory setting?'),
      p(
        'Phase III trials are usually large, randomised and controlled, frequently double-blind, and are designed to confirm efficacy and characterise safety in a population closer to real practice. Their pre-specified primary endpoint and sample size calculation are what regulators scrutinise most.',
      ),
      callout(
        'key-point',
        p(
          bold('Attrition is the norm. '),
          'In a large analysis of trials run between 2000 and 2015, the overall probability that a programme entering Phase I would reach approval was about 14%, with wide variation by therapeutic area — oncology was the lowest, at roughly 3% ',
          cite(2),
          '.',
        ),
      ),
      h2('Regulatory review'),
      p(
        'The sponsor compiles the evidence into a marketing application — an NDA or BLA at the FDA, a marketing authorisation application at the EMA, or a registration dossier at ANVISA in Brazil — and the regulator weighs benefit against risk for the proposed indication ',
        cite(3),
        '.',
      ),
      h2('Phase IV: what happens after approval?'),
      p(
        'Approval is not the end of evidence generation. Post-marketing studies and pharmacovigilance systems detect rare or delayed adverse events that trials of a few thousand participants cannot capture, evaluate long-term outcomes and study populations that were excluded from pivotal trials.',
      ),
      h2('Summary'),
      table(
        ['Phase', 'Main question', 'Typical size', 'Typical design'],
        [
          ['I', 'Safety, PK/PD, dose range', '20–100', 'Dose escalation, often open-label'],
          ['II', 'Efficacy signal, dose selection', '100–300', 'Randomised, sometimes placebo-controlled'],
          ['III', 'Confirm efficacy and safety', 'Hundreds to thousands', 'Randomised, controlled, often blinded'],
          ['IV', 'Long-term and rare effects', 'Thousands or more', 'Observational studies, registries, pharmacovigilance'],
        ],
      ),
      h2('My takeaways'),
      ul(
        'Each phase answers a different question, so a "positive" Phase II result is not evidence of clinical benefit.',
        'Look for the primary endpoint and the population before looking at the results.',
        'Safety knowledge keeps growing after approval; pharmacists are part of that system through adverse event reporting.',
      ),
    ),
    references: [
      {
        title: 'ICH E8(R1): General Considerations for Clinical Studies',
        authors: 'International Council for Harmonisation',
        journal: 'ICH Harmonised Guideline',
        year: 2021,
        url: 'https://www.ich.org/page/efficacy-guidelines',
      },
      {
        title: 'Estimation of clinical trial success rates and related parameters',
        authors: 'Wong CH, Siah KW, Lo AW',
        journal: 'Biostatistics',
        year: 2019,
        doi: '10.1093/biostatistics/kxx069',
      },
      {
        title: 'The Drug Development Process',
        authors: 'U.S. Food and Drug Administration',
        journal: 'FDA',
        year: 2018,
        url: 'https://www.fda.gov/patients/learn-about-drug-and-device-approvals/drug-development-process',
      },
    ],
  },
  {
    slug: 'understanding-hazard-ratio-in-clinical-trials',
    title: 'Understanding Hazard Ratio in Clinical Trials',
    subtitle: 'What an HR of 0.75 does — and does not — tell you',
    excerpt:
      'Hazard ratios dominate time-to-event results in oncology and cardiology. This note explains what the number means, the proportional hazards assumption behind it and the most common misreadings.',
    category: 'concept-explainer',
    topics: ['biostatistics', 'evidence-based-medicine', 'clinical-research'],
    tags: ['Hazard ratio', 'Survival analysis', 'Cox model'],
    language: 'en',
    publishedAt: '2026-06-23T09:00:00Z',
    featured: true,
    seoDescription:
      'A clear explanation of hazard ratios in clinical trials: definition, proportional hazards, confidence intervals and common misinterpretations.',
    content: doc(
      h2('Why this matters'),
      p(
        'When a trial measures ',
        italic('time'),
        ' until an event — death, disease progression, hospitalisation — the headline result is usually a hazard ratio (HR). It appears in the abstract, in press releases and in medical information letters, so misreading it propagates quickly.',
      ),
      h2('The definition'),
      p(
        'The hazard is the instantaneous rate at which events occur among people who have not yet had the event. The hazard ratio compares that rate between two groups:',
      ),
      math('\\mathrm{HR} = \\frac{h_{\\text{treatment}}(t)}{h_{\\text{control}}(t)}'),
      p(
        'Under the proportional hazards assumption this ratio is constant over time, which is what the Cox model estimates ',
        cite(2),
        '. An HR below 1 favours the treatment when the event is harmful; an HR of exactly 1 means no difference.',
      ),
      h2('Understanding the numbers'),
      p(
        'Take an illustrative result: ',
        inlineMath('\\mathrm{HR} = 0.75'),
        ', 95% CI 0.62 to 0.91. A reasonable reading is: ',
        italic(
          'at any given moment during follow-up, patients on treatment experienced the event at about three quarters of the rate of patients on control.',
        ),
      ),
      callout(
        'warning',
        p(
          bold('Common misreading: '),
          '“HR 0.75 means 25% fewer patients had the event.” The HR compares rates over time, not cumulative proportions at a fixed time point. The difference in the proportion of patients with an event depends on the baseline risk and the length of follow-up ',
          cite(1),
          '.',
        ),
      ),
      h3('Reading the confidence interval'),
      p(
        'Because the whole 95% confidence interval in the example lies below 1, the data are compatible with a benefit ranging from modest (0.91) to substantial (0.62). A wide interval crossing 1 means the data are compatible with benefit, no effect and harm.',
      ),
      h2('Statistical analysis'),
      ul(
        [bold('Kaplan–Meier curves '), 'show the estimated proportion of patients event-free over time in each group.'],
        [bold('The log-rank test '), 'tests whether the curves differ; it does not estimate the size of the difference.'],
        [bold('The Cox proportional hazards model '), 'estimates the HR and can adjust for covariates.'],
      ),
      h2('Limitations'),
      p(
        'If the curves cross or separate only late — common with immunotherapies — hazards are not proportional and a single HR averages over very different periods. Alternatives such as the difference in restricted mean survival time (RMST) express the effect in units of time and do not rely on proportional hazards ',
        cite(3),
        '.',
      ),
      quote(
        'Always ask: proportional over what period, in which population, and what was the absolute risk in the control group?',
      ),
      h2('My takeaways'),
      ol(
        'Translate the HR into “rate at any moment”, not “percentage fewer events”.',
        'Check the Kaplan–Meier curves before trusting a single summary number.',
        'Pair the HR with absolute measures (event rates, RMST) when communicating results.',
      ),
    ),
    references: [
      {
        title: 'Hazard ratio in clinical trials',
        authors: 'Spruance SL, Reid JE, Grace M, Samore M',
        journal: 'Antimicrobial Agents and Chemotherapy',
        year: 2004,
        doi: '10.1128/AAC.48.8.2787-2792.2004',
      },
      {
        title: 'Regression models and life-tables',
        authors: 'Cox DR',
        journal: 'Journal of the Royal Statistical Society: Series B (Methodological)',
        year: 1972,
        doi: '10.1111/j.2517-6161.1972.tb00899.x',
      },
      {
        title: 'Moving beyond the hazard ratio in quantifying the between-group difference in survival analysis',
        authors: 'Uno H, Claggett B, Tian L, et al.',
        journal: 'Journal of Clinical Oncology',
        year: 2014,
        doi: '10.1200/JCO.2013.53.2346',
      },
    ],
  },
  {
    slug: 'what-does-a-95-confidence-interval-actually-mean',
    title: 'What Does a 95% Confidence Interval Actually Mean?',
    subtitle: 'A property of the method, not a probability about one interval',
    excerpt:
      'Confidence intervals are the most useful number in a results table and one of the most misunderstood. Here is the correct interpretation, how they are built and how to use them in practice.',
    category: 'concept-explainer',
    topics: ['biostatistics', 'evidence-based-medicine'],
    tags: ['Confidence interval', 'Statistics', 'P-value'],
    language: 'en',
    publishedAt: '2026-07-14T09:00:00Z',
    featured: false,
    seoDescription:
      'The correct interpretation of a 95% confidence interval, how it is calculated and how it relates to p-values and clinical significance.',
    content: doc(
      h2('Why this matters'),
      p(
        'A point estimate on its own hides uncertainty. The confidence interval (CI) shows the range of effect sizes that are reasonably compatible with the data, which is exactly what a clinician or a medical affairs team needs to judge whether a result matters.',
      ),
      h2('The correct interpretation'),
      p(
        'If we repeated the same study many times and computed a 95% CI each time, about 95% of those intervals would contain the true value. The 95% describes the long-run behaviour of the ',
        italic('procedure'),
        ' ',
        cite(1),
        '.',
      ),
      callout(
        'warning',
        p(
          bold('Not quite right: '),
          '“There is a 95% probability that the true value lies in this interval.” In the frequentist framework the true value is fixed; a specific interval either contains it or does not.',
        ),
      ),
      h2('How it is built'),
      p('For a mean with an approximately normal sampling distribution:'),
      math('\\bar{x} \\pm 1.96 \\times \\frac{s}{\\sqrt{n}}'),
      p(
        'Ratio measures such as risk ratios, odds ratios and hazard ratios are calculated on the log scale and back-transformed, which is why their intervals are asymmetric around the point estimate.',
      ),
      h2('Understanding the numbers'),
      table(
        ['Illustrative result', 'Reading'],
        [
          ['Mean difference −4.1 mmHg (95% CI −6.0 to −2.2)', 'Consistent with a reduction between 2 and 6 mmHg.'],
          ['Risk ratio 0.90 (95% CI 0.78 to 1.04)', 'Compatible with a 22% reduction or a 4% increase.'],
          ['Odds ratio 1.8 (95% CI 1.1 to 2.9)', 'Compatible with modest to large increases in odds.'],
        ],
      ),
      h2('Relation to p-values'),
      p(
        'For a two-sided test at the 5% level, a 95% CI that excludes the null value (0 for differences, 1 for ratios) corresponds to p < 0.05. The interval is more informative because it shows magnitude and precision; it is even possible to approximate the CI from a reported p-value ',
        cite(2),
        '.',
      ),
      h2('Limitations'),
      ul(
        'A CI only reflects random error. It says nothing about bias from confounding, poor randomisation or missing data.',
        'Wide intervals usually mean small samples or few events — absence of evidence, not evidence of absence.',
        'Statistical significance does not equal clinical relevance; compare the interval with a minimal clinically important difference.',
      ),
      h2('My takeaways'),
      ol(
        'Read the interval before the p-value.',
        'Ask whether both ends of the interval would change practice.',
        'Remember that “95%” describes the method, not this particular interval.',
      ),
    ),
    references: [
      {
        title:
          'Statistical tests, P values, confidence intervals, and power: a guide to misinterpretations',
        authors: 'Greenland S, Senn SJ, Rothman KJ, et al.',
        journal: 'European Journal of Epidemiology',
        year: 2016,
        doi: '10.1007/s10654-016-0149-3',
      },
      {
        title: 'How to obtain the confidence interval from a P value',
        authors: 'Altman DG, Bland JM',
        journal: 'BMJ',
        year: 2011,
        doi: '10.1136/bmj.d2090',
      },
    ],
  },
  {
    slug: 'relative-risk-vs-absolute-risk',
    title: 'Relative Risk vs Absolute Risk',
    subtitle: 'Why “50% lower risk” can mean one patient in a hundred',
    excerpt:
      'The same trial result can sound dramatic or modest depending on how it is framed. A worked example of relative risk reduction, absolute risk reduction and number needed to treat.',
    category: 'concept-explainer',
    topics: ['evidence-based-medicine', 'biostatistics', 'medical-affairs'],
    tags: ['Relative risk', 'Absolute risk', 'NNT', 'Risk communication'],
    language: 'en',
    publishedAt: '2026-08-04T09:00:00Z',
    featured: false,
    seoDescription:
      'Relative risk, absolute risk reduction and number needed to treat explained with a worked example and implications for medical communication.',
    content: doc(
      h2('Why this matters'),
      p(
        'Relative measures are stable across populations and useful for modelling, but on their own they exaggerate perceived benefit. Absolute measures tell a patient — or a payer — how much difference a treatment actually makes ',
        cite(1),
        '.',
      ),
      h2('The definitions'),
      p('With CER the control event rate and EER the experimental event rate:'),
      math('\\mathrm{RR} = \\frac{\\mathrm{EER}}{\\mathrm{CER}} \\qquad \\mathrm{ARR} = \\mathrm{CER} - \\mathrm{EER} \\qquad \\mathrm{NNT} = \\frac{1}{\\mathrm{ARR}}'),
      p(
        'The relative risk reduction is ',
        inlineMath('\\mathrm{RRR} = 1 - \\mathrm{RR}'),
        '. The number needed to treat was proposed precisely to make trial results clinically interpretable ',
        cite(2),
        '.',
      ),
      h2('Understanding the numbers'),
      p('An illustrative example with the same relative effect in two populations:'),
      table(
        ['Population', 'Control risk', 'Treated risk', 'RRR', 'ARR', 'NNT'],
        [
          ['Low baseline risk', '2%', '1%', '50%', '1 percentage point', '100'],
          ['High baseline risk', '20%', '10%', '50%', '10 percentage points', '10'],
        ],
      ),
      callout(
        'key-point',
        p(
          'The relative risk reduction is identical, but treating 100 low-risk patients prevents one event, while treating 10 high-risk patients prevents one. ',
          bold('Baseline risk drives absolute benefit.'),
        ),
      ),
      h2('Implications for medical affairs'),
      ul(
        'Present relative and absolute effects together, with the time horizon (for example “over 3 years”).',
        'Report harms in the same format as benefits — number needed to harm alongside NNT.',
        'Use natural frequencies (“1 in 100”) when communicating with patients.',
      ),
      h2('Limitations'),
      p(
        'NNT depends on baseline risk and follow-up duration, so it cannot be compared across trials with different populations or time frames without care. It also has awkward confidence intervals when the effect is not statistically significant.',
      ),
      h2('My takeaways'),
      ol(
        'When you see a relative reduction, look for the control event rate.',
        'Translate results into NNT over a defined period.',
        'Balanced communication shows both absolute benefit and absolute harm.',
      ),
    ),
    references: [
      {
        title: 'Misleading communication of risk',
        authors: 'Gigerenzer G, Wegwarth O, Feufel M',
        journal: 'BMJ',
        year: 2010,
        doi: '10.1136/bmj.c4830',
      },
      {
        title: 'An assessment of clinically useful measures of the consequences of treatment',
        authors: 'Laupacis A, Sackett DL, Roberts RS',
        journal: 'New England Journal of Medicine',
        year: 1988,
        doi: '10.1056/NEJM198806303182605',
      },
    ],
  },
  {
    slug: 'how-to-read-a-clinical-research-paper',
    title: 'How to Read a Clinical Research Paper',
    subtitle: 'A structured checklist I use for every study',
    excerpt:
      'Start with the question, not the conclusion. A section-by-section method for appraising clinical studies, from PICO to limitations, using the structure of a CONSORT-compliant report.',
    category: 'guide',
    topics: ['evidence-based-medicine', 'clinical-research', 'medical-affairs'],
    tags: ['Critical appraisal', 'CONSORT', 'Study design'],
    language: 'en',
    publishedAt: '2026-09-01T09:00:00Z',
    featured: false,
    seoDescription:
      'A practical, section-by-section method to critically appraise a clinical research paper: question, design, population, endpoints, results and limitations.',
    content: doc(
      h2('Why this study matters'),
      p(
        'Before reading results, decide why the paper deserves your time: does it address a clinically relevant question, is it likely to change practice, and who funded it? Greenhalgh’s advice still holds: first work out what the paper is about ',
        cite(1),
        '.',
      ),
      h2('Research Question'),
      p('Frame the question with PICO:'),
      ul(
        [bold('P'), 'opulation — who was studied?'],
        [bold('I'), 'ntervention — what was done?'],
        [bold('C'), 'omparator — compared with what (placebo, standard of care)?'],
        [bold('O'), 'utcome — what was measured, and when?'],
      ),
      h2('Study Design'),
      p(
        'Identify the design (randomised trial, cohort, case-control, cross-sectional) and check whether it can answer the question. For randomised trials, reports should follow CONSORT ',
        cite(2),
        ', which makes randomisation, allocation concealment and blinding easy to locate.',
      ),
      h2('Population'),
      p(
        'Read the inclusion and exclusion criteria and the baseline characteristics table. Would your patients have been eligible? Trials often exclude older adults, pregnant people and patients with multiple comorbidities.',
      ),
      h2('Intervention'),
      p('Note dose, duration, route and co-interventions. Is the comparator a fair representation of current care?'),
      h2('Endpoints'),
      ul(
        'Is the primary endpoint clinically meaningful or a surrogate?',
        'Was it pre-specified (check the trial registration)?',
        'Composite endpoints: which component drives the result?',
      ),
      h2('Results'),
      p('Look at the flow diagram first: how many participants were randomised, analysed and lost to follow-up?'),
      h2('Understanding the Numbers'),
      p(
        'Extract the effect estimate with its confidence interval, the control event rate and an absolute measure (ARR or NNT). A relative reduction without the baseline risk is incomplete.',
      ),
      h2('Statistical Analysis'),
      ul(
        'Intention-to-treat or per-protocol? For superiority trials, ITT is the primary analysis.',
        'Was the sample size calculation based on a plausible effect size?',
        'Were subgroup analyses pre-specified, and is there a formal interaction test?',
      ),
      h2('Limitations'),
      p(
        'Read the authors’ limitations, then add your own: risk of bias, generalisability, follow-up length, funding and conflicts of interest.',
      ),
      callout(
        'note',
        p(
          'Tools such as the Cochrane Risk of Bias tool (RoB 2) for randomised trials provide a structured way to judge internal validity.',
        ),
      ),
      h2('My Takeaways'),
      p('I finish every appraisal with three sentences:'),
      ol(
        'What did the study find, in absolute terms?',
        'How confident am I in the result, and why?',
        'Would it change what I recommend to a patient or a healthcare professional?',
      ),
    ),
    references: [
      {
        title: 'How to read a paper: getting your bearings (deciding what the paper is about)',
        authors: 'Greenhalgh T',
        journal: 'BMJ',
        year: 1997,
        doi: '10.1136/bmj.315.7102.243',
      },
      {
        title: 'CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials',
        authors: 'Schulz KF, Altman DG, Moher D; CONSORT Group',
        journal: 'BMJ',
        year: 2010,
        doi: '10.1136/bmj.c332',
      },
    ],
  },
  {
    // Draft: used to verify that unpublished content is never publicly visible.
    slug: 'paper-review-sglt2-inhibitors-in-heart-failure-draft',
    title: 'Paper Review: SGLT2 Inhibitors in Heart Failure (draft)',
    subtitle: 'Work in progress',
    excerpt: 'Draft review — not yet published.',
    category: 'paper-review',
    topics: ['clinical-research', 'pharmacology'],
    tags: ['Cardiology'],
    language: 'en',
    status: 'draft',
    featured: false,
    seoDescription: '',
    content: doc(
      h2('Why this study matters'),
      p('Draft notes. This article is intentionally unpublished in the sample data.'),
    ),
    references: [],
  },
];
