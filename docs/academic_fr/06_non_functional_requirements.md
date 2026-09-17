# Chapitre 06 : Exigences Non-Fonctionnelles

**Statut :** Spécification de référence mesurable

## Sécurité et Confidentialité

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-SEC-01 | Toutes les opérations d'API protégées doivent exiger une identité authentifiée. | Tests d'autorisation automatisés |
| NFR-SEC-02 | Chaque requête portant sur des données locataires doit appliquer une isolation stricte par entreprise (*company isolation*). | Les tests d'accès multi-entreprises renvoient une absence de données ou une réponse d'accès interdit |
| NFR-SEC-03 | Les mots de passe doivent exploiter un algorithme de hachage moderne tel qu'Argon2. | Inspection du format de hachage et tests d'authentification |
| NFR-SEC-04 | Les secrets d'application doivent être chargés depuis les variables d'environnement ou un gestionnaire de secrets et exclus du contrôle de version Git. | L'analyse du dépôt ne révèle aucun identifiant réel |
| NFR-SEC-05 | Les communications en environnement de production doivent obligatoirement utiliser le protocole HTTPS. | Revue de la configuration de déploiement |
| NFR-SEC-06 | Les données sensibles des propriétés ne doivent être communiquées qu'aux utilisateurs autorisés et aux flux contrôlés de l'agent conversationnel. | Tests de permissions et d'ancrage contextuel (*grounding*) de l'agent conversationnel |
| NFR-SEC-07 | Les points de terminaison d'authentification et les routes sensibles doivent appliquer une limitation de débit (*rate limiting*) ou une protection équivalente contre les abus avant toute mise en production. | Tests de requêtes répétées |
| NFR-SEC-08 | La vérification de la sécurité doit s'appuyer sur un sous-ensemble documenté du guide de vérification OWASP ASVS. | Grille d'audit de sécurité dans le rapport de test |

Le cadre juridique tunisien régissant les données à caractère personnel s'appuie sur la loi organique n° 2004-63 et les procédures de déclaration ou d'autorisation auprès de l'INPDP pour les traitements concernés. La conformité légale définitive doit être examinée avec une personne qualifiée préalablement à tout déploiement en production [REF-INPDP-LAW] [REF-INPDP-FORMS].

## Fiabilité et Intégrité des Données

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-REL-01 | Le retraitement d'un même événement externe ne doit pas générer d'enregistrements persistants en doublon. | Tests d'idempotence |
| NFR-REL-02 | Les défaillances d'intégration doivent être journalisées avec un état permettant leur reprise ultérieure. | Simulation de pannes |
| NFR-REL-03 | L'échec d'actualisation d'un calendrier ne doit pas supprimer les dernières données de réservation connues. | Test d'indisponibilité de flux |
| NFR-REL-04 | Les mises à jour de base de données impliquant des enregistrements interdépendants doivent s'exécuter au sein de transactions atomiques. | Tests d'intégration et revue de code |
| NFR-REL-05 | Les changements d'état critiques doivent consigner l'acteur et l'horodatage. | Vérification des champs d'audit |
| NFR-REL-06 | Les procédures de sauvegarde et de restauration doivent être documentées avant toute utilisation en phase pilote. | Exercice concluant de restauration |

## Performance

| ID | Exigence | Objectif initial |
|---|---|---|
| NFR-PERF-01 | Les pages authentifiées courantes doivent devenir opérationnelles rapidement sous charge pilote. | 95 % des requêtes API courantes traitées en moins de 1 seconde en conditions locales/pilotes, hors fournisseurs tiers |
| NFR-PERF-02 | Les points de terminaison de webhooks doivent acquitter rapidement les événements valides et différer les traitements lourds. | Réponse renvoyée en moins de 2 secondes en conditions de test |
| NFR-PERF-03 | L'importation des calendriers doit s'exécuter de manière asynchrone sans bloquer les requêtes des utilisateurs. | Test d'exécution des processus d'arrière-plan (*workers*) |
| NFR-PERF-04 | L'application doit supporter le portefeuille pilote convenu sans partitionnement manuel. | Test de charge avec au moins 100 propriétés et un volume représentatif d'enregistrements |

Les cibles de performance constituent des objectifs initiaux d'ingénierie et non des garanties de niveau de service contractuelles. Elles devront être réévaluées après mesures empiriques.

