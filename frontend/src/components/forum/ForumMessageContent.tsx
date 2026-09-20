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
 * Analyse et valide une URL (BBCode, HTML ou brute).
 * Résout les liens internes NetTrader vers les routes SPA de la nouvelle IHM REST.
 */
function resolveLink(rawUrl: string): ResolvedLink {
  let url = rawUrl.trim();
  // Suppression des guillemets d'encadrement résiduels
  url = url.replace(/^["']+|["']+$/g, '');
  url = url.replace(/&amp;/g, '&');

  // Prise en charge des redirections historiques redir.php?url=...
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
  if (/formrazjoueur/i.test(url)) {
    return { isInternal: true, to: '/profile', isSafe: true };
  }
  if (/contactauteur/i.test(url)) {
    return { isInternal: true, to: '/help', isSafe: true };
  }
  if (/quittegroupe/i.test(url)) {
    return { isInternal: true, to: '/profile', isSafe: true };
  }

  // 5. URL externe commençant par www.
  if (/^www\./i.test(url)) {
    url = 'https://' + url;
  }

  // 6. Protocole externe sécurisé
  if (/^(?:https?:\/\/|mailto:)/i.test(url)) {
    return {
      isInternal: false,
      href: url,
      isSafe: true,
    };
  }

  // 7. Route relative interne SPA
  if (url.startsWith('/')) {
    return {
      isInternal: true,
      to: url,
      isSafe: true,
    };
  }

  // Protocole non autorisé ou risqué (ex: javascript:)
  return {
    isInternal: false,
    isSafe: false,
  };
}

/**
 * Affiche un lien formaté (interne Router ou externe avec icône et rel noopener).
 */
function renderLink(rawUrl: string, label?: React.ReactNode, key?: string | number): React.ReactNode {
  const resolved = resolveLink(rawUrl);
  const displayLabel = label !== undefined && label !== null && label !== '' ? label : rawUrl;

  if (!resolved.isSafe) {
    return <span key={key}>{displayLabel}</span>;
  }

  if (resolved.isInternal && resolved.to) {
    return (
      <Link
        key={key}
        to={resolved.to}
        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium transition inline-flex items-center gap-1 hover:brightness-110"
      >
        <span>{displayLabel}</span>
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
        <span>{displayLabel}</span>
        <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0 opacity-70 group-hover/link:opacity-100 transition-opacity" />
      </a>
    );
  }

  return <span key={key}>{displayLabel}</span>;
}

/**
 * Découpe et transforme le texte contenant des balises de liens, de style et des URLs brutes.
 */
function parseInlineTokens(rawText: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = rawText;
  let counter = 0;

  // Regex globale pour identifier tous les tokens
  const tokenRegex =
    /(\[url=(?:&quot;|"|'|&#039;)?([^\s\]"'>]+?)(?:&quot;|"|'|&#039;)?\]([\s\S]*?)\[\/url\]|\[url\]\s*([^\s\]<]+?)\s*\[\/url\]|<a\s+[^>]*href=(?:&quot;|"|'|&#039;)?([^\s"'>]+?)(?:&quot;|"|'|&#039;)?[^>]*>([\s\S]*?)<\/a>|\[img\]\s*(https?:\/\/[^\s<>&"\'\[\]]+)\s*\[\/img\]|\[b\]([\s\S]*?)\[\/b\]|\[i\]([\s\S]*?)\[\/i\]|\[u\]([\s\S]*?)\[\/u\]|\[code\]([\s\S]*?)\[\/code\]|\[color=[^\]]+\]([\s\S]*?)\[\/color\]|<br\s*\/?>|((?:https?:\/\/|www\.)[^\s<>"'\])\r\n]+))/i;

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
      const url = match[2];
      const label = match[3];
      nodes.push(renderLink(url, parseInlineTokens(label, `${key}-lbl`), key));
    } else if (match[4] !== undefined) {
      // 2. [url]link[/url]
      const url = match[4];
      nodes.push(renderLink(url, url, key));
    } else if (match[5] !== undefined && match[6] !== undefined) {
      // 3. <a href="link">label</a>
      const url = match[5];
      const label = match[6];
      nodes.push(renderLink(url, parseInlineTokens(label, `${key}-lbl`), key));
    } else if (match[7] !== undefined) {
      // 4. [img]link[/img]
      const imgUrl = match[7].trim();
      if (/^https?:\/\//i.test(imgUrl)) {
        nodes.push(
          <img
            key={key}
            src={imgUrl}
            alt="Illustration forum"
            className="max-w-full max-h-96 rounded-xl border border-slate-800 my-2 block"
            loading="lazy"
          />
        );
      } else {
        nodes.push(matchedFull);
      }
    } else if (match[8] !== undefined) {
      // 5. [b]...[/b]
      nodes.push(<strong key={key} className="font-bold text-white">{parseInlineTokens(match[8], `${key}-b`)}</strong>);
    } else if (match[9] !== undefined) {
      // 6. [i]...[/i]
      nodes.push(<em key={key} className="italic text-slate-100">{parseInlineTokens(match[9], `${key}-i`)}</em>);
    } else if (match[10] !== undefined) {
      // 7. [u]...[/u]
      nodes.push(<span key={key} className="underline">{parseInlineTokens(match[10], `${key}-u`)}</span>);
    } else if (match[11] !== undefined) {
      // 8. [code]...[/code]
      nodes.push(
        <code key={key} className="bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs">
          {match[11]}
        </code>
      );
    } else if (match[12] !== undefined) {
      // 9. [color]...[/color]
      nodes.push(<span key={key}>{parseInlineTokens(match[12], `${key}-c`)}</span>);
    } else if (/^<br\s*\/?>$/i.test(matchedFull)) {
      // 10. <br />
      nodes.push(<br key={key} />);
    } else if (match[13] !== undefined) {
      // 11. URL brute
      let rawUrl = match[13];
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
 * Analyse et imbrique les citations [quote]...[/quote] ou <table class="citation">.
 */
function parseQuotes(text: string, depth = 0): React.ReactNode[] {
  const quoteOpenRegex = /\[quote(?:=(?:&quot;|"|'|&#039;)?([^\]"'\r\n]+)(?:&quot;|"|'|&#039;)?)?\]/i;
  const quoteCloseRegex = /\[\/quote\]/i;

  let remaining = text;
  const nodes: React.ReactNode[] = [];
  let keyIndex = 0;

  while (remaining) {
    const openMatch = remaining.match(quoteOpenRegex);
    if (!openMatch || openMatch.index === undefined) {
      nodes.push(...parseInlineTokens(remaining, `txt-${depth}-${keyIndex++}`));
      break;
    }

    if (openMatch.index > 0) {
      const before = remaining.slice(0, openMatch.index);
      nodes.push(...parseInlineTokens(before, `txt-${depth}-${keyIndex++}`));
    }

    const author = openMatch[1];
    const startIndex = openMatch.index + openMatch[0].length;
    let quoteDepth = 1;
    let currIndex = startIndex;
    let endIndex = -1;

    while (quoteDepth > 0 && currIndex < remaining.length) {
      const nextOpen = remaining.slice(currIndex).match(quoteOpenRegex);
      const nextClose = remaining.slice(currIndex).match(quoteCloseRegex);

      if (!nextClose || nextClose.index === undefined) {
        break;
      }

      if (nextOpen && nextOpen.index !== undefined && nextOpen.index < nextClose.index) {
        quoteDepth++;
        currIndex += nextOpen.index + nextOpen[0].length;
      } else {
        quoteDepth--;
        if (quoteDepth === 0) {
          endIndex = currIndex + nextClose.index;
          currIndex = endIndex + nextClose[0].length;
        } else {
          currIndex += nextClose.index + nextClose[0].length;
        }
      }
    }

    if (endIndex !== -1) {
      const quoteBody = remaining.slice(startIndex, endIndex);
      nodes.push(
        <blockquote
          key={`quote-${depth}-${keyIndex++}`}
          className="my-3 p-3.5 bg-slate-950/70 border-l-4 border-emerald-500/60 rounded-r-xl space-y-1.5 text-xs text-slate-300"
        >
          {author && (
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px] mb-1">
              <Quote className="w-3 h-3 opacity-80" />
              <span>{author} a écrit :</span>
            </div>
          )}
          <div className="space-y-1 whitespace-pre-wrap">
            {parseQuotes(quoteBody, depth + 1)}
          </div>
        </blockquote>
      );
      remaining = remaining.slice(currIndex);
    } else {
      nodes.push(...parseInlineTokens(remaining.slice(0, startIndex), `txt-${depth}-${keyIndex++}`));
      remaining = remaining.slice(startIndex);
    }
  }

  return nodes;
}

export const ForumMessageContent: React.FC<ForumMessageContentProps> = ({
  content,
  formattedContent,
}) => {
  // Préférer formattedContent si présent, sinon décoder le contenu brut
  const rawText = content || formattedContent || '';
  const decoded = decodeEntities(rawText);

  return (
    <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
      {parseQuotes(decoded)}
    </div>
  );
};
