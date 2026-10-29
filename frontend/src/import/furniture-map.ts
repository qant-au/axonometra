// Furniture of other programs to Axonometra's built-in types, by its name or category (German, English, French,
// Spanish, Italian, Dutch words). Anything not recognised becomes a plain cabinet keeping its own name.

import type { FurnitureType } from "../model.ts";

const RULES: [RegExp, FurnitureType | ((h: number, y: number) => FurnitureType)][] = [
  [/upper cabinet|wall cabinet|hängeschrank|oberschrank|meuble haut|armario alto|pensile|élément haut/i, "kitchen_wall"],
  [/lower cabinet|base cabinet|unterschrank|meuble bas|élément bas/i, "kitchen"],
  [/glass ?-?door cabinet|vitrine|glasschrank|showcase|display cabinet/i, "tall_cabinet"],
  [/drawers?( cabinet)?|schubladen|tiroirs|cajonera|cassettiera/i, "dresser"],
  [/stair|treppe|escalier|escalera|scala|trap(?!p)/i, "stairs"],
  [/bunk|etagenbett|hochbett|lits? superpos|litera/i, "bunk_bed"],
  [/night ?stand|bedside|nachttisch|nachtkonsole|table de chevet|mesita|comodino|nachtkast/i, "nightstand"],
  [/\bbed\b|bett|\blit\b|cama|letto|^bed|double bed|single bed|boxspring/i, "bed"],
  [/corner sofa|ecksofa|l-?sofa|canap[ée] d'angle|capan[ée] d'angle|sofá esquinero|divano angolare|hoekbank/i, "sofa_l"],
  [/sofa|couch|canap[eé]|divano|bank \(polster\)/i, "sofa"],
  [/arm ?chair|sessel|fauteuil|sill[oó]n|poltrona|fauteuil/i, "armchair"],
  [/office chair|bürostuhl|drehstuhl|chaise de bureau|silla de oficina/i, "office_chair"],
  [/bar ?stool|barhocker|tabouret de bar|taburete/i, "bar_stool"],
  [/stool|hocker|tabouret|sgabello/i, "stool"],
  [/chair|stuhl|chaise|silla|sedia|stoel/i, "chair"],
  [/corner bench|eckbank/i, "corner_bench"],
  [/bench|sitzbank|banc|banco|panca/i, "bench"],
  [/desk|schreibtisch|bureau|escritorio|scrivania|bureau/i, "desk"],
  [/coffee ?table|couchtisch|wohnzimmertisch|table basse|mesa de centro|tavolino|salontafel/i, "coffee_table"],
  [/round table|runder tisch|table ronde|mesa redonda/i, "table_round"],
  [/table|tisch|mesa|tavolo|tafel/i, "table"],
  [/wardrobe|kleiderschrank|schrank.*kleid|armoire|penderie|armario|guardaroba|kledingkast/i, "wardrobe"],
  [/dresser|kommode|chest of drawers|commode|c[oó]moda|cassettiera/i, "dresser"],
  [/sideboard|anrichte|buffet|credenza|dressoir/i, "sideboard"],
  [/tv|television|fernseh|t[eé]l[eé]vis/i, "tv_board"],
  [/book ?case|book ?shelf|regal|shelf|shelves|étagère|biblioth[eè]que|estanter[ií]a|libreria|boekenkast|kast/i, "shelf"],
  [/smart ?fridge|fridge|refrigerator|kühlschrank|réfrigérateur|frigo|nevera|frigorifero|koelkast/i, "fridge"],
  [/dishwasher|spülmaschine|geschirrspüler|lave[- ]vaisselle|lavavajillas|lavastoviglie|vaatwasser/i, "dishwasher"],
  [/washing machine|washer|waschmaschine|lave[- ]linge|lavadora|lavatrice|wasmachine/i, "washer"],
  [/dryer|trockner|s[eè]che[- ]linge|secadora|asciugatrice|droger/i, "dryer"],
  [/oven|backofen|four|horno|forno|oven/i, "kitchen_tall"],
  [/cooker|cooktop|hob|stove|herd|kochfeld|cuisini[eè]re|plaque de cuisson|fornello|kookplaat/i, "stove"],
  [/kitchen sink|spüle|[ée]vier|fregadero|lavello|gootsteen|\bsink\b/i, "sink"],
  [/wall cabinet|hängeschrank|oberschrank|meuble haut|armario alto|pensile/i, "kitchen_wall"],
  [/tall cabinet|hochschrank|colonne|armario columna/i, "kitchen_tall"],
  [/island|kochinsel|kücheninsel|îlot|isla|isola/i, "island"],
  [/worktop|counter|arbeitsplatte|plan de travail|encimera|piano di lavoro/i, "worktop"],
  [/kitchen|küche|unterschrank|base cabinet|meuble bas|cocina|cucina|keuken/i, "kitchen"],
  [/toilet|\bwc\b|toilette|inodoro|\bklo\b/i, "wc"],
  [/bath ?tub|badewanne|baignoire|bañera|vasca da bagno|\bbath\b/i, "bathtub"],
  [/shower|dusche|douche|ducha|doccia/i, "shower"],
  [/wash ?basin|waschbecken|waschtisch|lavabo|lavandino|wastafel|basin/i, "washbasin"],
  [/radiator|heizk[oö]rper|radiateur|radiador|termosifone/i, "radiator"],
  [/air ?con|klima|climatiseur|aire acondicionado|condizionatore/i, "ac_unit"],
  [/coat|garderobe|portemanteau|perchero|appendiabiti/i, "coat_rack"],
  [/plant|pflanze|plante|planta|pianta|baum|tree|arbre|aspen|birch|birke|oak|eiche|pine|kiefer|fir\b|tanne|palm|bush|busch|shrub|strauch|hedge|hecke|ficus|bonsai/i, "plant"],
  [/rug|carpet|teppich|tapis|alfombra|tappeto|vloerkleed/i, "rug"],
  [/robot|saugroboter|vacuum/i, "robot_vacuum"],
  [/wall ?(light|lamp)|wandleuchte|wandlampe|applique|aplique/i, "lamp_wall"],
  [/floor ?lamp|stehlampe|stehleuchte|lampadaire|l[aá]mpara de pie|piantana/i, "lamp_floor"],
  [/table ?lamp|tischlampe|tischleuchte|lampe de table|l[aá]mpara de mesa/i, "lamp_table"],
  [/pendant|pendel|hängeleuchte|suspension/i, "lamp_pendant"],
  [/spot|downlight|einbau/i, "lamp_downlight"],
  // other lights: by the height they sit at
  [/lamp|light|leuchte|lampe|l[aá]mpara|luce|lamp/i, (h, y) => (y > 1.6 ? "lamp_ceiling" : h > 1.2 ? "lamp_floor" : "lamp_table")],
];

