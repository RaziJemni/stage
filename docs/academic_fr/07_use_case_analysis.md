# Chapitre 07 : Analyse des Cas d'Utilisation

**Statut :** Référentiel proposé

## Catalogue des Cas d'Utilisation

| ID | Cas d'utilisation | Acteur principal | Acteur/Système de support |
|---|---|---|---|
| UC-AUTH-01 | Se connecter | Gestionnaire ou personnel (*staff*) | Service d'authentification |
| UC-TEAM-01 | Gérer le personnel | Gestionnaire | Service de messagerie électronique (optionnel) |
| UC-PROP-01 | Gérer une propriété | Gestionnaire | Base de données |
| UC-CAL-01 | Connecter un flux de calendrier | Gestionnaire | Flux de la plateforme de réservation |
| UC-CAL-02 | Synchroniser le calendrier | Système | Processus d'arrière-plan (*worker*), flux externe |
| UC-CAL-03 | Créer une réservation manuelle | Gestionnaire ou personnel (*staff*) | Service de détection des conflits |
| UC-CAL-04 | Examiner un conflit de réservation | Gestionnaire ou personnel (*staff*) | Service d'alertes |
| UC-MSG-01 | Recevoir un message voyageur | Voyageur | Fournisseur WhatsApp |
| UC-MSG-02 | Répondre à une question sûre d'un voyageur | Agent conversationnel (*chatbot*) | Services de propriété et de disponibilité |
| UC-MSG-03 | Escalader une conversation | Agent conversationnel / Système | Personnel opérationnel (*staff*) |
| UC-MSG-04 | Reprendre en main une conversation | Personnel opérationnel (*staff*) | Fournisseur WhatsApp |
| UC-TKT-01 | Suggérer un ticket de maintenance | Agent conversationnel (*chatbot*) | Personnel opérationnel (*staff*) |
| UC-TKT-02 | Créer un ticket de maintenance | Gestionnaire ou personnel (*staff*) | Service des propriétés/réservations |
| UC-TKT-03 | Assigner un prestataire | Gestionnaire ou personnel (*staff*) | Répertoire des prestataires |
| UC-TKT-04 | Mettre à jour le statut d'un ticket | Gestionnaire ou personnel (*staff*) | Service de messagerie voyageur (optionnel) |
| UC-DASH-01 | Consulter les opérations journalières | Gestionnaire ou personnel (*staff*) | Ensemble des modules opérationnels |

## UC-AUTH-01 : Se Connecter

**Préconditions :** Le compte utilisateur existe et est actif.  
**Déclencheur :** L'utilisateur soumet son adresse e-mail et son mot de passe.

### Scénario nominal (Flux principal)

1. Le système valide le format des données saisies.
2. Le système recherche le compte utilisateur correspondant.
3. Le système vérifie l'empreinte cryptographique du mot de passe (*hash*).
4. Le système génère des identifiants d'authentification signés.
5. Le système retourne l'identité de l'utilisateur, ainsi que le contexte de son entreprise et de son rôle.
6. L'application redirige l'utilisateur vers le Tableau de bord.

### Scénarios alternatifs (Flux alternatifs)

- Identifiants invalides : afficher une erreur d'authentification générique.
- Compte inactif : refuser l'accès et fournir une directive de contact.
- Tentatives infructueuses excessives : appliquer une limitation de débit (*rate limiting*).

**Postcondition :** Une session authentifiée est établie pour un utilisateur actif.

## UC-CAL-02 : Synchroniser le Calendrier

**Préconditions :** Une propriété active et une configuration valide de flux de calendrier existent.  
**Déclencheur :** Exécution planifiée du processus d'arrière-plan (*worker*) ou actualisation manuelle par un utilisateur autorisé.

### Scénario nominal (Flux principal)

1. Le processus d'arrière-plan crée un enregistrement d'exécution de synchronisation (*synchronization run*).
2. Le processus d'arrière-plan télécharge le flux de calendrier externe.
3. L'analyseur syntaxique valide le contenu iCalendar conformément aux éléments pris en charge de la RFC 5545 [REF-IETF-ICAL].
4. Chaque événement pris en charge est normalisé en données de réservation ou de période bloquée.
5. Les enregistrements existants sont mis en correspondance selon le canal et l'identifiant d'événement externe.
6. Les nouveaux enregistrements sont créés et les enregistrements modifiés sont mis à jour.
7. Les événements disparus ou annulés appliquent la politique d'annulation convenue.
8. Le module de détection de conflits évalue les périodes actives modifiées.
9. L'exécution consigne le succès de l'opération, le décompte des entités traitées et l'horodatage d'achèvement.

