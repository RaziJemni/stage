# Chapitre 16 : Matrice de Traçabilité

**Statut :** Socle de référence actif (implémentation du MVP vérifiée ; entretiens de terrain en attente de réalisation)

## Finalité

La démarche de traçabilité garantit une continuité rigoureuse entre les besoins exprimés par les parties prenantes, les exigences formelles (fonctionnelles et non fonctionnelles), les modules logiciels, les tickets d'implémentation et les campagnes de validation. Tous les tickets fonctionnels constitutifs du périmètre MVP sont aujourd'hui implémentés et validés par des suites de tests automatisées. Le ticket #34 encadre le protocole d'exploration client documenté au Chapitre 3, dont l'expérimentation sur le terrain est en cours de déploiement.

## Traçabilité Fonctionnelle

| Besoin | Exigences | Module | Ticket GitHub actuel | Vérification principale |
|---|---|---|---|---|
| Environnement partagé et contrats d'interface | NFR-MNT-03, NFR-DEP-01..04 | Foundation (Socle) | #30 | Validation du démarrage vierge et conformité des schémas d'API |
| Accès sécurisé à l'espace entreprise | FR-AUTH-01..06 | Foundation (Socle) | #18, #19 | Tests automatisés d'authentification, contrôle de rôles et migrations |
| Gestion du référentiel des propriétés | FR-PROP-01..05 | Properties/Calendar (Propriétés/Calendrier) | #7 | Tests CRUD et validation de l'isolation multi-locataire |
| Connexion d'une source de calendrier distante | FR-CAL-01..03, FR-CAL-09 | Properties/Calendar (Propriétés/Calendrier) | #3, #4 | Tests d'ingestion de flux iCalendar d'essai et contrôle d'idempotence |
| Enregistrement des réservations directes et calcul de disponibilité | FR-CAL-04, FR-MSG-07 | Properties/Calendar (Propriétés/Calendrier) | #31 | Tests de réservation manuelle et algorithme de disponibilité |
| Configuration et validation des tarifs en réservation directe | FR-CAL-10, NFR-REL-04..05 | Properties/Calendar (Propriétés/Calendrier) | #21 | Profils tarifaires, devisage serveur, audit des dérogations et isolation |
| Détection proactive des conflits de réservation | FR-CAL-05, FR-CAL-08 | Properties/Calendar (Propriétés/Calendrier) | #5 | Matrice de tests de chevauchement de dates |
| Consultation consolidée du calendrier du portefeuille | FR-CAL-06..07 | Properties/Calendar (Propriétés/Calendrier) | #6 | Tests de l'interface connectée et validation ergonomique mobile |
| Réception unifiée des messages voyageurs | FR-MSG-01..04 | Communication | #8, #11, #12 | Tests de traitement des webhooks, déduplication et affichage |
| Réponses automatisées dans la langue du voyageur | FR-MSG-05..07 | Communication/Chatbot | #9 | Évaluation multilingue des faits contextualisés (*grounding*) |
| Escalade managériale et reprise en main par un opérateur | FR-MSG-08..10 | Communication/Chatbot | #10, #11 | Tests de détection de messages sensibles et passation de contrôle |
| Suggestion automatique de ticket suite à un incident | FR-MSG-11..12 | Communication/Maintenance | #13 | Scénarios de suggestion, confirmation humaine et rejet |
| Création et structuration d'un ticket de maintenance | FR-TKT-01..02 | Maintenance | #13 | Tests de validation des champs et conformité du cycle de vie |
| Gestion du répertoire des prestataires et affectation | FR-TKT-03..04 | Maintenance | #14 | Tests de persistance des contacts et historique d'attribution |
| Traçabilité des statuts et historique immuable des tickets | FR-TKT-05..07 | Maintenance | #15 | Tests des règles de transition d'état et d'immuabilité du journal |
| Information du voyageur quant à la prise en charge de l'incident | FR-TKT-08 | Maintenance/Communication | #16 | Tests d'émission de messages d'information pré-validés |
| Supervision quotidienne des opérations clés | FR-DASH-01..04 | Supervision | #17 | Tests des requêtes d'agrégation d'indicateurs et navigation |
| Paramétrage général et transparence des intégrations | FR-SET-01..04 | Foundation/Supervision | #18, #32 | Tests de restriction de droits et restitution de l'état réel des flux |
| Qualification globale du MVP intégré | Exigences NFR transverses | Transverse | #33 | Scénario de bout en bout en staging (`test_mvp_validation.py`) |
| Remplacement des hypothèses de marché par des preuves de terrain | Validation de l'étude projet | Documentation | #34 | Protocole d'entretien validé (Chapitre 3) ; phase terrain à mener |

## Traçabilité Non Fonctionnelle

