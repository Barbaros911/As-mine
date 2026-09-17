/* =====================================================================
   QR-AFFICHE.JS — l'encodeur QR, source UNIQUE des deux espaces
   ---------------------------------------------------------------------
   ÉCRIT ICI, ET PAS PRIS AILLEURS. Un service extérieur qui fabrique
   l'image (api.qrserver.com et ses semblables) ajoute une dépendance
   réseau à une affiche qu'on imprime une fois, et envoie l'adresse à un
   tiers qui n'a pas à la connaître. Deux cents lignes valent mieux qu'un
   serveur qu'on ne maîtrise pas.

   MODE OCTET, CORRECTION M, VERSIONS 1 À 6 — jusqu'à 106 caractères, très
   au-delà d'une adresse comme « elatransfer.com/?h=ibis-cdg ». S'arrêter
   à la version 6 évite les blocs d'information de version (obligatoires à
   partir de la 7) et garde un seul motif d'alignement.

   ═══ POURQUOI CE FICHIER EXISTE, ET POURQUOI IL A DÉMÉNAGÉ ═══
   Admin v2 a besoin de la même affiche. Recopier deux cent cinquante
   lignes d'encodeur aurait été la faute que ce dépôt reproche partout —
   et ici elle serait la PIRE : un encodeur QR ne se vérifie pas tout
   seul. Le premier jet de celui-ci passait TOUS les contrôles internes
   (format relu, masque, zigzag, Reed-Solomon divisible, dix syndromes
   nuls) et n'était lisible par AUCUN téléphone : l'information de format
   était écrite bit à l'envers, et le décodeur maison reproduisait la même
   erreur. Seul un décodeur INDÉPENDANT l'a montré.
   Deux copies, dont une qui dérive, ce sont des affiches imprimées que
   personne ne peut scanner — et on ne l'apprend qu'au comptoir.

   Éprouvé par « test-nouveau-affiche.mjs », qui rend le SVG FINAL en
   image et le fait décoder par « jsqr », plus un générateur de référence
   pour comparer module par module.
   ===================================================================== */
