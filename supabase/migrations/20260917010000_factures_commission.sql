-- ============================================================================
-- LA FACTURE DE COMMISSION, COTE SERVEUR.
--
-- L'ARGENT NE PASSE JAMAIS PAR ELATRANSFER : le client paie le chauffeur. La
-- commission ne s'encaisse donc pas toute seule, elle se FACTURE.
--
-- ═══ CE QUI CHANGE PAR RAPPORT A L'ESPACE ACTUEL, ET C'EST LE SUJET ═══
-- La-bas le rang de facture vit dans « localStorage » : un seul appareil, une
-- seule main, aucun conflit possible. Ici deux appareils peuvent emettre en
-- meme temps -- et la loi interdit au numero de facture les TROUS comme les
-- DOUBLONS (art. L441-9 Code de commerce). Lire le rang puis l'ecrire serait
-- exactement la faute : deux emissions simultanees liraient N et ecriraient
-- toutes deux N+1, donc DEUX FACTURES AU MEME NUMERO. Et ca ne se voit pas :
-- les deux documents s'impriment normalement, on l'apprend chez le comptable.
-- D'ou « on conflict do update ... returning » : UNE SEULE instruction, donc
-- atomique, avec la ligne verrouillee par Postgres le temps de l'increment.
--
-- ═══ LE RANG EST CONSOMME A L'EMISSION, JAMAIS A L'APERCU ═══
-- Regarder ce qu'on va facturer ne doit pas bruler un numero qui manquerait
-- ensuite -- et un numero manquant est un TROU, donc la meme infraction.
-- D'ou deux fonctions : « apercu » ne prend rien et n'ecrit rien.
-- ============================================================================

-- L'ADRESSE ET LE TAUX N'EXISTAIENT PAS. Sans adresse le document n'est pas
-- une facture ; sans taux on ne sait pas quoi facturer. Le taux est PAR
-- CHAUFFEUR -- decision de Barbaros en septembre 2026 (« je place seulement »)
-- -- et retombe sur « commission_ela_defaut » quand il n'est pas renseigne.
alter table public.chauffeurs add column if not exists adresse text;
alter table public.chauffeurs add column if not exists taux_commission numeric(5,2)
  check (taux_commission is null or (taux_commission >= 0 and taux_commission <= 100));

comment on column public.chauffeurs.taux_commission is
  'Taux de commission propre a ce chauffeur, en pourcentage. NULL = on prend '
  'le defaut « commission_ela_defaut ». Le taux se regle par chauffeur depuis '
  'septembre 2026 : il n''y a plus de taux global a trancher dans le code.';

-- LE COMPTEUR EST PAR ANNEE, comme la numerotation « F-AAAA-NNNN ».
create table if not exists public.compteur_factures (
  annee integer primary key,
  rang integer not null default 0 check (rang >= 0)
);

-- LA FACTURE EST FIGEE A L'EMISSION : emetteur, client et lignes sont RECOPIES
-- dedans. Le chauffeur peut demenager, la raison sociale peut changer -- un
-- document comptable qui se reecrit tout seul ne prouve plus rien.
create table if not exists public.factures_commission (
  num text primary key,
  chauffeur_id uuid not null references public.chauffeurs(id),
  periode_du date not null,
  periode_au date not null,
  emetteur jsonb not null,
  client jsonb not null,
  lignes jsonb not null,
  ht numeric(12,2) not null,
  taux_tva numeric(5,2) not null default 0,
  tva numeric(12,2) not null default 0,
  ttc numeric(12,2) not null,
  emise_le timestamptz not null default now(),
  emise_par uuid default auth.uid()
);
create index if not exists factures_commission_chauffeur
  on public.factures_commission(chauffeur_id, emise_le desc);

alter table public.compteur_factures  enable row level security;
alter table public.factures_commission enable row level security;

drop policy if exists factures_lecture_exploitant on public.factures_commission;
create policy factures_lecture_exploitant on public.factures_commission
  for select to authenticated using (public.est_exploitant());
-- AUCUNE POLICY D'ECRITURE, ET C'EST VOULU : on n'emet une facture que par la
-- fonction, qui seule sait prendre un numero sans trou ni doublon. Une
-- ecriture directe contournerait le compteur.

-- PAS DE NOM, PAS DE SIRET, PAS D'ADRESSE : LE DOCUMENT N'EST PAS UNE FACTURE
-- (art. L441-9). On refuse de l'editer plutot que d'en envoyer une fausse a un
-- tiers -- meme schema que le lien d'avis : on bloque et on dit quoi remplir.
create or replace function public.ela_emetteur_pret(e jsonb)
returns boolean language sql immutable as $$
  select e is not null
     and coalesce(trim(e->>'nom'),'')     <> ''
     and coalesce(trim(e->>'siret'),'')   <> ''
     and coalesce(trim(e->>'adresse'),'') <> ''
$$;

