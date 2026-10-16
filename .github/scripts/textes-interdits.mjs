/* =====================================================================
   TEXTES-INTERDITS.MJS — l'ancienne règle de paiement ne revient jamais
   ---------------------------------------------------------------------
   14 octobre 2026 (mission « alignement production ↔ dépôt »). Depuis le
   10–11/10/2026, le client paie son chauffeur PAR LIEN, avant le départ,
   comptoir d'hôtel compris ; il reçoit sa confirmation par appel / SMS,
   WhatsApp ou Telegram — plus d'iMessage. Les anciens boutons carte /
   espèces, la phrase « Aucun paiement en ligne nécessaire » et le bouton
   iMessage étaient seulement MASQUÉS : ils partaient encore dans le HTML
   publié, et quiconque lisait la page en ligne concluait que la production
   n'était pas à jour.

   UNE SEULE LISTE, DEUX LECTEURS : `verifier-textes-interdits.mjs` la lit
   sur le site construit (la construction échoue), `verifier-production.mjs`
   la lit sur le site EN LIGNE. Deux listes finiraient par diverger.

   ON VISE DES FORMES PRÉCISES, PAS DES MOTS. « espèces » et « à bord » sont
   dans les CGV, et à juste titre : « Aucun paiement n'est accepté à bord du
   véhicule, ni en espèces ni par carte ». Interdire le mot interdirait la
   règle elle-même.
   ===================================================================== */

export const INTERDITS = [
  { motif: /aucun paiement en ligne/i, quoi: "« Aucun paiement en ligne nécessaire » (ancienne règle)" },
  { motif: /no online payment/i, quoi: "« No online payment needed » (ancienne règle)" },
  { motif: /iMessage/, quoi: "iMessage (retiré le 11/10/2026)" },
  { motif: /r[èe]gle actuellement le chauffeur/i, quoi: "« le Client règle actuellement le chauffeur directement »" },
  { motif: /currently pays the driver/i, quoi: "« the Client currently pays the driver directly »" },
  { motif: /(?:paiement|r[èe]glement|r[ée]gl[ée]) (?:au chauffeur )?[àa] bord/i, quoi: "paiement / règlement à bord" },
  { motif: /\bpa(?:y|id|yment) (?:the driver )?on board/i, quoi: "payment on board" },
  { motif: /data-paiement="(?:carte|especes)"/, quoi: "bouton de paiement carte / espèces" },
  { motif: /\bpaiement_(?:carte|especes)\b/, quoi: "libellé de paiement carte / espèces" },
  { motif: /data-contact="messages"/, quoi: "bouton de confirmation iMessage" },
  { motif: /paiement(?:Nom)?\s*:\s*"(?:carte|especes|Carte bancaire|Esp[èe]ces)"/, quoi: "course enregistrée en carte / espèces (donnée d'exemple)" },
  /* L'OUVERTURE AUTOMATIQUE DE WHATSAPP (retirée le 4 octobre 2026, option A).
     Le bon disait encore « Si WhatsApp ne s'est pas ouvert, ou si vous n'avez
     pas appuyé sur envoyer » — trouvé en ligne le 15/10/2026 par l'audit des
     quatre prompts. Un libellé qui décrit un mécanisme retiré est pire qu'un
     libellé absent. */
  { motif: /WhatsApp ne s'est pas ouvert/i, quoi: "« Si WhatsApp ne s'est pas ouvert » (ouverture automatique retirée le 4/10/2026)" },
  { motif: /WhatsApp did not open/i, quoi: "« If WhatsApp did not open » (ouverture automatique retirée le 4/10/2026)" },
];

/* CE QUI N'EST PAS LU PAR UN CLIENT, ET POURQUOI — chemins relatifs au site.
   - l'admin (et ses raccourcis) : il relit des courses enregistrées avant
     le 10/10/2026, avec leur ancien mode de règlement et leur ancien canal ;
   - `bon-client.js` : le bon AFFICHÉ à la réception et dans l'admin relit
     ces mêmes courses anciennes — il dit ce qui a été enregistré ;
   - `intake-demande.js` : le lecteur de demandes collées, outil de
     l'exploitant, reconnaît encore un ancien message ;
   - les autres outils de l'admin (santé, pilotage, prospects, affiche QR) ;
   - `carte/` : Leaflet, qui n'est pas à nous. */
export const EXEMPTES = [
  /^admin\.html$/, /^admin-v2/, /^ela-admin\//, /^exploitant\//,
  /(^|\/)bon-client\.js$/, /^intake-demande\.js$/, /^admin-sante\.js$/,
  /^pilotage/, /^prospects/, /^qr-affiche\.js$/, /^carte\//,
];

export const exempte = (chemin) => EXEMPTES.some((m) => m.test(chemin));

/* Rend la liste des fautes trouvées dans un texte : [{quoi, extrait}]. */
export function chercher(texte) {
  const fautes = [];
  for (const i of INTERDITS) {
    const m = texte.match(i.motif);
    if (m) {
      const a = Math.max(0, m.index - 50);
      fautes.push({ quoi: i.quoi, extrait: texte.slice(a, m.index + m[0].length + 50).replace(/\s+/g, " ") });
    }
  }
  return fautes;
}