| Préoccupation de qualité | Exigences | Réponse de conception | Vérification |
|---|---|---|---|
| Authentification et habilitations | NFR-SEC-01, 03, 05, 07 | Mots de passe Argon2id, sessions opaques révocables, jetons CSRF, limitation de débit Redis, chiffrement TLS/HTTPS | Campagne de tests de sécurité et audit de configuration de production |
| Cloisonnement multi-locataire | NFR-SEC-02, 06 | Couche de persistance systématiquement filtrée par entreprise et contrôles d'accès par rôle | Tests automatisés d'accès inter-entreprises (*cross-company*) |
| Protection des secrets applicatifs | NFR-SEC-04 | Configuration externalisée par variables d'environnement et exclusions strictes Git | Balayage statique automatisé anti-fuite de secrets (*secret scanning*) |
| Idempotence et reprise sur panne | NFR-REL-01..04 | Identifiants d'événements externes, sessions de synchronisation isolées, transactions ACID et politique de réessais | Tests d'injection de messages en double et coupures réseau simulées |
| Auditabilité et imputabilité | NFR-REL-05, NFR-AI-03 | Horodatage infalsifiable avec traçabilité de l'acteur et journalisation de la provenance des déductions d'IA | Vérifications directes de l'intégrité de la base de données |
| Performance et passage à l'échelle | NFR-PERF-01..04 | Exécution asynchrone des traitements lourds, indexation relationnelle ciblée et requêtes optimisées | Tests de montée en charge sur l'API et les consommateurs de tâches (*workers*) |
| Ergonomie et expérience utilisateur | NFR-UX-01..06 | Organisation en six modules intuitifs, gestion explicite des états d'interface et conformité PWA mobile | Tests d'utilisabilité scénarisés auprès d'utilisateurs métiers |
| Maintenabilité et évolutivité | NFR-MNT-01..06 | Découpage modulaire strict, migrations de schéma versionnées, documentation OpenAPI et petites PRs | Revues de code par les pairs et validation continue (CI) |
| Déploiement et reproductibilité | NFR-DEP-01..04 | Conteneurs Docker standardisés, configuration partagée et sondes de santé applicatives | Validation sur clone vierge et déploiement automatisé |
| Sécurité et robustesse de l'IA | NFR-AI-01..06 | Ancrage contextuel strict (*grounding*), politiques d'escalade impératives et bascule de secours en mode dégradé | Évaluation systématique sur un corpus de test versionné (*eval dataset*) |

## Actions de Rapprochement du Backlog

1. **Création d'une épopée Socle (*Foundation*) :** regrouper les développements touchant l'entité Entreprise, l'authentification, les migrations de base de données et les conventions standardisées de l'API.
2. **Scission du module Propriétés :** isoler les opérations CRUD élémentaires de la gestion approfondie des consignes opérationnelles d'accueil si la complexité d'un ticket l'exige.
3. **Décomposition des connecteurs de calendrier :** fractionner chaque intégration de flux en sous-tâches bien délimitées : configuration du lien, première synchronisation, mise à jour périodique / gestion des annulations et surveillance de l'état de synchronisation.
4. **Formalisation des réservations directes :** consacrer des tickets d'implémentation dédiés à la saisie manuelle des séjours et au moteur de calcul de disponibilité.
5. **Découplage de la messagerie :** séparer nettement le transport réseau lié aux webhooks de la couche de persistance et de consultation des fils de discussion.
6. **Isolation des briques de l'agent conversationnel :** dissocier l'élaboration des réponses factuelles vérifiées, l'outil d'interrogation du calendrier, l'algorithme de détection de l'escalade et le banc de test d'évaluation.
7. **Validation explicite de la maintenance :** modéliser la confirmation par un opérateur humain des suggestions d'interventions générées par l'IA comme une action opérationnelle à part entière.
8. **Clarification des tickets d'interface utilisateur :** requalifier l'état d'avancement des tickets frontend après avoir arbitré si la réalisation d'une maquette interactive relève de la phase de conception ou de la mise en œuvre logicielle définitive.
9. **Systématisation des métadonnées :** attribuer les identifiants d'exigences (FR / NFR) et formaliser les liens de dépendance sur l'ensemble des tickets du périmètre MVP.
10. **Sanctuarisation du périmètre MVP :** maintenir les tickets prévus pour la Phase 2 en dehors des vues de sprint actives du carnet de produit.

## Traçabilité des Changements

Lorsqu'une évolution d'exigence intervient au cours du cycle de vie du projet, la procédure de traçabilité suivante doit être scrupuleusement observée :

1. Mettre à jour l'énoncé de l'exigence et consigner sa version ainsi que son statut d'approbation.
2. Actualiser les cas d'utilisation, les scénarios nominaux et d'exception ainsi que les diagrammes UML impactés.
3. Modifier le chapitre de modélisation des données ou d'architecture logicielle si la modification altère la conception technique.
4. Répercuter immédiatement ces ajustements sur les tickets GitHub correspondants et leurs critères d'acceptation.
5. Adapter ou étendre les scénarios de tests automatisés (unitaires, d'intégration ou fonctionnels) garants de la conformité.
6. Consigner une nouvelle fiche de décision au sein du registre d'architecture (*Decision Log*) pour toute modification substantielle d'orientation technique ou fonctionnelle.