(function(racine){
  "use strict";

  function qrMatrice(texte){
  /* ---- Corps fini GF(256), polynôme 0x11D : celui de la norme QR ---- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function(){ var x = 1;
    for(var i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x & 0x100) x ^= 0x11D; }
    for(i=255;i<512;i++) EXP[i] = EXP[i-255];
  })();
  function mul(a,b){ return (a && b) ? EXP[LOG[a]+LOG[b]] : 0; }
  function polyGen(n){
    var g = [1];
    for(var i=0;i<n;i++){
      var ng = new Array(g.length+1).fill(0);
      for(var j=0;j<g.length;j++){ ng[j] ^= g[j]; ng[j+1] ^= mul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  function ecc(data, n){
    var g = polyGen(n);
    var r = data.concat(new Array(n).fill(0));
    for(var i=0;i<data.length;i++){
      var c = r[i]; if(!c) continue;
      for(var j=0;j<g.length;j++) r[i+j] ^= mul(g[j], c);
    }
    return r.slice(data.length);
  }

  /* ---- Tables, niveau M, versions 1 à 6 ----
     [octets utiles, codets EC par bloc, blocs du groupe 1, données par bloc g1,
      blocs du groupe 2, données par bloc g2] */
  var V = {
    1:[14,10,1,16,0,0], 2:[26,16,1,28,0,0], 3:[42,26,1,44,0,0],
    4:[62,18,2,32,0,0], 5:[84,24,2,43,0,0], 6:[106,16,4,27,0,0]
  };
  var octets = [];
  for(var i=0;i<texte.length;i++){
    var c = texte.charCodeAt(i);
    if(c < 128) octets.push(c);
    else { var e = new TextEncoder().encode(texte[i]); for(var k=0;k<e.length;k++) octets.push(e[k]); }
  }
  var ver = 0;
  for(var v=1;v<=6;v++) if(octets.length <= V[v][0]){ ver = v; break; }
  if(!ver) throw new Error("texte trop long pour un QR de version 6");
  var t = V[ver], ecPar = t[1], b1 = t[2], d1 = t[3], b2 = t[4], d2 = t[5];
  var totalData = b1*d1 + b2*d2;

  /* ---- Le flux de bits : mode octet (0100), longueur sur 8 bits, données ---- */
  var bits = [];
  function pousser(val, n){ for(var i=n-1;i>=0;i--) bits.push((val >> i) & 1); }
  pousser(4, 4);
  pousser(octets.length, 8);
  octets.forEach(function(o){ pousser(o, 8); });
  /* Terminateur, puis alignement sur l'octet, puis remplissage alterné :
     c'est la norme, et un lecteur strict refuse un flux mal terminé. */
  for(var i=0;i<4 && bits.length < totalData*8;i++) bits.push(0);
  while(bits.length % 8) bits.push(0);
  var mots = [];
  for(var i=0;i<bits.length;i+=8){
    var o = 0; for(var j=0;j<8;j++) o = (o<<1) | bits[i+j];
    mots.push(o);
  }
  var bourre = [0xEC, 0x11], n = 0;
  while(mots.length < totalData) mots.push(bourre[n++ % 2]);

  /* ---- Découpe en blocs, puis entrelacement ---- */
  var blocs = [], eccs = [], pos = 0;
  for(var i=0;i<b1;i++){ var d = mots.slice(pos, pos+d1); pos += d1; blocs.push(d); eccs.push(ecc(d, ecPar)); }
  for(var i=0;i<b2;i++){ var d = mots.slice(pos, pos+d2); pos += d2; blocs.push(d); eccs.push(ecc(d, ecPar)); }
  var final = [];
  var maxD = Math.max(d1, d2);
  for(var i=0;i<maxD;i++) blocs.forEach(function(b){ if(i < b.length) final.push(b[i]); });
  for(var i=0;i<ecPar;i++) eccs.forEach(function(e){ final.push(e[i]); });

  /* ---- La grille ---- */
  var n2 = ver*4 + 17;
  var m = [], reserve = [];
  for(var i=0;i<n2;i++){ m.push(new Array(n2).fill(0)); reserve.push(new Array(n2).fill(0)); }
  function poserMotif(r, c){
    for(var i=-1;i<=7;i++) for(var j=-1;j<=7;j++){
      var y = r+i, x = c+j;
      if(y<0||x<0||y>=n2||x>=n2) continue;
      var noir = (i>=0&&i<=6&&(j===0||j===6)) || (j>=0&&j<=6&&(i===0||i===6))
              || (i>=2&&i<=4&&j>=2&&j<=4);
      m[y][x] = noir ? 1 : 0; reserve[y][x] = 1;
    }
  }
  poserMotif(0,0); poserMotif(0,n2-7); poserMotif(n2-7,0);
  /* Motif d'alignement : un seul, du centre-bas-droit, pour les versions 2 à 6. */
  if(ver >= 2){
    var a = [6, ver*4 + 10][1];
    for(var i=-2;i<=2;i++) for(var j=-2;j<=2;j++){
      m[a+i][a+j] = (Math.abs(i)===2 || Math.abs(j)===2 || (i===0&&j===0)) ? 1 : 0;
      reserve[a+i][a+j] = 1;
    }
  }
  for(var i=8;i<n2-8;i++){
    m[6][i] = (i % 2 === 0) ? 1 : 0; reserve[6][i] = 1;
    m[i][6] = (i % 2 === 0) ? 1 : 0; reserve[i][6] = 1;
  }
  m[n2-8][8] = 1; reserve[n2-8][8] = 1;              /* module noir obligatoire */
  /* Les deux copies de l'information de format. ATTENTION AUX BORNES : la
     seconde copie occupe la COLONNE 8 sur les lignes n-8..n-1, mais la LIGNE 8
     seulement sur les colonnes n-7..n-1. Réserver (8, n-8) en plus retire un
     module aux données et décale tout le flux — le QR se dessine, et aucun
     lecteur ne le décode. */
  for(var i=0;i<9;i++){ reserve[8][i]=1; reserve[i][8]=1; }
  for(var i=n2-8;i<n2;i++) reserve[8][i]=1;
  for(var i=n2-7;i<n2;i++) reserve[i][8]=1;

  /* ---- Les données, en zigzag depuis le coin bas-droit ---- */
  function placer(masque){
    var g = m.map(function(l){ return l.slice(); });
    var bit = 0, haut = true;
    for(var col = n2-1; col > 0; col -= 2){
      if(col === 6) col--;                       /* la colonne de timing se saute */
      for(var k=0;k<n2;k++){
        var row = haut ? (n2-1-k) : k;
        for(var d=0;d<2;d++){
          var c = col - d;
          if(reserve[row][c]) continue;
          var v = 0;
          if(bit < final.length*8) v = (final[bit >> 3] >> (7 - (bit & 7))) & 1;
          bit++;
          if(masqueVaut(masque, row, c)) v ^= 1;
          g[row][c] = v;
        }
      }
      haut = !haut;
    }
    return g;
  }
  function masqueVaut(k, i, j){
    switch(k){
      case 0: return (i+j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i+j) % 3 === 0;
      case 4: return (Math.floor(i/2) + Math.floor(j/3)) % 2 === 0;
      case 5: return ((i*j) % 2) + ((i*j) % 3) === 0;
      case 6: return (((i*j) % 2) + ((i*j) % 3)) % 2 === 0;
      default: return (((i+j) % 2) + ((i*j) % 3)) % 2 === 0;
    }
  }
  /* L'information de format : 5 bits (niveau M = 00, puis le masque), BCH(15,5),
     et le masque 0x5412 de la norme. Elle est écrite DEUX FOIS, aux deux coins :
     un QR abîmé sur un coin reste lisible par l'autre. */
  function poserFormat(g, masque){
    var v = (0 << 3) | masque;
    var d = v << 10;
    for(var i=4;i>=0;i--) if(d & (1 << (i+10))) d ^= 0x537 << i;
    var f = ((v << 10) | d) ^ 0x5412;
    for(var i=0;i<15;i++){
      /* LE BIT DE POIDS FORT EN PREMIER. Écrit dans l'autre sens, le mot de
         format se lit à l'envers : le QR se dessine parfaitement, mes propres
         contrôles le relisent — et aucun vrai lecteur ne le décode, parce que
         le niveau de correction annoncé est faux. Vérifié contre un
         générateur de référence, module par module. */
      var b = (f >> (14 - i)) & 1;
      if(i < 6) g[8][i] = b;
      else if(i < 8) g[8][i+1] = b;
      else if(i === 8) g[7][8] = b;
      else g[14-i][8] = b;
      /* Sept modules dans la colonne, HUIT dans la ligne — et pas huit
         partout : (n-8, 8) est le module noir obligatoire, pas du format.
         Se tromper d'un cran ici dessine un QR parfait qu'aucun lecteur ne
         décode, parce que le niveau de correction lu est faux. */
      if(i < 7) g[n2-1-i][8] = b;
      else g[8][n2-15+i] = b;
    }
    g[n2-8][8] = 1;
  }
  /* Le masque est CHOISI, pas fixé : on garde celui qui donne la plus faible
     pénalité, comme la norme le demande. Un mauvais masque crée des motifs qui
     ressemblent aux repères de position et gêne les lecteurs. */
  function penalite(g){
    var p = 0, i, j, k;
    for(i=0;i<n2;i++) for(var s=0;s<2;s++){
      var run = 1;
      for(j=1;j<n2;j++){
        var a = s ? g[j][i] : g[i][j], b = s ? g[j-1][i] : g[i][j-1];
        if(a === b) run++; else { if(run >= 5) p += 3 + (run-5); run = 1; }
      }
      if(run >= 5) p += 3 + (run-5);
    }
    for(i=0;i<n2-1;i++) for(j=0;j<n2-1;j++){
      var v = g[i][j];
      if(v === g[i][j+1] && v === g[i+1][j] && v === g[i+1][j+1]) p += 3;
    }
    var motif = [1,0,1,1,1,0,1];
    for(i=0;i<n2;i++) for(j=0;j<n2-6;j++) for(var s=0;s<2;s++){
      var bon = true;
      for(k=0;k<7;k++){ var a = s ? g[j+k][i] : g[i][j+k]; if(a !== motif[k]){ bon = false; break; } }
      if(!bon) continue;
      var avant = true, apres = true;
      for(k=1;k<=4;k++){
        var y1 = s ? j-k : i, x1 = s ? i : j-k;
        var y2 = s ? j+6+k : i, x2 = s ? i : j+6+k;
        if(y1>=0 && x1>=0 && (s?g[y1][x1]:g[y1][x1])) avant = false;
        if(y2<n2 && x2<n2 && (s?g[y2][x2]:g[y2][x2])) apres = false;
      }
      if(avant || apres) p += 40;
    }
    var noirs = 0;
    for(i=0;i<n2;i++) for(j=0;j<n2;j++) if(g[i][j]) noirs++;
    p += Math.floor(Math.abs(noirs*100/(n2*n2) - 50) / 5) * 10;
    return p;
  }
  var meilleur = null, scoreMin = Infinity;
  for(var k=0;k<8;k++){
    var g = placer(k);
    poserFormat(g, k);
    var s = penalite(g);
    if(s < scoreMin){ scoreMin = s; meilleur = g; }
  }
  return meilleur;
}

  /* Le QR est dessiné en SVG et non en canvas : une affiche s'IMPRIME, et
     un canvas de 200 px sort en bouillie sur du papier. Le SVG reste net à
     n'importe quelle taille. */
  function qrSvg(texte, cote){
    var m = qrMatrice(texte), n = m.length, marge = 4, total = n + marge*2;
    var d = "";
    for(var i=0;i<n;i++) for(var j=0;j<n;j++)
      if(m[i][j]) d += "M" + (j+marge) + " " + (i+marge) + "h1v1h-1z";
    /* Le « xmlns » n'est pas décoratif : sans lui le SVG s'affiche bien dans
       la page, mais il ne peut plus être chargé comme IMAGE ni collé
       ailleurs — donc ni éprouvé, ni réutilisé dans un document. */
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total
         + '" width="' + cote + '" height="' + cote
         + '" shape-rendering="crispEdges" role="img" aria-label="Code QR du site">'
         + '<rect width="' + total + '" height="' + total + '" fill="#fff"/>'
         + '<path d="' + d + '" fill="#16232B"/></svg>';
  }

  /* LE NOM VOYAGE EN CLAIR, pas en identifiant. « ?h=Ibis%20CDG » plutôt que
     « ?h=ibis-cdg » : à l'arrivée, on le pose tel quel dans le champ de départ
     et la recherche d'adresse retrouve l'hôtel. Un identifiant obligerait à
     tenir une table de correspondance — donc à republier le site à chaque
     nouvel hôtel, et à réimprimer les affiches le jour où la table change.
     LA BASE EST UN PARAMÈTRE OBLIGATOIRE : Admin v2 vit sur « /admin-v2.html »,
     et un défaut caché y fabriquerait des affiches qui renvoient le client
     vers le back-office. Un appelant qui ne la fournit pas est arrêté. */
  function lienHotel(base, nom){
    if(!base) throw new Error("lienHotel : l'adresse du site est obligatoire");
    return base + "?h=" + encodeURIComponent(String(nom || "").slice(0, 60));
  }

  racine.ELA_QR = { matrice: qrMatrice, svg: qrSvg, lien: lienHotel };
})(typeof window !== "undefined" ? window : globalThis);
