<?php

namespace NetTrader\Service;

/**
 * Service dédié au formatage de données, parseur BBCode, pagination et échappement sécurisé.
 */
class FormattingService
{
    /**
     * Sécurise une chaîne de caractères pour l'affichage HTML contre les attaques XSS.
     */
    public static function escape(?string $string): string
    {
        if ($string === null) {
            return '';
        }
        return htmlspecialchars((string)$string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Parse les balises BBCode de façon sécurisée (avec échappement préalable du HTML).
     */
    public function parseBBCode(?string $text, string $skinRep = 'skin/default'): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        // 1. Décodage préventif des entités historiques pour normaliser les balises (ex: &quot; dans [url=&quot;...&quot;])
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // 2. Échapper strictement tout le HTML pour parer aux attaques XSS
        $text = self::escape($text);

        // 3. Traitement des styles BBCode de base
        $text = preg_replace('/\[b\]([\s\S]*?)\[\/b\]/i', '<b>$1</b>', $text);
        $text = preg_replace('/\[i\]([\s\S]*?)\[\/i\]/i', '<i>$1</i>', $text);
        $text = preg_replace('/\[u\]([\s\S]*?)\[\/u\]/i', '<u>$1</u>', $text);
        $text = preg_replace('/\[code\]([\s\S]*?)\[\/code\]/i', '<code>$1</code>', $text);

        // [list], [*], [/list]
        $text = str_ireplace('[list]', '<ul>', $text);
        $text = str_ireplace('[*]', '<li>', $text);
        $text = str_ireplace('[/list]', '</ul>', $text);

        // [color=...]
        $text = preg_replace_callback('/\[color=(?:&quot;|&#039;)?([#a-zA-Z0-9]+)(?:&quot;|&#039;)?\]([\s\S]*?)\[\/color\]/i', function ($m) {
            return '<span style="color:' . $m[1] . '">' . $m[2] . '</span>';
        }, $text);

        // [size=...]
        $text = preg_replace_callback('/\[size=(?:&quot;|&#039;)?([0-9]+)(?:&quot;|&#039;)?\]([\s\S]*?)\[\/size\]/i', function ($m) {
            return '<span style="font-size:' . (int)$m[1] . 'px">' . $m[2] . '</span>';
        }, $text);

        // [img]url[/img]
        $text = preg_replace_callback('/\[img\]\s*(https?:\/\/[^\s<>&"\'\[\]]+)\s*\[\/img\]/i', function ($m) {
            return '<img src="' . $m[1] . '" border="0" />';
        }, $text);

        // [url=...]...[/url]
        $text = preg_replace_callback('/\[url=(?:&quot;|&#039;)?([^\s\]"\'<>]+?)(?:&quot;|&#039;)?\]([\s\S]*?)\[\/url\]/i', function ($m) {
            $rawUrl = preg_replace('/(?:&quot;|&#039;|["\'&])+$/', '', $m[1]);
            $url = html_entity_decode($rawUrl, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            return self::formatSafeLink($url, $m[2]);
        }, $text);

        // [url]...[/url]
        $text = preg_replace_callback('/\[url\]\s*([^\s<"\'\[\]]+?)\s*\[\/url\]/i', function ($m) {
            $rawUrl = preg_replace('/(?:&quot;|&#039;|["\'&])+$/', '', $m[1]);
            $url = html_entity_decode($rawUrl, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            return self::formatSafeLink($url, htmlspecialchars($url, ENT_QUOTES, 'UTF-8'));
        }, $text);

        // [mail=...] et [mail]...[/mail]
        $text = preg_replace_callback('/\[mail=(?:&quot;|&#039;)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:&quot;|&#039;)?\]([\s\S]*?)\[\/mail\]/i', function ($m) {
            return '<a href="mailto:' . $m[1] . '">' . $m[2] . '</a>';
        }, $text);
        $text = preg_replace_callback('/\[mail\]([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\[\/mail\]/i', function ($m) {
            return '<a href="mailto:' . $m[1] . '">' . $m[1] . '</a>';
        }, $text);

        // [quote]...[/quote] récursif (gère l'imbrication)
        $quoteCount = 0;
        while (preg_match('/\[quote(?:=(?:&quot;|&#039;)?([^\]"\'<>]+)(?:&quot;|&#039;)?)?\]([\s\S]*?)\[\/quote\]/i', $text) && $quoteCount < 10) {
            $quoteCount++;
            $text = preg_replace('/\[quote(?:=(?:&quot;|&#039;)?([^\]"\'<>]+)(?:&quot;|&#039;)?)?\]([\s\S]*?)\[\/quote\]/i', '<table width="100%" class="citation"><tr><td>$2</td></tr></table>', $text);
        }

        // Émoticônes
        $smilies = [
            ":D" => "icon_biggrin.gif",
            ":)" => "icon_smile.gif",
            ":(" => "icon_sad.gif",
            ":o " => "icon_surprised.gif",
            ":shock:" => "icon_eek.gif",
            ":? " => "icon_confused.gif",
            "8)" => "icon_cool.gif",
            ":lol:" => "icon_lol.gif",
            ":x" => "icon_mad.gif",
            ":oops:" => "icon_redface.gif",
            ":cry:" => "icon_cry.gif",
            ":evil:" => "icon_evil.gif",
            ":roll:" => "icon_rolleyes.gif",
            ":wink:" => "icon_wink.gif",
            ":!:" => "icon_exclaim.gif",
            ":?:" => "icon_question.gif",
            ":idea:" => "icon_idea.gif",
            ":arrow:" => "icon_arrow.gif",
            ":neutral:" => "icon_neutral.gif",
            ":mrgreen:" => "icon_mrgreen.gif"
        ];
        foreach ($smilies as $code => $img) {
            $text = str_replace($code, "<img src=\"$skinRep/smiles/$img\" title=\"Smile\" border=\"0\">", $text);
        }

        return nl2br($text);
    }

    /**
     * Génère un lien HTML sécurisé contre les attaques XSS.
     */
    private static function formatSafeLink(string $url, string $label): string
    {
        $cleanUrl = trim($url);
        if (preg_match('#^(?:redir\.php\?url=|index\.php\?|\/)#i', $cleanUrl)) {
            return '<a href="' . self::escape($cleanUrl) . '" target="_blank" rel="noopener noreferrer">' . $label . '</a>';
        }
        if (preg_match('#^www\.#i', $cleanUrl)) {
            $cleanUrl = 'http://' . $cleanUrl;
        }
        if (preg_match('#^https?:\/\/#i', $cleanUrl)) {
            return '<a href="' . self::escape($cleanUrl) . '" target="_blank" rel="noopener noreferrer">' . $label . '</a>';
        }
        return self::escape($cleanUrl);
    }

    /**
     * Formate un nombre avec des zéros initiaux (remplace leading_zero).
     */
    public function formatZeroPadded($number, int $intPart, ?int $floatPart = null, ?string $decPoint = null, ?string $thousandsSep = null): string
    {
        $formatted = $number;
        if ($floatPart !== null) {
            $formatted = number_format((float)$formatted, $floatPart, $decPoint, $thousandsSep);
        }
        $len = strlen((string)floor(floatval($formatted)));
        if ($intPart > $len) {
            $formatted = str_repeat('0', $intPart - $len) . $formatted;
        }
        return (string)$formatted;
    }

    /**
     * Génère une boîte de message formatée HTML.
     */
    public function renderMessageBox(string $message, string $title): string
    {
        $titleEscaped = self::escape($title);
        return "<br><table align=\"center\" width=\"90%\" class=\"tab_message\">" .
               "<tr class=\"titre\"><td>{$titleEscaped}</td></tr>" .
               "<tr><td>{$message}</td></tr>" .
               "</table><br>";
    }

    /**
     * Génère l'affichage des médailles/récompenses.
     */
    public function formatRewards(int $gold, int $silver, int $bronze, string $skinRep = 'skin/default'): string
    {
        return str_repeat("<img src=\"{$skinRep}/premier.png\" border=\"0\" alt=\"Or\">", max($gold, 0)) .
               str_repeat("<img src=\"{$skinRep}/deus.png\" border=\"0\" alt=\"Argent\">", max($silver, 0)) .
               str_repeat("<img src=\"{$skinRep}/tres.png\" border=\"0\" alt=\"Bronze\">", max($bronze, 0));
    }
}
