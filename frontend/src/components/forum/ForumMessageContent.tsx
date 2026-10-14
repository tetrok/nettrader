/**
 * NetTrader 2 — Rendu Sécurisé du Contenu des Messages de Forum (ForumMessageContent)
 *
 * Usage:
 *   Transforme le texte brut contenant des balises Markdown (GFM) ou BBCode historiques en éléments React stylisés et sécurisés.
 *
 * Logique & Fonctionnement:
 *   - Support hybride Markdown (titres #/##/###, gras **, italique *, barré ~~, code `, citations >, listes -, liens [texte](url)).
 *   - Rétrocompatibilité 100% avec l'ancien BBCode ([b], [i], [u], [quote], [code], [url], [color], [img]).
 *   - Assainissement strict des liens pour neutraliser les attaques XSS (interdiction javascript:, safe rel, routage SPA).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Quote } from 'lucide-react';

interface ForumMessageContentProps {
  content: string;
  formattedContent?: string;
}

/**
 * Décode les entités HTML standard et numériques courantes dans les messages historiques.
 */
function decodeEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&auml;/g, 'ä')
    .replace(/&icirc;/g, 'î')
    .replace(/&iuml;/g, 'ï')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ouml;/g, 'ö')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

interface ResolvedLink {
  isInternal: boolean;
  to?: string;
  href?: string;
  isSafe: boolean;
}

/**
 * Analyse et valide une URL (Markdown, BBCode, HTML ou brute).
 * Résout les liens internes NetTrader vers les routes SPA de la nouvelle IHM REST.
 */
