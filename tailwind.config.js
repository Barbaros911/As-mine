/* Feuille de style du site, compilée UNE fois et versionnée.
   Le site chargeait Tailwind depuis un CDN qui compile dans le navigateur :
   trois mégaoctets de JavaScript, un affichage qui saute au chargement, et
   surtout une dépendance à un serveur qui ne nous appartient pas — le jour
   où il tombe, la page est illisible pour tous les clients.

   Régénérer après avoir ajouté des classes :
     npx tailwindcss@3 -c tailwind.config.js -i tailwind.src.css \
       -o styles.css --minify
*/
module.exports = {
  content: ["./index.html", "./admin.html"],
  theme: { extend: {} }
};
