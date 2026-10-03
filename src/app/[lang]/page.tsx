import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@/components/layout/container';
import { SectionHeader } from '@/components/layout/section-header';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleCard } from '@/features/articles/components/article-card';
import { FeaturedArticle } from '@/features/articles/components/featured-article';
import { EvidenceStory } from '@/features/home/components/evidence-story';
import { MetricsTable } from '@/features/home/components/metrics-table';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { ProjectCard } from '@/features/projects/components/project-card';
import { TopicPlot } from '@/features/topics/components/topic-plot';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { personJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';
import {
  ARTICLES_PAGE_SIZE,
  getFeaturedArticle,
  getPublicMetrics,
  getPublishedArticles,
  getPublishedProjects,
  getSiteProfile,
  getSiteSettings,
  getTopicsWithCounts,
} from '@/services/public-content.service';

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  const settings = await getSiteSettings(lang);
  return buildMetadata({
    title: t.meta.homeTitle(settings.site.name),
    absoluteTitle: true,
    description: settings.site.description,
    path: '/',
    locale: lang,
    type: 'profile',
  });
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const i18n = i18nFor(lang);
  const { t, href } = i18n;

  const [profile, settings, metrics, featured, recent, topics, projects] = await Promise.all([
    getSiteProfile(lang),
    getSiteSettings(lang),
    getPublicMetrics(lang),
    getFeaturedArticle(lang),
    getPublishedArticles({}, 1, Math.min(7, ARTICLES_PAGE_SIZE), lang),
    getTopicsWithCounts(lang),
    getPublishedProjects(1, 3, lang),
  ]);

  const authorName = profile?.full_name ?? settings.site.name;
  const recentArticles = recent.items.filter((article) => article.translation_group !== featured?.translation_group).slice(0, 6);
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  return (
    <>
      <JsonLd data={websiteJsonLd(settings.site.name, settings.site.description, lang)} />
      {profile ? <JsonLd data={personJsonLd(profile, lang)} /> : null}

      {profile ? (
        <EvidenceStory profile={profile} topics={topics} i18n={i18n} />
      ) : (
        <Container className="py-20">
          <h1 className="text-5xl font-semibold text-ink">{settings.site.name}</h1>
          <p className="mt-4 text-lg text-muted">{settings.site.description}</p>
        </Container>
      )}

      <Container className="mt-16 sm:mt-20">
        <MetricsTable metrics={metrics} />
      </Container>

      {featured ? (
        <section aria-labelledby="featured-heading" className="mt-20">
          <Container>
            <h2 id="featured-heading" className="sr-only">
              {t.home.featured}
            </h2>
            <FeaturedArticle article={featured} fallbackAuthor={authorName} />
          </Container>
        </section>
      ) : null}

      {profile ? (
        <section id="profile-snapshot" aria-labelledby="profile-heading" className="profile-snapshot mt-20 scroll-mt-24">
          <Container className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <h2 id="profile-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.home.profileTitle[0]}
                <br />
                {t.home.profileTitle[1]}
              </h2>
              <p className="mt-5 max-w-md font-serif text-xl leading-relaxed text-muted">
                {profile.bio ? profile.bio.split('\n\n')[0] : profile.short_bio}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-azure-700">
                <Link href={href('/about')} className="link-arrow">
                  {t.home.meet(firstName)}
                </Link>
                <Link href={href('/certificates')} className="link-arrow">
                  {t.home.certificates}
                </Link>
                <Link href={href('/experience')} className="link-arrow">
                  {t.home.experience}
                </Link>
              </div>
            </div>
            <ProfileCard profile={profile} />
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="recent-heading" className="mt-20">
        <Container>
          <SectionHeader
            id="recent-heading"
            title={t.home.recentTitle}
            description={t.home.recentDescription}
            action={
              recent.total > recentArticles.length
                ? { href: href('/articles'), label: t.home.allArticles(recent.total) }
                : undefined
            }
          />
          {recentArticles.length > 0 ? (
            <div className="card-grid mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {recentArticles.map((article, index) => (
                <ArticleCard key={article.id} article={article} fallbackAuthor={authorName} index={index} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-muted">{t.home.noArticles}</p>
          )}
        </Container>
      </section>

      {topics.length > 0 ? (
        <section aria-labelledby="topics-heading" className="mt-24">
          <Container>
            <SectionHeader
              id="topics-heading"
              title={t.home.topicsTitle}
              description={t.home.topicsDescription}
              action={{ href: href('/topics'), label: t.home.browseTopics }}
            />
            <div className="mt-8">
              <TopicPlot topics={topics} totalArticles={metrics.articles_published} />
            </div>
          </Container>
        </section>
      ) : null}

      {projects.items.length > 0 ? (
        <section aria-labelledby="projects-heading" className="mt-24">
          <Container>
            <SectionHeader
              id="projects-heading"
              title={t.home.projectsTitle}
              description={t.home.projectsDescription}
              action={{ href: href('/projects'), label: t.home.allProjects }}
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="contact-heading" className="mt-24">
        <Container>
          <div className="contact-banner flex flex-col gap-6 rounded-xl px-6 py-10 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 id="contact-heading" className="text-2xl font-semibold">
                {t.home.contactTitle}
              </h2>
              <p className="mt-2 text-navy-200">{t.home.contactBody(authorName)}</p>
            </div>
            <Link href={href('/contact')} className="contact-cta" data-magnetic>
              {t.home.getInTouch}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
