import type { Locale } from './config';

/**
 * Error-page copy, kept apart from the dictionaries so the client error
 * boundary does not ship the whole interface text. The dictionaries reuse it.
 */
export const ERROR_COPY: Record<
  Locale,
  {
    notFoundTitle: string;
    notFoundBody: string;
    browseArticles: string;
    searchSite: string;
    home: string;
    errorTitle: string;
    errorBody: string;
    reference: string;
    tryAgain: string;
  }
> = {
  en: {
    notFoundTitle: 'This page does not exist',
    notFoundBody: 'The link may be outdated, or the article may have been moved or unpublished.',
    browseArticles: 'Browse articles',
    searchSite: 'Search the site',
    home: 'Go to the home page',
    errorTitle: 'This page could not be loaded',
    errorBody: 'The content service did not respond as expected. Try again in a moment.',
    reference: 'Reference:',
    tryAgain: 'Try again',
  },
  pt: {
    notFoundTitle: 'Esta página não existe',
    notFoundBody: 'O link pode estar desatualizado, ou o artigo pode ter sido movido ou despublicado.',
    browseArticles: 'Ver artigos',
    searchSite: 'Buscar no site',
    home: 'Ir para a página inicial',
    errorTitle: 'Não foi possível carregar esta página',
    errorBody: 'O serviço de conteúdo não respondeu como esperado. Tente de novo em instantes.',
    reference: 'Referência:',
    tryAgain: 'Tentar de novo',
  },
};
