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

export function assembler() {
  const message = readFileSync(join(ICI, "message.js"), "utf8");
  const index = readFileSync(join(ICI, "index.ts"), "utf8");

  /* Les fonctions du message deviennent locales : plus rien ne les
     importe, et « export » sur une fonction du même fichier ne servirait
     qu'à faire croire à un module qui n'existe plus. */
  let corpsMessage = message.replace(/^export function /gm, "function ");

  /* ON ANNOTE LES PARAMÈTRES EN « any », ET CE N'EST PAS COSMÉTIQUE.
     « message.js » est un fichier .js : TypeScript n'y exige aucun type.
     Recopié tel quel dans un .ts, chaque paramètre nu devient une erreur
     « implicitly has an any type » — la fonction cesserait de se déployer
     pour une raison qui n'a rien à voir avec ce qu'elle fait. Le fichier
     source, lui, reste du JavaScript ordinaire, relisible par Node. */
  let annotes = 0;
  corpsMessage = corpsMessage.replace(
    /\bfunction (\w+)\(([^)]*)\)/g,
    function (tout, nom, params) {
      if (!params.trim()) return tout;
      const neufs = params.split(",").map(function (p) {
        const t = p.trim();
        if (!t || t.includes(":")) return p;
        annotes++;
        /* « max = 42 » doit devenir « max: any = 42 », pas
           « max = 42: any » — le type se pose sur le NOM. */
        const eq = t.indexOf("=");
        return eq === -1 ? " " + t + ": any"
                         : " " + t.slice(0, eq).trim() + ": any = " + t.slice(eq + 1).trim();
      });
      return "function " + nom + "(" + neufs.join(",").trim() + ")";
    },
  );
  /* Les cinq fonctions du message portent sept paramètres en tout. Si ce
     compte change sans que ce nombre bouge, c'est qu'une signature a été
     ajoutée ou retirée : mieux vaut s'arrêter ici que déployer un fichier
     qui ne compilera pas chez Supabase. */
  if (annotes !== 7) {
    throw new Error("attendu 7 paramètres à annoter, trouvé " + annotes);
  }

  const LIGNE_IMPORT = 'import { titre, corps } from "./message.js";';
  if (!index.includes(LIGNE_IMPORT)) {
    throw new Error("index.ts n'importe plus message.js — assembleur à revoir");
  }

  const entete = [
    "/* =====================================================================",
    "   NOUVELLE-DEMANDE — LE FICHIER À COLLER DANS SUPABASE",
    "   ---------------------------------------------------------------------",
    "   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction",
    "   se fait dans « index.ts » ou « message.js », puis on relance",
    "   « node supabase/functions/nouvelle-demande/assembler.mjs ».",
    "   Un test compare les deux — une retouche faite ici serait perdue au",
    "   prochain assemblage, et pire, elle tournerait un moment sans que",
    "   personne ne sache d'où elle vient.",
    "   ===================================================================== */",
    "",
  ].join("\n");

  return entete + index.replace(LIGNE_IMPORT, corpsMessage.trim());
}

/* Exécuté directement : on écrit. Importé par le test : on se contente de
   rendre le texte, pour comparer sans rien toucher au dépôt. */
if (process.argv[1] && process.argv[1].endsWith("assembler.mjs")) {
  writeFileSync(join(ICI, "a-coller.ts"), assembler());
  console.log("a-coller.ts assemblé");
}
