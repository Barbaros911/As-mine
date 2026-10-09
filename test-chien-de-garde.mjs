/* TEST-CHIEN-DE-GARDE — le juge du chien de garde, sans réseau.
   Il doit se taire quand tout va bien, et nommer ce qui cloche sinon.
   Lancer : node test-chien-de-garde.mjs */
import { juger } from './.github/scripts/chien-de-garde.mjs';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

const sain = { sans_alerte: 0, relance_active: true, derniere_relance_s: 12, relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 3, demandes_24h: 5 };
check('tout va bien : il se tait', juger(sain).ok, juger(sain).pannes.join(' | '));
check('nuit calme (aucune demande, aucun Telegram) : il se tait aussi', juger({ ...sain, telegram_ok_1h: 0, demandes_24h: 0 }).ok);
check('une demande sans alerte : il aboie et la compte', !juger({ ...sain, sans_alerte: 1 }).ok && /1 demande/.test(juger({ ...sain, sans_alerte: 1 }).pannes[0]));
check('relance inactive : il aboie', /relance/i.test(juger({ ...sain, relance_active: false }).pannes.join(' ')));
check('relance absente (null) : il aboie', !juger({ ...sain, relance_active: null }).ok);
check('relance active mais muette depuis 20 min : il aboie', /20 min/.test(juger({ ...sain, derniere_relance_s: 1200 }).pannes.join(' ')));
check('relance active, passage il y a 50 s : rien', juger({ ...sain, derniere_relance_s: 50 }).ok);
check('un passage raté sur quinze : rien (pg_net tousse parfois)', juger({ ...sain, relances_echouees_15min: 1 }).ok);
check('dix passages ratés : il aboie', !juger({ ...sain, relances_echouees_15min: 10 }).ok);
check('Telegram : un échec parmi des réussites : rien', juger({ ...sain, telegram_echecs_1h: 1, telegram_ok_1h: 2 }).ok);
check('Telegram : que des échecs depuis une heure : il aboie', /Telegram/.test(juger({ ...sain, telegram_echecs_1h: 3, telegram_ok_1h: 0 }).pannes.join(' ')));
check('réponse illisible : il aboie plutôt que de se taire', !juger(null).ok && !juger('x').ok);
check('les nombres arrivent parfois en texte : il les lit', !juger({ ...sain, sans_alerte: '2' }).ok && juger({ ...sain, derniere_relance_s: '30' }).ok);

/* LES DÉPÔTS REFUSÉS (audit du 9 octobre 2026) : clés FACULTATIVES — un
   serveur d'avant la migration 20261009000000 ne les rend pas, et le voyant
   ne passe pas au gris pour autant. Un dépôt en échec serveur (5xx) est une
   panne dès le premier ; le plafond (429) à partir de trois ; les autres
   refus à partir de dix. Contre l'ancien juge, les trois « il aboie » tombent. */
check('dépôts refusés : clés absentes (serveur d\'avant la migration) : il se tait', juger(sain).ok);
check('dépôts refusés : zéro partout : il se tait', juger({ ...sain, depots_indisponibles_1h: 0, depots_quota_1h: 0, depots_refuses_1h: 0 }).ok);
check('un dépôt en échec serveur (5xx) : il aboie et le dit', /dépôt/.test(juger({ ...sain, depots_indisponibles_1h: 1, depots_quota_1h: 0, depots_refuses_1h: 0 }).pannes.join(' ')));
check('deux refus par le plafond : rien ; trois : il aboie', juger({ ...sain, depots_quota_1h: 2 }).ok && /plafond/.test(juger({ ...sain, depots_quota_1h: 3 }).pannes.join(' ')));
check('neuf refus divers : rien ; dix : il aboie', juger({ ...sain, depots_refuses_1h: 9 }).ok && !juger({ ...sain, depots_refuses_1h: 10 }).ok);
check('dépôts refusés : les nombres en texte sont lus aussi', !juger({ ...sain, depots_indisponibles_1h: '1' }).ok);

/* LE VOYANT DE L'ADMIN (4 octobre 2026) juge avec le même fichier : il lit
   la phrase SIMPLE de chaque panne, celle qu'on comprend la nuit sur un
   téléphone. Une panne sans phrase simple laisserait un bandeau rouge muet. */
for (const [nom, m] of [['demande sans alerte', { ...sain, sans_alerte: 1 }], ['relance arrêtée', { ...sain, relance_active: false }],
                        ['relance muette', { ...sain, derniere_relance_s: 1200 }], ['Telegram', { ...sain, telegram_echecs_1h: 2, telegram_ok_1h: 0 }],
                        ['dépôt en échec serveur', { ...sain, depots_indisponibles_1h: 1 }], ['plafond atteint', { ...sain, depots_quota_1h: 3 }],
                        ['réponse illisible', null]]) {
  const v = juger(m);
  check(`${nom} : chaque panne a sa phrase simple pour l'admin`, Array.isArray(v.simples) && v.simples.length === v.pannes.length && v.simples.every(x => typeof x === 'string' && x.length > 10), JSON.stringify(v.simples));
}
check('tout va bien : aucune phrase de panne pour l\'admin non plus', juger(sain).simples.length === 0);

/* LE CHIEN DE GARDE ET LE VOYANT MESURENT LA MÊME CHOSE. Le chien de garde
   lit .github/scripts/sante-serveur.sql par l'API de gestion ; le voyant
   appelle « ela_sante_mesures », posée par la migration du 4 octobre. Les
   deux requêtes doivent rester identiques, au caractère près une fois les
   blancs ramenés à un seul : sinon le voyant pourrait dire vert pendant que
   l'Issue crie. */
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const corps = (texte) => {
    const i = texte.indexOf('json_build_object(');
    if (i < 0) return null;
    let profondeur = 0, j = i + 'json_build_object'.length;
    for (; j < texte.length; j++) {
      if (texte[j] === '(') profondeur++;
      else if (texte[j] === ')' && --profondeur === 0) break;
    }
    return texte.slice(i, j + 1).replace(/\s+/g, ' ').trim();
  };
  const chien = corps(readFileSync('.github/scripts/sante-serveur.sql', 'utf8'));
  /* LA DERNIÈRE MIGRATION QUI DÉFINIT LA MESURE, quel que soit son nom : une
     redéfinition future dans un fichier autrement nommé serait sinon
     ignorée, et la comparaison porterait sur l'ancienne (relecture du
     4 octobre 2026). */
  const fichier = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
    .filter(f => /create\s+or\s+replace\s+function\s+public\.ela_sante_mesures\s*\(/i.test(readFileSync('supabase/migrations/' + f, 'utf8'))).pop();
  const voyant = fichier ? corps(readFileSync('supabase/migrations/' + fichier, 'utf8')) : null;
  check('la fonction du voyant existe dans les migrations', !!voyant, fichier || 'aucune migration « …_sante_alertes.sql »');
  check('le voyant et le chien de garde mesurent exactement la même chose', !!chien && chien === voyant,
    chien === voyant ? '' : 'les deux requêtes ont divergé');
}

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
