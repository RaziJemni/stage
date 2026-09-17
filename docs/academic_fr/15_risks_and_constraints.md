# Chapitre 15 : Analyse des Risques et Contraintes

**Statut :** Registre des risques actif

## Échelle d'Évaluation des Risques

La probabilité d'occurrence et l'impact potentiel sont classés selon une échelle qualitative : Faible (*Low*), Moyen (*Medium*), Élevé (*High*) ou Critique (*Critical*). Le niveau de criticité global est déduit de cette combinaison et fait l'objet d'un réexamen formel au début de chaque cycle itératif de développement.

## Registre des Risques

| ID | Risque | Probabilité | Impact | Stratégie d'atténuation | Responsable |
|---|---|---|---|---|---|
| R-01 | Le périmètre du MVP excède la capacité de livraison d'une équipe de trois ingénieurs stagiaires | Élevée | Élevé | Définir des exclusions de périmètre strictes et imposer des arbitrages rigoureux pour tout ajout fonctionnel | Responsable d'équipe (*Team lead*) |
| R-02 | Indisponibilité ou absence d'accès officiel aux API partenaires des plateformes de réservation (Airbnb, Booking.com) | Élevée | Moyen | Exploiter les flux iCalendar normalisés (RFC 5545) et la saisie de réservations manuelles ; expliciter les limites fonctionnelles | Responsable Calendrier (*Calendar lead*) |
| R-03 | Flux de synchronisation de calendrier distant obsolète, incomplet ou indisponible | Moyenne | Élevé | Sondage périodique régulé (*polling*), politique de réessais avec repli exponentiel, conservation des dernières données valides et rafraîchissement forcé | Responsable Calendrier (*Calendar lead*) |
| R-04 | L'agent conversationnel (chatbot) génère une réponse erronée, hallucinée ou contractuellement engageante | Moyenne | Élevé | Ancrage contextuel strict (*grounding*), limitation aux catégories de requêtes sûres, escalade managériale obligatoire et journalisation d'audit | Responsable Communication (*Communication lead*) |
| R-05 | Qualité de compréhension ou d'expression insuffisante sur le dialecte arabe tunisien (*derja*) | Moyenne | Moyen | Constitution d'un jeu de tests local, validation humaine par des locuteurs natifs, escalade systématique en cas d'ambiguïté et réglage progressif | Responsable Communication (*Communication lead*) |
| R-06 | Délais excessifs dans la validation du compte professionnel WhatsApp Business par Meta | Moyenne | Élevé | Conception basée sur un simulateur local et le mode bac à sable (*sandbox*) ; isolation des appels derrière une interface d'adaptateur | Responsable Communication (*Communication lead*) |
| R-07 | Brèche d'étanchéité permettant à une entreprise d'accéder aux données d'une entreprise concurrente | Faible / Moyenne | Critique | Imposition d'un filtrage systématique par identifiant locataire (*tenant scoping*) dans toutes les requêtes, tests de non-régression d'isolation et revue de code | Responsable Plateforme (*Platform lead*) |
| R-08 | Divergence des contrats d'interface et incompatibilités logicielles entre branches de développement parallèles | Moyenne | Élevé | Spécification formelle des schémas OpenAPI, réduction de la taille des incréments, revues de code par les pairs et intégration continue fréquente | Équipe entière (*Entire team*) |
| R-09 | Implémentation du schéma relationnel avant la consolidation et l'approbation des flux de travail métier | Moyenne | Élevé | Revue collégiale de conception et validation formelle de la grille de cohérence conceptuelle avant toute création de migration Alembic | Responsable Base de données (*Database lead*) |
| R-10 | Confusion entre l'apparence esthétique d'un prototype d'interface et l'achèvement fonctionnel réel | Moyenne | Moyen | Transparence sur les états réels des fonctionnalités, critères stricts d'interconnexion avec les API et application rigoureuse de la Définition de Terminé (*DoD*) | Équipe entière (*Entire team*) |
| R-11 | Hétérogénéité des environnements d'exécution Docker et divergences de configuration entre développeurs | Moyenne | Moyen | Validation de la pile complète sur un clone vierge de référence et verrouillage strict des versions des dépendances (*pinning*) | Responsable Plateforme (*Platform lead*) |
| R-12 | Fuite d'informations sensibles (données voyageurs, codes de coffres à clés) dans les journaux d'événements ou les invites d'IA | Moyenne | Élevé | Application du principe de minimisation des données, assainissement automatique des logs, restriction d'accès et politique de rétention courte | Responsables Plateforme et IA (*Platform and AI leads*) |
| R-13 | Manque de validation empirique directe auprès des gestionnaires | Moyenne | Moyen | Validation des flux par rapport aux exigences métier documentées et aux tests automatisés ; entretiens de terrain maintenus comme ticket ouvert (#34) pour la phase pilote post-MVP | Coordinateur documentation (*Documentation coordinator*) |
| R-14 | Désynchronisation progressive entre les spécifications documentaires et l'implémentation logicielle effective | Élevée | Moyen | Association obligatoire des identifiants d'exigences dans les commits, mise à jour de la documentation au sein de la même PR et audit de traçabilité | Équipe entière (*Entire team*) |
| R-15 | Dépassement budgétaire lié à la tarification des modèles de langage ou des services d'infrastructure cloud | Moyenne | Moyen | Configuration de quotas d'appels, benchmarking de modèles légers et architecture permettant d'interchanger dynamiquement les fournisseurs | Responsable d'équipe (*Team lead*) |
| R-16 | Échec ou perturbation de la soutenance de démonstration suite à une panne imprévue des API externes | Moyenne | Élevé | Implémentation de jeux de données déterministes et d'un mode de simulation hors ligne entièrement autonome | Équipe entière (*Entire team*) |

## Contraintes Techniques

- **Socle de persistance relationnel :** adoption exclusive de PostgreSQL comme moteur de base de données relationnelle.
- **Cadre applicatif :** développement adossé à FastAPI (Python 3.12) pour l'API backend et à React / TypeScript (Vite) pour l'application cliente frontend.
- **Environnement de conteneurisation :** obligation d'exécuter et de valider l'ensemble des services au sein d'un environnement partagé Docker Compose.
- **Interopérabilité des calendriers :** restriction initiale de l'ingestion des calendriers aux spécifications standardisées du format iCalendar (RFC 5545).
- **Politique d'accès simplifiée :** absence délibérée de portail d'authentification pour les voyageurs et les prestataires externes de maintenance.
- **Dépendance aux politiques tierces :** assujettissement aux délais d'agrément, quotas de requêtes, contraintes de modération et règles de tarification imposés par Meta, OpenAI et les plateformes de réservation.

## Contraintes Organisationnelles

- **Composition de l'équipe :** répartition de l'ensemble des charges d'analyse, de conception, de développement, de test et de rédaction entre trois élèves-ingénieurs.
- **Maturité méthodologique :** expérience préalable limitée des membres quant à la coordination synchrone sur des projets logiciels complexes.
- **Encadrement académique et professionnel :** nécessité d'intégrer les arbitrages et réorientations formulés lors des revues d'étape avec les encadrants.
- **Échéances du stage :** limitation temporelle stricte imposant un arbitrage rigoureux entre l'étendue des intégrations techniques et la profondeur de la phase d'expérimentation pilote.

## Considérations Éthiques et Juridiques

- **Transparence algorithmique vis-à-vis des voyageurs :** proscription stricte de toute ambiguïté ; les réponses générées par le système automatisé ne doivent jamais se faire passer frauduleusement pour un engagement contractuel humain sans vérification.
- **Imputabilité des actions :** chaque message émis et chaque mise à jour opérationnelle doivent être formellement tracés et attribuables, avec possibilité permanente de reprise en main par un opérateur humain.
- **Principe de minimisation et finalité :** collecte et traitement restreints aux seules données strictement nécessaires à l'accueil du voyageur et à la maintenance des lieux.
- **Conformité au cadre juridique tunisien :** respect scrupuleux des obligations issues de la loi organique n° 2004-63 relative à la protection des données à caractère personnel et alignement sur les directives de l'INPDP.
- **Honnêteté intellectuelle et académique :** distinction rigoureuse, dans l'ensemble des livrables et du mémoire de fin d'études, entre les observations de terrain réelles, les hypothèses modélisées, les mécanismes simulés et les modules pleinement opérationnels.

## Scénario de Démonstration de Secours / Mode Dégradé

Afin de garantir la tenue irréprochable de la soutenance académique, le système intègre nativement un mode de fonctionnement dégradé autonome, capable de reproduire l'intégralité du cycle opérationnel en l'absence totale de connectivité vers les services externes :

- serveur local de simulation de flux iCalendar ou chargement direct de fichiers statiques RFC 5545 ;
- simulateur de webhooks WhatsApp permettant d'émettre des messages voyageurs depuis une interface de test dédiée ;
- adaptateur de communication factice interceptant et consignant les messages sortants sans interroger les serveurs de Meta ;
- bouchon (*stub*) de modèle d'IA configurable, reproduisant fidèlement les cas de réponses factuelles nominales et les scénarios d'escalade managériale obligatoire ;
- base de données pré-remplie avec un jeu de données de démonstration cohérent illustrant les situations multi-locataires et les conflits d'agendas.

Ce dispositif de continuité ne se substitue pas aux travaux d'intégration réelle réalisés ; il apporte la résilience indispensable pour prémunir l'évaluation académique contre toute panne d'infrastructure distante imprévue.
