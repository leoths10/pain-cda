/**
 * Représente un traitement (job) VTOM appartenant à une application.
 * Les coordonnées `x`/`y`/`width`/`height` sont optionnelles car elles
 * peuvent être générées automatiquement lors du rendu si absentes.
 */
export interface Job {
  /** Nom du traitement tel que défini dans VTOM. */
  name: string
  /** Code statut VTOM : `'E'` terminé, `'W'` attente, `'R'` en cours, `'U'` inconnu. */
  status?: string
  /** Chemin absolu du script shell associé au traitement. */
  script?: string
  /** Liste des paramètres passés au traitement. */
  parameters?: string[]
  /** Fréquence d'exécution (ex. `'DAILY'`, `'WEEKLY'`). */
  frequency?: string
  /** Mode de lancement (ex. `'NORMAL'`, `'FORCE'`). */
  mode?: string
  /** Heure de démarrage minimum au format `HH:MM`. */
  minStart?: string
  /** Heure de démarrage maximum au format `HH:MM`. */
  maxStart?: string
  /** Code retour attendu pour considérer le traitement comme terminé avec succès. */
  retcode?: string
  /** Couleur de fond en hexadécimal, héritée de l'application parente. */
  background?: string
  /** Position horizontale dans le canvas SVG de l'application. */
  x?: number
  /** Position verticale dans le canvas SVG de l'application. */
  y?: number
  /** Largeur du nœud dans le canvas SVG de l'application. */
  width?: number
  /** Hauteur du nœud dans le canvas SVG de l'application. */
  height?: number
  /** Nom de l'application parente (dénormalisé pour la recherche globale). */
  parentApp?: string
}

/**
 * Représente une application VTOM positionnée sur le plan SVG.
 * Correspond à un nœud `<Application>` dans le XML PAY_TOURS.
 */
export interface ApplicationNode {
  /** Nom de l'application. */
  name: string
  /** Position horizontale dans le canvas SVG global (après application de `X_SCALE`). */
  x: number
  /** Position verticale dans le canvas SVG global. */
  y: number
  /** Largeur du nœud en pixels SVG (après application de `X_SCALE`). */
  width: number
  /** Couleur de fond en hexadécimal (ex. `'#4B68FF'`). */
  background: string
  /** Famille d'application VTOM. */
  family?: string
  /** Code statut VTOM (`'E'`, `'W'`, `'R'`, `'U'`). */
  status?: string
  /** Commentaire libre associé à l'application. */
  comment?: string
  /** Indique si la gestion de cycle est activée (`'true'` / `'false'`). */
  cycleEnabled?: string
  /** Libellé ou identifiant du cycle d'exécution. */
  cycle?: string
  /** Nombre de traitements déclarés (peut différer de `jobs.length` si non chargés). */
  jobsCount?: number
  /** Liste des traitements appartenant à cette application. */
  jobs?: Job[]
  /** Commentaires positionnés dans le schéma de traitements de l'application. */
  graphComments?: GraphComment[]
  /** Ressources que l'application doit attendre avant de pouvoir s'exécuter. */
  expectedResources?: ExpectedResource[]
}

/**
 * Commentaire positionné à l'intérieur du schéma de traitements d'une application.
 * Correspond aux nœuds `<Node objectType="com">` dans `<Application><Graph>`.
 */
export interface GraphComment {
  /** Position horizontale dans le canvas SVG de l'application. */
  x: number
  /** Position verticale dans le canvas SVG de l'application. */
  y: number
  /** Largeur en pixels SVG. */
  width: number
  /** Hauteur en pixels SVG. */
  height: number
  /** Contenu du commentaire (peut contenir du HTML). */
  label: string
  /** Couleur du texte en hexadécimal. */
  foreground: string
  /** Couleur de fond (optionnel). */
  background?: string
  /** Chaîne de description de la police. */
  font: string
}

/**
 * Lien de dépendance entre deux applications VTOM.
 */
export interface ApplicationLink {
  /** Nom de l'application source. */
  from: string
  /** Nom de l'application cible. */
  to: string
  /** Type de lien (ex. `'NORMAL'`, `'IF_OK'`, `'IF_NOK'`). */
  type: string
}

/**
 * Lien de dépendance entre deux traitements à l'intérieur d'une application.
 */
export interface JobLink {
  /** Nom du traitement source. */
  from: string
  /** Nom du traitement cible. */
  to: string
  /** Type de lien (ex. `'NORMAL'`, `'IF_OK'`, `'IF_NOK'`). */
  type: string
}

