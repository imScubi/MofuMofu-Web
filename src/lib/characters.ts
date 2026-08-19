/**
 * El elenco de PuffiLand.
 *
 * Nyxie abrió los portales en un experimento que le salió mal y medio
 * mundo terminó en la Tierra. Mofu, que allá había levantado el bazar
 * más grande de PuffiLand, decidió volver a hacerlo aquí con los amigos
 * que cayeron con ella: eso es MofuMofu Market.
 *
 * Este archivo es la fuente de verdad de quién es quién. Las
 * descripciones del test salen de aquí, así que corregir un rasgo lo
 * corrige en toda la página.
 */

export type CharacterId =
  | "mofu"
  | "nyxie"
  | "mimirosa"
  | "hanzo"
  | "rakkun"
  | "charmy"
  | "nori"
  | "kaini";

export interface CharacterInfo {
  id: CharacterId;
  /** Como se le nombra en voz alta. */
  name: string;
  species: string;
  /** Una línea para presentarlo sin contar toda su historia. */
  tagline: string;
  /** De dónde viene y cómo llegó aquí. */
  lore: string;
  /** Su color, para las tarjetas del test. */
  color: string;
  softColor: string;
  /** Con quiénes se lleva mejor, en su orden. */
  friends: CharacterId[];
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  mofu: {
    id: "mofu",
    name: "Mofu",
    species: "Coneja",
    tagline: "La que junta a todos",
    lore:
      "En PuffiLand levantó el bazar más grande que se haya visto, uniendo cientos de emprendimientos con ideas y magia. Al caer aquí no se le ocurrió otra cosa que volver a hacerlo, esta vez con los amigos que cayeron con ella.",
    color: "#E8628E",
    softColor: "#FFF1F5",
    friends: ["mimirosa", "nori", "nyxie"],
  },
  nyxie: {
    id: "nyxie",
    name: "Nyxie",
    species: "Gata",
    tagline: "La maga que abrió los portales",
    lore:
      "La maga más poderosa de PuffiLand. Un experimento que salió mal abrió los portales que trajeron a todos a la Tierra — incluida ella. Enseña magia, resuelve lo que nadie puede y por eso se le respeta tanto.",
    color: "#4B3C52",
    softColor: "#F3EEF6",
    friends: ["mofu", "nori"],
  },
  mimirosa: {
    id: "mimirosa",
    name: "Mimirosa",
    species: "Ratoncita",
    tagline: "Las manos que hacen todo a mano",
    lore:
      "Vivía en un bosque enorme que era su casa entera. Ama la naturaleza y las manualidades. Es de las mayores del grupo y aunque casi no habla, cuando sus amigos están en problemas es la primera en dar la cara.",
    color: "#26724A",
    softColor: "#DFF3E4",
    friends: ["mofu", "charmy"],
  },
  hanzo: {
    id: "hanzo",
    name: "Hanzo",
    species: "Sapo",
    tagline: "El que se mete al portal sin preguntar",
    lore:
      "Aventurero de tiempo completo: buscaba tesoros en lugares que nadie había pisado, y así fue como se metió al portal que lo trajo aquí. Descubrió los superhéroes y el anime y ya no hubo vuelta atrás.",
    color: "#6B4BC4",
    softColor: "#EFE9FF",
    friends: ["rakkun", "kaini"],
  },
  rakkun: {
    id: "rakkun",
    name: "Rakkun",
    species: "Mapache",
    tagline: "El que se leyó las reglas completas",
    lore:
      "Mejor amigo de Hanzo: jugaban videojuegos toda la tarde y leían mangas y cómics. Se le abrió un portal bajo los pies mientras leía uno. Aquí encontró el TCG y los videojuegos y sintió que llegó a casa.",
    color: "#8A5806",
    softColor: "#FFF1D6",
    friends: ["hanzo", "nyxie"],
  },
  charmy: {
    id: "charmy",
    name: "Charmy",
    species: "Camaleona",
    tagline: "La que le ve belleza a todo",
    lore:
      "Artista de las que dominan todas las técnicas y además les mete magia. Sus obras eran famosas en PuffiLand por hipnotizar a quien las miraba. Se distrae con cualquier cosa bonita, que son casi todas.",
    color: "#2E8B57",
    softColor: "#E4F5EA",
    friends: ["kaini", "mimirosa"],
  },
  nori: {
    id: "nori",
    name: "Nori",
    species: "Kitsune",
    tagline: "La que te alimenta antes de preguntarte nada",
    lore:
      "Viene de un linaje antiguo de chefs. Cocina con magia y le encanta inventar sabores que no existían. Si le importas, te va a hacer algo de comer pensado nada más para ti — y te va a preguntar si estás bien.",
    color: "#C2352C",
    softColor: "#FFF0EF",
    friends: ["mofu", "nyxie"],
  },
  kaini: {
    id: "kaini",
    name: "Kaini",
    species: "Hurona",
    tagline: "La que ya se sabe la coreografía",
    lore:
      "La más nueva del elenco y la más ruidosa. Fanática absoluta de la música y el baile: se inventa coreografías todo el día y colecciona hasta el último llavero de sus bandas favoritas.",
    color: "#1D6FA5",
    softColor: "#E3F1FA",
    friends: ["hanzo", "charmy"],
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export function getCharacter(id: string): CharacterInfo | undefined {
  return CHARACTERS[id as CharacterId];
}

