-- DEBUG : Vérifier les rapports et leur correspondance avec les clients

-- 1. Voir TOUS les rapports
SELECT
  id,
  client_id,
  titre,
  date_generation,
  nb_sources
FROM rapports
ORDER BY date_generation DESC;

-- 2. Voir TOUS les clients
SELECT
  id as client_id,
  user_id,
  prenom,
  email
FROM clients;

-- 3. Vérifier la correspondance pour VOTRE user_id
-- Remplacez '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e' par votre user_id
SELECT
  c.id as client_id,
  c.user_id,
  c.prenom,
  COUNT(r.id) as nb_rapports
FROM clients c
LEFT JOIN rapports r ON r.client_id = c.id
WHERE c.user_id = '5fa9d9df-2008-4fcd-9f05-0aaed9a1e68e'
GROUP BY c.id, c.user_id, c.prenom;

-- 4. Si le rapport existe mais avec un autre client_id
-- Mettre à jour le client_id du rapport pour correspondre à votre client
-- REMPLACEZ LES VALEURS PAR LES VÔTRES APRÈS AVOIR VU LES RÉSULTATS CI-DESSUS
--
-- UPDATE rapports
-- SET client_id = 'VOTRE_CLIENT_ID'
-- WHERE id = '9e400f70-7178-44b0-acbf-750528fc52e5';
