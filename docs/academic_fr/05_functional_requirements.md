# Chapitre 05 : Exigences Fonctionnelles

**Statut :** Spécification de référence proposée pour la réconciliation du backlog

## Convention sur les Exigences

Chaque exigence dispose d'un identifiant stable. La priorisation applique la convention MoSCoW :

- **Must (Indispensable) :** requis pour le MVP du stage
- **Should (Important) :** important, mais pouvant faire l'objet d'une implémentation simplifiée
- **Could (Secondaire) :** utile si le calendrier le permet
- **Won't (Exclu) :** exclu du périmètre du MVP actuel

## Authentification et Gestion de l'Entreprise

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-AUTH-01 | Un gestionnaire doit pouvoir créer ou activer un compte d'entreprise. | Must | Les enregistrements de l'entreprise et du gestionnaire sont persistés |
| FR-AUTH-02 | Un utilisateur doit pouvoir s'authentifier à l'aide de son adresse e-mail et de son mot de passe. | Must | Des identifiants valides génèrent une session authentifiée ; des identifiants invalides sont rejetés |
| FR-AUTH-03 | Le système doit hacher les mots de passe et ne jamais stocker de mots de passe en clair. | Must | La base de données ne contient que des empreintes cryptographiques sécurisées |
| FR-AUTH-04 | Un gestionnaire doit pouvoir créer, inviter, désactiver et consulter les comptes du personnel opérationnel (*staff*). | Must | Les modifications sont persistées et affectent immédiatement les accès |
| FR-AUTH-05 | Le backend doit restreindre l'accès aux opérations réservées aux gestionnaires pour les utilisateurs du personnel. | Must | Les appels directs non autorisés à l'API renvoient une réponse 403 Interdit (*Forbidden*) |
| FR-AUTH-06 | Un utilisateur authentifié doit pouvoir se déconnecter et invalider ou supprimer les identifiants de sa session active. | Must | Les requêtes protégées ultérieures échouent |

## Gestion des Propriétés

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-PROP-01 | Un gestionnaire doit pouvoir créer une propriété rattachée à l'entreprise courante. | Must | La propriété est persistée et apparaît dans la liste des propriétés |
| FR-PROP-02 | Les utilisateurs autorisés doivent pouvoir consulter les détails d'une propriété. | Must | Seules les propriétés de l'entreprise courante sont visibles |
| FR-PROP-03 | Un gestionnaire doit pouvoir modifier les détails d'une propriété ainsi que ses connaissances opérationnelles. | Must | Les valeurs mises à jour se rechargent correctement |
| FR-PROP-04 | Les connaissances opérationnelles de la propriété doivent inclure les modalités d'arrivée (*check-in*), les accès Wi-Fi, le stationnement, le règlement intérieur, les équipements et les consignes d'urgence, selon le cas. | Must | Les informations peuvent être stockées et extraites pour l'ancrage contextuel (*grounding*) de l'agent conversationnel |
| FR-PROP-05 | Un gestionnaire doit pouvoir archiver une propriété sans supprimer l'historique des réservations, des messages ou des tickets associés. | Should | La propriété archivée est masquée des vues actives standards, mais l'historique reste conservé |

