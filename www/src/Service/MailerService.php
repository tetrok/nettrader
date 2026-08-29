<?php

namespace NetTrader\Service;

use NetTrader\Database\Database;
use PDO;

/**
 * Service de gestion et d'envoi d'e-mails transactionnels (file d'attente mail_tosend et envoi direct).
 */
class MailerService
{
    /**
     * Insère un e-mail dans la file d'attente asynchrone (mail_tosend) consommée par python-mailer.
     */
    public function queueMail(
        string $toEmail,
        string $toPseudo,
        string $subject,
        string $body,
        ?string $fromEmail = null,
        ?string $fromPseudo = null,
        ?int $sendDate = null,
        ?PDO $conn = null
    ): bool {
        $fromEmail  = $fromEmail  ?? (defined('EMAILADMIN') ? EMAILADMIN : 'admin@localhost');
        $fromPseudo = $fromPseudo ?? 'Admin';
        $sendDate   = $sendDate   ?? time();

        $query = "INSERT INTO mail_tosend (dateenvoi, from_mail, from_pseudo, to_mail, to_pseudo, titre, corps, etat) " .
                 "VALUES (?, ?, ?, ?, ?, ?, ?, 'attente')";
        $params = [$sendDate, $fromEmail, $fromPseudo, $toEmail, $toPseudo, $subject, $body];

        $stmt = Database::execute($query, $params, $conn);
        return $stmt !== false;
    }

    /**
     * Envoie un e-mail direct via mail() avec en-têtes standardisés.
     */
    public function sendRawMail(string $toEmail, string $subject, string $body, ?string $fromEmail = null): bool
    {
        $fromEmail  = $fromEmail ?? (defined('EMAILADMIN') ? EMAILADMIN : 'admin@localhost');
        $dateHeader = date("D, j M Y H:i:s O");
        
        $headers  = "From: {$fromEmail}\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "Date: {$dateHeader}\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        $fullSubject = "NetTrader : " . $subject;
        $unsubscribeUrl = (defined('ADDRNT') ? ADDRNT : '') . "/index.php?do=formrazjoueur";
        $fullBody = $body . "\r\n\r\n\r\n\r\nPour ne plus recevoir d'e-mail provenant du site NetTrader, veuillez vous désinscrire via le lien R.A.Z. joueur ({$unsubscribeUrl}) ou contacter l'administrateur.";

        if (isset($_SERVER['REMOTE_ADDR']) && $_SERVER['REMOTE_ADDR'] !== "127.0.0.1") {
            return @mail($toEmail, $fullSubject, stripslashes($fullBody), $headers);
        }

        return true;
    }
}
