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

console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