function resolveLink(rawUrl: string): ResolvedLink {
  let url = rawUrl.trim();
  url = url.replace(/^["']+|["']+$/g, '');
  url = url.replace(/&amp;/g, '&');

  // Redirections historiques redir.php?url=...
  const redirMatch = url.match(/(?:^|[/?&])redir\.php\?.*?(?:&|\?)?url=([^&]+)/i);
  if (redirMatch) {
    try {
      url = decodeURIComponent(redirMatch[1]);
    } catch {
      url = redirMatch[1];
    }
  }

  // 1. Liens vers un sujet du forum : idsujet=... ou /forums/topic/...
  const topicMatch =
    url.match(/(?:showlstposts|topic).*?[?&]idsujet=(\d+)/i) ||
    url.match(/\/forums\/topic\/(\d+)/i);
  if (topicMatch) {
    return {
      isInternal: true,
      to: `/forums/topic/${topicMatch[1]}`,
      isSafe: true,
    };
  }

  // 2. Liens vers une catégorie du forum : idforum=...
  const forumMatch = url.match(/(?:showlstsujets|forum).*?[?&]idforum=(\d+)/i);
  if (forumMatch) {
    return {
      isInternal: true,
      to: `/forums?id=${forumMatch[1]}`,
      isSafe: true,
    };
  }

  // 3. Lien vers la liste des forums
  if (/showlstforums/i.test(url) || url === '/forums' || url === 'http://www.nettrader.fr/index.php?do=showlstforums') {
    return {
      isInternal: true,
      to: '/forums',
      isSafe: true,
    };
  }

  // 4. Liens vers d'autres pages internes
  if (/(?:portefeuille|trading)/i.test(url)) {
    return { isInternal: true, to: '/portfolio', isSafe: true };
  }
  if (/(?:classement|leaderboard)/i.test(url)) {
    return { isInternal: true, to: '/leaderboards', isSafe: true };
  }
  if (/(?:marche|market)/i.test(url)) {
    return { isInternal: true, to: '/market', isSafe: true };
  }

  // 5. Liens HTTP/HTTPS externes
  if (/^(?:https?:\/\/|ftps?:\/\/)/i.test(url)) {
    return {
      isInternal: false,
      href: url,
      isSafe: true,
    };
  }

  // 6. Liens sans protocole débutant par www.
  if (/^www\./i.test(url)) {
    return {
      isInternal: false,
      href: `https://${url}`,
      isSafe: true,
    };
  }

  // 7. Neutralisation stricte des protocoles dangereux
  return {
    isInternal: false,
    isSafe: false,
  };
}

/**
 * Rendu sécurisé d'un lien (interne via React Router ou externe avec icône).
 */
function renderLink(rawUrl: string, children: React.ReactNode, key: string): React.ReactNode {
  const resolved = resolveLink(rawUrl);

  if (!resolved.isSafe) {
    return <span key={key} className="text-slate-400 font-mono text-xs">{children}</span>;
  }

  if (resolved.isInternal && resolved.to) {
    return (
      <Link
        key={key}
        to={resolved.to}
        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all transition font-semibold"
      >
        {children}
      </Link>
    );
  }

  if (resolved.href) {
    return (
      <a
        key={key}
        href={resolved.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all transition font-medium inline-flex items-center gap-1 group/link"
      >
        <span>{children}</span>
        <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0 opacity-70 group-hover/link:opacity-100 transition-opacity" />
      </a>
    );
  }

  return <span key={key}>{children}</span>;
}

/**
 * Analyse les éléments inline : Markdown (gras, italique, barré, code, liens, images) et BBCode.
 */
function parseInlineTokens(rawText: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = rawText;
  let counter = 0;

  // Regex combinant Markdown et BBCode :
  // 1: BBCode [url=link]label[/url]
  // 4: BBCode [url]link[/url]
  // 5: Markdown [label](link)
  // 7: Markdown ![alt](imglink)
  // 9: HTML <a href=...>...</a>
  // 11: BBCode [img]...[/img]
  // 12: Markdown bold **...**
  // 13: BBCode [b]...[/b]
  // 14: Markdown strikethrough ~~...~~
  // 15: Markdown italic *...*
  // 16: BBCode [i]...[/i]
  // 17: BBCode [u]...[/u]
  // 18: Markdown inline code `...`
  // 19: BBCode [code]...[/code]
  // 20: BBCode [color=...]...[/color]
  // 22: URL brute auto-link
  const tokenRegex =
    /(\[url=(?:&quot;|"|'|&#039;)?([^\s\]"'>]+?)(?:&quot;|"|'|&#039;)?\]([\s\S]*?)\[\/url\]|\[url\]\s*([^\s\]<]+?)\s*\[\/url\]|\[([^\]]+)\]\((https?:\/\/[^\s\)]+|www\.[^\s\)]+|\/[^\s\)]+)\)|!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)|<a\s+[^>]*href=(?:&quot;|"|'|&#039;)?([^\s"'>]+?)(?:&quot;|"|'|&#039;)?[^>]*>([\s\S]*?)<\/a>|\[img\]\s*(https?:\/\/[^\s<>&"\'\[\]]+)\s*\[\/img\]|\*\*([^\*\n]+?)\*\*|\[b\]([\s\S]*?)\[\/b\]|~~([^~\n]+?)~~|\*([^\*\n]+?)\*|\[i\]([\s\S]*?)\[\/i\]|\[u\]([\s\S]*?)\[\/u\]|`([^`\n]+?)`|\[code\]([\s\S]*?)\[\/code\]|\[color=[^\]]+\]([\s\S]*?)\[\/color\]|<br\s*\/?>|((?:https?:\/\/|www\.)[^\s<>"'\])\r\n]+))/i;

  while (remaining) {
    const match = remaining.match(tokenRegex);
    if (!match || match.index === undefined) {
      nodes.push(remaining);
      break;
    }

    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }

    const matchedFull = match[0];
    const key = `${keyPrefix}-${counter++}`;

    if (match[2] !== undefined && match[3] !== undefined) {
      // 1. [url=link]label[/url]
      nodes.push(renderLink(match[2], parseInlineTokens(match[3], `${key}-lbl`), key));
    } else if (match[4] !== undefined) {
      // 2. [url]link[/url]
      nodes.push(renderLink(match[4], match[4], key));
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // 3. Markdown [label](link)
      nodes.push(renderLink(match[6], parseInlineTokens(match[5], `${key}-mdlbl`), key));
    } else if (match[7] !== undefined && match[8] !== undefined) {
      // 4. Markdown ![alt](imglink)
      const imgUrl = match[8].trim();
      nodes.push(
        <img
          key={key}
          src={imgUrl}
          alt={match[7] || 'Image'}
          className="max-w-full max-h-96 rounded-xl border border-slate-800 my-2 block"
          loading="lazy"
        />
      );
    } else if (match[9] !== undefined && match[10] !== undefined) {
      // 5. <a href="...">...</a>
      nodes.push(renderLink(match[9], parseInlineTokens(match[10], `${key}-hlbl`), key));
    } else if (match[11] !== undefined) {
      // 6. [img]...[/img]
      const imgUrl = match[11].trim();
      nodes.push(
        <img
          key={key}
          src={imgUrl}
          alt="Illustration forum"
          className="max-w-full max-h-96 rounded-xl border border-slate-800 my-2 block"
          loading="lazy"
        />
      );
    } else if (match[12] !== undefined) {
      // 7. Markdown **gras**
      nodes.push(<strong key={key} className="font-bold text-white">{parseInlineTokens(match[12], `${key}-mdb`)}</strong>);
    } else if (match[13] !== undefined) {
      // 8. BBCode [b]gras[/b]
      nodes.push(<strong key={key} className="font-bold text-white">{parseInlineTokens(match[13], `${key}-bbb`)}</strong>);
    } else if (match[14] !== undefined) {
      // 9. Markdown ~~barré~~
      nodes.push(<span key={key} className="line-through opacity-75">{parseInlineTokens(match[14], `${key}-s`)}</span>);
    } else if (match[15] !== undefined) {
      // 10. Markdown *italique*
      nodes.push(<em key={key} className="italic text-slate-100">{parseInlineTokens(match[15], `${key}-mdi`)}</em>);
    } else if (match[16] !== undefined) {
      // 11. BBCode [i]italique[/i]
      nodes.push(<em key={key} className="italic text-slate-100">{parseInlineTokens(match[16], `${key}-bbi`)}</em>);
    } else if (match[17] !== undefined) {
      // 12. BBCode [u]souligné[/u]
      nodes.push(<span key={key} className="underline">{parseInlineTokens(match[17], `${key}-u`)}</span>);
    } else if (match[18] !== undefined) {
      // 13. Markdown `code`
      nodes.push(
        <code key={key} className="bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800/80">
          {match[18]}
        </code>
      );
    } else if (match[19] !== undefined) {
      // 14. BBCode [code]...[/code]
      nodes.push(
        <code key={key} className="bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800/80">
          {match[19]}
        </code>
      );
    } else if (match[20] !== undefined) {
      // 15. BBCode [color]...[/color]
      nodes.push(<span key={key}>{parseInlineTokens(match[20], `${key}-c`)}</span>);
    } else if (/^<br\s*\/?>$/i.test(matchedFull)) {
      // 16. <br />
      nodes.push(<br key={key} />);
    } else if (match[21] !== undefined) {
      // 17. URL brute
      let rawUrl = match[21];
      let trailing = '';
      while (/[.,;:!?]$/.test(rawUrl)) {
        trailing = rawUrl.slice(-1) + trailing;
        rawUrl = rawUrl.slice(0, -1);
      }
      nodes.push(
        <React.Fragment key={key}>
          {renderLink(rawUrl, rawUrl, `${key}-raw`)}
          {trailing}
        </React.Fragment>
      );
    } else {
      nodes.push(matchedFull);
    }

    remaining = remaining.slice(match.index + matchedFull.length);
  }

  return nodes;
}

/**
 * Analyse les blocs : Titres Markdown (#/##/###), Blocs de code (```...```), Citations (> et [quote]), Listes (-).
 */
function parseBlocks(text: string, depth = 0): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let keyIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Blocs de code Markdown multi-lignes ```lang ... ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Sauter la ligne de fin ```
      nodes.push(
        <pre
          key={`code-block-${depth}-${keyIndex++}`}
          className="my-3 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 2. Citations Markdown (> ...)
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].startsWith('#')))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      nodes.push(
        <blockquote
          key={`md-quote-${depth}-${keyIndex++}`}
          className="my-3 p-3.5 bg-slate-950/70 border-l-4 border-emerald-500/60 rounded-r-xl space-y-1 text-xs text-slate-300"
        >
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px] mb-1">
            <Quote className="w-3 h-3 opacity-80" />
            <span>Citation :</span>
          </div>
          <div className="whitespace-pre-wrap">{parseBlocks(quoteLines.join('\n'), depth + 1)}</div>
        </blockquote>
      );
      continue;
    }

    // 3. Citations BBCode [quote=Author]...[/quote]
    if (/\[quote(?:=[^\]]+)?\]/i.test(line)) {
      const quoteOpenMatch = line.match(/\[quote(?:=(?:&quot;|"|'|&#039;)?([^\]"'\r\n]+)(?:&quot;|"|'|&#039;)?)?\]/i);
      const author = quoteOpenMatch ? quoteOpenMatch[1] : undefined;
      const quoteLines: string[] = [];
      let inQuote = true;

      // Retirer la balise ouvrante de la ligne courante
      const restOfFirstLine = line.replace(/\[quote(?:=[^\]]+)?\]/i, '');
      if (restOfFirstLine.includes('[/quote]')) {
        const parts = restOfFirstLine.split(/\[\/quote\]/i);
        quoteLines.push(parts[0]);
        inQuote = false;
      } else {
        quoteLines.push(restOfFirstLine);
      }
      i++;

      while (i < lines.length && inQuote) {
        if (lines[i].includes('[/quote]')) {
          const parts = lines[i].split(/\[\/quote\]/i);
          quoteLines.push(parts[0]);
          inQuote = false;
          i++;
          break;
        } else {
          quoteLines.push(lines[i]);
          i++;
        }
      }

      nodes.push(
        <blockquote
          key={`bb-quote-${depth}-${keyIndex++}`}
          className="my-3 p-3.5 bg-slate-950/70 border-l-4 border-emerald-500/60 rounded-r-xl space-y-1.5 text-xs text-slate-300"
        >
          {author && (
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px] mb-1">
              <Quote className="w-3 h-3 opacity-80" />
              <span>{author} a écrit :</span>
            </div>
          )}
          <div className="space-y-1 whitespace-pre-wrap">
            {parseBlocks(quoteLines.join('\n'), depth + 1)}
          </div>
        </blockquote>
      );
      continue;
    }

    // 4. Titres Markdown
    if (/^###\s+(.*)/.test(line)) {
      const match = line.match(/^###\s+(.*)/);
      nodes.push(
        <h4 key={`h3-${depth}-${keyIndex++}`} className="text-sm font-bold text-white mt-3 mb-1">
          {parseInlineTokens(match![1], `h3-${keyIndex}`)}
        </h4>
      );
      i++;
      continue;
    }

    if (/^##\s+(.*)/.test(line)) {
      const match = line.match(/^##\s+(.*)/);
      nodes.push(
        <h3 key={`h2-${depth}-${keyIndex++}`} className="text-base font-bold text-emerald-400 mt-4 mb-1">
          {parseInlineTokens(match![1], `h2-${keyIndex}`)}
        </h3>
      );
      i++;
      continue;
    }

    if (/^#\s+(.*)/.test(line)) {
      const match = line.match(/^#\s+(.*)/);
      nodes.push(
        <h2 key={`h1-${depth}-${keyIndex++}`} className="text-lg font-extrabold text-white mt-4 mb-2 border-b border-slate-800 pb-1">
          {parseInlineTokens(match![1], `h1-${keyIndex}`)}
        </h2>
      );
      i++;
      continue;
    }

    // 5. Listes Markdown (- item ou * item)
    if (/^[-*]\s+(.*)/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+(.*)/.test(lines[i])) {
        const m = lines[i].match(/^[-*]\s+(.*)/);
        if (m) listItems.push(m[1]);
        i++;
      }
      nodes.push(
        <ul key={`ul-${depth}-${keyIndex++}`} className="list-disc list-inside space-y-1 my-2 text-slate-300">
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInlineTokens(item, `li-${keyIndex}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ligne standard
    nodes.push(
      <React.Fragment key={`line-${depth}-${keyIndex++}`}>
        {parseInlineTokens(line, `l-${depth}-${keyIndex}`)}
        {i < lines.length - 1 && '\n'}
      </React.Fragment>
    );
    i++;
  }

  return nodes;
}

export const ForumMessageContent: React.FC<ForumMessageContentProps> = ({
  content,
  formattedContent,
}) => {
  const rawText = content || formattedContent || '';
  const decoded = decodeEntities(rawText);

  return (
    <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words space-y-0.5">
      {parseBlocks(decoded)}
    </div>
  );
};
