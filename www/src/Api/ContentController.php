<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class ContentController
{
    /**
     * Récupère le règlement du jeu.
     */
    public function getRules(Request $request): void
    {
        $rulesHtml = txt_regl();
        ApiResponse::success([
            'content' => $rulesHtml,
        ]);
    }

    /**
     * Récupère l'aide du jeu.
     */
    public function getHelp(Request $request): void
    {
        $id = $request->getInt('id', 0);
        $helpHtml = txt_help($id);
        ApiResponse::success([
            'content' => $helpHtml,
        ]);
    }

    /**
     * Récupère la FAQ.
     */
    public function getFaq(Request $request): void
    {
        $id = $request->getInt('id', 0);
        $faqHtml = txt_faq($id);
        ApiResponse::success([
            'content' => $faqHtml,
        ]);
    }

    /**
     * Formulaire de contact.
     */
    public function contact(Request $request): void
    {
        $payload = $request->getJson();
        $email = trim((string)($payload['email'] ?? ''));
        $subject = trim((string)($payload['subject'] ?? ''));
        $message = trim((string)($payload['message'] ?? ''));

        if (empty($email) || empty($message)) {
            ApiResponse::error("Veuillez renseigner votre email et votre message.", 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            ApiResponse::error("Format d'adresse e-mail invalide.", 400);
        }

        if (strlen($subject) > 150) {
            ApiResponse::error("L'objet du message ne doit pas dépasser 150 caractères.", 400);
        }

        if (strlen($message) > 5000) {
            ApiResponse::error("Le message ne doit pas dépasser 5000 caractères.", 400);
        }

        // Envoyer un email à l'administrateur
        $adminMail = defined('MAILADMIN') ? MAILADMIN : 'contact@nettrader.fr';
        envoimail($adminMail, "[Contact NetTrader] $subject ($email)", "De: $email\n\nMessage:\n$message");

        ApiResponse::success(null, "Votre message a été envoyé avec succès à l'équipe NetTrader.");
    }
}
