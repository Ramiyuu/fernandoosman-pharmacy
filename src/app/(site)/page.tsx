import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { SectionHeader } from '@/components/layout/section-header';
import { JsonLd } from '@/components/seo/json-ld';
import { ArticleCard } from '@/features/articles/components/article-card';
import { FeaturedArticle } from '@/features/articles/components/featured-article';
import { Hero } from '@/features/home/components/hero';
import { MetricsTable } from '@/features/home/components/metrics-table';
import { ProjectCard } from '@/features/projects/components/project-card';
import { TopicPlot } from '@/features/topics/components/topic-plot';
import { buildMetadata } from '@/lib/seo/metadata';
import { personJsonLd, websiteJsonLd } from '@/lib/seo/structured-data';
import {
  getFeaturedArticle,
  getPublicMetrics,
  getPublishedArticles,
  getPublishedProjects,
  getSiteProfile,
  getSiteSettings,
  getTopicsWithCounts,
} from '@/services/public-content.service';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return buildMetadata({
    title: `${settings.site.name} | Pharmacy, Clinical Research & Data`,
    absoluteTitle: true,
    description: settings.site.description,
    path: '/',
    type: 'profile',
  });
}

export default async function HomePage() {
  const [profile, settings, metrics, featured, recent, topics, projects] = await Promise.all([
    getSiteProfile(),
    getSiteSettings(),
    getPublicMetrics(),
    getFeaturedArticle(),
    getPublishedArticles({}, 1, 7),
    getTopicsWithCounts(),
    getPublishedProjects(1, 3),
  ]);

  const authorName = profile?.full_name ?? settings.site.name;
  const recentArticles = recent.items.filter((article) => article.id !== featured?.id).slice(0, 6);

  return (
    <>
      <JsonLd data={websiteJsonLd(settings.site.name, settings.site.description)} />
      {profile ? <JsonLd data={personJsonLd(profile)} /> : null}

      {profile ? (
        <Hero profile={profile} />
      ) : (
        <Container className="py-20">
          <h1 className="text-5xl font-semibold text-ink">{settings.site.name}</h1>
          <p className="mt-4 text-lg text-muted">{settings.site.description}</p>
        </Container>
      )}

      <Container className="mt-14">
        <MetricsTable metrics={metrics} />
      </Container>

      {featured ? (
        <section aria-labelledby="featured-heading" className="mt-20">
          <Container>
            <h2 id="featured-heading" className="sr-only">
              Featured article
            </h2>
            <FeaturedArticle article={featured} fallbackAuthor={authorName} />
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="recent-heading" className="mt-20">
        <Container>
          <SectionHeader
            id="recent-heading"
            title="Recent articles"
            description="Explainers, paper reviews and notes on clinical evidence."
            action={recent.total > recentArticles.length ? { href: '/articles', label: `All ${recent.total} articles` } : undefined}
          />
          {recentArticles.length > 0 ? (
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {recentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} fallbackAuthor={authorName} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-muted">The first articles are being written. Check back soon.</p>
          )}
        </Container>
      </section>

      {topics.length > 0 ? (
        <section aria-labelledby="topics-heading" className="mt-24">
          <Container>
            <SectionHeader
              id="topics-heading"
              title="Topics"
              description="The areas this archive covers, from trial design to the statistics behind the results."
              action={{ href: '/topics', label: 'Browse topics' }}
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
              title="Data projects"
              description="Hands-on work with health data: dashboards, analyses and reproducible notes."
              action={{ href: '/projects', label: 'All projects' }}
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
          <div className="flex flex-col gap-6 rounded-xl bg-navy-900 px-6 py-10 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 id="contact-heading" className="text-2xl font-semibold">
                Internships, research or a question about a study?
              </h2>
              <p className="mt-2 text-navy-200">Messages go straight to {authorName}.</p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-md bg-white px-5 font-medium text-navy-900 transition-colors hover:bg-teal-50"
            >
              Get in touch
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
