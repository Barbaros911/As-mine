/* =====================================================================
   ASSEMBLER.MJS — fabrique le fichier à coller depuis un téléphone
   ---------------------------------------------------------------------
   MÊME RAISON QUE POUR « nouvelle-demande » : la fonction vit en DEUX
   fichiers parce que « chiffrer.js » est du JavaScript ordinaire, relisible
   par un test Node — et c'est la seule partie qui se vérifie sans déployer.
   Mais on ne colle pas deux fichiers dans l'éditeur du tableau de bord
   Supabase avec un pouce.

   IL EST FABRIQUÉ, JAMAIS ÉCRIT À LA MAIN. « test-push.mjs » refait
   l'assemblage en mémoire et le compare au fichier : s'ils s'écartent, la
   suite tombe et dit de relancer ce script. Deux recettes finissent
   toujours par diverger, et ici la divergence voudrait dire déployer un
   chiffrement que personne n'a éprouvé.

   Lancer :  node supabase/functions/prevenir-client/assembler.mjs
   ===================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));

export function assembler() {
  const chiffrer = readFileSync(join(ICI, "chiffrer.js"), "utf8");
  const index = readFileSync(join(ICI, "index.ts"), "utf8");

  let corps = chiffrer.replace(/^export function /gm, "function ")
                      .replace(/^export async function /gm, "async function ");

  /* ON ANNOTE LES PARAMÈTRES EN « any », ET CE N'EST PAS COSMÉTIQUE.
     « chiffrer.js » est un .js : TypeScript n'y exige aucun type. Recopié
     tel quel dans un .ts, chaque paramètre nu devient « implicitly has an
     any type » et la fonction cesse de se déployer pour une raison sans
     rapport avec ce qu'elle fait. */
  let annotes = 0;
  corps = corps.replace(
    /\b(async function|function) (\w+)\(([^)]*)\)/g,
    function (tout, mot, nom, params) {
      if (!params.trim()) return tout;
      const neufs = params.split(",").map(function (p) {
        const t = p.trim();
        if (!t || t.includes(":")) return p;
        annotes++;
        /* UN PARAMÈTRE « RESTE » NE PEUT PAS ÊTRE « any ». TypeScript exige
           un type de tableau : « ...morceaux: any » est refusé, et la
           fonction ne se déploierait pas — pour une raison, encore une fois,
           sans aucun rapport avec ce qu'elle fait. */
        if (t.startsWith("...")) return " " + t + ": any[]";
        const eq = t.indexOf("=");
        return eq === -1 ? " " + t + ": any"
                         : " " + t.slice(0, eq).trim() + ": any = " + t.slice(eq + 1).trim();
      });
      return mot + " " + nom + "(" + neufs.join(",").trim() + ")";
    },
  );
  /* Huit fonctions, quinze paramètres. Si ce compte change sans que ce
     nombre bouge, c'est qu'une signature a été ajoutée ou retirée : mieux
     vaut s'arrêter ici que déployer un fichier qui ne compilera pas. */
  if (annotes !== 15) {
    throw new Error("attendu 15 paramètres à annoter, trouvé " + annotes);
  }

  const LIGNE_IMPORT = 'import { chiffrer, jetonVapid } from "./chiffrer.js";';
  if (!index.includes(LIGNE_IMPORT)) {
    throw new Error("index.ts n'importe plus chiffrer.js — assembleur à revoir");
  }

  const entete = [
    "/* =====================================================================",
    "   PREVENIR-CLIENT — LE FICHIER À COLLER DANS SUPABASE",
    "   ---------------------------------------------------------------------",
    "   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction",
    "   se fait dans « index.ts » ou « chiffrer.js », puis on relance",
    "   « node supabase/functions/prevenir-client/assembler.mjs ».",
    "   Un test compare les deux — une retouche faite ici serait perdue au",
    "   prochain assemblage, et pire, elle tournerait un moment sans que",
    "   personne ne sache d'où elle vient.",
    "   ===================================================================== */",
    "",
  ].join("\n");

  return entete + index.replace(LIGNE_IMPORT, corps.trim());
}

if (process.argv[1] && process.argv[1].endsWith("assembler.mjs")) {
  writeFileSync(join(ICI, "a-coller.ts"), assembler());
  console.log("a-coller.ts assemblé");
}
