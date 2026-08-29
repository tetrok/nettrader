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

        // 1. Échapper préalablement tout le HTML utilisateur
        $text = self::escape($text);

        $bbcode = [
            "[list]", "[*]", "[/list]",
            "[img]", "[/img]",
            "[b]", "[/b]",
            "[u]", "[/u]",
            "[i]", "[/i]",
            '[color="', "[/color]",
            "[size=", "[/size]",
            '[url="', "[/url]",
            "[mail=\"", "[/mail]",
            "[code]", "[/code]",
            "[quote]", "[/quote]",
            '"]',
            ']',":D",":)",":(",":o ",":shock:",":? ","8)",":lol:",":x",":oops:",":cry:",":evil:",":roll:",":wink:",":!:",":?:",":idea:",":arrow:",":neutral:",":mrgreen:"
        ];

        $htmlcode = [
            "<ul>", "<li>", "</ul>",
            "<img src=\"", "\">",
            "<b>", "</b>",
            "<u>", "</u>",
            "<i>", "</i>",
            "<span style=\"color:", "</span>",
            "<span style=\"font-size:", "</span>",
            '<a href="', "</a>",
            "<a href=\"mailto:", "</a>",
            "<code>", "</code>",
            "<table width=\"100%\" class=\"citation\"><tr><td>", "</td></tr></table>",
            '">','">',
            "<img src=\"$skinRep/smiles/icon_biggrin.gif\" title=\"Very Happy\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_smile.gif\" title=\"Smile\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_sad.gif\" title=\"Sad\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_surprised.gif\" title=\"Surprised\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_eek.gif\" title=\"Shocked\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_confused.gif\" title=\"Confused\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_cool.gif\" title=\"Cool\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_lol.gif\" title=\"Laughing\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_mad.gif\" title=\"Mad\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_redface.gif\" title=\"Embarassed\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_cry.gif\" title=\"Crying or Very sad\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_evil.gif\" title=\"Evil or Very Mad\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_rolleyes.gif\" title=\"Rolling Eyes\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_wink.gif\" title=\"Wink\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_exclaim.gif\" title=\"Exclamation\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_question.gif\" title=\"Question\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_idea.gif\" title=\"Idea\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_arrow.gif\" title=\"Arrow\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_neutral.gif\" title=\"Neutral\" border=\"0\">",
            "<img src=\"$skinRep/smiles/icon_mrgreen.gif\" title=\"Mr. Green\" border=\"0\">"
        ];

        $result = str_replace($bbcode, $htmlcode, $text);
        return nl2br($result);
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
