import { z } from 'zod';

import { imagePathSchema, optionalUrl } from './common';

const shortText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters.`);

export const siteProfileSchema = z.object({
  expected_graduation: shortText(40).optional().default(''),
  current_studies: z.array(shortText(60)).max(20).optional().default([]),
  scientific_interests: z.array(shortText(60)).max(20).optional().default([]),
  website_url: optionalUrl.optional(),
  full_name: shortText(120).min(2, 'Add a name.'),
  headline: shortText(120),
  focus_areas: z.array(shortText(60).min(1)).max(6),
  short_bio: shortText(400),
  bio: shortText(6000),
  photo_path: imagePathSchema,
  course: shortText(120),
  university: shortText(160),
  current_semester: z
    .union([z.coerce.number().int().min(1).max(20), z.literal(''), z.null()])
    .transform((value) => (typeof value === 'number' ? value : null)),
  total_semesters: z
    .union([z.coerce.number().int().min(1).max(20), z.literal(''), z.null()])
    .transform((value) => (typeof value === 'number' ? value : null)),
  location: shortText(120),
  languages: z.array(z.object({ name: shortText(60).min(1), level: shortText(60) })).max(10),
  interests: z.array(shortText(60).min(1)).max(20),
  linkedin_url: optionalUrl,
  github_url: optionalUrl,
  lattes_url: optionalUrl,
  orcid_url: optionalUrl,
  professional_email: z
    .union([z.email('Enter a valid email address.'), z.literal('')])
    .transform((value) => (value === '' ? null : value)),
  education: z
    .array(
      z.object({
        visible: z.boolean().optional().default(true),
        order: z.coerce.number().int().min(0).max(1000).optional().default(0),
        current: z.boolean().optional().default(false),
        logo: imagePathSchema.optional(),
        field: shortText(160).optional(),
        activities: shortText(1000).optional(),
        institution: shortText(160).min(1, 'Add the institution.'),
        degree: shortText(160),
        start: shortText(40),
        end: shortText(40),
        description: shortText(1000),
      }),
    )
    .max(10),
  experience: z
    .array(
      z.object({
        visible: z.boolean().optional().default(true),
        order: z.coerce.number().int().min(0).max(1000).optional().default(0),
        current: z.boolean().optional().default(false),
        logo: imagePathSchema.optional(),
        employment_type: shortText(80).optional(),
        location: shortText(120).optional(),
        skills: shortText(600).optional(),
        organization: shortText(160).min(1, 'Add the organisation.'),
        role: shortText(160),
        start: shortText(40),
        end: shortText(40),
        description: shortText(1000),
      }),
    )
    .max(20),
  skills: z.array(z.object({ group: shortText(80).min(1), items: z.array(shortText(60).min(1)).max(20) })).max(10),
  certifications: z
    .array(
      z.object({
        visible: z.boolean().optional().default(true),
        issue_date: shortText(40).optional(),
        expiration_date: shortText(40).optional(),
        credential_id: shortText(160).optional(),
        description: shortText(1000).optional(),
        skills: shortText(600).optional(),
        image_path: imagePathSchema.optional(),
        pdf_file_id: z.union([z.uuid(), z.literal(''), z.null()]).optional(),
        name: shortText(200).min(1),
        issuer: shortText(160),
        year: shortText(10),
        url: z.union([
          z.literal(''),
          z
            .string()
            .trim()
            .regex(/^https?:\/\/[^\s<>"]+$/i, 'Enter a full URL.')
            .max(2048),
        ]),
      }),
    )
    .max(30),
});

export type SiteProfileInput = z.input<typeof siteProfileSchema>;
export type SiteProfileData = z.output<typeof siteProfileSchema>;

export const siteSettingsSchema = z.object({
  site: z.object({
    name: shortText(80).min(2),
    tagline: shortText(200),
    description: shortText(320),
    keywords: z.array(shortText(60).min(1)).max(20),
  }),
  contact: z.object({ intro: shortText(600) }),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