## Canaux, Réservations et Calendrier

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-CAL-01 | Un gestionnaire doit pouvoir ajouter et mettre à jour un flux de calendrier pris en charge pour une propriété. | Must | Une configuration valide est persistée ; une URL invalide est rejetée |
| FR-CAL-02 | Le système doit importer périodiquement les événements iCalendar. | Must | Les événements nouveaux ou modifiés apparaissent dans l'intervalle de scrutation (*polling*) configuré |
| FR-CAL-03 | Le système doit mettre à jour ou annuler les enregistrements importés existants sans créer de doublons. | Must | La réimportation d'un même flux demeure idempotente |
| FR-CAL-04 | Les utilisateurs autorisés doivent pouvoir créer des réservations manuelles ou directes. | Must | La réservation manuelle bloque les dates sélectionnées en interne |
| FR-CAL-05 | Le système doit détecter les chevauchements pertinents de réservations actives pour une même propriété. | Must | Les chevauchements réels génèrent un conflit ; les séjours consécutifs (*back-to-back*) ne génèrent pas de conflit |
| FR-CAL-06 | Les utilisateurs autorisés doivent pouvoir visualiser un calendrier multi-propriétés. | Must | Les réservations s'affichent sur les propriétés et aux dates appropriées |
| FR-CAL-07 | Le calendrier doit distinguer la source et le statut de la réservation par du texte accompagné d'indicateurs visuels. | Must | La signification est intelligible sans reposer exclusivement sur la couleur |
| FR-CAL-08 | Les gestionnaires et le personnel opérationnel doivent pouvoir consulter les détails d'un conflit ainsi que son état de prise en compte (*acknowledgement*). | Must | La source du conflit, les dates et les réservations concernées sont visibles |
| FR-CAL-09 | Le système doit consigner l'état d'actualisation des calendriers et les erreurs survenues. | Must | Les utilisateurs peuvent distinguer les flux à jour, retardés ou en échec |
| FR-CAL-10 | Un gestionnaire doit pouvoir configurer les règles tarifaires de base, de week-end et saisonnières pour les réservations directes, et les opérateurs autorisés doivent recevoir une recommandation calculée par le serveur. | Should | Les règles sont persistées par propriété d'entreprise ; une réservation directe enregistre un prix explicitement approuvé ou une dérogation justifiée |

## Conversations Voyageurs et Agent Conversationnel (Chatbot)

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-MSG-01 | Le système doit recevoir les événements webhooks entrants de WhatsApp ou les événements équivalents d'un simulateur. | Must | Tout événement valide est accepté et persisté |
| FR-MSG-02 | Le système doit identifier ou créer la conversation appropriée selon le contexte du voyageur et de la propriété. | Must | Le message apparaît dans la conversation adéquate |
| FR-MSG-03 | Le système doit empêcher l'enregistrement en double des événements de messages externes réémis. | Must | Un même identifiant de message externe n'est stocké qu'une seule fois |
| FR-MSG-04 | Les utilisateurs autorisés doivent pouvoir consulter les listes de conversations et l'historique ordonné des messages. | Must | Les messages affichent l'expéditeur, l'horodatage, la langue et l'état de distribution |
| FR-MSG-05 | L'agent conversationnel doit détecter ou utiliser la langue prise en charge du voyageur. | Must | La réponse est formulée en français, anglais ou arabe selon le contexte |
| FR-MSG-06 | L'agent conversationnel doit répondre aux questions courantes et sûres sur les propriétés en exploitant la fiche de la propriété concernée. | Must | Les questions de test reçoivent des réponses ancrées sans faits inventés (*hallucinations*) |
| FR-MSG-07 | Les réponses relatives aux disponibilités doivent être calculées par une fonction dédiée du backend. | Must | La sortie du modèle d'IA ne peut prévaloir sur le résultat de la base de données |
| FR-MSG-08 | L'agent conversationnel doit transférer (*escalader*) les demandes sensibles ou incertaines aux opérateurs humains au lieu de répondre automatiquement. | Must | Les réclamations, remboursements, annulations, paiements, urgences et cas incertains sont signalés |
| FR-MSG-09 | Le personnel opérationnel doit pouvoir prendre le contrôle d'une conversation et répondre manuellement. | Must | L'envoi automatique par l'agent conversationnel est désactivé pendant la reprise en main manuelle |
| FR-MSG-10 | Le système doit enregistrer si chaque message sortant a été généré par l'agent conversationnel ou rédigé par un membre du personnel. | Must | La source du message est vérifiable et auditable |
| FR-MSG-11 | L'agent conversationnel peut suggérer un ticket de maintenance à partir d'un incident signalé par un voyageur. | Should | Une suggestion structurée est présentée sans créer de ticket de manière automatique |
| FR-MSG-12 | Le personnel opérationnel doit pouvoir confirmer, modifier ou rejeter une suggestion de ticket émise par l'agent conversationnel. | Should | Seule la confirmation explicite déclenche la création effective du ticket |
| FR-MSG-13 | L'agent conversationnel peut fournir un lien de réservation externe configuré par le propriétaire après vérification de la disponibilité. | Could | Aucune réservation n'est créée directement par Vayca à partir de cette interaction voyageur |

