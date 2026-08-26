# Proposition de Solution : Flux Boursiers Externes (API et Fonctionnalités)

## 1. Contexte et Problématique
Le projet s'appuie historiquement sur d'anciens flux de données CSV (Yahoo Finance, Euronext) qui sont désormais obsolètes et inaccessibles. Les fonctions de parsing dédiées (`traiteeuronextcsv` et `traiteyahoocsv`) situées dans `www/nt2_function.php` sont donc cassées et ne parviennent plus à récupérer les cotations boursières. Les URL appelées (comme celles pointant vers `fr.old.finance.yahoo.com` ou `www.euronext.com`) ne fonctionnent plus.

## 2. Solutions d'API Modernes Proposées
Pour remplacer ces flux, nous devons intégrer des API financières modernes. Plusieurs options sont envisageables :

### Option A : Utilisation du service Python existant avec `yfinance` (Recommandée)
Puisque le projet possède déjà une architecture avec des scripts Python s'exécutant en arrière-plan (`pythonfetch`), nous pouvons utiliser la librairie Python **`yfinance`**.
- **Avantages :** Gratuit, robuste, permet d'extraire les données du scraper du code PHP vers le conteneur `python-fetcher` dédié.
- **Mise en œuvre :** Créer un script Python qui récupère la liste des tickers en base, interroge `yfinance`, et met à jour les cotations dans la base de données.

### Option B : Intégration d'API REST (depuis PHP ou Python)
- **Alpha Vantage** : Adapté pour récupérer des données de fin de journée, avec un quota gratuit.
- **IEX Cloud / Polygon.io** : Des API professionnelles très complètes, mais souvent payantes pour un usage intensif.
- **Yahoo Finance non-officiel via RapidAPI** : Une solution permettant d'obtenir des flux JSON formatés depuis Yahoo.

## 3. Règle Métier : Gestion des Échecs de Récupération
Lors de la conception du nouveau système, il faut impérativement respecter cette règle de logique du projet :
> **Ne jamais désactiver définitivement les symboles boursiers (tickers) lorsque la récupération des données échoue ou retourne des données manquantes.**

L'application doit :
- **Ne pas marquer** le ticker comme inactif ou l'exclure des prochaines recherches.
- **Journaliser explicitement** les succès et les échecs, ce qui permettra de réessayer de récupérer les données lors des prochaines exécutions.

## 4. Plan de Migration
1. Ajouter un script Python utilisant `yfinance` (ou une des API REST) dans le dossier `pythonfetch/` pour mettre à jour la table des valeurs (`cacval`).
2. S'assurer que le script ne désactive pas les actions en cas d'erreur de réseau ou d'API.
3. Supprimer de `www/nt2_function.php` les anciennes fonctions CSV (`traiteeuronextcsv`, `traiteyahoocsv`, etc.) une fois la nouvelle solution stable.