/**
 * Feu tricolore (point de contrôle) positionné sur le plan SVG.
 * Correspond à un nœud `<TrafficLight>` dans le XML.
 */
export interface TrafficLight {
  /** Position horizontale dans le canvas SVG global. */
  x: number
  /** Position verticale dans le canvas SVG global. */
  y: number
  /** Largeur en pixels SVG. */
  width: number
  /** Hauteur en pixels SVG. */
  height: number
  /** Libellé affiché sous le feu. */
  label: string
}

/**
 * Zone de commentaire libre positionnée sur le plan SVG.
 */
export interface Comment {
  /** Position horizontale dans le canvas SVG global. */
  x: number
  /** Position verticale dans le canvas SVG global. */
  y: number
  /** Largeur en pixels SVG. */
  width: number
  /** Hauteur en pixels SVG. */
  height: number
  /** Contenu textuel du commentaire (peut contenir du HTML encodé). */
  label: string
  /** Couleur du texte en hexadécimal. */
  foreground: string
  /** Chaîne de description de la police (ex. `'Arial|10|normal'`). */
  font: string
  /** `true` si ce commentaire sert d'étiquette de colonne (rendu distinct). */
  isColumnLabel?: boolean
}

/**
 * Colonne verticale du plan, regroupant des applications d'un même domaine
 * fonctionnel.
 */
export interface Column {
  /** Nom de la colonne (ex. `'COMPTABILITE'`). */
  name: string
  /** Position horizontale du bord gauche dans le canvas SVG global. */
  x: number
  /** Largeur en pixels SVG. */
  width: number
  /** Couleur de fond de la colonne en hexadécimal. */
  color: string
}

/**
 * Séparateur visuel (bande horizontale ou verticale) structurant le plan.
 */
export interface Separator {
  /** Libellé du séparateur. */
  label: string
  /** Position horizontale dans le canvas SVG global. */
  x: number
  /** Position verticale dans le canvas SVG global. */
  y: number
  /** Largeur en pixels SVG. */
  width: number
  /** Hauteur en pixels SVG. */
  height: number
  /** Couleur de fond en hexadécimal. */
  background: string
  /** Couleur du texte en hexadécimal. */
  foreground: string
  /** Chaîne de description de la police. */
  font: string
  /** `true` si le texte doit être rendu visible. */
  textVisible: boolean
  /** `true` si le séparateur est orienté verticalement. */
  isVertical: boolean
}

/**
 * Application sélectionnée (clic sur le canvas), avec position du curseur
 * pour positionner la modale de détail.
 */
export interface SelectedApp {
  /** Application sélectionnée. */
  app: ApplicationNode
  /** Coordonnée X du curseur au moment du clic (viewport). */
  mouseX: number
  /** Coordonnée Y du curseur au moment du clic (viewport). */
  mouseY: number
}

/**
 * Traitement sélectionné depuis la modale d'une application.
 */
export interface SelectedJob {
  /** Traitement sélectionné. */
  job: Job
  /** Nom de l'application parente, utilisé pour l'affichage. */
  appName: string
}

/**
 * Ressource attendue par une application VTOM pour pouvoir s'exécuter.
 * Correspond à un nœud `<ExpectedResource>` dans `<Application><ExpectedResources>`.
 */
export interface ExpectedResource {
  /** Nom de la ressource VTOM référencée. */
  resource: string
  /** Opérateur de comparaison : `'!'` exclusion, `'P'` production, `'OK'` état ok. */
  operator: string
  /** Valeur attendue (présente uniquement pour l'opérateur `'!'`). */
  value?: string
  /** Attendre que la condition soit remplie avant de démarrer. */
  wait: boolean
  /** Libérer la ressource à la fin de l'application. */
  free: boolean
}

/**
 * Ressource VTOM (variable partagée entre traitements).
 * Correspond à un nœud `<Resource>` dans le XML.
 */
export interface VtomResource {
  /** Nom unique de la ressource. */
  name: string
  /** Type de ressource (ex. `'COUNTER'`, `'FILE'`, `'LOCK'`). */
  type: string
  /** Valeur initiale ou courante de la ressource. */
  value: string
  /** Commentaire libre associé à la ressource. */
  comment?: string
}

/**
 * Coordonnées et dimensions de la fenêtre de visualisation SVG courante,
 * synchronisées avec la position de scroll du conteneur.
 */
export interface ViewBox {
  /** Coin gauche visible (coordonnées SVG). */
  x: number
  /** Coin haut visible (coordonnées SVG). */
  y: number
  /** Largeur visible (coordonnées SVG). */
  width: number
  /** Hauteur visible (coordonnées SVG). */
  height: number
}
