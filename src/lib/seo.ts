/**
 * Metadados de página para as rotas públicas.
 *
 * O app é uma SPA: o HTML servido é sempre o mesmo. O Googlebot executa
 * JavaScript, então ajustar título, descrição, canônica e JSON-LD em tempo de
 * execução é suficiente para indexar as páginas de resultado — e é o que
 * também alimenta os previews de WhatsApp e Twitter.
 */

const JSONLD_ID = 'seo-jsonld';

/**
 * Domínio oficial do site. O mesmo build também responde pelo endereço
 * `*.up.railway.app`, e sem isso cada página teria duas URLs indexáveis com o
 * mesmo conteúdo. Define `VITE_SITE_URL` em produção para fixar a canônica.
 */
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') || '';

function siteOrigin(): string {
  return SITE_URL || window.location.origin;
}

function upsertMeta(seletor: string, attrs: Record<string, string>): void {
  let tag = document.head.querySelector<HTMLMetaElement>(seletor);

  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }

  for (const [chave, valor] of Object.entries(attrs)) {
    tag.setAttribute(chave, valor);
  }
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }

  link.setAttribute('href', href);
}

export interface PageSeo {
  title: string;
  description: string;
  /** Caminho relativo, como `/resultado/mega-sena/3058`. */
  path?: string;
  /** Dados estruturados schema.org. */
  jsonLd?: Record<string, unknown>;
}

export function applyPageSeo({ title, description, path, jsonLd }: PageSeo): void {
  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description,
  });

  if (path) {
    const url = `${siteOrigin()}${path}`;
    upsertCanonical(url);
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
  }

  const anterior = document.getElementById(JSONLD_ID);
  if (anterior) anterior.remove();

  if (jsonLd) {
    const script = document.createElement('script');
    script.id = JSONLD_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }
}