## Maintenance

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-TKT-01 | Les utilisateurs autorisés doivent pouvoir créer un ticket associé à une propriété et, facultativement, à une réservation. | Must | Les champs obligatoires sont validés et persistés |
| FR-TKT-02 | Un ticket doit posséder une priorité définie et un état dans son cycle de vie. | Must | L'état utilise les valeurs Ouvert (*Open*), Assigné (*Assigned*), En cours (*In Progress*), Résolu (*Resolved*) ou Annulé (*Cancelled*) conformément aux spécifications |
| FR-TKT-03 | Un gestionnaire ou un membre autorisé du personnel doit pouvoir tenir à jour le répertoire des prestataires. | Must | Les prestataires sont de simples contacts et ne disposent pas d'identifiants d'authentification |
| FR-TKT-04 | Le personnel opérationnel doit pouvoir assigner manuellement un prestataire et consigner cette affectation. | Must | L'historique d'assignation mentionne le prestataire, l'acteur à l'origine de l'action et l'horodatage |
| FR-TKT-05 | Les utilisateurs autorisés doivent pouvoir mettre à jour l'état d'un ticket. | Must | Toute transition valide est persistée ; toute transition invalide est rejetée |
| FR-TKT-06 | Les utilisateurs autorisés doivent pouvoir visualiser les interventions de maintenance filtrées par statut et par propriété. | Must | Le tableau (*Kanban*) ou la liste reflète fidèlement l'état de la base de données |
| FR-TKT-07 | Le système doit conserver l'historique du ticket et de ses affectations après sa résolution. | Must | L'enregistrement historique demeure accessible |
| FR-TKT-08 | Le personnel opérationnel peut envoyer un message d'information au voyageur lors du changement d'état d'un ticket lié. | Should | Le message est relu ou généré à partir d'un modèle validé |

## Tableau de Bord et Alertes

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-DASH-01 | Le tableau de bord doit afficher les éléments requérant une attention immédiate. | Must | Les conflits, conversations escaladées et tickets urgents sont visibles |
| FR-DASH-02 | Le tableau de bord doit présenter les arrivées et départs prévus aujourd'hui. | Must | Les valeurs sont calculées à partir des données de réservations actives |
| FR-DASH-03 | Le tableau de bord doit afficher les indicateurs d'occupation fondamentaux du parc de logements. | Should | Les valeurs sont calculées et non codées en dur |
| FR-DASH-04 | Les utilisateurs doivent pouvoir accéder au flux opérationnel correspondant depuis chaque élément du tableau de bord. | Must | Chaque alerte redirige vers la réservation, la conversation ou le ticket pertinent |

## Paramètres et Visibilité des Intégrations

| ID | Exigence | Priorité | Résumé d'acceptation |
|---|---|---|---|
| FR-SET-01 | Les gestionnaires doivent pouvoir visualiser et mettre à jour les paramètres de l'entreprise. | Must | L'accès est strictement interdit au personnel opérationnel (*staff*) |
| FR-SET-02 | Les gestionnaires doivent pouvoir visualiser l'état de connexion des canaux de réservation. | Must | L'état reflète la configuration réelle et l'heure de la dernière actualisation |
| FR-SET-03 | Les gestionnaires doivent pouvoir consulter le mode et l'état de santé de l'intégration WhatsApp. | Should | L'interface distingue les modes simulateur, test et production |
| FR-SET-04 | L'interface ne doit pas afficher une intégration comme connectée lorsqu'elle est simulée ou non configurée. | Must | L'état affiché lors des démonstrations est rigoureusement conforme à la réalité |
