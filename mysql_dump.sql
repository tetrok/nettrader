-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : db
-- Généré le : dim. 23 août 2026 à 07:02
-- Version du serveur : 10.5.29-MariaDB-ubu2004
-- Version de PHP : 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `nettrader`
--

-- --------------------------------------------------------

--
-- Structure de la table `cacval`
--

CREATE TABLE `cacval` (
  `codesico` mediumint(8) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Identifiant SICOVAM historique ou dérivé de l''ISIN (Clé primaire)',
  `yahooname` varchar(25) NOT NULL COMMENT 'Symbole/Ticker utilisé pour les requêtes yfinance (ex: TTE.PA)',
  `nom` varchar(35) NOT NULL COMMENT 'Nom usuel ou raison sociale de la valeur',
  `valeur` double NOT NULL DEFAULT 0 COMMENT 'Dernier cours de bourse enregistré',
  `lasttime` decimal(10,0) NOT NULL DEFAULT 0 COMMENT 'Timestamp UNIX de la dernière cotation/mise à jour du cours',
  `lasttimedown` decimal(10,0) NOT NULL DEFAULT 0 COMMENT 'Timestamp UNIX de la dernière tentative ou réussite de téléchargement',
  `last_attempt` decimal(10,0) NOT NULL DEFAULT 0 COMMENT 'Timestamp UNIX de la dernière tentative de fetch',
  `last_status` enum('success','failed','pending') NOT NULL DEFAULT 'pending' COMMENT 'Statut du dernier fetch',
  `fail_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Nombre d echecs consecutifs',
  `total_fails` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Nombre total d echecs',
  `retry_count` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Nombre de retries lors du dernier cycle',
  `last_error` varchar(255) DEFAULT NULL COMMENT 'Dernier message d erreur rencontree',
  `authachat` enum('1','0') NOT NULL DEFAULT '1' COMMENT 'Flag d''autorisation d''achat (1=achetable par l''algo, 0=bloqué)',
  `down` enum('1','0') NOT NULL DEFAULT '1' COMMENT 'Activer le fetch du cours dans le script (1=télécharger, 0=ignorer)',
  `idsecteur` smallint(5) UNSIGNED NOT NULL DEFAULT 22 COMMENT 'Identifiant du secteur d''activité (clé étrangère vers table secteurs)',
  `idmarket` smallint(5) UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Identifiant de la place boursière (clé étrangère vers table marchés, ex: Euronext Paris)',
  `is_archived` enum('1','0') NOT NULL DEFAULT '0' COMMENT 'Drapeau d''archivage (1=archivé, 0=actif)'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `market_sync_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sync_time` decimal(10,0) NOT NULL,
  `total_stocks` int(11) NOT NULL,
  `success_count` int(11) NOT NULL,
  `error_count` int(11) NOT NULL,
  `duration_seconds` float NOT NULL,
  `details` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sync_time` (`sync_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `stock_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `codesico` mediumint(8) unsigned NOT NULL,
  `temps` int(10) unsigned NOT NULL,
  `valeur` double NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_history_code_time` (`codesico`, `temps`),
  KEY `idx_stock_history_time` (`temps`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


--
-- Déchargement des données de la table `cacval`
--



-- --------------------------------------------------------

--
-- Structure de la table `cacvalmaj`
--

CREATE TABLE `cacvalmaj` (
  `codesico` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `yahooname` varchar(25) NOT NULL DEFAULT '',
  `nom` varchar(35) NOT NULL DEFAULT '',
  `valeur` double NOT NULL DEFAULT 0,
  `lasttime` decimal(10,0) NOT NULL DEFAULT 0,
  `lasttimedown` decimal(10,0) NOT NULL DEFAULT 0,
  `authachat` enum('1','0') NOT NULL DEFAULT '1',
  `down` enum('1','0') NOT NULL DEFAULT '1',
  `idsecteur` smallint(5) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `cacvalmaj`
--



-- --------------------------------------------------------

--
-- Structure de la table `chapaide`
--

CREATE TABLE `chapaide` (
  `idchapaide` smallint(6) NOT NULL,
  `titrechap` varchar(250) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `chapaide`
--

INSERT INTO `chapaide` (`idchapaide`, `titrechap`) VALUES
(1, 'Les listes'),
(2, 'Les formulaires');

-- --------------------------------------------------------

--
-- Structure de la table `compte`
--

CREATE TABLE `compte` (
  `idcompte` smallint(5) UNSIGNED NOT NULL,
  `pseudonyme` varchar(30) NOT NULL DEFAULT '',
  `nom` varchar(50) NOT NULL DEFAULT '',
  `prenom` varchar(50) NOT NULL DEFAULT '',
  `passe` varchar(255) NOT NULL DEFAULT '',
  `dateinscr` decimal(10,0) NOT NULL DEFAULT 0,
  `adresse` varchar(100) NOT NULL DEFAULT '',
  `cp` varchar(10) NOT NULL DEFAULT '',
  `ville` varchar(50) NOT NULL DEFAULT '',
  `tel` varchar(20) NOT NULL DEFAULT '',
  `email` varchar(100) NOT NULL DEFAULT '',
  `etablissement` varchar(100) NOT NULL DEFAULT '',
  `idniveau` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `cashback` decimal(10,2) NOT NULL DEFAULT 10000.00,
  `maildaily` tinyint(1) NOT NULL DEFAULT 0,
  `mailweekly` tinyint(1) NOT NULL DEFAULT 0,
  `lastpostaction` decimal(10,0) NOT NULL DEFAULT 0,
  `dateactivite` decimal(10,0) NOT NULL DEFAULT 0,
  `authlevel` tinyint(1) NOT NULL DEFAULT 1,
  `histonbl` smallint(5) UNSIGNED NOT NULL DEFAULT 20,
  `msgnbl` smallint(5) UNSIGNED NOT NULL DEFAULT 10,
  `classenbl` smallint(5) UNSIGNED NOT NULL DEFAULT 30,
  `idskin` tinyint(3) UNSIGNED NOT NULL DEFAULT 1,
  `cookiesess` varchar(32) NOT NULL DEFAULT '',
  `nbpostforum` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `toutvuforum` decimal(10,0) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `compte`
--

INSERT INTO `compte` (`idcompte`, `pseudonyme`, `nom`, `prenom`, `passe`, `dateinscr`, `adresse`, `cp`, `ville`, `tel`, `email`, `etablissement`, `idniveau`, `cashback`, `maildaily`, `mailweekly`, `lastpostaction`, `dateactivite`, `authlevel`, `histonbl`, `msgnbl`, `classenbl`, `idskin`, `cookiesess`, `nbpostforum`, `toutvuforum`) VALUES
(1, 'Administrateur', '', '', '$2b$10$s3mVhDvbQHcLJBGzYlekmeNJ0NPL8Odl2fxWAnEVGrivUVEapn6/C', 1341427690, '', '', '', '', 'Administrateur@whoknows.com', '', 3, 10000.00, 0, 0, 0, 0, 1, 50, 5, 30, 1, '', 1, 0);

-- --------------------------------------------------------

--
-- Structure de la table `conf`
--

CREATE TABLE `conf` (
  `libel` varchar(50) NOT NULL DEFAULT '',
  `valeur` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `conf`
--

INSERT INTO `conf` (`libel`, `valeur`) VALUES
('envoyeurip', ''),
('lastmajstattitle', 'Profits et Pertes cumulées par jour'),
('lastenvoiemailquotidien', '1406908839'),
('lastenvoiemailhebdo', '1406908800'),
('lastenvoiemailmensuel', '0');

-- --------------------------------------------------------

--
-- Structure de la table `dailystatclassement`
--

CREATE TABLE `dailystatclassement` (
  `pseudonyme` varchar(30) NOT NULL DEFAULT '',
  `capital` double(23,2) DEFAULT NULL,
  `prog` double(23,2) DEFAULT NULL,
  `idcompte` mediumint(8) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `dailystatclassement`
--


-- --------------------------------------------------------

--
-- Structure de la table `f_corps`
--

CREATE TABLE `f_corps` (
  `idmessage` mediumint(8) UNSIGNED NOT NULL,
  `contenu` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_corps`
--

INSERT INTO `f_corps` (`idmessage`, `contenu`) VALUES
(1, 'Bienvenue sur le forum officiel de NetTrader !\r\n\r\nCet espace d\'échange est dédié aux discussions sur la bourse, aux stratégies de trading et à la vie de la communauté.\r\n\r\nBons trades à tous !');

-- --------------------------------------------------------

--
-- Structure de la table `f_forum`
--

CREATE TABLE `f_forum` (
  `idforum` smallint(5) UNSIGNED NOT NULL,
  `idsection` smallint(5) UNSIGNED NOT NULL,
  `nomforum` char(50) NOT NULL,
  `descriptionforum` varchar(255) NOT NULL,
  `nbsujets` mediumint(8) UNSIGNED NOT NULL,
  `nbmessages` mediumint(8) UNSIGNED NOT NULL,
  `idlastmessage` mediumint(8) UNSIGNED NOT NULL,
  `authread` enum('ouvert','admin','groupe','identifie') NOT NULL DEFAULT 'ouvert',
  `authwrite` enum('identifie','admin','groupe') NOT NULL DEFAULT 'identifie'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_forum`
--

INSERT INTO `f_forum` (`idforum`, `idsection`, `nomforum`, `descriptionforum`, `nbsujets`, `nbmessages`, `idlastmessage`, `authread`, `authwrite`) VALUES
(1, 2, 'Annonces', 'News de l\'administrateur', 1, 1, 1, 'ouvert', 'admin'),
(2, 2, 'Discussion générale', 'Discussions portant sur NetTrader ou la bourse', 0, 0, 0, 'ouvert', 'identifie'),
(3, 2, 'Suggestions ajouts et modification', 'Vous avez des idées pour améliorer NetTrader ?<br>Faites nous en part ici !', 0, 0, 0, 'ouvert', 'identifie'),
(4, 2, 'Recrutements groupes', 'Faites de la pub de votre groupe et recrutez des traders..', 0, 0, 0, 'ouvert', 'identifie'),
(5, 3, 'Vos sites favoris', 'Partagez vos liens vers les sites financiers', 0, 0, 0, 'ouvert', 'identifie'),
(6, 3, 'Les bon trades', 'Echangez vos tuyaux sur les bon trades et les actions à surveiller.', 0, 0, 0, 'ouvert', 'identifie'),
(7, 3, 'Logiciels boursiers', 'Vous avez découvert un nouveau soft financier sympa, faites part de vos impressions.', 0, 0, 0, 'ouvert', 'identifie'),
(8, 4, 'Bla-bla', 'Forum libre', 0, 0, 0, 'ouvert', 'identifie');

-- --------------------------------------------------------

--
-- Structure de la table `f_message`
--

CREATE TABLE `f_message` (
  `idmessage` mediumint(8) UNSIGNED NOT NULL,
  `idsujet` mediumint(8) UNSIGNED NOT NULL,
  `datepost` decimal(10,0) NOT NULL,
  `idcompte` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_message`
--

INSERT INTO `f_message` (`idmessage`, `idsujet`, `datepost`, `idcompte`) VALUES
(1, 1, 1729112400, 1);

-- --------------------------------------------------------

--
-- Structure de la table `f_readforum`
--

CREATE TABLE `f_readforum` (
  `idforum` smallint(5) UNSIGNED NOT NULL,
  `idcompte` mediumint(8) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_readforum`
--


-- --------------------------------------------------------

--
-- Structure de la table `f_readsujet`
--

CREATE TABLE `f_readsujet` (
  `idsujet` mediumint(8) UNSIGNED NOT NULL,
  `idcompte` mediumint(8) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_readsujet`
--


-- --------------------------------------------------------

--
-- Structure de la table `f_section`
--

CREATE TABLE `f_section` (
  `idsection` smallint(5) UNSIGNED NOT NULL,
  `libellesection` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_section`
--

INSERT INTO `f_section` (`idsection`, `libellesection`) VALUES
(2, 'NetTrader'),
(3, 'Bourse'),
(4, 'Hors sujet'),
(1, 'Débuter avec NetTrader');

-- --------------------------------------------------------

--
-- Structure de la table `f_sujet`
--

CREATE TABLE `f_sujet` (
  `idsujet` mediumint(8) UNSIGNED NOT NULL,
  `idforum` smallint(5) UNSIGNED NOT NULL,
  `idcompteauteur` mediumint(8) UNSIGNED NOT NULL,
  `s_nbmessages` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `txtsujet` char(80) NOT NULL,
  `nblectures` smallint(5) UNSIGNED NOT NULL,
  `idlastmessage` mediumint(8) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `f_sujet`
--

INSERT INTO `f_sujet` (`idsujet`, `idforum`, `idcompteauteur`, `s_nbmessages`, `txtsujet`, `nblectures`, `idlastmessage`) VALUES
(1, 1, 1, 0, 'Bienvenue sur le forum de NetTrader !', 0, 1);

-- --------------------------------------------------------

--
-- Structure de la table `groupe`
--

CREATE TABLE `groupe` (
  `idgroupe` smallint(5) UNSIGNED NOT NULL,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `titregroupe` varchar(250) NOT NULL DEFAULT '',
  `initialgroupe` varchar(5) NOT NULL DEFAULT '',
  `urlsite` varchar(250) NOT NULL DEFAULT '',
  `etat` enum('inactif','actif') NOT NULL DEFAULT 'inactif',
  `descriptiongroupe` text NOT NULL,
  `medor` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `medargent` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `medbronze` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `datecreation` decimal(10,0) UNSIGNED NOT NULL DEFAULT 0,
  `idforum` smallint(5) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `groupe`
--


-- --------------------------------------------------------

--
-- Structure de la table `historique`
--

CREATE TABLE `historique` (
  `idhisto` int(11) NOT NULL,
  `temps` decimal(10,0) NOT NULL DEFAULT 0,
  `codesico` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `sens` enum('Achat','Vente') NOT NULL DEFAULT 'Achat',
  `nbr` bigint(20) NOT NULL DEFAULT 0,
  `valeurunique` double UNSIGNED NOT NULL DEFAULT 0,
  `taxe` double NOT NULL DEFAULT 0,
  `profit` float(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `historique`
--


-- --------------------------------------------------------

--
-- Structure de la table `invitegroupe`
--

CREATE TABLE `invitegroupe` (
  `idgroupe` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `invitegroupe`
--


-- --------------------------------------------------------

--
-- Structure de la table `listmoisclass`
--

CREATE TABLE `listmoisclass` (
  `datescore` date NOT NULL DEFAULT '0000-00-00'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `listmoisclass`
--


-- --------------------------------------------------------

--
-- Structure de la table `mail_tosend`
--

CREATE TABLE `mail_tosend` (
  `idmail` int(10) UNSIGNED NOT NULL,
  `dateenvoi` decimal(10,0) UNSIGNED NOT NULL,
  `from_mail` varchar(120) NOT NULL DEFAULT '',
  `from_pseudo` varchar(120) NOT NULL DEFAULT '',
  `to_mail` varchar(120) NOT NULL DEFAULT '',
  `to_pseudo` varchar(120) NOT NULL DEFAULT '',
  `titre` varchar(255) NOT NULL DEFAULT '',
  `corps` text NOT NULL,
  `etat` enum('attente','traitement','traite','erreur') NOT NULL DEFAULT 'attente'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `market`
--

CREATE TABLE `market` (
  `idmarket` smallint(5) UNSIGNED NOT NULL,
  `marketname` varchar(80) NOT NULL,
  `openday` smallint(6) NOT NULL DEFAULT 0,
  `closeday` smallint(6) NOT NULL DEFAULT 6,
  `openhour` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `openminute` smallint(5) UNSIGNED NOT NULL DEFAULT 1,
  `closehour` smallint(5) UNSIGNED NOT NULL DEFAULT 23,
  `closeminute` smallint(5) UNSIGNED NOT NULL DEFAULT 59
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `market`
--

INSERT INTO `market` (`idmarket`, `marketname`, `openday`, `closeday`, `openhour`, `openminute`, `closehour`, `closeminute`) VALUES
(1, 'SRD', 0, 4, 9, 15, 18, 0),
(2, 'Marché des changes', 0, 6, 0, 1, 23, 59),
(3, 'Marché US', 0, 4, 15, 30, 22, 30);

-- --------------------------------------------------------

--
-- Structure de la table `membregroupe`
--

CREATE TABLE `membregroupe` (
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `idgroupe` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `datejoint` decimal(10,0) UNSIGNED NOT NULL DEFAULT 0,
  `capitalinscr` float(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `membregroupe`
--


-- --------------------------------------------------------

--
-- Structure de la table `menu`
--

CREATE TABLE `menu` (
  `idmenu` int(11) NOT NULL,
  `type_menu` varchar(6) NOT NULL DEFAULT '',
  `text_id` int(5) NOT NULL DEFAULT 0,
  `link_menu` varchar(255) NOT NULL DEFAULT '',
  `do` tinytext NOT NULL,
  `alldo` text NOT NULL,
  `authlevel` int(1) NOT NULL DEFAULT 0,
  `visiteurseulement` int(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `menu`
--

INSERT INTO `menu` (`idmenu`, `type_menu`, `text_id`, `link_menu`, `do`, `alldo`, `authlevel`, `visiteurseulement`) VALUES
(1, 'menu', 5, 'index.php?', 'accueil', '||', 0, 0),
(2, 'menu', 6, 'index.php?', 'formachatvente&info=investir', '|achataction|venteaction|login|formachatvente|', 1, 0),
(3, 'menu', 7, 'index.php?', 'forminscription', '||', -1, 1),
(4, 'menu', 12, 'index.php?', 'historique', '||', 1, 0),
(5, 'menu', 13, 'index.php?', 'classement', '||', 0, 0),
(8, 'menu', 62, 'index.php?', 'listemessage', '||', 1, 0),
(9, 'menu', 240, 'index.php?', 'showlstforums', '|showlstsujets||showlstsujets||showlstposts|', 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `messages`
--

CREATE TABLE `messages` (
  `idmsg` int(10) UNSIGNED NOT NULL,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `datemess` decimal(10,0) NOT NULL DEFAULT 0,
  `idenvoyeur` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `titre` varchar(255) NOT NULL DEFAULT '',
  `corps` text NOT NULL,
  `etat` enum('non lu','lu') NOT NULL DEFAULT 'non lu'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `messages`
--

INSERT INTO `messages` (`idmsg`, `idcompte`, `datemess`, `idenvoyeur`, `titre`, `corps`, `etat`) VALUES
(2, 0, 1086287305, 1, 'Arrivée de la béta de NetTrader 2 !', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;La beta public de nettrader 2 est dispo, il s\'agit de la version web, en meme temps est lancé le projet GNU ( open source) pour linux pour le dev d\'une interface logicielle qui utilise les comptes du site internet, vous pourrez donc jouer dans le logiciel et/ou sur le site en meme temps.\r\n\r\nViendrat aussi rapidement le logiciel win \"d\'urgence\", je vais simplement adapter nettrader1 pour qu\'il utilise les comptes du sites nettrader2.\r\n\r\nViendra ensuite une version windows avec un graphisme ressemblant a celui d\'un jeu cette fois.', 'lu'),
(13, 0, 1089707923, 1, 'N\'oubliez pas !', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Souvenez-vous que NetTrader 2 est en version de test alors je compte sur vous tous pour me faire part de vos remarques,suggestion,bugs et problemes, tout commentaire au sujet de la version de test nettrader2,<a href=\"http://nettrader.apinc.org/phpBB2/viewforum.php?f=12\" target=\"_blank\">a donner sur le forum</a>.\r\n<br>Merci <img src=\"http://nettrader.apinc.org/phpBB2/images/smiles/icon_wink.gif\">', 'lu'),
(14, 0, 1089911475, 1, 'Mise à jour', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Salutation,  les profits et pertes sont maintenant colorés , si vous pensez que la couleur ne va pas laissez un message sur le forum.J\'ai changé aussi le systeme de mise a jour des valeurs qui me permet de mettre autre chose que les valeurs du cac40, j\'ai mis aussi une valeur etrangere \"or de virginie\" mais je pense qu\'il y a un decalage horaire... a confirmer.', 'lu'),
(15, 0, 1089975053, 1, 'Valeurs du SRD', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Bien j\'ai mis les valeurs du SRD sauf celle dont la valeur est inferieur a 2€, mais semble y avoir un probleme avec la mise à jour des valeurs, ca sera resolu cet aprem surement', 'lu'),
(22, 0, 1091635147, 1, 'Bientôt...', 'Je vois qu\'il y a pas mal de testeurs ... pour 0 commentaires ...<br><br>\r\n\r\nEnfin bref le but de cette news est pour vous informer l\'arrivée d\'une page de statistiques comprenant les valeurs les plus achetés aujourd\'hui par les joueurs et d\'autres trucs, si vous avez des idées de statistiques merci de poster vos idées sur le forum de NetTrader2.', 'lu'),
(23, 0, 1091997959, 1, 'Interface logiciel NetTrader 2', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Comme vous le savez NetTrader 2 version logiciel est en préparation, il utilisera les comptes du site où vous êtes actuellement et il sera possible de modifier l\'apparance du jeu.<br><br>\r\nVoici ce que vous verrez en entrant dans le jeu :<br><br>\r\n<center><a href=\"imgnews/grandn1.png\" target=\"_blank\"><img src=\"imgnews/petitn1.png\"></a>\r\n<br><i>Cliquez sur l\'image pour agrandir</i></center>', 'lu'),
(24, 0, 1092413322, 1, 'Info', 'Pour le classement, seul les joueurs ayant joué depuis 30 jours sont affiché, pour l\'instant c\'est ceux qui ont joué depuis la date de cette news vu que le compteur a été activé que maintenant.\r\n<br><br>\r\nEt faut également savoir que les joueurs n\'ayant pas joué depuis deux mois ou plus seront supprimé, ils ne seront plus visible dans les scores des mois passées non-plus ( cf réglement )', 'lu'),
(25, 0, 1095786196, 1, 'Tour de jeu', 'TourDeJeu est un portail francophone des jeux par correspondance, j\'y est inscrit NetTrader, si vous desirez avoir plus de concurent ou simplement remercier l\'auteur ca serait sympa de <a href=\"http://www.tourdejeu.net/annu/votejeu.php?id=1083&retourfiche=1\" target=\"blank\">voter pour nettrader</a>. Merci<br><br>\r\n<center><a href=\"http://www.tourdejeu.net\" target=\"blank\"><img src=\"http://www.tourdejeu.net/images/boutonanim.gif\"></a></center>', 'lu'),
(27, 0, 1095195808, 1, 'Petit ajout', 'Salutations :<br><br>\r\n\r\nJ\'ai ajouté une petite icone ( <img src=\"http://nettrader2.apinc.org/skin/default/images/info.gif\"> ) vous permettant d\'aller sur un site boursier afin d\'obtenir plus d\'information sur l\'action ( graphique, historique, informations techniques etc...)<br><br>\r\n\r\nLa conception du logiciel nettrader 2 avance également <img src=\"http://nettrader.apinc.org/phpBB2/images/smiles/icon_wink.gif\">', 'lu'),
(28, 0, 1095786381, 1, 'Outils', 'Une fois que vous avez compris le système en mode débutant n\'hesitez pas à <a href=\"index.php?do=profil\">passer en mode initié</a> afin de pouvoir obtenir d\'outils supplémentaire tel que l\'achat vente à seuil.<br><br>Pour information seul 15% des joueurs ont choisis la difficulté Inititié-Expert', 'lu'),
(78, 0, 1101853384, 1, 'Mise à jour', 'Une petite mise à jour :<br><br>\r\n\r\n-Page de remise à 0 du compte<br>\r\n-Colonne Valeur initiale', 'lu'),
(97, 0, 1102768117, 1, 'Sondage important !', '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Un sondage important est en cours du 11 au 25 décembre 2004.<br><br>\r\n\r\n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Vous allez décider de la nouvelle taxe appliquée à nettrader 2.<br><br>\r\n\r\nSur le forum à cette adresse :<br><br>\r\n<a href=\"http://nettrader.apinc.org/phpBB2/viewtopic.php?p=2720#2720\">http://nettrader.apinc.org/phpBB2/viewtopic.php?p=2720#2720</a>', 'lu'),
(197, 0, 1104534000, 1, 'Année 2005', 'L\'auteur vous souhaite une trés bonne année 2005.<br><br>\r\n\r\nN\'hésitez pas à demander de l\'aide sur le <a href=\"http://nettrader.apinc.org/phpBB2/\">forum</a> moi même ou d\'autres joueurs pourront surement vous aider.<br><br>\r\n\r\nBon trade ;)', 'lu'),
(209, 0, 1105186028, 1, 'Actions à éviter !', 'Ces actions sont à éviter car elles ne sont plus mis à jour (ou rarement )  :<br><br>\r\n\r\n-NOKIA AB<br>\r\n-TRACKS MSCI ENER<br>\r\n-EASYETF EURO BNK<br>\r\n-STOXX50 EX<br>\r\n-TRACKS MSCI CO.S<br>\r\n-EASYETF EURO UTI<br>', 'lu'),
(265, 0, 1105832772, 1, 'Taxes', 'Conformément au résultat du vote, la taxe suivante a été appliquée :<br><br>\r\n\r\ntaxe=ValxQuantx0.003x(1 + 0.196 )<br><br>\r\n\r\nIl y a donc une taxe de 0,3 % avec en plus la tva de 19,6% sur cette taxe, et il y a un minimum de 4,95 € de taxe.<br><br>\r\n\r\nCe système est utilisé par un des courtiers en ligne réel, par rapport à l\'ancienne taxe qui était 0,25% et 15€ mini la nouvelle vous permet de faire d\'aventage de l\'intraday, mais pénalise toutefois quelque peu les  mouvements volumineux.<br><br>\r\n\r\nIl y a 212 joueurs réguliers mais seul 8 ont votés... 5 ont choisis cette taxe.', 'lu'),
(266, 0, 1105988195, 1, 'Sondage', 'Salutations Traders ;)<br><br>\r\n\r\nEn ce moment à lieu un vote, ce vote vous permet de choisir si vous désirez qu\'il y ai un décalage de 15 minutes dans l\'execution des ordres afin d\'empecher les joueurs ayant les cours en direct de <b>tricher</b> à NetTrader et aussi d\'ajouter un peu de réalisme... plus de détails dans la page suivante où vous pouvez voter :<br><br>Vous devez vous <a href=\"http://nettrader.apinc.org/phpBB2/profile.php?mode=register\" target=\"_blank\">inscrire sur le forum</a> pour pouvoir voter ( c\'est une inscription differentes que ce site )\r\n\r\n<br><br>Une fois inscrit, identifiez vous (login) sur le forum et vous pourrez voter sur la page suivante :<br><br>\r\n\r\n<a href=\"http://nettrader.apinc.org/phpBB2/viewtopic.php?t=483\" target=\"_blank\">Cliquez ici pour avoir accès à la page de vote</a><br><br>Merci', 'lu'),
(292, 0, 1108333459, 1, 'Amélioration', 'Une nouvelle page a été créé, elle vous permet de voir <a href=\"index.php?do=lstactions\">la liste des actions classée par secteur d\'activité</a>, avec pour chacune d\'elle sont pourcentage par mis la totalité du portefeuille des joueurs ( colonne part) et de votre portefeuille ( colonne votre part)<br><br>\r\n\r\n\r\nLa case qui va du blanc au gris vous permet d\'avoir une idée rapide sur le classement, noir pour l\'action la plus achetée, gris pour celle figurant au milieu du classement et blanc pour la dernière du classement. <br><br>\r\n\r\nLe fichier d\'aide sur cette page sera bientôt fait, merci à <a href=\"http://nettrader.apinc.org/phpBB2/profile.php?mode=viewprofile&u=436\" target=\"_blank\">genius</a> pour avoir cherché les secteurs des entreprises.', 'lu'),
(297, 0, 1109630047, 1, 'Mise à jour', 'Conformément au vote la maj entraîne ceci :<br><br>\r\n\r\nLes ordres ne sont éxécutés seulement si la date ( et heure) du cours de la bourse est égal ou supérieure à la date de création de l\'ordre, comme il y a un décalage entre la date actuelle et celle du cours de la bourse dans le site ( de l\'ordre de 15 min ~ ) l\'ordre s\'executera automatiquement au minimum 15 minutes aprés sa création.<br><br>\r\n\r\nDe plus vous ne pouvez pas supprimer un ordre dans la tranche de 5 à 20 minutes aprés la création de celui-ci, vous avez donc 5 minutes pour supprimer un ordre fraichement créé.<br><br>\r\n\r\nVous avez remarqué également une sorte de fenêtre de statistique en bas à droite de la page d\'accueil, elle changera tout les jours.<br><br>\r\n\r\nLes ordres qui sont éxécutés ( avec réussite ou pas ) ne sont plus supprimés, ils sont visible dans la liste des ordres, cette liste a été pour l\'occasion réarrangé.\r\n<br><br>\r\nMerci de votre patience et bon jeu ;)', 'lu'),
(373, 0, 1110580016, 1, 'Passez du virtuel au réél', '<!--- Code à insérer CibleClick : Boursorama INVEST ---><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667\" target=\"_blank\" >Boursorama INVEST</a><img src=\"http://ad.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=0\"  border=\"0\" alt=\"\" width=\"0\" height=\"0\"><!--- fin du Code à insérer CibleClick : Boursorama INVEST ---> est le leader français de l\'information financière et du courtage en ligne  , <!--Code à insérer CibleClick : Boursorama INVEST --><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\" target=\"_blank\" >boursorama INVEST</a><img src=\"http://www.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\"  border=\"0\" alt=\"\"><!--Code à insérer CibleClick : Boursorama INVEST --> est idéal pour débuter en bourse :<br><br> Le fait qu\'il y ai 0 € de droit de Garde réduit les frais liés à la gestion de\r\nvotre portefeuille, <!--Code à insérer CibleClick : Boursorama INVEST --><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\" target=\"_blank\" >boursorama INVEST</a><img src=\"http://www.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\"  border=\"0\" alt=\"\"><!--Code à insérer CibleClick : Boursorama INVEST --> est donc destiné aux  investisseurs particuliers, une bonne solution pour découvrir la bourse réelle.<br><br>Pour recevoir gratuitement une documentation sur <!--Code à insérer CibleClick : Boursorama INVEST --><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\" target=\"_blank\" >boursorama INVEST</a><img src=\"http://www.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\"  border=\"0\" alt=\"\"><!--Code à insérer CibleClick : Boursorama INVEST -->  remplissez le formulaire qui se trouve sur la page accessible en cliquant sur le nom du service<br><br>\r\n\r\nEt n\'oubliez pas ceci :<br><br>Mettez en bourse uniquement l\'argent dont vous n\'avez pas besoin !\r\n\r\n<br><br>Merci <img src=\"http://nettrader.apinc.org/phpBB2/images/smiles/icon_wink.gif\">', 'lu'),
(540, 0, 1111162222, 1, 'Skin', 'Salutation Traders<br><br>\r\n\r\nJe suis certain que de nombreux joueurs jouent au travail ;) C\'est pour cela que j\'ai pensé à vous faire une skin ( par encore faite ) dont voici , ci-dessous, le résultat final.<br><br><center><a title=\"Cliquez ici pour agrandir l\'image\" href=\"http://nettrader.apinc.org/NetTraderSkin.JPG\" target=\"_blank\"><img src=\"http://nettrader.apinc.org/NetTraderSkinMini.JPG\" alt=\"Cliquez ici pour agrandir l\'image\"></a></center><br> Vous pourrez alors passer inapercu en vous écriant \"mais oui je fait du tableur je ne joue pas môa !\"<br><br> Si vous êtes interressé par cette skin pour le moins trompeuse merci de l\'exprimer sur le <a href=\"http://nettrader.apinc.org/phpBB2/\">forum</a> ou par <a href=\"index.php?do=contactauteur\" title=\"Cliquez-ici pour me contacter\">email</a>, <b>si je recois suffisament de réponse je créerai et la rendrai disponible à la sélection dans votre profil.</b><br><br>-Nicolas', 'lu'),
(899, 0, 1113414847, 1, 'Pour faire plus de plus-value', '82 % des joueurs ont comme niveau \"Débutant\" dans leurs profils.<br><br>\r\n\r\nC\'est trés dommage, un jeu en mode débutant limite les types d\'ordres que vous pouvez passer !\r\n<br><br>\r\nSi dans votre <a href=\"index.php?do=profil\">profil</a> vous mettez initié ou expert vous aurez accès à d\'autres outils comme par exemple l\'achat et vente à seuil qui vous permettent d\'ajouter une condition de valeur à l\'execution de l\'ordre, vous pourrez ainsi par exemple créer un ordre de vente  qui s\'executera seulement si le prix de l\'action vous est profitable !\r\n<br><br>\r\nIl s\'agit de la seule différence, les règles restent les mêmes, à tous ceux qui sont en mode débutant je leurs conseil fortement de passer au niveau initié.', 'lu'),
(1088, 0, 1114539193, 1, 'Mise à jour', 'Salutations<br><br> Une petite maj, ajout de la recherche de Joueurs dans la page de classement.<br><br> Bon trade ;)', 'lu'),
(1224, 0, 1115569714, 1, 'Mise à jour, et désactivation', 'Bonjour<br><br>\r\n\r\nUne bonne et une mauvaise nouvelle aujourd\'hui :<br><br>\r\n\r\nLa bonne nouvelle, je commence par là ;) , c\'est la mise à jour qui permet pour le mode expert de specifier une plage de valeurs pour l\'execution au lieu d\'un simple seuil, de la correction des plues values sur le portefeuille, et grande nouvelle l\'arrivé de la vente à découvert qui est cependant pour l\'instant en test.<br><br>\r\n\r\nLa mauvaise nouvelle c\'est la désactivation de 27 valeurs de la bourse dû à des probléme technique, j\'espere pouvoir les reactiver durant cette semaine, la liste est la suivante :<br><br> NOKIA AB, REXEL, ISHARES STOXX 50, MAST.DOW JONES E, MSCI US TECH MAS, DJ EUR.ST.50MA.E, EASYETF EURO BNK, EASYETF EURO ENE, EASYETF EURO HLT, EASYETF EURO INS, EASYETF EURO MED, EASYETF EURO TEC, EASYETF EURO TEL, EASYETF EURO UTI, SPDR EURO, SPDR EUROPE 350, ST.SM MSCI PAN E, STOXX50 EX, EURO ST.50 EX, TRACKS MSCI CO.D, TRACKS MSCI CO.S, TRACKS MSCI ENER, TRACKS MSCI FINA, TRACKS MSCI HLT, TRACKS MSCI INDU, TRACKS MSCI MAT, TRACKS MSCI UTIL, TRADEX ST SUS<br><br>\r\n\r\nBon trade ;)', 'lu'),
(1278, 0, 1124731067, 1, 'Recevez une documentation gratuite', 'Si vous vous sentez d\'attaque pour passer au réél ou si vous désirez juste en apprendre un peu plus sur le courtage en ligne, je vous conseil <!--Code à insérer CibleClick : Boursorama INVEST --><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\" target=\"_blank\" >boursorama INVEST</a><img src=\"http://www.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\"  border=\"0\" alt=\"\"><!--Code à insérer CibleClick : Boursorama INVEST -->.<br><br>\r\n\r\nVous pouvez faire une demande pour recevoir par la poste un dépliant expliquant précisement  le courtage en ligne et ce gratuitement !<br><br>\r\n\r\nIl vous suffit pour cela de cliquer sur <!--Code à insérer CibleClick : Boursorama INVEST --><a href=\"http://www.cibleclick.com/cibles/clicks/symp.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\" target=\"_blank\" >boursorama INVEST</a><img src=\"http://www.cibleclick.com/cibles/banniere/symp0.cfm?site_id=165428834&friend_id=168633667&banniere_id=9172\"  border=\"0\" alt=\"\"><!--Code à insérer CibleClick : Boursorama INVEST --> et de remplir le formulaire qui apparaitra.<br><br>Merci<br><br>\r\n\r\n-Le créateur de NetTrader, FORTIN Nicolas<br><br>\r\nPs: Maintenir le jeu coûte du temps et de l\'argent à l\'auteur, remplir correctement le formulaire est le seul moyen d\'aider NetTrader à persister, merci.', 'lu'),
(1621, 0, 1117979721, 1, 'Nouveau serveur !', 'Salutations<br><br>\r\n\r\nJ\'ai démmarré un nouveau serveur rien que pour votre plaisir ^^<br><br>\r\n\r\nLa seule difference avec ce serveur c\'est que l\'éxécution des ordres est immédiate.<br><br>\r\n\r\nEt ca ca change beaucoup, vous le verrez dans un mois sur la page des scores ^^\r\n\r\n<br><br><a href=\"http://nettrader2.cumu.net\" target=\"_blank\">http://nettrader2.cumu.net</a><br><br>\r\n\r\nBon jeu les traders ;)', 'lu'),
(1979, 0, 1120559246, 1, 'Le Forum', 'Salutations Traders !<br><br>\r\n\r\nVenez débattre sur le forum de NetTrader, partagez vos astuces de jeu,  récoltez des informations qui vous seront trés utile à l\'établissement de vos ordres d\'achat vente.\r\n\r\n<br><br>Enfin bref, si vous voulez discuter avec d\'autres joueurs de NetTrader venez sur le forum :\r\n\r\n<br><br><a href=\"http://nettrader.apinc.org/phpBB2/\" target=\"_blank\">http://nettrader.apinc.org/phpBB2/</a>\r\n\r\n<br><br>L\'admin CuMu', 'lu'),
(2044, 0, 1121115115, 1, 'Mise à Jour', 'Une mise à jour vient d\'être faite : <br><br>\r\n\r\n-Fonction de tri des colonnes des tableaux<br>\r\n-Le tableau de la liste des actions a été refait<br>\r\n-Coche automatique des ordres, quand vous choisissez par la liste déroulant ou par entrée directe de la quantité les options de nombre ou de pourcentage se positionne sur votre choix. <br><br>\r\n\r\nUn peu de patience encore pour le logiciel NetTrader 2 je travail dessus', 'lu'),
(2083, 0, 1121682595, 1, 'VAD', 'Bonjour<br><br>\r\n\r\nJ\'ai activé la vente à découvert, pour l\'utiliser il faut être niveau expert, pour passer au niveau expert dans votre <a href=\"index.php?do=profil\">profil</a> séléctionnez expert, tapez votre mot de passe et validez.<br><br>\r\n\r\nAttention la vad est trés dangereuse, vous pouvez gagner beaucoup mais perdre de façon illimitée ! L\'aventage est de gagner lorsque le valeur baisse.Vous trouvez toute l\'aide dans celle de NetTrader, ou dans des sites boursiers sur internet.\r\n\r\n<br><br> Bon trade et soyez prudent ;)', 'lu'),
(2818, 0, 1124731267, 1, 'NetTrader dans la presse !', 'Aujourd\'hui une trés grande nouvelle, NetTrader a eu une place dans le journal \"20 minutes\" parisien, 1/2 page consacré au jeu !<br><br>\r\n\r\nD\'où le nombre record de connectés aujourd\'hui, 380 joueurs aujourd\'hui et 50 nouveaux joueurs par heure !<br><br>\r\n\r\nA cette adresse vous pourrez consulter l\'edition d\'ajourd\'hui :<br><br>\r\n\r\n<a href=\"http://www.20minutes.fr\">http://www.20minutes.fr</a><br><br>\r\n\r\nNetTrader est à la page 40.<br><br>\r\n\r\nMerci à tous', 'lu'),
(4241, 0, 1125532941, 1, 'Mise à jour', 'Voilà j\'ai enfin terminé cette modification.<br><br>\r\n\r\n-Corrections de bug, VAD et erreur de %\r\n-Ajout d\'une partie aide et faq dynamique, vous pouvez ajouter des commentaires et de mon coté je pourrai plus facilement ajouter de l\'aide<br>\r\n-Pour l\'instant c\'est la même aide, mais je modifirai et ajouterai en fonction des réactions sur le forum<br><br>\r\n\r\nBon trade', 'lu'),
(5051, 0, 1126470051, 1, 'Suppression de valeur', 'Salutations traders\r\n\r\n<br><br>Vous l\'avez évidament remarqué, les scores c\'est du n\'importe quoi, ceci pour une raison, les actions eurotunnel et disney-land.\r\n\r\nCes actions ont une valeur de moins de 1€ normallement ces actions mettent dans la réalité une semaine, voire un mois pour se vendre ou s\'acheter.<br><br>\r\n\r\nEnfin bref, ces actions vont être retirées pour ses raisons, vous avez deux jours pour ne plus les avoirs dans votre portefeuille, ils seront supprimés mardi soir, ceux qui auront ces actions en découvert à ce moment et qui n\'auront pas les moyens de les racheter se verront supprimé ces actions de leurs portefeuille.<br><br>\r\n\r\nEt une nouvelle, une fiche pour les actions est en cours de développement.\r\n\r\n<br><br>Bon trade, l\'administrateur', 'lu'),
(5052, 0, 1126512010, 1, 'Petit problème passager', 'Voilà<br><br>\r\n\r\nJe vais changer de fournisseur d\'accès et il se pourrait que je sois injoignable quelques jours durant le changement, pareil pour nettrader, les ordres à seuil ne s\'executeront pas toujours comme il faut quand je n\'aurai plus internet.<br><br>\r\n\r\nPour cette raison j\'ai decidé qu\'a partir de maintenant jusqu\'a ce que ca redevienne stable le décalage des executions d\'ordres n\'ont plus lieu.', 'lu'),
(7388, 0, 1135465200, 1, 'Joyeux Noël', 'Cher Traders vous souhaite un joyeux noël. <br><br>J\'espère que vous amusez bien avec votre famille ou vos amis, et que vous mangez plein de bonnes choses.', 'lu'),
(7494, 0, 1136073601, 1, 'Bonne année 2006', 'Passez une bonne et heureuse année 2006, je souhaite remercier tout les joueurs pour leur fidélitée et leur soutient.', 'lu'),
(8062, 0, 1138638539, 1, 'Merci un jour un site', 'NetTrader a été sélectionné par <a href=\"http://www.unjourunsite.be\" target=\"_blank\">http://www.unjourunsite.be</a>, et l\'auteur l\'en remerci.\r\n\r\n<br><br>\r\n-Nicolas', 'lu'),
(9338, 0, 1149189592, 1, 'Référencement', 'NetTrader remercie ousurfer.com pour son référencement !<br><br><center><a target=\"_blank\" href=\"http://www.ousurfer.com\"><img src=\"http://www.ousurfer.com/images/selection.gif\" alt=\"Site recommandé par Ousurfer.com\" border=\"0\"></a></center>', 'lu'),
(10060, 0, 1148299590, 1, 'Total', 'Salutations<br><br>\r\n\r\nDû à la Division par 4 du nominal de l\'action Total , votre nombre d\'action a été multiplié par 4.<br><br>\r\n\r\nVous pouvez de nouveau vendre et acheter des actions total.<br><br>\r\n\r\nNous vous fiez pas à la colonne ( % profit ) de votre portefeuille, le calcul est erronné, de plus une ligne dans votre historique a été ajouté mais ne correspond pas à la réalitée.<br><br>\r\n\r\nVotre capital est bon, vous n\'avez donc pas été laisé par la manipulation.<br><br>\r\n\r\nPour revenir à des statistiques correctes il faudrait vous débarrassez des actions total.<br><br>\r\n\r\nVotre classement est lui aussi revenu à la normal.<br><br>\r\n\r\nDésolé pour la gêne occasionné.<br><br>\r\n\r\nJe remercie les joueurs de m\'avoir avertit par mail du problême, ce message fait réponse à tout les mails.\r\n\r\n<br><br>Bon jeu ;)', 'lu'),
(10326, 0, 1149418741, 1, 'L\'analyse technique chez pro-at.com', 'Salutations les traders !<br><br>\r\n\r\nComme vous le savez surement il y a deux courants dans la <b>prévision des cours boursiers</b>, l\'analyse fondamentale et l\'analyse technique.<br><br>\r\n\r\n<a href=\"http://www.pro-at.com\" target=\"_blank\">Pro-at.com</a>  est un site internet qui vous permettra de <b>découvrir</b> et de savoir utiliser l\'analyse technique.<br><br>\r\n\r\nDans les forums de <a href=\"http://www.pro-at.com\" target=\"_blank\">Pro-at.com</a> vous trouverez également des conseils de <b>stratégies</b> !<br><br>\r\n\r\nPar exemple, un ordre d\'achat ne doit pas être créé seul, vous devez également créer deux ordres de ventes, un pour vous vendre si le cours atteint votre objectif, et un pour vendre pour vous protéger si jamais le cours chute de  facon inquiétante.<br><br>\r\n\r\nEssayez ces techniques sur <b>NetTrader</b>, je vous le conseil !\r\n\r\n<br><br><center>\r\n<a href=\"http://www.pro-at.com\" target=\"_blank\">Pro-AT.com</a></center>', 'lu'),
(10400, 0, 1150060457, 1, 'Serveur NetTrader', 'Joueurs de NT2\r\n\r\nJe vous informe que dû à des difficultés techniques je vais louer un serveur dédié pour heberger NetTrader.\r\n\r\n<br><br>Pour l\'instant le jeu est hebergé via une solution \"Commune\" avec d\'autres sites web, et ceci au maximum sur les 35 prochains jours.<br><br>\r\n\r\nJ\'espère pouvoir faire la migration du jeu dans ce délai, sinon il pourrait y avoir un arret temporaire de nettrader.\r\n<br><br>Sachez que vous ne perdrez pas votre compte lors du passage à la solution dédié.\r\n\r\n<br><br>Si vous avez des questions vous pouvez me <a href=\"index.php?do=contactauteur\" target=\"_blank\" class=\"copyright\">contacter</a> .<br><br>D\'ici là bon trades à tous !', 'lu'),
(10755, 0, 1151221384, 1, 'Nettrader.fr est à nous !', 'Bonne nouvelle<br><br>\r\n\r\nDû à la récente ouverture des .fr aux particuliers, j\'ai acheté le domaine nettrader.fr, ce domaine redirigera bientôt vers le nouvel hebergeur de NetTrader.<br><br>\r\n\r\nEst-ce qu\'un alias votrepseudo@nettrader.fr vous interresse ?<br><br>\r\n\r\nVous pouvez me donner votre réponse sur <a href=\"http://nettrader.apinc.org/phpBB2/viewtopic.php?t=765\" target=\"_blank\">le forum de nettrader</a>.', 'lu'),
(10913, 0, 1151958467, 1, 'Migration', 'La migration est effectué.<br><br>\r\n\r\nSi vous rencontrez des problèmes merci de m\'avertir au plus vite !<br><br>\r\n-Nicolas', 'lu'),
(14588, 0, 1167393862, 1, 'PREPAREZ VOS ORDRES POUR LE 02 JANVIER', '<p><strong>Attention le concours cité ci-dessous ne se déroule pas sur ce site internet, mais à l\'adresse <nobr><a href=\"http://www.pro-at.com/jeux/\" title=\"Jeu de simulation boursière \" target=\"_blank\">http://www.pro-at.com/jeux/</a></nobr><br><br><br> A partir du 02 janvier 2007 </strong> à l\'ouverture de la Bourse de Paris, le <strong> <a href=\"http://www.pro-at.com/jeux/\" title=\"Jeu de simulation boursière \" target=\"_blank\">JEU \" EFFET JANVIER \"</a></strong> d&eacute;butera et vous pourrez commencer à concourir en vue de gagner l\'un des 10 lots qui récompenseront les 10 premiers du classement au 31 janvier 17h30. </p>\r\n<p>Le gagnant aura la possibilit&eacute; de <strong> choisir</strong> une <a href=\"http://www.pro-at.com/formations/\" title=\"Apprendre la bourse avec Pro-AT\" target=\"_blank\">formation Pro-AT</a> <br />\r\nLes 9 suivants pourront <strong> choisir</strong> un ouvrage dans la collection <a href=\"http://www.pro-at.com/boutique/\" title=\"Boutique Bourse et Finance\" target=\"_blank\">VALOR Editions</a>. </p>\r\n<p>Bonne chasse aux p&eacute;pites pour 2007 !</p>\r\n<p><a href=\"http://www.nettrader.fr/\" title=\"Jeu de simulation boursière \" target=\"_blank\">Nettrader</a> &amp; <a href=\"http://www.pro-at.com/\" title=\"Bourse Forex CAC 40 - Pro-AT.com : analyses, conseils , forums\" target=\"_blank\">Pro-AT</a></p>', 'lu'),
(14732, 0, 1168142947, 1, 'Mise &agrave; jour importante', 'Pour vous souhaiter une trés bonne année 2007 je vous ai concocté une miriade de nouvelles fonctionnalitées !\r\n\r\n-Creez votre équipe et affrontez les equipes concurentes.\r\n-Communiquez entre-vous grâce à la messagerie interne.\r\n-Désormais vous pouvez visualiser les profits et les pertes dans l\'historique !\r\n- Un profil plus complet des actions a été ajouté.\r\n- Vous pouvez maintenant supprimer en masse les ordres éxécutés et périmés.\r\n- Les erreurs de calculs connuent sont corrigées.\r\n\r\nEt j\'ai pris également une décision importante. NetTrader est un jeu et non un concours donc pour votre plus grand plaisir j\'ai désactivé le décalage de l\'execution d\'un ordre. Sachez qu\'en cas de problème les joueurs ayant un score abérrant ne seront plus affichés dans le palmarès.\r\n\r\nBonne année et bon jeu !', 'lu'),
(14999, 0, 1169124165, 1, 'Probl&egrave;me de charge serveur', 'Bonjour\r\n\r\nVous avez surement remarqué le site nettrader.fr rencontre des difficultées. Lors des heures de pointes (13 et 17h ) il peut arriver que le serveur de jeu tombe en rade.\r\n\r\nLe serveur de jeu ( qui heberge donc le site et le moteur du jeu ) est un serveur dédié virtuel. Ce type de serveur est moins puissant qu\'un serveur dédié tout court. \r\n\r\nDès que j\'aurai les moyens et le temps j\'acheterai un serveur dédié assez puissant pour vous permettre de jouer sans problèmes.\r\n\r\n\r\nEn attendant désolé pour les problèmes rencontrés.\r\n\r\n-Le créateur de NetTrader\r\n\r\nps:Si vous avez des infos sur un bon hebergeur de serveur dédié merci de m\'en faire part via le lien \"Contacter l\'auteur\".', 'lu'),
(15045, 0, 1169300465, 1, 'Evoluez', 'Bonjour\r\n\r\nJ\'ai regardé les stats du serveur et il semblerait que seul 10% des joueurs sont en niveau expert.\r\n\r\nLa differences entre les niveaux c\'est uniquement <STRONG>l\'accès à plus ou moins d\'outils</STRONG>.\r\n\r\nSi vous avez compris <STRONG>l\'achat et la vente</STRONG> au niveau débutant je vous conseil fortement de passer au niveau :\r\n\r\n<STRONG>Initié</STRONG> pour apprendre ce qu\'est l\'achat/vente <STRONG>à seuil</STRONG>.\r\n\r\nExpert pour apprendre ce qu\'est l\'achat/vente à <STRONG>plage de valeurs</STRONG> et la <STRONG>vente à découvert</STRONG>.\r\n\r\nPour passer dans ses modes il suffit de modifier votre profil :\r\n\r\n<a href=\"http://www.nettrader.fr/index.php?do=profil\">Modifier votre profil</a>\r\n\r\nPour progresser plus rapidement j\'ai mis à votre disposition un blog sur les rudiments du jeu :\r\n\r\n<a href=\"http://blog.nettrader.fr\">http://blog.nettrader.fr</a>\r\n\r\nBon jeu\r\n\r\n-Nicolas\r\n\r\n', 'lu'),
(15251, 0, 1171047106, 1, 'Ajout d\'une action', 'Salutations\r\n\r\nJ\'ai ajouté l\'action Olympique Lyonnais. L\'action s\'appelle <a href=\"http://www.nettrader.fr/index.php?do=profilaction&yn=OLG.PA\">OL GROUPE N.</a>. Par contre je ne pourrais vous dire si ca vaut le coup ;)<br><br>Toutefois il y a quand même un support médiatique trés inhabituel !\r\n\r\n<br><br>Bon trade !\r\n<br><br>Ps: Pour le nouveau serveur, ce seras peut être en place dans deux semaines.', 'lu'),
(15324, 0, 1171533068, 1, 'Blocage des cours', 'Désolé pour le blocage des cours de la bourse, le flux de données c\'est coupé et je n\'avais pas le temps de corriger le problème.\r\n\r\nLe problème est résolu.\r\n\r\n\r\nLes préjudices ne seront pas corrigés.\r\n\r\n', 'lu'),
(15367, 0, 1171894686, 1, 'SCOR', 'Dû à certaines manipulation afin de corriger l\'action (valeur passant de 21 à 2.1 &#8364; ) des problèmes sont survenues. Normallement vous devez avoir 10 fois plus d\'action que précédament. En cas de problème n\'hesitez pas à me contacter.\r\n\r\n-Nicolas', 'lu'),
(15396, 0, 1172222580, 1, 'Migration', 'Voilà c\'est fait j\'ai loué un serveur dédié pour vous.\r\n\r\nVoici les caractéristiques :\r\nIntel  Celeron 2.66 GHz\r\nMémoire 256 Mo DDR\r\nDisque dur 160go SATA2\r\nConnexion 100 MBits/s soit le transfert d\'un cd-rom en 50 secondes !\r\n\r\n\r\nIl ne devrait plus y avoir de problèmes maintenant\r\n', 'lu'),
(15436, 0, 1172836894, 1, 'Fun-trades', 'Salutations traders\r\n\r\nJ\'ai introduit aujourd\'hui le site nettrader dans la bourse virtuelle fun-trades.\r\n\r\nUne fois inscrit vous misez vos pixos sur des sites web introduits dans notre marché virtuel, vous achetez des parts et les revendez  selon le principe de l\'offre et de la demande !\r\n\r\nL\'inscription est gratuite et vous pouvez jouer sans payer, pour demmarrer le jeu de facon plus rapide vous avez le choix d\'utiliser un paiement en ligne pour créditer votre compte fun-trades.\r\n\r\nEn ce qui concerne les dividendes je fait le choix pour l\'instant de reverser 100% aux personnes détentitres d\'action nettrader.\r\n\r\nPour acceder à fun-trades le lien se trouve dans le menu partenaires.\r\n\r\nBon jeu\r\n\r\n-Nicolas', 'lu'),
(15449, 0, 1173196677, 1, 'lobourse.com', 'Faites vos premiers pas en bourse avec <a href=\"http://www.lobourse.com\">lobourse.com</a>. Vous y trouverez des tutoriels et outils sur l\'analyse technique.\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n', 'lu'),
(15455, 0, 1173185890, 1, 'Maj', 'Hello\r\n\r\nMaj du site importante.\r\n\r\nForum integré.\r\n\r\nPar contre j\'ai quelques probleme avec le serveur.. affaire a suivre', 'lu'),
(15462, 0, 1173196685, 1, 'Ca fonctionne !', 'Voilà c\'est corrigé\r\n\r\nTout le monde sur le forum !! ;)', 'lu'),
(15518, 0, 1173460480, 1, 'Messagerie', 'La messagerie a été réparée.\r\n\r\nInfos au groupes, vous avez votre forum personnel et privé. pour y acceder aller sur votre profil de groupe et cliquer sur la ligne \"forum\".\r\n\r\nBon trades', 'lu'),
(15902, 0, 1176475005, 1, 'Flux boursier', 'Un probleme tres important aujourd\'hui , les cours de la bourse ne sont plus mis à jour. Ce problème via de la source des données, je ne peut donc rien faire.\r\n\r\n\r\nToutefois si jamais ce probleme n\'est pas corrigé par la suite. Je serais obligé de fermer NetTrader le temps que je configure pour trouver une autre source pour les cours de la bourse.\r\n\r\nSi jamais vous travaillez dans une entreprise qui fournit les cours de la bourse, et ce gratuitement ( partenariat possible ) merci de me contacter via le lien \"contacter l\'auteur\" dans le menu de la page d\'accueil. merci\r\n\r\n\r\nDésolé pour ce problème.', 'lu'),
(16054, 0, 1177926117, 1, 'Cours de la bourse', 'Il semblerait que le problème ne soit pas si grave que ca. Il s\'agit simplement d\'un décalage horaire, je n\'ai simplement qu\'à rajouter quelques heures pour que sa revienne à la normal.\r\n\r\nBon trades\r\n\r\nps: J\'espere pouvoir finir de développer une petite surprise pour vous cette semaine..', 'lu'),
(16060, 0, 1177941789, 1, 'Trading-School', '<p>Le site <strong><a href=\"redir.php?url=http://www.trading-school.eu/\" title=\"Formation bourse en ligne\" target=\"_blank\">Trading-School.eu</a></strong> propose depuis mars 2007 des <a href=\"redir.php?url=http://www.trading-school.eu/boutique/webinaires.html\" title=\"webinaire bourse en ligne\" target=\"_blank\">formations en ligne au trading</a>, mais également des webinaires (séminaires sur le web) gratuits. <br />\r\nVous y apprendrez comment analyser les actions, indices, monnaies et comment utiliser l\'Analyse Technique pour vos investissements.</p>\r\n<p>Nicolas & <a href=\"redir.php?url=http://www.trading-school.eu/contacts.php\" title=\"contacter trading-school.eu\" target=\"_blank\">L\'Equipe de Trading-School </a></p>', 'lu'),
(16259, 0, 1179159810, 1, 'Chat', 'Vous avez peut etre remarqué le formulaire pas beau de chat dans la page forum.\r\n\r\nOn m\'a demandé à plusieurs reprise d\'en mettre un. Voici donc votre chat, si ca marche je mettrai quelque chose de mieux, sinon je l\'enleverai.\r\n\r\nAccedez au  <a href=\"http://www.fantasya.org/fichesalon.php?salon=nettrader\" alt=\"info live!\" target=\"_blank\">Statistiques live</a> pour savoir qui est connecté.', 'lu'),
(19287, 0, 1190036754, 1, 'maj', 'Salutations\r\n\r\n\r\nUne mise à jour est imminante. Vous aurez un cours de la bourse de meilleur qualité avec automatiquement des nouvelles valeurs. Une nouvelle fonctionnalité vous permettra également de vous débarrasser de vos actions qui ne sont plus mis à jour.\r\n\r\nIl y aura également une petite modification sur la vente à découvert et sur son formulaire.\r\n\r\nPlus de détails une fois la mise à jour effectué\r\n\r\n-Votre admin Nicolas\r\n\r\nps: Merci à <a href=\"http://www.lobourse.com\">Lobourse.com</a> qui ammene régulierement de nouveaux joueurs !', 'lu'),
(19495, 0, 1191539398, 1, 'Maj', 'Bonjour\r\n\r\nLa mise à jour a été effectué.\r\n\r\nJ\'ai été obligé d\'effectuer un RAZ car la source du cours de la boursé a changé.\r\n\r\nDans quelques jours vous pourrez recevoir par mail votre performance , par jour et/ou par semaine, pour activer cela rendez vous dans <a href=\"http://www.nettrader.fr/index.php?do=profil\">votre profil</a> .\r\n\r\nBon jeu !\r\n\r\n++\r\n\r\nNicolas F.', 'lu'),
(40319, 0, 1264460865, 1, 'Remise &agrave; 0 des mails automatiques', 'Bonsoir\r\n\r\nDu au trop grand nombre d\'envoi de mail, j\'ai désactivé l\'envoi des mails de statistiques pour tout les comptes. Si vous désirez réactiver l\'envoi de statistique pour votre compte veuillez modifier les options de votre compte :\r\n\r\n<a href=\"http://www.nettrader.fr/index.php?do=profil\">http://www.nettrader.fr/index.php?do=profil</a>\r\n\r\nBon jeu\r\n\r\n-Nicolas', 'lu'),
(20363, 0, 1192038135, 1, 'Flux boursier', 'Bonjour\r\n\r\nLe flux boursier servant a mettre a jour les cours de la bourse n\'a pas été rétabli. D\'aprés eux il sera rétabli jeudi 11 octobre au soir, si ce n\'est pas encore repoussé comme cela l\'a été aujourd\'hui.\r\n\r\nJusque là vous pouvez créer vos ordres en repoussant bien l\'echéances pour ne pas rater la reprise.\r\n\r\nDésolé pour le problème rencontré.', 'lu'),
(33820, 0, 1193606730, 1, 'Mail de stats', 'Bonjour\r\n\r\nJe viens de mettre en place l\'envoi de mail de statistiques pour les joueurs.\r\n\r\nPour ceux qui n\'ont pas joué cette semaine il n\'auront pas toutes les statistiques car pour des raisons de taille de la base de données j\'ai limité a ceux qui jouent.\r\n\r\nSi jamais vous avez recu plusieurs fois le mail faites le moi savoir.\r\n\r\nPour info ceux qui avaient des caractère non alphanumerique dans leur pseudo ils ne pourront par recevoir le mail. Par exemple dédé56 n\'a pas recu le mail a cause de l\'accent\r\n\r\nCe probleme sera resolu lundi soir ( sans renvoi des mails biensur)\r\n\r\nEn bas du mail il y a un lien direct pour se desabonner des mails de stats. L\'effet est immédiat.\r\n\r\n-Nicolas\r\n\r\nps:Pour des suggestions sur ce mail de stat, direction le forum, merci', 'lu'),
(33735, 0, 1192643352, 1, 'Reprise du cours', 'Bonjour\r\n\r\nC\'est pas sans peine que j\'ai rétabli l\'ancien cours de la bourse.\r\n\r\nRefaire un raz serait du travail supplementaire.\r\n\r\nJ\'ai retabli les messages de la messagerie des 13 derniers jours. Ce n\'est cependant pas le cas du forum.\r\n\r\nEn cas de probleme comme vous savez faire , manifestez vous.\r\n\r\n-Admin \"qui n\'a pas démissionné\"', 'lu'),
(34205, 0, 1195801407, 1, 'Internet', 'Bonjour\r\n\r\nVotre admin n\'a plus internet alors je ne pourrai pas repondre a vos mails avant que ce soit rétabli.\r\n\r\n-Nicolas', 'lu'),
(38283, 0, 1224783074, 1, '3615 ma vie', 'Bonjour\r\n\r\nDepuis que le developpement d\'application est devenu mon métier j\'ai vraiment mis de coté NetTrader. Cela fait un peu plus d\'un an maintenant.\r\n\r\nLa raison est trés simple à comprendre. Si vous travaillerai 7h par jour à développer des logiciels auriez vous envie de refaire du développement en rentrant chez vous ?\r\n\r\nEn fait pour moi jusqu\'ici la réponse était non.\r\n\r\nAujourd\'hui une chose a changée car :\r\n\r\n1: Raison perso\r\n2: J\'ai pensé a un nouveau projet a ma porté et je me sens motivé à le faire car le concept est sans égal.\r\n\r\nLe projet remplacera NetTrader 2 et modifiera de facon complète le système de jeu. Et ce pour les objectifs suivant :\r\n\r\nUn jeu plus vivant (exit les pages web et bonjour le logiciel)\r\nUn jeu plus réaliste ( Fini les +300% et un véritable marché sous votre souris )\r\nUn jeu plus réactif ( Fini les 15 min de décalage des ordres et les raffraichissements toutes les 2 à 5 min )\r\nUn jeu non stop ( jouez 24h/24 7j/7 )\r\n\r\nEtc etc..\r\n\r\nEn fait ces objectifs seront l\'effets du remaniement du système actuel vers un système beaucoup plus travaillé et pensé.\r\n\r\nJe garde mes secrets et je vous tient au courant sur le forum.', 'lu'),
(35367, 0, 1202919448, 1, 'Riber', 'Bonjour\r\n\r\nDésolé du retard. J\'ai dû supprimer riber pour libérer vos fonds le temps que je corrige.\r\n\r\n++\r\n\r\n-Nicolas', 'lu'),
(37132, 0, 1216134940, 1, 'Usurpation identit&eacute;e', 'Bonjour\r\n\r\nJuste pour vous dire que le seul et véritable compte Administrateur dans le chat est le pseudonyme \"Administrateur\".\r\n\r\nUn petit malin c\'est fait passer pour moi via le pseudo Admin il y a un certain temps.\r\n\r\nBon jeu', 'lu'),
(37007, 0, 1214335127, 1, 'Logiciel', 'Salutation\r\n\r\nLa version beta du jeu version logiciel et non site web est disponible.\r\n\r\nLe lien pour le telecharger se trouve dans le forum. Si vous l\'essayez merci de laisser un commentaire pour rapporter les bugs ou les modifications à faire.\r\n\r\nVous pouvez vous connecter avec votre pseudo et mot de passe de votre compte.\r\n\r\nL\'admin', 'lu'),
(37696, 0, 1222702559, 1, 'Forum', 'Faites une petite visite sur le forum svp.\r\n\r\n<a href=\"http://www.nettrader.fr/index.php?do=showlstposts&idsujet=272\">Lien vers le forum</a>', 'lu'),
(38869, 0, 1230235434, 1, 'Noel', 'Joyeux noël à tous les joueurs.', 'lu'),
(38624, 0, 1227046389, 1, 'Proposion de modification du classement', 'Bonjour\r\n\r\nJe propose de modifier le classement.\r\n\r\nAu lieu de classer par la croissance du capital sur le mois courant. Je propose de classer selon le cumul des profits et pertes cumulés sur le mois lors des échanges d\'action.\r\n\r\nQu\'en dites vous ?\r\n\r\nhttp://www.nettrader.fr/index.php?do=showlstposts&idsujet=288', 'lu'),
(39374, 0, 1236268525, 1, 'Am&eacute;liorations', 'N\'hésitez pas à faire connaitre vos idées d\'amélioration via le forum de NetTrader.\r\n\r\nPour les groupes de trader n\'oubliez pas que vous avez un forum privé à votre disposition pour vos membres.\r\n\r\n-Nicolas', 'lu'),
(40072, 0, 1252347549, 1, 'Down de tout les scripts', 'Bonsoir\r\n\r\nTout les scripts se sont arrêtés. Du coup pas de mise à jour des cours lundi. Le retour à la normale à l\'ouverture demain.\r\n\r\nDésolé pour le dérangement.', 'lu'),
(39651, 0, 1240416378, 1, 'Un peu d&eacute;sert', 'Le site est un peu désert mais c\'est totalement de ma faute, je ne m\'occupe pas assez de vous. Mais vous êtes sympa vous ne vous pleignez pas.\r\n\r\nJe n\'ai aucune excuse, peut être un peu la flemme. Faut dire que je m\'occupe de NetTrader depuis 2001 donc ca fait à peu près 8 ans maintenant !\r\n\r\n\r\nJe réflechis à quelques fonctionnalité qui pourrait faire naître un certain interet pour le jeu, mais je ne vous promet rien. Déjà il faudrait que je répare le systeme de mise à jours des cours de la bourse qui a quelques déboires !', 'lu'),
(39703, 0, 1241304046, 1, 'Mise &agrave; jour des valeurs', 'Le système de mise à jour des cours a été totalement réécrit. Il devrait être plus efficace que l\'ancien.\r\n\r\nIl est possible qu\'il y ait des probleme lundi. Merci de me faire savoir si vous trouvez une action dont le cours est déféctueux.', 'lu'),
(39709, 0, 1241452094, 1, 'Mise &agrave; jour des cours', 'La modification fonctionne pas mal..\r\n\r\nExcepté que ce n\'est pas du tout les bons horaires. Ce sera reglé ce soir je pense.\r\n\r\nDésolé pour les problèmes occasionnés.', 'lu'),
(39998, 0, 1249582006, 1, 'Site d\'information et de formation', 'Bonjour\r\n\r\nPermettez-moi de vous présenter Trader-Finance.fr. Ce site vous permettra de connaitre d\'avantage de chose au trading grâce à ces fiches de guide.\r\n\r\nNous avons par exemple la fiche <a href=\"http://bourse.trader-finance.fr/ordre+a+plage+de+declenchement/\" target=\"_blank\">ordre à plage déclenchement</a> ou bien encore la fiche <a href=\"http://bourse.trader-finance.fr/vente+a+decouvert/\" target=\"_blank\"> des ventes à découvert </a>(disponible en mode expert dans NetTrader).\r\n\r\nDonc voilà si vous débutez allez faire un tour sur <a href=\"http://www.trader-finance.fr/\" target=\"_blank\">www.trader-finance.fr</a> histoire d\'être armé pour bien investir dans le jeu.\r\n\r\nBon trades à tous ;)\r\n\r\n-Admin', 'lu'),
(40010, 0, 1250108612, 1, 'Jeu logiciel NetTrader 2', 'Bonjour\r\n\r\nJ\'ai finalisé le logiciel NetTrader 2. Toutefois il est encore en période de test.\r\n\r\nMerci d\'indiquer sur le forum de NetTrader les dysfonctionnement du logiciel.\r\n\r\n<a href=\"http://www.nettrader.fr/install/Setup_Nettrader2.exe\">http://www.nettrader.fr/install/Setup_Nettrader2.exe</a>\r\n\r\nBon jeu.\r\n\r\nPS: Vous pouvez jouer dans ce logiciel ET dans le site internet, c\'est le même compte.\r\n\r\n\r\n', 'lu'),
(40659, 0, 1288730908, 1, 'news', 'Ca fait un moment que j\'ai pas posté de messages.\r\n\r\nBon hé bien rien de neuf. N\'hésitez pas à poster sur le forum. Surtout le forum suggestion, ainsi le jeu pourra peut être combler vos attentes..\r\n\r\nJ\'ai pas eu de retour sur le logiciel, donc on dirai que ca fonctionne ? Si c\'est pas le cas envoyez moi un mail, ou bien postez sur le forum Logiciel nettrader2.\r\n\r\n++', 'lu'),
(40266, 0, 1259686674, 1, 'Supporter NetTrader c\'est simple', 'NetTrader est hébergé sur un serveur dédié professionnel, le coût est de 340 &#8364; par an. L\'unique moyen de payer ce serveur est la publicité google qui apparait sur chaque page.\r\n\r\nJe ne vous demande pas de faire de don mais simplement d\'aller visiter une fois par jour les partenaires dont les liens apparaissent dans le cadre \"Annonces Google\".\r\n\r\nMerci de votre soutien', 'lu'),
(40391, 0, 1268340124, 1, 'Flux boursier en fonctionnement', 'Bonjour\r\n\r\nDésolé pour le blocage au niveaux des cours de la bourse. Le problème a été réparé et le système rendu plus stable face aux données de flux boursier erronés.\r\n\r\nBon jeu\r\n\r\n-Nicolas', 'lu'),
(40458, 0, 1271277254, 1, 'Fun-Trades', 'NetTrader est introduit dans le marché virtuel fun-trades.\r\n\r\nUn aperçu du cours de NetTrader :\r\n<a href=\"http://fun-trades.com/index.php?ref=5737\" target=\"_blank\"><img src=\"http://fun-trades.com/intragraphes/chand15j_site_16.png?1271276883\"></a>\r\n\r\nCliquez dessus si vous voulez acheter ce titre avec la monnaie de ce jeu \"les pixos\".', 'lu'),
(40715, 0, 1295091293, 1, 'Sauvegardez vos donn&eacute;es gratuitement', 'Un service permet de sauvegarder vos données dès quelles sont modifiées sur un serveur sécurisé. Avec ce service vous pouvez revenir sur les anciennes version de vos fichiers et retrouver ceux qui ont été supprimés. Le tout totalement intégré à votre explorateur de fichier, que ce soit sous Windows, Linux ou Mac !\r\n\r\nCe service est totalement gratuit et vous disposez d\'un espace de 2 Go.\r\n\r\n<a href=\"http://db.tt/LjqdN5n\">Cliquez ici pour découvrir ce service</a>', 'lu'),
(40611, 0, 1281952563, 1, 'Jeu logiciel NetTrader 2', 'Je vous rappel que vous pouvez télécharger la version logiciel de NetTrader 2.\r\n\r\n<a href=\"http://www.logitheque.com/logiciels/windows/comptabilite_gestion/bourse_actions_sicav/telecharger/nettrader_2_29421.htm\">Page de téléchargement NetTrader 2</a>\r\n\r\nCe logiciel utilise le compte que vous avez créé sur ce site et il s\'agit donc d\'une alternative d\'interface.\r\n\r\nSi vous aimez ce logiciel merci de laisser un commentaire sur la fiche logiciel afin de le faire connaitre.\r\n\r\nbon jeu\r\n\r\n-Nicolas\r\n\r\n', 'lu'),
(40743, 0, 1296994946, 1, 'Flux r&eacute;par&eacute;', 'Bonjour\r\n\r\nDésolé pour les désagréments. Les actions sont maintenant mis à jour correctement.\r\n\r\n-Nicolas', 'lu'),
(40927, 0, 1341427615, 1, 'Forum', 'Je vois qu\'il y quelque messages sur le forum, n\'hésitez pas à l\'utiliser pour demander conseil ou si vous avez des suggestions pour NetTrader\r\n\r\nBon jeu', 'lu');

-- --------------------------------------------------------

--
-- Structure de la table `niveau`
--

CREATE TABLE `niveau` (
  `idniveau` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `texteniveau` text NOT NULL,
  `seuil` smallint(6) NOT NULL DEFAULT 0,
  `vad` enum('0','1') NOT NULL DEFAULT '0',
  `plage` enum('0','1') NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `niveau`
--

INSERT INTO `niveau` (`idniveau`, `texteniveau`, `seuil`, `vad`, `plage`) VALUES
(1, 'Débutant', 1, '0', '0'),
(2, 'Initié', 1, '0', '1'),
(3, 'Expert', 1, '1', '1'),
(4, 'BetaTest', 1, '1', '1');

-- --------------------------------------------------------

--
-- Structure de la table `ordre`
--

CREATE TABLE `ordre` (
  `idordre` int(10) UNSIGNED NOT NULL,
  `codesico` int(11) NOT NULL DEFAULT 0,
  `idcompte` int(11) NOT NULL DEFAULT 0,
  `datecreation` decimal(10,0) NOT NULL DEFAULT 0,
  `sens` enum('achat','vente') NOT NULL DEFAULT 'achat',
  `nbr` int(11) NOT NULL DEFAULT 0,
  `pourc` float DEFAULT 0,
  `tempslim` decimal(10,0) NOT NULL DEFAULT 0,
  `coursmin` double NOT NULL DEFAULT 0,
  `coursmax` double NOT NULL DEFAULT 0,
  `etat` enum('1','0') NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `ordre`
--


-- --------------------------------------------------------

--
-- Structure de la table `portef`
--

CREATE TABLE `portef` (
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `codesico` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `quant` bigint(20) NOT NULL DEFAULT 0,
  `ansvaleur` float NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `portef`
--


-- --------------------------------------------------------

--
-- Structure de la table `progmess`
--

CREATE TABLE `progmess` (
  `idprogmess` mediumint(8) UNSIGNED NOT NULL,
  `progmess` mediumtext NOT NULL,
  `addrclic` varchar(255) NOT NULL DEFAULT '',
  `addrpopup` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `progmess`
--

INSERT INTO `progmess` (`idprogmess`, `progmess`, `addrclic`, `addrpopup`) VALUES
(1, '------Beta version------\r\nBienvenue dans la beta-version de NetTrader.\r\n\r\nMerci d\'indiquer le mauvais fonctionnement du logiciel dans le forum de NetTrader 2.\r\n\r\nBon jeu ;)', 'http://www.nettrader.fr', ''),
(2, 'Bonjour\r\n\r\nBienvenu dans la version logiciel du jeu NetTrader 2. N\'hésitez pas à fournir vos avis via le forum.\r\n\r\nBon trades', 'http://www.nettrader.fr', '');

-- --------------------------------------------------------

--
-- Structure de la table `reqlist`
--

CREATE TABLE `reqlist` (
  `idreq` smallint(6) NOT NULL,
  `libelreq` varchar(255) NOT NULL DEFAULT '',
  `req` text NOT NULL,
  `nbutil` smallint(6) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `reqlist`
--

INSERT INTO `reqlist` (`idreq`, `libelreq`, `req`, `nbutil`) VALUES
(4, 'Joueurs en ligne', 'SELECT compte.pseudonyme AS Pseudo, FROM_UNIXTIME( MAX(tempsconnect) )  AS  \'Heure de connexion\'\r\nFROM compte,Session\r\nWHERE compte.idcompte = Session.idcompte AND tempsconnect>UNIX_TIMESTAMP() - 30 * 60\r\nGROUP BY pseudonyme\r\nORDER BY tempsconnect DESC', 213),
(5, 'Verification Actions historique->Portefeuille', 'SELECT portef.idcompte as id1,historique.idcompte as id2, compte.pseudonyme , cacval.nom, SUM( historique.nbr * SIGN( historique.taxe )  )  AS restant, COALESCE( portef.quant, 0  )  - SUM( historique.nbr * SIGN( historique.taxe )  )  AS nbrerreur, COALESCE( portef.quant, 0  )  AS Possede\r\nFROM historique\r\nLEFT  JOIN portef\r\nUSING ( idcompte, codesico ) \r\nLEFT  JOIN cacval\r\nON historique.codesico = cacval.codesico \r\nLEFT JOIN compte\r\nON compte.idcompte = historique.idcompte\r\nGROUP  BY compte.pseudonyme , cacval.nom\r\nHAVING nbrerreur <> 0\r\nORDER  BY compte.pseudonyme ASC', 73),
(6, '30 premieres Actions (test flux)', 'SELECT nom, valeur, FROM_UNIXTIME( lasttime ) AS \'Date Action\', FROM_UNIXTIME( lasttimedown ) AS \'Date Téléchargement\' , authachat,down\r\nFROM `cacval` \r\nWHERE 1 ORDER BY lasttime ASC', 165),
(7, 'Nombre d\'ordre executé', 'SELECT compte.pseudonyme, FROM_UNIXTIME(compte.dateactivite) as dateact,COUNT( idhisto )  AS Nbordres\r\nFROM compte, historique\r\nWHERE compte.idcompte = historique.idcompte\r\nGROUP  BY pseudonyme,dateact\r\nORDER  BY Nbordres DESC', 30),
(8, 'Verification cashback', 'SELECT historique.idcompte, compte.pseudonyme, 10000 + SUM( ( valeurunique * nbr + taxe ) * SIGN( -historique.taxe )  )  AS restant, round(10000 + SUM( ( valeurunique * nbr + taxe ) * SIGN( -historique.taxe )  )  - compte.cashback,2) AS nbrerreur, compte.cashback AS Possede\r\nFROM compte,historique,cacval\r\nwhere compte.idcompte = historique.idcompte\r\nAND historique.codesico = cacval.codesico\r\nGROUP  BY idcompte, compte.pseudonyme\r\nHAVING nbrerreur <>0\r\nORDER  BY historique.idcompte ASC ', 36),
(9, 'Action le plus possédé', 'SELECT cacval.nom as Nom,SUM(portef.quant) as \'Quantitée\', SUM(portef.quant * cacval.valeur)  AS Valeur FROM cacval,portef WHERE cacval.codesico = portef.codesico GROUP BY cacval.nom ORDER BY Valeur DESC', 33),
(10, 'Nouveau inscrit au dernieres 24h', 'SELECT pseudonyme,FROM_UNIXTIME(dateinscr) AS \"Date d\'inscription\" FROM compte where dateinscr>UNIX_TIMESTAMP()-24*3600', 385),
(11, 'Actions achetés et vendu depuis 2h', 'SELECT cacval.nom as Nom,historique.sens  as Sens,SUM(historique.nbr) as \'Quantitée\', SUM(historique.nbr * cacval.valeur)  AS \"Valeur ( € ) \" FROM cacval,historique WHERE cacval.codesico = historique.codesico \r\nAND historique.temps>UNIX_TIMESTAMP()-2*3600\r\nGROUP BY cacval.nom,historique.sens ORDER BY \"Valeur ( € ) \" DESC', 76),
(12, 'Dernière connexion des joueurs', 'SELECT FROM_UNIXTIME( dateactivite, \'%d %M %Y\' ) AS \"Dernière connexion\", count( * ) as \"Nombre\"\r\nFROM `compte`\r\nWHERE dateactivite >0\r\nGROUP BY \"Dernière connexion\"\r\nORDER BY dateactivite DESC', 390),
(13, 'Dernière connect', 'SELECT FROM_UNIXTIME( dateactivite ) as Date\r\nFROM `compte`\r\nWHERE pseudonyme = \'Sethan\'', 19),
(14, 'Gain de lignes à la maintenance', 'SELECT COUNT( * ) AS \'Nombre de lignes à gagner\'\r\nFROM compte, historique\r\nWHERE compte.idcompte = historique.idcompte\r\nAND dateactivite < UNIX_TIMESTAMP( ) -3600 *24 *30 *2\r\nAND (\r\ndateactivite >0\r\nOR (\r\ndateactivite =0\r\nAND dateinscr < UNIX_TIMESTAMP( ) -3600 *24 *30\r\n)\r\n)', 26),
(15, 'Gain de ligne d\'histo par joueur', 'SELECT compte.idcompte AS id, compte.pseudonyme AS pseudo, dateactivite AS seclast,\r\nIF (\r\ndateactivite >0, FROM_UNIXTIME( dateactivite ) , \'\'\r\n) AS lastconnect, FROM_UNIXTIME( dateinscr ) AS \'date d\\\\\'inscription\', COUNT( * ) as \'Lignes d\\\\\'historique\'\r\nFROM compte, historique\r\nWHERE compte.idcompte = historique.idcompte\r\nAND dateactivite < UNIX_TIMESTAMP( ) -3600 *24 *30 *2\r\nAND (\r\ndateactivite >0\r\nOR (\r\ndateactivite =0\r\nAND dateinscr < UNIX_TIMESTAMP( ) -3600 *24 *30\r\n)\r\n)\r\nGROUP BY id, pseudo, seclast, lastconnect, \'date d\\\\\'inscription\'\r\nORDER BY dateactivite ASC', 19),
(16, 'Actions achetées depuis 9h', 'SELECT cacval.nom, ROUND( SUM( nbr * valeurunique ) , 2 ) AS Valeur, \'€\' AS \' \'\r\nFROM cacval, historique\r\nWHERE cacval.codesico = historique.codesico\r\nAND temps > UNIX_TIMESTAMP( DATE_FORMAT( NOW( ) , \'%Y-%m-%d 09:00:00\' ) )\r\nGROUP BY cacval.nom\r\nORDER BY Valeur DESC\r\nLIMIT 20', 24),
(17, 'Supprimer vieux ordres', 'DELETE FROM `ordre`\r\nWHERE (\r\n`etat` = \'0\' OR `tempslim` < UNIX_TIMESTAMP( )\r\n) AND `datecreation` < UNIX_TIMESTAMP( ) -604800', 20),
(18, 'Top fournisseur', 'SELECT count(  *  )  AS cpt, SUBSTRING( EMAIL, INSTR( EMAIL,  \'@\'  )  +1  )  AS provider\r\nFROM compte\r\nGROUP  BY provider\r\nORDER  BY cpt DESC', 33),
(19, 'Nombre d\'ordres éxécutés par jour', 'SELECT FROM_UNIXTIME( temps, \'%d %M %Y\' ) AS \"Date d\'éxécution\", count( * ) as \"Nombre d\'ordres\", CONCAT(SUM(nbr*valeurunique),\' €\')  Volume\r\nFROM `historique`\r\nWHERE temps>UNIX_TIMESTAMP()-604800\r\nGROUP BY \"Date d\'éxécution\"\r\nORDER BY \"Date d\'éxécution\" DESC', 44),
(20, 'Niveau des joueurs', 'SELECT `texteniveau` AS Niveau, COUNT( * ) AS Nombre\r\nFROM `niveau` , `compte`\r\nWHERE compte.idniveau = niveau.idniveau\r\nGROUP BY Niveau\r\nORDER BY niveau.idniveau', 43),
(21, 'Les actions à acheter', 'SELECT nom AS \'Nom action\', valeur AS \'Actuel\', COUNT( * ) AS \'Nombre de joueur\', ROUND( ABS( AVG( ansvaleur ) - valeur )/valeur*100 , 2 ) AS diff, MAX(idcompte), ROUND(SUM(( valeur - ansvaleur ) * quant),2)  as benef, SUM(quant) as tot\r\nFROM cacval, portef\r\nWHERE portef.codesico = cacval.codesico AND idcompte\r\nIN ( 36, 237, 1259, 1199, 2658, 1094, 579, 914, 340, 966 )\r\nGROUP BY \'Nom action\', \'Actuel\'\r\nORDER BY tot DESC', 18),
(23, 'Pseudo des actions à acheter', 'SELECT idcompte, pseudonyme\r\nFROM compte\r\nWHERE idcompte\r\nIN ( 36, 237, 1259, 1199, 2658, 1094, 579, 914, 340, 966 )\r\nORDER BY idcompte', 11),
(24, 'VAD ?', 'SELECT compte.pseudonyme, portef. *\r\nFROM `portef` , compte\r\nWHERE quant <0 AND portef.idcompte = compte.idcompte', 19),
(25, 'Essais de mot de passes', 'SELECT idcompte,count(*) as nbressai FROM `tabforcing` WHERE 1 group by idcompte ORDER BY nbressai DESC', 15),
(26, 'Skin des joueurs', 'SELECT nomskin, COUNT( * )\r\nFROM compte, skin\r\nWHERE compte.idskin = skin.idskin\r\nGROUP BY nomskin', 4),
(27, 'Skin choisis par joueurs', 'SELECT `nomskin` , COUNT( * ) FROM `skin` , `compte` WHERE compte.idskin = skin.idskin GROUP BY nomskin', 3),
(28, 'Messages joueurs', 'SELECT c2.pseudonyme MessFrom, c1.pseudonyme MessTo, FROM_UNIXTIME( datemess ) , titre, corps\r\nFROM `messages` m, compte c1, compte c2\r\nWHERE idenvoyeur !=1\r\nAND c1.idcompte = m.idcompte\r\nAND c2.idcompte = m.idenvoyeur\r\nORDER BY `m`.`datemess` DESC \r\nLIMIT 15', 893),
(29, 'Profits et Pertes des Joueurs', 'SELECT FROM_UNIXTIME( temps, \'%d %M %Y\' ) AS \"Date d\'éxécution\", SUM(IF(profit>0,profit,0)) as Profits,SUM(IF(profit<0,profit,0)) as Pertes\r\nFROM `historique`\r\nWHERE temps>UNIX_TIMESTAMP()-604800\r\nGROUP BY \"Date d\'éxécution\"\r\nORDER BY \"Date d\'éxécution\" DESC', 311),
(30, 'Commentaire Aide', 'SELECT FROM_UNIXTIME( `datecomment` ) , pseudonyme, `textecomment` \r\nFROM `tabaidecomment` tc, compte c\r\nWHERE tc.idcompte = c.idcompte\r\nORDER BY `datecomment` DESC \r\nLIMIT 10', 509),
(31, 'Commentaire faq', 'SELECT FROM_UNIXTIME( `datecomment` ) , pseudonyme, `textecomment` \r\nFROM `tabfaqcomment` tc, compte c\r\nWHERE tc.idcompte = c.idcompte\r\nORDER BY `datecomment` DESC \r\nLIMIT 10', 511),
(32, 'Mess forum', 'SELECT pseudonyme, contenu\r\nFROM `compte` , `f_message` fm, `f_corps` fc\r\nWHERE fm.idmessage = fc.idmessage\r\nAND compte.idcompte = fm.idcompte\r\nORDER BY fm.idmessage DESC \r\nLIMIT 0 , 30', 519),
(33, 'Joueurs vers Pro-at ( ip unique 24h)', 'SELECT FROM_UNIXTIME( tmps, \'%d %M %Y\' ) AS \"Date clic\",url, count( * ) as \"Nombre clics\"\r\nFROM (SELECT * FROM `statout` GROUP BY FROM_UNIXTIME( tmps, \'%d %M %Y\' ),ip) as stat\r\nGROUP BY \"Date clic\",url\r\nORDER BY tmps DESC', 1071),
(34, 'Joueurs vers domaine ( ip unique 24h)', 'SELECT FROM_UNIXTIME( tmps, \'%d %M %Y\' ) AS \"Date clic\",SUBSTRING(url, 1,INSTR( url,  \'.eu\'  )  +3 ) as lurl, count( * ) as \"Nombre clics\"\r\nFROM (SELECT * FROM `statout` GROUP BY FROM_UNIXTIME( tmps, \'%d %M %Y\' ),ip) as stat\r\nGROUP BY \"Date clic\",lurl\r\nORDER BY tmps DESC', 2017),
(35, 'Erreur reception mail', 'SELECT (SELECT count(  *  )  AS provider\r\nFROM compte cp\r\nWHERE cp.dateactivite=\'0\' and SUBSTRING( cp.EMAIL, INSTR( cp.EMAIL,  \'@\'  )  +1  ) = SUBSTRING( cpt.EMAIL, INSTR( cpt.EMAIL,  \'@\'  )  +1  )\r\n)/count(  *  )  AS cpt, SUBSTRING( EMAIL, INSTR( EMAIL,  \'@\'  )  +1  )  AS provider,count(  *  ) as nbmail\r\nFROM compte cpt\r\nGROUP  BY provider\r\nORDER  BY nbmail DESC', 37);

-- --------------------------------------------------------

--
-- Structure de la table `reqlistpublic`
--

CREATE TABLE `reqlistpublic` (
  `idreq` smallint(6) NOT NULL,
  `libelreq` varchar(255) NOT NULL DEFAULT '',
  `req` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci PACK_KEYS=0;

--
-- Déchargement des données de la table `reqlistpublic`
--

INSERT INTO `reqlistpublic` (`idreq`, `libelreq`, `req`) VALUES
(3, '10 derniers inscrits aux dernieres 24h', 'SELECT pseudonyme,FROM_UNIXTIME(dateinscr) AS \"Date d\'inscription\" FROM compte where dateinscr>UNIX_TIMESTAMP()-24*3600 ORDER BY dateinscr DESC LIMIT 0,10'),
(4, '10 Actions achetées et vendues depuis 2h', 'SELECT cacval.nom as Nom,historique.sens  as Sens,SUM(historique.nbr) as \'Quantitée\', SUM(historique.nbr * cacval.valeur)  AS \"Valeur\" FROM cacval,historique WHERE cacval.codesico = historique.codesico \r\nAND historique.temps>UNIX_TIMESTAMP()-2*3600\r\nGROUP BY cacval.nom,historique.sens ORDER BY \"Valeur ( € ) \" DESC LIMIT 10'),
(2, 'Les 5 actions les plus achetées depuis 9h aujourd\'hui', 'SELECT cacval.nom as Nom,ROUND(SUM(nbr*valeurunique),2) as Valeur, \'€\' as \'-\'  FROM cacval,historique WHERE cacval.codesico = historique.codesico AND temps>UNIX_TIMESTAMP( DATE_FORMAT( NOW( ) , \'%Y-%m-%d 09:00:00\' ) ) GROUP BY cacval.nom ORDER BY Valeur DESC LIMIT 5'),
(1, 'Nombre d\'ordres éxécutés par jour', 'SELECT FROM_UNIXTIME( temps, \'%d %M %Y\' ) AS \"Date d\'éxécution\", count( * ) as \"Nombre d\'ordres\", CONCAT(SUM(nbr*valeurunique),\' €\')  Volume\r\nFROM `historique`\r\nWHERE temps>UNIX_TIMESTAMP()-604800\r\nGROUP BY \"Date d\'éxécution\"\r\nORDER BY \"Date d\'éxécution\" DESC'),
(5, 'Profits et Pertes cumulées par jour', 'SELECT FROM_UNIXTIME( temps, \'%d %M %Y\' ) AS \"Date d\'éxécution\", SUM(IF(profit>0,profit,0)) as Profits,SUM(IF(profit<0,profit,0)) as Pertes\r\nFROM `historique`\r\nWHERE temps>UNIX_TIMESTAMP()-604800\r\nGROUP BY \"Date d\'éxécution\"\r\nORDER BY \"Date d\'éxécution\" DESC'),
(6, 'Meilleur vente aujourd\'hui', 'SELECT pseudonyme AS Pseudo, CONCAT(IF( profit >0, profit, 0 ),\' €\') AS Profits,nbr as Quantité, nom\r\nFROM `historique` , `compte` , `cacval`\r\nWHERE temps > UNIX_TIMESTAMP( DATE_FORMAT( NOW( ) , \'%Y-%m-%d 09:00:00\' ) )\r\nAND historique.idcompte = compte.idcompte and historique.codesico=cacval.codesico and sens=\'Vente\' GROUP BY historique.idcompte\r\nORDER BY profit DESC LIMIT 10');

-- --------------------------------------------------------

--
-- Structure de la table `scores`
--

CREATE TABLE `scores` (
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `datescore` date NOT NULL DEFAULT '0000-00-00',
  `capitalscores` float(20,2) UNSIGNED NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `scores`
--


-- --------------------------------------------------------

--
-- Structure de la table `scoresgroupes`
--

CREATE TABLE `scoresgroupes` (
  `idgroupe` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `datescore` date NOT NULL DEFAULT '0000-00-00',
  `capitaldeb` float(12,2) NOT NULL DEFAULT 0.00,
  `capitalfin` float(12,2) NOT NULL DEFAULT 0.00,
  `nbmembres` tinyint(3) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `scoresgroupes`
--


-- --------------------------------------------------------

--
-- Structure de la table `secteurent`
--

CREATE TABLE `secteurent` (
  `idsecteur` smallint(6) UNSIGNED NOT NULL,
  `libellesecteur` varchar(100) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `secteurent`
--

INSERT INTO `secteurent` (`idsecteur`, `libellesecteur`) VALUES
(1, 'Agroalimentaire'),
(2, 'Chimie'),
(3, 'Chimie Luxe et Cosmétiques'),
(4, 'Construction'),
(5, 'Distribution'),
(6, 'Equipement'),
(7, 'Finance'),
(8, 'Immobilier'),
(9, 'Loisirs'),
(10, 'Luxe et Cosmétiques'),
(11, 'Médias'),
(12, 'Métallurgie'),
(13, 'Minéraux'),
(14, 'Pétrole et Gaz Naturel'),
(15, 'Santé'),
(16, 'Services'),
(17, 'Sociétés de Participations'),
(18, 'Technologies de l\'Information'),
(19, 'Télécommunications'),
(20, 'Transports'),
(21, 'Véhicules et Equipements'),
(22, 'Non classée'),
(23, 'Trackers'),
(24, 'Biotechnologie');

-- --------------------------------------------------------

--
-- Structure de la table `session`
--

CREATE TABLE `session` (
  `idSession` varchar(64) NOT NULL DEFAULT '',
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `tempsLimite` decimal(10,0) NOT NULL DEFAULT 0,
  `tempsconnect` decimal(10,0) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `session`
--


-- --------------------------------------------------------

--
-- Structure de la table `skin`
--

CREATE TABLE `skin` (
  `idskin` int(5) NOT NULL DEFAULT 0,
  `nomskin` varchar(25) NOT NULL DEFAULT '',
  `repskin` varchar(25) NOT NULL DEFAULT '',
  `descriptionskin` varchar(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `skin`
--

INSERT INTO `skin` (`idskin`, `nomskin`, `repskin`, `descriptionskin`) VALUES
(1, 'Dark Blue', 'default', 'Fond bleu sombre, texte blanc'),
(2, 'Grey Tortle', 'GreyTortle', 'Fond gris, texte blanc, menu noir');

-- --------------------------------------------------------

--
-- Structure de la table `statmaj`
--

CREATE TABLE `statmaj` (
  `idstat` smallint(6) NOT NULL,
  `codesico` mediumint(8) UNSIGNED NOT NULL DEFAULT 0,
  `lasttime_ans` decimal(10,0) NOT NULL DEFAULT 0,
  `lasttimedown_ans` decimal(10,0) NOT NULL DEFAULT 0,
  `lasttime_nouv` decimal(10,0) NOT NULL DEFAULT 0,
  `lasttimedown_nouv` decimal(10,0) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `statout`
--

CREATE TABLE `statout` (
  `nbclic` mediumint(8) UNSIGNED NOT NULL,
  `tmps` decimal(10,0) NOT NULL,
  `ip` varchar(20) NOT NULL,
  `url` varchar(250) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `statout`
--


-- --------------------------------------------------------

--
-- Structure de la table `stats`
--

CREATE TABLE `stats` (
  `Date d'éxécution` varchar(72) DEFAULT NULL,
  `Profits` double(19,2) DEFAULT NULL,
  `Pertes` double(19,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `statsclassement`
--

CREATE TABLE `statsclassement` (
  `pseudonyme` varchar(30) NOT NULL DEFAULT '',
  `capital` double(23,2) DEFAULT NULL,
  `prog` double(23,2) DEFAULT NULL,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `statsclassement`
--


-- --------------------------------------------------------

--
-- Structure de la table `tabaide`
--

CREATE TABLE `tabaide` (
  `idaide` smallint(6) NOT NULL,
  `titreaide` varchar(255) NOT NULL DEFAULT '',
  `txtaide` text NOT NULL,
  `idchapaide` smallint(6) NOT NULL DEFAULT 0,
  `lnkaide` varchar(250) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `tabaide`
--

INSERT INTO `tabaide` (`idaide`, `titreaide`, `txtaide`, `idchapaide`, `lnkaide`) VALUES
(1, 'Portefeuille', '<p align=\\\"center\\\">&nbsp;</p>\r\n<p>&nbsp;&nbsp;&nbsp; Voici l\'ensemble des titres boursier que vous détenez, il\r\nest indiqué le nom de l\'action, le nombre d\'actions la valeur globale et\r\nunitaire, ainsi que les profit (plus-value) réalisé grâce à cette valeur.</p>\r\n<p>La plus value désigne la valeur en € et en pourcentage de différence entre le\r\nmoment où vous avez acheté ces actions et la valeur actuelle.</p>\r\n<p>A droite de portefeuille est indiqué la valeur totale de vos actions, ainsi\r\nque la plus-value totale.</p>\r\n<p><a name=\\\"Cashback\\\">&quot;Cash back&quot;</a> désigne les liquidités dont vous disposez,\r\nc\'est avec ces liquidités que vous achèterez les actions des sociétés.</p>\r\n<p>Total désigne la valeur de votre portefeuille plus vos liquidité, a droite\r\nest écrit votre progression par rapport au commencement.</p>\r\n<p>Pour les experts : Si le nombre des actions est négatif c\'est que vous êtes\r\nà découvert sur cette action, faites attention contrairement aux actions\r\nclassiques il n\'y a pas de limite quant aux pertes éventuelles sur une Vente à Découvert\r\nvous pouvez vous retrouver avec un capital négatif !</p>', 1, 'formlistaction'),
(2, 'Ordres', '<p align=\\\"center\\\">&nbsp;</p>\r\n<p>Cette liste s\'affiche si vous avez des ordres en attente d\'exécution, ces\r\nordres ont été créé lorsque vous avez demandé d\'acheter ou de vendre des\r\nactions, l\'ordre d\'achat ou de vente s\'exécutera que si elle rempli toutes ses\r\nconditions d\'exécution.</p>\r\n<p>Les conditions d\'exécution sont :</p>\r\n<ul>\r\n  <li>Une plage de la valeur de l\'action :</li>\r\n</ul>\r\n<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\r\nExemple : Exécution si la valeur de l\'action se trouve entre 10€ et 15€ (si la\r\nvaleur maxi est vide alors seul la valeur minimum compte)</p>\r\n<ul>\r\n  <li>Une date :</li>\r\n</ul>\r\n<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\r\nExemple : Exécution de l\'action à partir du 15/02/2005 (date du cours, donc il y aura un décalage de 15 minutes par rapport à la\r\nréalité.</p>', 1, 'listordre'),
(3, 'Formulaire d\'achat', '<p align=\\\"center\\\">&nbsp;</p>\r\n<p dir=\\\"ltr\\\">Ce formulaire vous permettra de créer un ordre d\'achat.</p>\r\n<p dir=\\\"ltr\\\">Vous avez deux outils de sélection, une liste déroulante vous\r\npermettant de sélection le nombre d\'action à acheter par rapport à votre\r\n<a href=%22#Cashback/\\\">CashBack</a>.</p>\r\n<p dir=\\\"ltr\\\">Par exemple si vous avez 10.000 € de liquidités, si vous\r\nachetez\r\npour 50% d\'action alors vous investirez 5.000€ dans ces actions .</p>\r\n<p dir=\\\"ltr\\\">Il y a également une zone de texte pour saisir plus précisément le\r\npourcentage d\'action à acheter.</p>\r\n<p dir=\\\"ltr\\\">Vous pouvez également saisir le nombre exact d\'action à acheter,\r\nfaites attention toutefois à ne pas acheter plus d\'action que vous ne le pouvez.</p>\r\n<p dir=\\\"ltr\\\">Pour les initiés : Vous pouvez choisir jusqu\'à quelle valeur\r\nl\'ordre d\'achat s\'exécutera. Les deux cases de choix vous permettent de choisir\r\nsi l\'achat se fera avec la quantité d\'action que vous avez choisis ou avec le\r\npourcentage des liquidités au moment où l\'ordre sera en mesure de s\'exécuter. Vous pouvez également sélectionner\r\njusqu\'a quelle date l\'ordre sera valide (il ne sera jamais exécuté après cette date ). Mettez -1 dans la valeur maxi pour indiquer qu\'il n\'y a pas de valeur maximum d\'execution.<br></p>\r\n<p dir=\\\"ltr\\\">Pour les experts : Vous pouvez donner une plage précise comme\r\ncondition à l\'exécution.<br>\r\n&nbsp;Si pour l\'action sélectionnée vous êtes à découvert d\'un certain\r\nnombre d\'action, dans la liste de sélection du % vous pouvez choisir de retirer\r\nx% du découvert, ceci afin de simplifier la saisie des ordres.<br><br>Il s\'agit de la date du cours (donc différé de 15 min par rapport à la\r\nréalité), l\'ordre ne pourra pas s\'exécuter avant 15 minutes après la création de l\'ordre afin que ceux disposant des cours en temps\r\nréel ne soit pas avantagés.</p>\r\n<p dir=\\\"ltr\\\">Cliquez sur le bouton &quot;acheter&quot; pour créer l\'ordre, celui-ci\r\ns\'exécutera automatiquement.</p>', 2, 'formachat'),
(4, 'Formulaire de vente', '<p dir=\\\"ltr\\\">&nbsp;</p>\r\n<p dir=\\\"ltr\\\">Ce formulaire vous permettra de créer un ordre de vente.</p>\r\n<p dir=\\\"ltr\\\">Vous avez deux outils de sélection, une liste déroulante vous\r\npermettant de sélection le nombre d\'action à acheter par rapport au nombre\r\nd\'action que vous possédez.</p>\r\n<p dir=\\\"ltr\\\">Il y a également une zone de texte pour saisir plus précisément le\r\npourcentage d\'action à acheter.</p>\r\n<p dir=\\\"ltr\\\">Vous pouvez également saisir le nombre exact d\'action à vendre,\r\nfaites attention toutefois à ne pas vendre plus d\'action que vous possédez.</p>\r\n<p dir=\\\"ltr\\\">Pour les initiés : Vous pouvez choisir à partir de quelle valeur\r\nl\'ordre de vente s\'exécutera. Les deux cases de choix vous permettent de choisir\r\nsi la vente se fera avec la quantité d\'action que vous avez choisis ou avec le\r\npourcentage des actions du portefeuille au moment où l\'ordre sera en mesure de\r\ns\'exécuter. Vous pouvez également sélectionner jusqu\'a quelle date l\'ordre\r\nsera valide (il ne sera jamais exécuté après cette date ). Mettez -1 dans la valeur maxi pour indiquer qu\'il n\'y a pas de valeur maximum d\'execution.</p>\r\n<p dir=\\\"ltr\\\">Pour les experts : Vous pouvez donner une plage précise comme\r\ncondition à l\'exécution.<br>\r\n&nbsp;Vous pouvez également vendre des actions que vous n\'avez pas, vous devrez\r\ndonc un certain nombre d\'action contre une somme d\'argent, l\'intérêt est que\r\npour faire des profits il faut que la valeur de l\'action baisse. Pour ne plus\r\navoir d\'action à découvert il suffit d\'acheter un nombre égal au nombre\r\nd\'action en découvert. La vente à découvert est un type d\'ordre trés\r\ndangereux mais peut vous apporter énormément,&nbsp; de grands risques mais\r\nbeaucoup de profits possibles.<br><br>Il s\'agit de la date du cours (donc différé de 15 min par rapport à la\r\nréalité), l\'ordre ne pourra pas s\'exécuter avant 15 minutes après la création de l\'ordre afin que ceux disposant des cours en temps\r\nréel ne soit pas avantagés.</p>\r\n<p dir=\\\"ltr\\\">Cliquez sur le bouton &quot;vendre&quot; pour créer l\'ordre, celui-ci\r\ns\'exécutera automatiquement.</p>\r\n<p dir=\\\"ltr\\\">Pour le niveau expert : Dans l\'outil de sélection du nombre d\'action à vendre il apparait \"x % du portefeuille\", en séléctionnant ce choix, vous vendrez que les actions que vous possedez, vous ne ferez pas de vente à découvert.</p>', 2, 'formvente'),
(5, 'Classement', '<p dir=\\\"ltr\\\" align=\\\"center\\\">&nbsp;</p>\r\n<p dir=\\\"ltr\\\">Ce tableau affiche le classement des joueurs en temps réel en\r\nfonction de la progression de leur portefeuille sur un mois.Le champ &quot;Recherche&quot;\r\nvous permet de rechercher un pseudonyme dans le classement.</p><br><br>Le but du jeu se trouve ici, vous avez un mois pour terminer premier, ainsi vous resterez à jamais le 1er du mois qui vient de s\'ecouler, utilisez la liste déroulante pour consulter les tableaux des scores de chaque mois passé.<p dir=\\\"ltr\\\"></p>', 1, 'formclasse'),
(6, 'Historique', '<p dir=\\\"ltr\\\" align=\\\"center\\\">&nbsp;</p>\r\n<p dir=\\\"ltr\\\">Ce tableau affiche tout les mouvements des actions de votre\r\nportefeuille.</p>\r\n<p dir=\\\"ltr\\\">Le total TTC correspond à la somme d\'argent crédité ou débité de\r\nvotre portefeuille. Pour la vente le Total Hors Taxes est soustrait de la taxe,\r\npour l\'achat la taxe est additionné au total hors taxe.</p>\r\n<p dir=\\\"ltr\\\">La date correspond au moment où l\'ordre a été exécuté.</p>', 1, 'formhisto'),
(7, 'Liste des valeurs', 'Ce tableau affiche la liste des actions pouvant être achetées dans NetTrader.<br><br> La colonne <b>valeur</b> représente la valeur actuelle de l\'action.<br><br> La colonne <b>part</b> représente le pourcentage des fonds investit par tout les joueurs sur cette action par rapport aux fonds investit par tout les joueurs sur toute les actions.<br><br> La colonne <b>votre part</b> représente, par rapport au total investit, ce qui vous avez investit dans cette action.<br><br>Il n\'y a pas de notion par d\'acquisition pour une valeur car il n\'y a pas de limite au nombre d\'action distribuées aux joueurs. <br><br>Le <b>Top 5 de la semaine</b> liste les actions qui ont eu le plus d\'achat et de vente sur la dernière semaine, ce qui peut indiquer des actions ayant un potentiel au yeux des joueurs de nettrader.Votre attention peut donc s\'appuyer sur ces 5 valeurs. <br><br> La liste <b>Vos secteurs</b> affiche les valeurs boursière qui ont leur secteur d\'activitée ( celle de l\'entreprise ) en commun avec les valeurs que vous avez dans votre portefeuille.Les Traders professionnel \"jouent\" sur des secteurs bien précis car grâce à cela il peuvent concentrer leurs recherches d\'actualitée sur un secteur bien précis !', 1, 'formlstactions');

-- --------------------------------------------------------

--
-- Structure de la table `tabaidecomment`
--

CREATE TABLE `tabaidecomment` (
  `idcomment` smallint(6) NOT NULL,
  `idaide` smallint(6) NOT NULL DEFAULT 0,
  `idcompte` smallint(6) NOT NULL DEFAULT 0,
  `datecomment` decimal(10,0) NOT NULL DEFAULT 0,
  `textecomment` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `tabaidecomment`
--


-- --------------------------------------------------------

--
-- Structure de la table `tabfaq`
--

CREATE TABLE `tabfaq` (
  `idaide` smallint(6) NOT NULL,
  `titreaide` varchar(255) NOT NULL DEFAULT '',
  `txtaide` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `tabfaq`
--

INSERT INTO `tabfaq` (`idaide`, `titreaide`, `txtaide`) VALUES
(1, 'J\'ai reçu l\'email de confirmation mais je n\'arrive pas à m\'identifier', 'Il se peut que vous ayez soit mal lu le mot de passe généré soit mal entré, je vous conseil d\'utiliser le copier-coller avec le mot de passe, vous serez ainsi certain de ne pas faire d\'erreur.'),
(2, 'Je n\'arrive pas à trouver la vente à découvert !', 'Il faut passer au mode expert, la vente pourra alors s\'effectuer sur des actions n\'étant pas en portefeuille et étant limité par l\'effet de levier ( 5x votre cashback )\r\n\r\nPour passer en mode expert, sur la page d\'accueil cliquer sur profil puis dans niveau séléctionner expert et taper le mot de passe, puis valider.'),
(3, 'Je viens de m\'inscrire mais je n\'ai pas reçu d\'email', 'Vous n\'avez pas entré l\'adresse email correct, il faut vous réinscrire avec un pseudonyme differend avec la bonne adresse email.'),
(4, 'Quels sont les taxes appliquées dans le jeu ?', 'La taxe suivante a été appliquée :<br><br>\r\n\r\ntaxe=<b>ValeurUnitaire</b>x<b>Quantité</b>x0.003x(1 + 0.196 )<br><br>\r\n\r\nIl y a donc une taxe de 0,3 % avec en plus la tva de 19,6% sur cette taxe, et il y a un minimum de 4,95 € de taxe pour chaque mouvements.'),
(5, 'Sur la page il est écrit que la bourse est fermé, pourquoi ?', 'Comme vous le savez NetTrader utilise les véritables cours de la bourse, et la bourse de paris n\'est pas ouverte tout le temps, elle n\'ouvre que du Lundi au Vendredi de 9h00 à 18h00.<br><br>Les achats et les ventes dans NetTrader se font donc seulement dans cette période.'),
(6, 'Je n\'arrive pas à télécharger NetTrader.', 'Le logiciel NetTrader est cours de développement il permetra de jouer avec le compte que vous utilisez actuellement sur ce site internet, un autre moyen de jouer en quelques sorte, vous serez averti par mail lors de sa sortie.<br><br>\r\n\r\nEn attendant veuillez utiliser le site internet pour jouer, ainsi une fois le logiciel disponible vous pourrez continuer à jouer avec le même compte.');

-- --------------------------------------------------------

--
-- Structure de la table `tabfaqcomment`
--

CREATE TABLE `tabfaqcomment` (
  `idcomment` smallint(6) NOT NULL,
  `idaide` smallint(6) NOT NULL DEFAULT 0,
  `idcompte` smallint(6) NOT NULL DEFAULT 0,
  `datecomment` decimal(10,0) NOT NULL DEFAULT 0,
  `textecomment` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `tabfaqcomment`
--


-- --------------------------------------------------------

--
-- Structure de la table `tabforcing`
--

CREATE TABLE `tabforcing` (
  `idforcing` smallint(5) UNSIGNED NOT NULL,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `dateforcing` decimal(10,0) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `test`
--

CREATE TABLE `test` (
  `d` int(11) NOT NULL DEFAULT 0,
  `dd` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `verifgroupe`
--

CREATE TABLE `verifgroupe` (
  `idverifgroupe` smallint(5) UNSIGNED NOT NULL,
  `idgroupe` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `idcompte` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `titregroupe` varchar(250) NOT NULL DEFAULT '',
  `initialgroupe` varchar(5) NOT NULL DEFAULT '',
  `urlsite` varchar(250) NOT NULL DEFAULT '',
  `descriptiongroupe` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `warn_old_sicav`
--

CREATE TABLE `warn_old_sicav` (
  `idcompte` mediumint(9) NOT NULL,
  `codesico` mediumint(9) NOT NULL,
  `link` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Structure de la table `weeklystatclassement`
--

CREATE TABLE `weeklystatclassement` (
  `pseudonyme` varchar(30) NOT NULL DEFAULT '',
  `capital` double(23,2) DEFAULT NULL,
  `prog` double(23,2) DEFAULT NULL,
  `idcompte` mediumint(8) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `weeklystatclassement`
--


-- --------------------------------------------------------

--
-- Structure de la table `_dummy`
--

CREATE TABLE `_dummy` (
  `num` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Déchargement des données de la table `_dummy`
--


--
-- Index pour les tables déchargées
--

--
-- Index pour la table `cacval`
--
ALTER TABLE `cacval`
  ADD PRIMARY KEY (`codesico`);

--
-- Index pour la table `cacvalmaj`
--
ALTER TABLE `cacvalmaj`
  ADD PRIMARY KEY (`codesico`),
  ADD UNIQUE KEY `yahooname` (`yahooname`);

--
-- Index pour la table `chapaide`
--
ALTER TABLE `chapaide`
  ADD PRIMARY KEY (`idchapaide`);

--
-- Index pour la table `compte`
--
ALTER TABLE `compte`
  ADD PRIMARY KEY (`idcompte`),
  ADD UNIQUE KEY `pseudonyme` (`pseudonyme`),
  ADD KEY `email` (`email`);

--
-- Index pour la table `conf`
--
ALTER TABLE `conf`
  ADD PRIMARY KEY (`libel`);

--
-- Index pour la table `f_corps`
--
ALTER TABLE `f_corps`
  ADD PRIMARY KEY (`idmessage`);

--
-- Index pour la table `f_forum`
--
ALTER TABLE `f_forum`
  ADD PRIMARY KEY (`idforum`);

--
-- Index pour la table `f_message`
--
ALTER TABLE `f_message`
  ADD PRIMARY KEY (`idmessage`),
  ADD KEY `idsujet` (`idsujet`);

--
-- Index pour la table `f_readforum`
--
ALTER TABLE `f_readforum`
  ADD PRIMARY KEY (`idforum`,`idcompte`);

--
-- Index pour la table `f_readsujet`
--
ALTER TABLE `f_readsujet`
  ADD PRIMARY KEY (`idsujet`,`idcompte`);

--
-- Index pour la table `f_section`
--
ALTER TABLE `f_section`
  ADD PRIMARY KEY (`idsection`);

--
-- Index pour la table `f_sujet`
--
ALTER TABLE `f_sujet`
  ADD PRIMARY KEY (`idsujet`),
  ADD KEY `idforum` (`idforum`);

--
-- Index pour la table `groupe`
--
ALTER TABLE `groupe`
  ADD PRIMARY KEY (`idgroupe`);

--
-- Index pour la table `historique`
--
ALTER TABLE `historique`
  ADD PRIMARY KEY (`idhisto`),
  ADD KEY `idcompte` (`idcompte`);

--
-- Index pour la table `invitegroupe`
--
ALTER TABLE `invitegroupe`
  ADD PRIMARY KEY (`idgroupe`,`idcompte`);

--
-- Index pour la table `mail_tosend`
--
ALTER TABLE `mail_tosend`
  ADD PRIMARY KEY (`idmail`);

--
-- Index pour la table `market`
--
ALTER TABLE `market`
  ADD PRIMARY KEY (`idmarket`);

--
-- Index pour la table `membregroupe`
--
ALTER TABLE `membregroupe`
  ADD PRIMARY KEY (`idcompte`);

--
-- Index pour la table `menu`
--
ALTER TABLE `menu`
  ADD PRIMARY KEY (`idmenu`);

--
-- Index pour la table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`idmsg`),
  ADD KEY `idcompte` (`idcompte`);

--
-- Index pour la table `niveau`
--
ALTER TABLE `niveau`
  ADD PRIMARY KEY (`idniveau`);

--
-- Index pour la table `ordre`
--
ALTER TABLE `ordre`
  ADD PRIMARY KEY (`idordre`);

--
-- Index pour la table `portef`
--
ALTER TABLE `portef`
  ADD PRIMARY KEY (`idcompte`,`codesico`);

--
-- Index pour la table `progmess`
--
ALTER TABLE `progmess`
  ADD PRIMARY KEY (`idprogmess`);

--
-- Index pour la table `reqlist`
--
ALTER TABLE `reqlist`
  ADD PRIMARY KEY (`idreq`);

--
-- Index pour la table `reqlistpublic`
--
ALTER TABLE `reqlistpublic`
  ADD PRIMARY KEY (`idreq`);

--
-- Index pour la table `scores`
--
ALTER TABLE `scores`
  ADD PRIMARY KEY (`idcompte`,`datescore`);

--
-- Index pour la table `scoresgroupes`
--
ALTER TABLE `scoresgroupes`
  ADD PRIMARY KEY (`idgroupe`,`datescore`);

--
-- Index pour la table `secteurent`
--
ALTER TABLE `secteurent`
  ADD PRIMARY KEY (`idsecteur`);

--
-- Index pour la table `session`
--
ALTER TABLE `session`
  ADD PRIMARY KEY (`idSession`,`idcompte`);

--
-- Index pour la table `skin`
--
ALTER TABLE `skin`
  ADD PRIMARY KEY (`idskin`);

--
-- Index pour la table `statmaj`
--
ALTER TABLE `statmaj`
  ADD PRIMARY KEY (`idstat`);

--
-- Index pour la table `statout`
--
ALTER TABLE `statout`
  ADD PRIMARY KEY (`nbclic`);

--
-- Index pour la table `statsclassement`
--
ALTER TABLE `statsclassement`
  ADD PRIMARY KEY (`idcompte`);

--
-- Index pour la table `tabaide`
--
ALTER TABLE `tabaide`
  ADD PRIMARY KEY (`idaide`);

--
-- Index pour la table `tabaidecomment`
--
ALTER TABLE `tabaidecomment`
  ADD PRIMARY KEY (`idcomment`);

--
-- Index pour la table `tabfaq`
--
ALTER TABLE `tabfaq`
  ADD PRIMARY KEY (`idaide`);

--
-- Index pour la table `tabfaqcomment`
--
ALTER TABLE `tabfaqcomment`
  ADD PRIMARY KEY (`idcomment`);

--
-- Index pour la table `tabforcing`
--
ALTER TABLE `tabforcing`
  ADD PRIMARY KEY (`idforcing`);

--
-- Index pour la table `test`
--
ALTER TABLE `test`
  ADD PRIMARY KEY (`d`);

--
-- Index pour la table `verifgroupe`
--
ALTER TABLE `verifgroupe`
  ADD PRIMARY KEY (`idverifgroupe`);

--
-- Index pour la table `warn_old_sicav`
--
ALTER TABLE `warn_old_sicav`
  ADD PRIMARY KEY (`idcompte`,`codesico`);

--
-- Index pour la table `_dummy`
--
ALTER TABLE `_dummy`
  ADD PRIMARY KEY (`num`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `chapaide`
--
ALTER TABLE `chapaide`
  MODIFY `idchapaide` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `compte`
--
ALTER TABLE `compte`
  MODIFY `idcompte` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `f_forum`
--
ALTER TABLE `f_forum`
  MODIFY `idforum` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `f_message`
--
ALTER TABLE `f_message`
  MODIFY `idmessage` mediumint(8) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `f_section`
--
ALTER TABLE `f_section`
  MODIFY `idsection` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `f_sujet`
--
ALTER TABLE `f_sujet`
  MODIFY `idsujet` mediumint(8) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `groupe`
--
ALTER TABLE `groupe`
  MODIFY `idgroupe` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `historique`
--
ALTER TABLE `historique`
  MODIFY `idhisto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `mail_tosend`
--
ALTER TABLE `mail_tosend`
  MODIFY `idmail` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `market`
--
ALTER TABLE `market`
  MODIFY `idmarket` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `menu`
--
ALTER TABLE `menu`
  MODIFY `idmenu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `messages`
--
ALTER TABLE `messages`
  MODIFY `idmsg` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41025;

--
-- AUTO_INCREMENT pour la table `ordre`
--
ALTER TABLE `ordre`
  MODIFY `idordre` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `progmess`
--
ALTER TABLE `progmess`
  MODIFY `idprogmess` mediumint(8) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `reqlist`
--
ALTER TABLE `reqlist`
  MODIFY `idreq` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT pour la table `reqlistpublic`
--
ALTER TABLE `reqlistpublic`
  MODIFY `idreq` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `secteurent`
--
ALTER TABLE `secteurent`
  MODIFY `idsecteur` smallint(6) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT pour la table `statmaj`
--
ALTER TABLE `statmaj`
  MODIFY `idstat` smallint(6) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `statout`
--
ALTER TABLE `statout`
  MODIFY `nbclic` mediumint(8) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `tabaide`
--
ALTER TABLE `tabaide`
  MODIFY `idaide` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `tabaidecomment`
--
ALTER TABLE `tabaidecomment`
  MODIFY `idcomment` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `tabfaq`
--
ALTER TABLE `tabfaq`
  MODIFY `idaide` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `tabfaqcomment`
--
ALTER TABLE `tabfaqcomment`
  MODIFY `idcomment` smallint(6) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT pour la table `tabforcing`
--
ALTER TABLE `tabforcing`
  MODIFY `idforcing` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Structure de la table `analytics_event`
--
CREATE TABLE IF NOT EXISTS `analytics_event` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(64) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `event_name` varchar(64) NOT NULL,
  `category` varchar(32) NOT NULL DEFAULT 'general',
  `properties` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_analytics_event_created_at` (`created_at`),
  KEY `idx_analytics_event_name` (`event_name`),
  KEY `idx_analytics_event_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Structure de la table `analytics_error`
--
CREATE TABLE IF NOT EXISTS `analytics_error` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(64) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `error_type` varchar(32) NOT NULL DEFAULT 'API_ERROR',
  `message` text NOT NULL,
  `route` varchar(255) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `stack_trace` mediumtext DEFAULT NULL,
  `context` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_analytics_error_created_at` (`created_at`),
  KEY `idx_analytics_error_type` (`error_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
