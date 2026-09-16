/* =====================================================================
   ASSEMBLER.MJS — fabrique le fichier à coller depuis un téléphone
   ---------------------------------------------------------------------
   POURQUOI UN FICHIER DE PLUS. La fonction vit en DEUX fichiers, et c'est
   voulu : « message.js » est en JavaScript ordinaire pour qu'un test Node
   puisse relire le texte de l'alerte sans Deno ni réseau — c'est la seule
   partie qui se vérifie sans déployer, et c'est celle qui compte.
   Mais on ne colle pas deux fichiers dans l'éditeur du tableau de bord
   Supabase avec un pouce, à 5 h du matin. « a-coller.ts » est donc la
   MÊME fonction en un seul morceau.

   IL EST FABRIQUÉ, JAMAIS ÉCRIT À LA MAIN. Deux recettes finissent
   toujours par diverger, et on s'en aperçoit le jour où celle qui tourne
   n'est pas celle qu'on a testée. « test-notification.mjs » refait
   l'assemblage en mémoire et le compare au fichier : s'ils s'écartent, la
   suite tombe et dit de relancer ce script.

   Lancer :  node supabase/functions/nouvelle-demande/assembler.mjs
   ===================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));

/* COMBIEN DE PARAMÈTRES CHAQUE SOURCE DOIT FAIRE ANNOTER.
   Ce n'est pas de la comptabilité : si le compte change sans que ce nombre
   bouge, c'est qu'une signature a été ajoutée ou retirée sans qu'on le
   sache — mieux vaut s'arrêter ici que déployer un fichier qui ne
   compilera pas chez Supabase. */
const ATTENDUS = { "message.js": 7, "chiffrer.js": 15 };

/* ON INLINE TOUT CE QU'« index.ts » IMPORTE LOCALEMENT, pas un fichier
   nommé en dur — et c'est un correctif (16 septembre 2026).
   L'assembleur ne connaissait que « message.js ». La PR #180 a ajouté la
   notification push, donc un TROISIÈME fichier, « chiffrer.js » : son
   import restait dans le fichier assemblé. Or tout l'intérêt de « a-coller »
   est d'être collable d'un seul bloc avec un pouce — avec cet import, le
   collage échouait chez Supabase, où « ./chiffrer.js » n'existe pas.
   Le test le voyait ; le lanceur ne comptait pas les échecs de cette
   suite-là et disait « TOUT EST AU VERT ». Les deux sont corrigés.
   Un quatrième fichier demain sera inliné sans qu'on y pense. */
function localiser(texte) {
  return [...texte.matchAll(/^import\s*\{[^}]*\}\s*from\s*"\.\/([\w.-]+)";?\s*$/gm)];
}

export function assembler() {
  const index = readFileSync(join(ICI, "index.ts"), "utf8");
  const imports = localiser(index);
  if (!imports.length) {
    throw new Error("index.ts n'importe plus aucun fichier local — assembleur à revoir");
  }

  let assemble = index;
  let annotes = 0;
  for (const imp of imports) {
    const nomFichier = imp[1];
    const source = readFileSync(join(ICI, nomFichier), "utf8");
    const avant = annotes;
    const corps = preparer(source, n => { annotes += n; });
    const faits = annotes - avant;
    const attendu = ATTENDUS[nomFichier];
    if (attendu === undefined) {
      throw new Error("« " + nomFichier + " » est inliné mais n'a pas de compte attendu "
        + "dans ATTENDUS (il en fait " + faits + ") — l'ajouter volontairement");
    }
    if (faits !== attendu) {
      throw new Error("« " + nomFichier + " » : attendu " + attendu
        + " paramètres à annoter, trouvé " + faits);
    }
    assemble = assemble.replace(imp[0], corps.trim());
  }

  /* LA CEINTURE : un seul fichier, vraiment. Si un import survit — un
     chemin écrit autrement, un « import * as », une bibliothèque distante
     — on s'arrête plutôt que de rendre un fichier qui ne se colle pas. */
  if (/^\s*import\s/m.test(assemble)) {
    const reste = assemble.match(/^\s*import\s.*$/m)[0].trim();
    throw new Error("un import survit à l'assemblage : " + reste);
  }

  return entete() + assemble;
}