## Utilisabilité et Accessibilité

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-UX-01 | La navigation principale doit comporter six destinations exprimées en langage clair. | Revue d'interface |
| NFR-UX-02 | Les statuts majeurs doivent combiner texte, icône et couleur plutôt que de reposer uniquement sur la couleur. | Revue d'accessibilité |
| NFR-UX-03 | Les flux de travail fondamentaux doivent rester parfaitement utilisables sur les largeurs d'écran mobiles courantes. | Tests aux largeurs de 360 px, 390 px et 768 px |
| NFR-UX-04 | Les formulaires doivent fournir des étiquettes explicites, des messages de validation clairs et des directives constructives de résolution d'erreur. | Tests d'interface manuels et automatisés |
| NFR-UX-05 | Des états vide (*empty*), de chargement (*loading*), de succès (*success*) et d'échec (*failure*) doivent être conçus pour toutes les pages dépendantes de données. | Grille de contrôle des états par page |
| NFR-UX-06 | Les termes techniques doivent être remplacés ou explicités dans les interfaces destinées aux utilisateurs finaux. | Revue de terminologie avec les utilisateurs cibles |

## Maintenabilité

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-MNT-01 | Le référentiel doit posséder une architecture de référence unique et un système de design (*design system*) faisant autorité. | Revue documentaire |
| NFR-MNT-02 | Les évolutions de schéma de base de données doivent s'effectuer au moyen de migrations versionnées sous Alembic. | Revue de l'historique des migrations |
| NFR-MNT-03 | Le frontend et le backend doivent partager des schémas d'API documentés via OpenAPI ou des types générés lorsque cela est possible. | Revue des contrats d'interface |
| NFR-MNT-04 | Chaque branche de fonctionnalité (*feature branch*) doit rester circonscrite à un seul ticket analysable ou à une unité logique étroitement liée. | Revue des demandes d'intégration (*pull requests*) |
| NFR-MNT-05 | Les tests automatisés doivent couvrir les règles métier critiques du domaine. | Rapport de tests d'intégration continue (CI) |
| NFR-MNT-06 | Les journaux applicatifs doivent inclure des identifiants de corrélation pour les événements externes lorsque cela est pertinent. | Inspection des journaux (*logs*) |

## Portabilité et Déploiement

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-DEP-01 | Une procédure Docker documentée doit permettre de lancer la pile d'exécution de développement à partir d'un clone vierge du projet. | Test sur machine ou environnement vierge |
| NFR-DEP-02 | La configuration propre à un environnement ne doit requérir aucune modification du code source. | Comparaison des configurations de développement et de test |
| NFR-DEP-03 | Les sondes de santé (*health checks*) doivent distinguer l'état de préparation de l'API, de la base de données, de Redis et des processus d'arrière-plan (*workers*). | Test de santé des conteneurs |
| NFR-DEP-04 | Le déploiement doit prendre en charge l'exécution des migrations de base de données en tant qu'étape explicite de livraison. | Test de déploiement en environnement de pré-production (*staging*) |

## Qualité et Sécurité de l'Agent Conversationnel (Chatbot)

| ID | Exigence | Cible de vérification |
|---|---|---|
| NFR-AI-01 | L'agent conversationnel ne doit pas inventer de faits relatifs aux propriétés ni de disponibilités (*hallucinations*). | Jeu d'évaluation des réponses ancrées (*grounded*) |
| NFR-AI-02 | Les messages sensibles et incertains doivent faire l'objet d'une escalade vers un opérateur plutôt que d'une réponse non étayée. | Jeu d'évaluation des cas limites (*edge cases*) |
| NFR-AI-03 | Les sorties et décisions de l'agent conversationnel doivent être auditables. | Stockage de la source, de la version du modèle/configuration et du motif d'escalade |
| NFR-AI-04 | Des requêtes formulées en français, en anglais, en arabe standard moderne et en arabe tunisien représentatif doivent être évaluées. | Jeu de données de tests linguistiques |
| NFR-AI-05 | La sélection des modèles doit reposer sur des mesures tangibles de qualité, de latence et de coût, plutôt que sur des a priori de marque. | Comparatif d'évaluation documenté |
| NFR-AI-06 | Une panne d'un fournisseur d'IA ne doit pas empêcher le personnel de traiter manuellement les conversations. | Test de défaillance du fournisseur |