-- ── le calcul, ecrit UNE SEULE FOIS ────────────────────────────────────────
-- L'apercu et l'emission doivent rendre EXACTEMENT le meme document : deux
-- calculs qui divergent ne se voient pas, et ici la divergence serait entre
-- ce que Barbaros a relu et ce qu'il envoie a un tiers.
create or replace function public.ela_lignes_facture(
  p_chauffeur_id uuid, p_du date, p_au date)
returns table(ref text, jour date, depart text, arrivee text,
              prix numeric, taux numeric, commission numeric)
language sql stable
set search_path = public, pg_temp
as $$
  select c.ref,
         (c.bon->'course'->>'date')::date,
         coalesce(c.bon->'course'->>'departPublic', c.bon->'course'->>'depart', ''),
         coalesce(c.bon->'course'->>'arriveePublic', c.bon->'course'->>'arrivee', ''),
         coalesce((c.bon->'prix'->>'total')::numeric, 0),
         t.taux,
         round(coalesce((c.bon->'prix'->>'total')::numeric, 0) * t.taux / 100, 2)
    from public.courses c
    cross join lateral (
      select coalesce(ch.taux_commission,
               (select (valeur->>'pourcentage')::numeric
                  from public.parametres_commerciaux
                 where cle = 'commission_ela_defaut' and actif), 0) as taux
        from public.chauffeurs ch where ch.id = p_chauffeur_id
    ) t
   -- SEULES LES « realisee » SONT FACTURABLES : une course confirmee est une
   -- promesse, pas un encaissement. Meme regle que le registre.
   where c.statut = 'realisee'
     -- UNE COURSE N'EST FACTUREE QU'UNE FOIS. Le doublon ne se voit que six
     -- mois plus tard, chez le comptable.
     and (c.bon->>'factureNum') is null
     -- ═══ LE CHAUFFEUR SE LIT DANS « attributions_chauffeur », PAS DANS LE BON ═══
     -- « ela_attribuer_chauffeur » n'ecrit dans le bon que le nom, le telephone
     -- et la carte : AUCUN identifiant. Filtrer sur le bon n'aurait rendu
     -- AUCUNE course -- une facture vide, sans le moindre message. Et s'y
     -- rabattre par le NOM repeterait la faiblesse de l'espace actuel, ou il
     -- est saisi a la main (« Mehmet », « mehmet », « Mehmet Y. »).
     -- L'attribution est une ligne structuree : c'est elle qui fait foi.
     and exists (select 1 from public.attributions_chauffeur a
                  where a.course_ref = c.ref
                    and a.chauffeur_id = p_chauffeur_id
                    and a.statut = 'active')
     and (c.bon->'course'->>'date')::date between p_du and p_au
   order by c.bon->'course'->>'date', c.bon->'course'->>'heure', c.ref
$$;

-- ── l'apercu : il ne prend AUCUN numero et n'ecrit RIEN ────────────────────
create or replace function public.ela_apercu_facture_commission(
  p_chauffeur_id uuid, p_du date, p_au date)
returns jsonb
language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  e jsonb; ch record; lignes jsonb; v_ht numeric; v_taux_tva numeric; v_tva numeric;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if p_du is null or p_au is null or p_du > p_au then raise exception 'periode_invalide'; end if;

  select valeur into e from public.parametres_commerciaux
   where cle = 'entreprise_emettrice' and actif;
  select * into ch from public.chauffeurs where id = p_chauffeur_id;
  if ch is null then raise exception 'chauffeur_introuvable'; end if;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.jour, l.ref), '[]'::jsonb),
         coalesce(sum(l.commission), 0)
    into lignes, v_ht
    from public.ela_lignes_facture(p_chauffeur_id, p_du, p_au) l;

  v_taux_tva := coalesce((e->>'taux_tva')::numeric, 0);
  v_tva := round(v_ht * v_taux_tva / 100, 2);

  return jsonb_build_object(
    'num', null,
    'emetteur_pret', public.ela_emetteur_pret(e),
    'emetteur', coalesce(e, '{}'::jsonb),
    'client', jsonb_build_object('id', ch.id, 'nom', ch.nom_affiche,
                'siret', coalesce(ch.siret,''), 'adresse', coalesce(ch.adresse,'')),
    'periode_du', p_du, 'periode_au', p_au,
    'lignes', lignes, 'ht', v_ht,
    'taux_tva', v_taux_tva, 'tva', v_tva, 'ttc', v_ht + v_tva);
end $$;

