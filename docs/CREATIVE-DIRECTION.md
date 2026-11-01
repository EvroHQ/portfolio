# Christophe Kirkoussis — « RESONANCE »
Direction créative v2 (remplace la v1 minimaliste « Signal »)

## 1. Réévaluation

La v1 de la refonte était trop **sage** : du noir et blanc, une typo sur fond vide, une ligne néon. Retours de Chris :
- l'effet bleu est rejeté ;
- le nom est trop écarté sur grand écran ;
- le changement de police au survol est rejeté ;
- la police ne convient pas.

On abandonne le minimalisme. On garde trois choses :
- la vérité du contenu (5 vrais projets, de vraies captures) ;
- l'identité *développeur × producteur de musique* ;
- la police **Geist** + **Geist Mono**, validée après retour.

## 2. Le concept : RESONANCE

> Le son, c'est de la matière qui vibre.

Tout le site est fait d'**une seule matière** : environ 40 000 grains de poussière ivoire, rendus en WebGL. Le visiteur en **joue comme d'un instrument**. Cette matière se désintègre et se recompose à chaque chapitre. C'est le fil narratif : on ne change jamais de page, on change d'**état de la matière**.

**Palette (fini le noir et blanc) :**
| Rôle | Valeur |
|---|---|
| Nuit chaude | `#0c0a09` |
| Ivoire | `#f2ece2` |
| Braise | `#ff5a1f` |
| Cendre | `#8a8178` |

- Les grains chauffent à la braise quand on les frappe, puis refroidissent vers l'ivoire.
- Un halo de « lumière de studio » chaude dessine la profondeur.

**Typo :** Geist 600 en capitales, approche −0.06em, en méga taille. Labels en Geist Mono. Aucun changement de police pour l'emphase.

## 3. Le hero signature : « THE DROP »

**Chargement :**
- Écran noir. Un compteur `000 → 100` en mono, collé en bas à droite.
- Les grains flottent en nuage chaotique dans tout l'espace 3D.
- À 100, ils **convergent** en 1.6s pour former **CHRISTOPHE / KIRKOUSSIS** en un bloc compact. Taille calée sur `min(vw, vh)` : jamais écarté sur un ultrawide.

**Interaction :**
- Le curseur est une **source sonore**. Chaque mouvement émet une **onde de pression** : un anneau qui se propage dans les lettres.
- Les grains touchés sont repoussés et s'échauffent en braise.
- **Clic n'importe où = le DROP** : une onde de choc massive souffle le nom, puis la matière se ressoude comme un ressort.
- Indication en bas : « Click anywhere — drop the bass ».

## 4. Trois interactions spectaculaires

1. **Typographie à onde de choc** (hero) :
   - jusqu'à 8 ondes simultanées, propagées en GPU (vertex shader) ;
   - un champ de répulsion local au curseur ;
   - le clic déclenche le drop.
2. **La membrane** (À propos) :
   - au scroll, le nom explose et la matière se recompose en **membrane de haut-parleur** : des anneaux concentriques en perspective 3D qui vibrent ;
   - la caméra s'incline avec le scroll ;
   - la fréquence de vibration suit la vitesse de défilement ;
   - le manifeste s'allume caractère par caractère à côté.
3. **The Reel** (projets), une galerie horizontale épinglée :
   - les vraies captures sont des **plans WebGL** ;
   - la vitesse de scroll les **courbe** et sépare leurs canaux RGB ;
   - au survol, le plan avance et l'image **ondule comme un liquide** sous le curseur ;
   - au clic, le plan **s'étend en plein écran** et devient le hero de l'étude de cas, sans coupure.

En complément :
- boutons magnétiques ;
- labels qui se « décodent » (scramble) ;
- une marquee géante de compétences, inclinée par la vitesse de scroll ;
- un rail de chapitres vertical à droite, qui remplace la nav classique.

## 5. Transitions entre sections

La matière est le fil. Chaque transition passe par un **état d'explosion** : un bruit de turbulence culmine à mi-parcours. On voit le nom se désintégrer, puis se recomposer en autre chose.

| Chapitre | État des grains |
|---|---|
| 01 Hero | le **nom** |
| 02 À propos | la **membrane** |
| 03 Projets | **poussière** (champ stellaire profond derrière la galerie) |
| 04 Outils | poussière **braise** |
| 05 Contact | le **monogramme CK** (le logo de la v1), qui respire derrière l'e-mail |

Projets → étude de cas : le plan WebGL s'étend en plein écran et la page s'échange dessous, sans fondu. L'image finale est identique pixel pour pixel au cover de la page de destination.
Retour : rideau braise qui balaie l'écran.

## 6. Technique

- **Astro 7** (HTML statique, SEO) + **Three.js** vanilla.
  - Pas de React Three Fiber : il faudrait embarquer React pour un seul canvas. Vanilla est plus léger et le canvas persiste entre les pages (`transition:persist`).
- Un seul `WebGLRenderer` plein écran, derrière le DOM.
  - Caméra perspective calibrée pour que **1 unité = 1 px CSS** à z=0 : les plans WebGL s'alignent exactement sur les rectangles DOM.
- **Particules :**
  - toutes les formes cibles sont précalculées au chargement, échantillonnées depuis un canvas 2D (texte en Geist, chemin SVG du logo) ;
  - elles sont stockées en attributs ;
  - le morph, l'explosion, les ondes et la chaleur sont calculés **dans le vertex shader**, sans aucun calcul CPU par grain.
- **Galerie :** des `PlaneGeometry` 32×32 avec un shader de courbure, de RGB-split et de ripple. Les couvertures SVG générées sont converties en texture.
- **GSAP + ScrollTrigger** pilotent les poids de morph (scrub), les épinglages et la galerie horizontale. **Lenis** gère le scroll doux.
- **Paliers de performance :**
  | Profil | Grains | DPR max |
  |---|---|---|
  | Desktop | 40k | 1.75 |
  | Mobile, ou < 4 cœurs | 14k | 1.25 |
- **Robustesse :**
  - **reduced-motion** : formations statiques, pas d'ondes, fondus au lieu des explosions ;
  - **sans WebGL** : le nom et les projets restent en DOM, entièrement lisibles ;
  - rendu en pause quand l'onglet est caché.
- **Accessibilité / SEO :** `h1` réel (le nom), contenu complet en DOM, liens et focus visibles, JSON-LD `Person`, sitemap.