### Scénarios alternatifs (Flux alternatifs)

- Flux indisponible : conserver les données antérieures et marquer l'actualisation en échec.
- Événement invalide : consigner l'erreur relative à l'événement et poursuivre le traitement des autres événements de manière sécurisée.
- Réémission d'événement : mettre à jour l'enregistrement correspondant sans générer de doublon.

**Postcondition :** La base de données reflète le dernier état du flux interprété avec succès.

## UC-CAL-04 : Examiner un Conflit de Réservation

**Préconditions :** Le mécanisme de détection a identifié des réservations actives qui se chevauchent.  
**Déclencheur :** L'utilisateur ouvre une alerte de conflit.

### Scénario nominal (Flux principal)

1. Le système affiche la propriété, les dates, les canaux sources des réservations et leurs statuts actuels.
2. L'utilisateur vérifie les informations issues des plateformes sources.
3. L'utilisateur prend acte du conflit ou consigne sa résolution effectuée à l'extérieur de la plateforme.
4. Le système enregistre la prise d'acte (*acknowledgement*) ainsi que l'opérateur concerné.

Vayca n'annule ni ne modifie automatiquement aucune réservation sur la plateforme source dans le cadre du MVP.

## UC-MSG-02 : Répondre à une Question Sûre d'un Voyageur

**Préconditions :** Le message du voyageur est rattaché à une propriété ou à un contexte de réservation résolu de manière fiable.  
**Déclencheur :** Un message entrant pris en charge est enregistré.

### Scénario nominal (Flux principal)

1. Le système identifie la langue et l'intention du message.
2. Le système catégorise la demande en tant que sûre, sensible ou incertaine.
3. Pour une demande d'information sur la propriété, le backend extrait les connaissances autorisées de la fiche de propriété.
4. Pour une demande de disponibilité, le backend calcule la disponibilité à partir des réservations actives.
5. L'agent conversationnel élabore une réponse strictement contrainte par les faits extraits (*grounding*).
6. Les contrôles de sécurité vérifient que la réponse est éligible à un envoi automatique.
7. La réponse est transmise et stockée avec l'indication de provenance de l'agent conversationnel.

### Scénarios alternatifs (Flux alternatifs)

- Contexte de propriété absent : transférer (*escalader*) à un opérateur humain.
- Connaissance manquante : indiquer que le personnel apportera une confirmation et escalader la conversation.
- Intention sensible : ne pas envoyer de réponse automatique ; escalader vers le personnel.
- Défaillance du fournisseur d'IA : préserver le message entrant afin qu'il soit traité manuellement par le personnel.

## UC-MSG-04 : Reprendre en Main une Conversation

1. Un membre du personnel ouvre une conversation escaladée ou active.
2. Le membre du personnel active le mode de réponse manuelle.
3. L'envoi automatique par l'agent conversationnel est désactivé pour cette conversation.
4. Le membre du personnel rédige et transmet sa réponse.
5. Le système enregistre et délivre le message.
6. Le personnel peut réactiver le mode automatique après vérification.

## UC-TKT-01 : Suggérer un Ticket de Maintenance

1. L'agent conversationnel détecte un problème probable lié à la propriété.
2. L'agent conversationnel extrait une proposition de catégorie, une description et un niveau de priorité.
3. Le système soumet la suggestion au personnel opérationnel.
4. Le personnel confirme, modifie ou rejette la suggestion.
5. Seule une confirmation explicite génère la création effective d'un ticket.

## UC-TKT-03 : Assigner un Prestataire

1. Un membre du personnel ouvre un ticket non assigné.
2. Le membre du personnel sélectionne un prestataire actif dans le répertoire des contacts.
3. Le membre du personnel valide l'assignation.
4. Le système consigne l'historique d'assignation et bascule l'état du ticket à Assigné (*Assigned*).
5. Le membre du personnel contacte manuellement le prestataire par WhatsApp ou téléphone.

Les prestataires externes ne disposent d'aucun accès authentifié au système lors du MVP.