-- ── l'emission : le seul endroit qui prend un numero ───────────────────────
create or replace function public.ela_emettre_facture_commission(
  p_chauffeur_id uuid, p_du date, p_au date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e jsonb; ch record; lignes jsonb; refs text[];
  v_ht numeric; v_taux_tva numeric; v_tva numeric;
  v_annee integer; v_rang integer; v_num text;
begin
  if not public.est_exploitant() then raise exception 'acces_refuse'; end if;
  if p_du is null or p_au is null or p_du > p_au then raise exception 'periode_invalide'; end if;

  select valeur into e from public.parametres_commerciaux
   where cle = 'entreprise_emettrice' and actif;
  if not public.ela_emetteur_pret(e) then raise exception 'emetteur_incomplet'; end if;

  select * into ch from public.chauffeurs where id = p_chauffeur_id;
  if ch is null then raise exception 'chauffeur_introuvable'; end if;

  -- ON VERROUILLE LES COURSES AVANT DE LES FACTURER. Sans « for update », deux
  -- emissions simultanees pour le meme chauffeur prendraient les MEMES courses
  -- et les factureraient deux fois -- et les deux documents s'impriment tres
  -- bien. Le verrou porte sur les lignes de « courses », pas sur la fonction
  -- de calcul, qui est « stable » et ne verrouille rien.
  -- « for update » ne se combine pas a un agregat : on verrouille dans la
  -- sous-requete, on additionne au-dessus.
  select array_agg(x.ref order by x.ref) into refs from (
    select c.ref
      from public.courses c
     where c.ref in (select l.ref from public.ela_lignes_facture(p_chauffeur_id, p_du, p_au) l)
     order by c.ref
       for update
  ) x;

  if refs is null or array_length(refs, 1) = 0 then
    raise exception 'aucune_course_a_facturer';
  end if;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.jour, l.ref), '[]'::jsonb),
         coalesce(sum(l.commission), 0)
    into lignes, v_ht
    from public.ela_lignes_facture(p_chauffeur_id, p_du, p_au) l;

  v_taux_tva := coalesce((e->>'taux_tva')::numeric, 0);
  v_tva := round(v_ht * v_taux_tva / 100, 2);

  -- ═══ LE NUMERO, EN UNE SEULE INSTRUCTION ATOMIQUE ═══
  -- Lire puis ecrire laisserait deux emissions simultanees prendre le meme
  -- rang. Ici Postgres verrouille la ligne du compteur le temps de
  -- l'increment : le second appel attend, puis obtient le suivant.
  v_annee := extract(year from (now() at time zone 'Europe/Paris'))::integer;
  insert into public.compteur_factures(annee, rang) values (v_annee, 1)
    on conflict (annee) do update set rang = public.compteur_factures.rang + 1
    returning rang into v_rang;
  v_num := 'F-' || v_annee || '-' || lpad(v_rang::text, 4, '0');

  insert into public.factures_commission(num, chauffeur_id, periode_du, periode_au,
      emetteur, client, lignes, ht, taux_tva, tva, ttc)
    values (v_num, p_chauffeur_id, p_du, p_au,
      e,
      jsonb_build_object('id', ch.id, 'nom', ch.nom_affiche,
        'siret', coalesce(ch.siret,''), 'adresse', coalesce(ch.adresse,'')),
      lignes, v_ht, v_taux_tva, v_tva, v_ht + v_tva);

  -- LA MARQUE SUR LES COURSES EST DANS LA MEME TRANSACTION QUE LA FACTURE.
  -- Separees, une panne entre les deux brulerait un numero (trou) ou laisserait
  -- des courses refacturables (doublon).
  update public.courses
     set bon = jsonb_set(bon, '{factureNum}', to_jsonb(v_num), true)
   where ref = any(refs);

  insert into public.evenements_reservation(course_ref, type_evenement,
                                            acteur_type, acteur_id, donnees)
    select r, 'facture_commission_emise', 'admin_ela', auth.uid(),
           jsonb_build_object('facture', v_num)
      from unnest(refs) r;

  return jsonb_build_object('num', v_num, 'emetteur', e,
    'client', jsonb_build_object('id', ch.id, 'nom', ch.nom_affiche,
      'siret', coalesce(ch.siret,''), 'adresse', coalesce(ch.adresse,'')),
    'periode_du', p_du, 'periode_au', p_au,
    'lignes', lignes, 'ht', v_ht,
    'taux_tva', v_taux_tva, 'tva', v_tva, 'ttc', v_ht + v_tva,
    'refs', to_jsonb(refs));
end $$;

revoke all on function public.ela_apercu_facture_commission(uuid,date,date)  from public, anon;
revoke all on function public.ela_emettre_facture_commission(uuid,date,date) from public, anon;
revoke all on function public.ela_lignes_facture(uuid,date,date)             from public, anon;
grant execute on function public.ela_apercu_facture_commission(uuid,date,date)  to authenticated;
grant execute on function public.ela_emettre_facture_commission(uuid,date,date) to authenticated;
grant execute on function public.ela_lignes_facture(uuid,date,date)             to authenticated;

comment on function public.ela_emettre_facture_commission(uuid,date,date) is
  'Emet une facture de commission. Prend son numero de facon ATOMIQUE (un seul '
  'insert ... on conflict ... returning) : deux emissions simultanees ne peuvent '
  'pas obtenir le meme rang. Verrouille les courses avant de les marquer, dans '
  'la meme transaction que la facture -- sinon une panne entre les deux laisse '
  'un trou ou un doublon, et les deux sont interdits (L441-9).';