/** Things other programs place like furniture that are no furniture in a floor plan: decoration, small things, parts of the building. */
const DECOR =
  /frame|picture|photo|poster|\bbild\b|tableau|vase|plate|teller|assiette|bowl|schale|bottle|flasche|bouteille|\bglass(es)?\b|verres|candle|kerze|bougeoir|clock|\buhr\b|horloge|mirror|spiegel|miroir|curtain|vorhang|gardine|rideau|tringle|blind|jalousie|rollo|\bstore\b|tube|rohr|\bvent\b|lüftung|vmc|outlet|steckdose|\bprise\b|switch|schalter|fence|zaun|railing|geländer|handrail|rampe|roof|\bdach\b|tiles|fliesen|\bbox\b|cylinder|triangle|\barch\b|keyboard|tastatur|clavier|mouse|\bmaus\b|souris|flowers|blumen|shampoo|trash|mülleimer|poubelle|\bjar\b|bocal|guitar|gitarre|\bbike\b|fahrrad|vélo|beetle|\bcar\b|\bauto\b|voiture|\bscale\b|scaletta|ladder|leiter|chimney|kamin(?!ofen)|\bhood\b|dunstabzug|hotte|microwave|micro ?-?onde|mikrowelle|coffee|cofee|kaffee|toaster|imac|ibook|laptop|\bpc\b|monitor|écran|ecran|screen|\bdvd\b|phone|telefon|\bbook\b|\bbuch\b|towel|handtuch|ustensils|cutlery|besteck|sushi|wine|\bwein\b|\boil\b|heat system|aquarium|\bfish\b|poisson|\btoy\b|spielzeug|cushion|kissen|blanket/i;

/** Whether a named thing is decoration or a small part rather than furniture. */
export function isDecor(name: string): boolean {
  return DECOR.test(name.replace(/[_-]+/g, " "));
}

/** Axonometra's type for a piece of furniture of another program; null when nothing fits. */
export function furnitureType(name: string, h = 0.8, y = 0): FurnitureType | null {
  const text = name.replace(/[_-]+/g, " ");
  for (const [re, t] of RULES) if (re.test(text)) return typeof t === "function" ? t(h, y) : t;
  return null;
}

/** Apple RoomPlan's object categories. */
export const ROOMPLAN_TYPES: Record<string, FurnitureType> = {
  storage: "tall_cabinet",
  refrigerator: "fridge",
  stove: "stove",
  bed: "bed",
  sink: "sink",
  washerDryer: "washer",
  toilet: "wc",
  bathtub: "bathtub",
  oven: "kitchen_tall",
  dishwasher: "dishwasher",
  table: "table",
  sofa: "sofa",
  chair: "chair",
  fireplace: "sideboard",
  television: "tv_board",
  stairs: "stairs",
};
