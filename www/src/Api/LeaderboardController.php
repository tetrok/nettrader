<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class LeaderboardController
{
    /**
     * Classement individuel des traders.
     */
    public function getPlayers(Request $request): void
    {
        $search = trim($request->getString('search', ''));
        $monthYear = trim($request->getString('period', '')); // format 'MM-YYYY' ou vide pour mois courant
        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 30)));
        $offset = ($page - 1) * $limit;

        if (!empty($monthYear) && strpos($monthYear, '-') !== false) {
            list($mon, $yr) = explode('-', $monthYear);
        } else {
            $mon = (int)date('m');
            $yr = (int)date('Y');
        }

        $dateFormatted = date('Y-m-d', mktime(1, 1, 1, (int)$mon, 1, (int)$yr));

        $res = listclassement($dateFormatted, $offset, $limit, $search);
        $groups = gettabjoueursenequipes();

        $items = [];
        $rawList = is_object($res) && isset($res->liste) && is_array($res->liste) ? $res->liste : [];
        $rank = $offset;

        foreach ($rawList as $row) {
            $rank++;
            $userId = (int)($row['idcompte'] ?? 0);
            $teamName = (is_array($groups) && isset($groups[$userId])) ? $groups[$userId][0] : null;
            $teamId = (is_array($groups) && isset($groups[$userId])) ? (int)$groups[$userId][1] : null;

            $items[] = [
                'rank' => $rank,
                'userId' => $userId,
                'pseudo' => (string)($row['pseudonyme'] ?? ''),
                'capital' => (float)($row['capital'] ?? 0.0),
                'performance' => (float)($row['prog'] ?? 0.0),
                'teamName' => $teamName,
                'teamId' => $teamId,
            ];
        }

        $totalCount = is_object($res) && isset($res->nb) ? (int)$res->nb : count($items);
        $availableMonths = listmoisclass();

        ApiResponse::success([
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $totalCount,
            'totalPages' => (int)ceil($totalCount / $limit),
            'availablePeriods' => is_array($availableMonths) ? $availableMonths : [],
            'currentPeriod' => sprintf('%02d-%d', $mon, $yr),
        ]);
    }

    /**
     * Classement des équipes / groupes.
     */
    public function getTeams(Request $request): void
    {
        $search = trim($request->getString('search', ''));
        $monthYear = trim($request->getString('period', ''));
        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 30)));
        $offset = ($page - 1) * $limit;

        if (!empty($monthYear) && strpos($monthYear, '-') !== false) {
            list($mon, $yr) = explode('-', $monthYear);
        } else {
            $mon = (int)date('m');
            $yr = (int)date('Y');
        }

        $dateFormatted = date('Y-m-d', mktime(1, 1, 1, (int)$mon, 1, (int)$yr));

        $res = listclassementequipe($dateFormatted, $offset, $limit, $search);

        $items = [];
        $rawList = is_object($res) && isset($res->liste) && is_array($res->liste) ? $res->liste : [];
        $rank = $offset;

        foreach ($rawList as $row) {
            $rank++;
            $items[] = [
                'rank' => $rank,
                'teamId' => (int)($row['idgroupe'] ?? 0),
                'name' => (string)($row['titregroupe'] ?? ''),
                'tag' => (string)($row['initialgroupe'] ?? ''),
                'performance' => (float)($row['prog'] ?? 0.0),
                'membersCount' => (int)($row['nbjoueurs'] ?? 0),
                'medals' => [
                    'gold' => (int)($row['medor'] ?? 0),
                    'silver' => (int)($row['medargent'] ?? 0),
                    'bronze' => (int)($row['medbronze'] ?? 0),
                ],
            ];
        }

        $totalCount = is_object($res) && isset($res->nb) ? (int)$res->nb : count($items);

        ApiResponse::success([
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $totalCount,
            'totalPages' => (int)ceil($totalCount / $limit),
        ]);
    }
}
