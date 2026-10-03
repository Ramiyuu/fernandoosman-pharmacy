import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { Tagline } from '@/components/brand/brand';
import { LinkedInIcon } from '@/components/icons/brand-icons';
import { Container } from '@/components/layout/container';
import type { I18n } from '@/i18n/server';
import type { SiteProfile, TopicWithCount } from '@/types/content';
import { safeExternalUrl } from '@/utils/url';

import { EvidenceStage } from '../evidence/evidence-stage';
import { MoleculeFigure, NetworkFigure, SurvivalFigure } from '../evidence/figures';

interface EvidenceStoryProps {
  profile: SiteProfile;
  topics: TopicWithCount[];
  i18n: I18n;
}

/**
 * The opening of the home page: the hero, then three steps that follow a
 * drug from its structure to the evidence about it. On wide screens a WebGL
 * point cloud behind the text turns from the molecule into survival curves
 * and then into the archive's topics; elsewhere each step shows a drawing.
 */
export function EvidenceStory({ profile, topics, i18n }: EvidenceStoryProps) {
  const { t, href } = i18n;
  const story = t.story;
  const linkedin = safeExternalUrl(profile.linkedin_url);
  const shownTopics = topics.slice(0, 9);
  const figureTopics = shownTopics.map((topic) => ({ name: topic.name, count: topic.article_count }));

  return (
    <section data-evidence data-webgl="off" className="evidence" aria-labelledby="hero-heading">
      <EvidenceStage
        topics={figureTopics}
        stepNames={[story.steps.molecule.name, story.steps.trial.name, story.steps.evidence.name]}
      />

      <Container className="evidence-hero">
        <div className="hero-intro">
          <p className="hero-meta">
            <span className="hero-headline">{profile.headline || t.home.fallbackHeadline}</span>
            {profile.focus_areas.length > 0 ? (
              <Tagline items={profile.focus_areas} className="hero-focus" />
            ) : null}
          </p>
          <h1 id="hero-heading" className="hero-name">
            {profile.full_name}
          </h1>
          {profile.short_bio ? <p className="hero-bio">{profile.short_bio}</p> : null}
          <div className="hero-actions">
            <Link href={href('/articles')} className="hero-primary" data-magnetic>
              {t.home.readArticles}
              <span className="hero-primary-icon" aria-hidden="true">
                <ArrowUpRight size={17} />
              </span>
            </Link>
            <Link href={href('/cv')} className="hero-secondary">
              {t.home.viewCv}
            </Link>
            {linkedin ? (
              <a href={linkedin} target="_blank" rel="noopener noreferrer me" className="hero-link">
                <LinkedInIcon className="size-4" /> LinkedIn
              </a>
            ) : null}
          </div>
        </div>
        <div className="hero-figure">
          <MoleculeFigure id="hero-molecule" title={story.figureAlt.molecule} className="evidence-svg" />
        </div>
      </Container>

      <ol className="evidence-steps" aria-label={story.label}>
        <li data-evidence-step className="evidence-step evidence-step-molecule">
          <Container>
            <div className="evidence-copy">
              <figure className="step-figure">
                <MoleculeFigure id="step-molecule" title={story.figureAlt.molecule} className="evidence-svg" />
              </figure>
              <h2>{story.steps.molecule.title}</h2>
              <p className="evidence-body">{story.steps.molecule.body}</p>
              <p className="evidence-caption">{story.steps.molecule.caption}</p>
            </div>
          </Container>
        </li>
        <li data-evidence-step className="evidence-step">
          <Container>
            <div className="evidence-copy">
              <figure className="step-figure">
                <SurvivalFigure
                  labels={{ title: story.figureAlt.trial, ...story.legend }}
                  className="evidence-svg"
                />
              </figure>
              <h2>{story.steps.trial.title}</h2>
              <p className="evidence-body">{story.steps.trial.body}</p>
              <p className="evidence-caption">{story.steps.trial.caption}</p>
              <Link href={href('/articles')} className="evidence-link">
                {story.steps.trial.link}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </Container>
        </li>
        <li data-evidence-step className="evidence-step">
          <Container>
            <div className="evidence-copy">
              <figure className="step-figure">
                <NetworkFigure title={story.figureAlt.evidence} topics={figureTopics} className="evidence-svg" />
              </figure>
              <h2>{story.steps.evidence.title}</h2>
              <p className="evidence-body">{story.steps.evidence.body}</p>
              {shownTopics.length > 0 ? (
                <>
                  <p className="evidence-caption">{story.steps.evidence.caption}</p>
                  <ul className="evidence-topics">
                    {shownTopics.map((topic) => (
                      <li key={topic.slug}>
                        <Link href={href(`/topics/${topic.slug}`)}>{topic.name}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <Link href={href('/topics')} className="evidence-link">
                {story.steps.evidence.link}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </Container>
        </li>
      </ol>
    </section>
  );
}