/* Les fonctions inlinées deviennent locales : plus rien ne les importe, et
   « export » sur une fonction du même fichier ne servirait qu'à faire
   croire à un module qui n'existe plus. « async » est conservé — le perdre
   transformerait un « await » en erreur de compilation, sans rapport avec
   ce que fait la fonction. */
function preparer(source, compter) {
  let corpsMessage = source.replace(/^export (async )?function /gm, "$1function ");

  /* ON ANNOTE LES PARAMÈTRES EN « any », ET CE N'EST PAS COSMÉTIQUE.
     « message.js » est un fichier .js : TypeScript n'y exige aucun type.
     Recopié tel quel dans un .ts, chaque paramètre nu devient une erreur
     « implicitly has an any type » — la fonction cesserait de se déployer
     pour une raison qui n'a rien à voir avec ce qu'elle fait. Le fichier
     source, lui, reste du JavaScript ordinaire, relisible par Node. */
  let annotes = 0;
  /* ON CAPTURE « async » ET ON LE REPOSE. Sans le groupe, la réécriture
     rendait « function hkdf(…) » pour « async function hkdf(…) » : tous les
     « await » du corps devenaient des erreurs. Invisible tant qu'aucune
     source inlinée n'était asynchrone — « chiffrer.js » en a trois. */
  corpsMessage = corpsMessage.replace(
    /\b(async\s+)?function (\w+)\(([^)]*)\)/g,
    function (tout, asy, nom, params) {
      if (!params.trim()) return tout;
      const neufs = params.split(",").map(function (p) {
        const t = p.trim();
        if (!t || t.includes(":")) return p;
        annotes++;
        /* « max = 42 » doit devenir « max: any = 42 », pas
           « max = 42: any » — le type se pose sur le NOM. */
        /* UN PARAMÈTRE DE RESTE SE TYPE EN TABLEAU. « ...m: any » est
           refusé par TypeScript (« A rest parameter must be of an array
           type ») — il faut « ...m: any[] ». « coller(...m) » de
           « chiffrer.js » est le premier de ce genre. */
        if (t.startsWith("...")) { return " " + t + ": any[]"; }
        const eq = t.indexOf("=");
        return eq === -1 ? " " + t + ": any"
                         : " " + t.slice(0, eq).trim() + ": any = " + t.slice(eq + 1).trim();
      });
      return (asy || "") + "function " + nom + "(" + neufs.join(",").trim() + ")";
    },
  );
  compter(annotes);
  return corpsMessage;
}

/* Le compte des paramètres vit désormais dans ATTENDUS, par fichier : avec
   deux sources inlinées, un seul total les aurait confondues — une
   signature retirée ici et une ajoutée là se seraient annulées. */
function entete() {
  return [
    "/* =====================================================================",
    "   NOUVELLE-DEMANDE — LE FICHIER À COLLER DANS SUPABASE",
    "   ---------------------------------------------------------------------",
    "   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction",
    "   se fait dans « index.ts » ou l'un des fichiers qu'il importe, puis",
    "   on relance",
    "   « node supabase/functions/nouvelle-demande/assembler.mjs ».",
    "   Un test compare les deux — une retouche faite ici serait perdue au",
    "   prochain assemblage, et pire, elle tournerait un moment sans que",
    "   personne ne sache d'où elle vient.",
    "   ===================================================================== */",
    "",
  ].join("\n");
}

/* Exécuté directement : on écrit. Importé par le test : on se contente de
   rendre le texte, pour comparer sans rien toucher au dépôt. */
if (process.argv[1] && process.argv[1].endsWith("assembler.mjs")) {
  writeFileSync(join(ICI, "a-coller.ts"), assembler());
  console.log("a-coller.ts assemblé");
}
