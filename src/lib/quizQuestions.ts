import type { CharacterId } from "@/lib/characters";
import type { AxisId } from "@/lib/quizAxes";

/**
 * Las 20 preguntas: cinco por eje, cuatro respuestas cada una.
 *
 * Cada respuesta hace dos cosas a la vez. Empuja el eje hacia uno de sus
 * dos lados (de ahí sale el código de cuatro letras) y reparte puntos de
 * afinidad entre los personajes (de ahí sale quién te toca).
 *
 * Están separados a propósito: si el personaje saliera del código, sólo
 * habría 16 combinaciones repartidas entre 8 personajes y el resultado
 * se sentiría a sorteo. Así cada respuesta suma a alguien en concreto.
 */

export interface QuizOption {
  text: string;
  /** Hacia qué lado del eje empuja esta respuesta. */
  pole: "a" | "b";
  /** Personaje al que más se parece esta respuesta. */
  primary: CharacterId;
  /** El que se le parece un poco. */
  secondary: CharacterId;
}

export interface QuizQuestion {
  id: number;
  axis: AxisId;
  text: string;
  options: QuizOption[];
}

export const PRIMARY_POINTS = 3;
export const SECONDARY_POINTS = 1;

export const QUESTIONS: QuizQuestion[] = [
  // ---------------------------------------------------------------
  // Energía — Fiesta / Refugio
  // ---------------------------------------------------------------
  {
    id: 1,
    axis: "energia",
    text: "Llegas al market y está hasta el tope de gente. Lo primero que haces:",
    options: [
      { text: "Meterme hasta el fondo, quiero verlo todo ya", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Buscar a mis amigos para recorrerlo juntos", pole: "a", primary: "kaini", secondary: "mofu" },
      { text: "Dar una vuelta por la orilla para ubicarme", pole: "b", primary: "mimirosa", secondary: "rakkun" },
      { text: "Quedarme viendo la entrada un rato antes de entrar", pole: "b", primary: "nyxie", secondary: "charmy" },
    ],
  },
  {
    id: 2,
    axis: "energia",
    text: "Una fiesta que se alarga hasta las tres de la mañana. Tú:",
    options: [
      { text: "Sigo hasta que apaguen la música", pole: "a", primary: "kaini", secondary: "hanzo" },
      { text: "Me quedo, pero en la cocina platicando con dos personas", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Me voy a las once, sin avisar y sin culpa", pole: "b", primary: "nyxie", secondary: "mimirosa" },
      { text: "Me quedo hasta el final, calladito en mi rincón", pole: "b", primary: "rakkun", secondary: "charmy" },
    ],
  },
  {
    id: 3,
    axis: "energia",
    text: "Te toca hablar frente a un montón de gente:",
    options: [
      { text: "Me encanta, ahí me crezco", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Lo disfruto si conozco a la gente", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Lo hago bien, pero termino agotadísimo", pole: "b", primary: "nyxie", secondary: "mimirosa" },
      { text: "Prefiero que hable alguien más y yo apoyo desde atrás", pole: "b", primary: "mimirosa", secondary: "charmy" },
    ],
  },
  {
    id: 4,
    axis: "energia",
    text: "Un domingo libre perfecto:",
    options: [
      { text: "Un concierto, aunque sea de una banda que no conozco", pole: "a", primary: "kaini", secondary: "nori" },
      { text: "Salir a explorar un lugar donde nunca he estado", pole: "a", primary: "hanzo", secondary: "charmy" },
      { text: "En mi casa, con mis cosas y sin planes", pole: "b", primary: "rakkun", secondary: "nyxie" },
      { text: "En un jardín, sin prisa y sin reloj", pole: "b", primary: "mimirosa", secondary: "mofu" },
    ],
  },
  {
    id: 5,
    axis: "energia",
    text: "Después de un día pesado, te recargas:",
    options: [
      { text: "Saliendo con alguien, aunque sea un rato", pole: "a", primary: "kaini", secondary: "hanzo" },
      { text: "Cocinando algo para los demás", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Con un libro y nadie que me hable", pole: "b", primary: "mofu", secondary: "rakkun" },
      { text: "Haciendo algo con las manos hasta que se me olvide la hora", pole: "b", primary: "charmy", secondary: "mimirosa" },
    ],
  },

  // ---------------------------------------------------------------
  // Decisión — Corazón / Mente
  // ---------------------------------------------------------------
  {
    id: 6,
    axis: "decision",
    text: "Un amigo te cuenta un problema. Lo primero que te sale:",
    options: [
      { text: "«¿Ya comiste? Ven, te preparo algo»", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Abrazarlo y escucharlo hasta que termine", pole: "a", primary: "mofu", secondary: "mimirosa" },
      { text: "«A ver, cuéntame bien qué pasó» y empezar a desenredarlo", pole: "b", primary: "nyxie", secondary: "rakkun" },
      { text: "Buscarle una solución práctica, aunque no me la haya pedido", pole: "b", primary: "rakkun", secondary: "hanzo" },
    ],
  },
  {
    id: 7,
    axis: "decision",
    text: "Dos opciones y las dos suenan bien. ¿Cómo eliges?",
    options: [
      { text: "La que se sienta bonita, aunque no sepa explicar por qué", pole: "a", primary: "charmy", secondary: "kaini" },
      { text: "La que le convenga más a los demás", pole: "a", primary: "mofu", secondary: "nori" },
      { text: "Hago una lista de pros y contras. Literal, escrita", pole: "b", primary: "rakkun", secondary: "nyxie" },
      { text: "Investigo hasta quedar convencido", pole: "b", primary: "nyxie", secondary: "rakkun" },
    ],
  },
  {
    id: 8,
    axis: "decision",
    text: "Alguien hace algo que te molesta:",
    options: [
      { text: "Se me nota en la cara aunque no diga nada", pole: "a", primary: "kaini", secondary: "charmy" },
      { text: "Lo dejo pasar y me lo guardo", pole: "a", primary: "mimirosa", secondary: "mofu" },
      { text: "Se lo digo de frente, sin hacer drama", pole: "b", primary: "nori", secondary: "nyxie" },
      { text: "Primero pienso si de verdad valía la pena molestarme", pole: "b", primary: "rakkun", secondary: "nyxie" },
    ],
  },
  {
    id: 9,
    axis: "decision",
    text: "Te piden un consejo importante:",
    options: [
      { text: "Le digo lo que siento, aunque no sea lo que quiere oír", pole: "a", primary: "hanzo", secondary: "nori" },
      { text: "Le pregunto cómo se siente antes de opinar", pole: "a", primary: "mofu", secondary: "mimirosa" },
      { text: "Le doy la información y que decida solo", pole: "b", primary: "rakkun", secondary: "charmy" },
      { text: "Le enseño a resolverlo en vez de resolvérselo", pole: "b", primary: "nyxie", secondary: "mimirosa" },
    ],
  },
  {
    id: 10,
    axis: "decision",
    text: "Vas a comprar algo carito:",
    options: [
      { text: "Si me enamoré, me lo llevo y ya", pole: "a", primary: "charmy", secondary: "kaini" },
      { text: "Termino comprando dos, porque pensé en alguien", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Comparo precios durante tres semanas", pole: "b", primary: "mimirosa", secondary: "rakkun" },
      { text: "Leo reseñas hasta el último comentario", pole: "b", primary: "nyxie", secondary: "rakkun" },
    ],
  },

  // ---------------------------------------------------------------
  // Ritmo — Vuelo / Plan
  // ---------------------------------------------------------------
  {
    id: 11,
    axis: "ritmo",
    text: "Aparece un portal brillando en tu cuarto:",
    options: [
      { text: "Me meto. Obvio me meto", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Le tomo mil fotos y luego me meto", pole: "a", primary: "charmy", secondary: "kaini" },
      { text: "Primero investigo qué es y a dónde va", pole: "b", primary: "nyxie", secondary: "rakkun" },
      { text: "Le hablo a alguien antes de hacer nada", pole: "b", primary: "mofu", secondary: "mimirosa" },
    ],
  },
  {
    id: 12,
    axis: "ritmo",
    text: "Tu forma de organizar un viaje:",
    options: [
      { text: "Compro el boleto y ya veré allá", pole: "a", primary: "hanzo", secondary: "charmy" },
      { text: "Tengo una idea general y decido sobre la marcha", pole: "a", primary: "kaini", secondary: "nori" },
      { text: "Itinerario por horas, con todo apuntado", pole: "b", primary: "mofu", secondary: "nyxie" },
      { text: "Reservado con semanas de anticipación", pole: "b", primary: "nori", secondary: "rakkun" },
    ],
  },
  {
    id: 13,
    axis: "ritmo",
    text: "Empiezas un proyecto nuevo:",
    options: [
      { text: "Haciendo. Ya veré después si servía", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Probando mil ideas hasta que una prenda", pole: "a", primary: "charmy", secondary: "kaini" },
      { text: "Con un boceto o una lista antes de tocar nada", pole: "b", primary: "mimirosa", secondary: "mofu" },
      { text: "Estudiando cómo lo hicieron los que ya saben", pole: "b", primary: "charmy", secondary: "rakkun" },
    ],
  },
  {
    id: 14,
    axis: "ritmo",
    text: "Te cambian el plan a última hora:",
    options: [
      { text: "Perfecto, así se pone más divertido", pole: "a", primary: "kaini", secondary: "hanzo" },
      { text: "Me adapto sin despeinarme", pole: "a", primary: "charmy", secondary: "nori" },
      { text: "Me molesta tantito, pero lo reacomodo", pole: "b", primary: "nori", secondary: "nyxie" },
      { text: "Necesito un momento para reordenarlo todo en mi cabeza", pole: "b", primary: "mimirosa", secondary: "rakkun" },
    ],
  },
  {
    id: 15,
    axis: "ritmo",
    text: "Un juego de mesa que nunca has jugado:",
    options: [
      { text: "Aprendo jugando, las reglas al ratito", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Improviso y a veces gano sin saber cómo", pole: "a", primary: "charmy", secondary: "kaini" },
      { text: "Me leo el instructivo completo antes de repartir", pole: "b", primary: "rakkun", secondary: "nyxie" },
      { text: "Miro una ronda entera antes de entrarle", pole: "b", primary: "nyxie", secondary: "mimirosa" },
    ],
  },

  // ---------------------------------------------------------------
  // Mundo — Gente / Taller
  // ---------------------------------------------------------------
  {
    id: 16,
    axis: "mundo",
    text: "Lo mejor de un evento como este:",
    options: [
      { text: "Reencontrarme con gente que hace rato no veía", pole: "a", primary: "mofu", secondary: "nori" },
      { text: "Conocer a alguien nuevo y salir con un amigo más", pole: "a", primary: "kaini", secondary: "hanzo" },
      { text: "Encontrar ESA pieza que llevaba meses buscando", pole: "b", primary: "rakkun", secondary: "mimirosa" },
      { text: "Ver de cerca cómo están hechas las cosas", pole: "b", primary: "charmy", secondary: "mimirosa" },
    ],
  },
  {
    id: 17,
    axis: "mundo",
    text: "Si pusieras un stand, sería de:",
    options: [
      { text: "Algo que junte a la gente: dinámicas, juegos, retos", pole: "a", primary: "mofu", secondary: "hanzo" },
      { text: "Comida, nada más por ver las caras cuando prueban", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Cosas hechas por mí, una por una", pole: "b", primary: "mimirosa", secondary: "charmy" },
      { text: "Cartas, figuras y coleccionables", pole: "b", primary: "rakkun", secondary: "kaini" },
    ],
  },
  {
    id: 18,
    axis: "mundo",
    text: "Se acaba el día y estás contento si:",
    options: [
      { text: "Hice reír a alguien", pole: "a", primary: "hanzo", secondary: "kaini" },
      { text: "Alguien se sintió acompañado gracias a mí", pole: "a", primary: "mofu", secondary: "nori" },
      { text: "Terminé algo que había empezado", pole: "b", primary: "mimirosa", secondary: "charmy" },
      { text: "Aprendí algo que no sabía en la mañana", pole: "b", primary: "nyxie", secondary: "rakkun" },
    ],
  },
  {
    id: 19,
    axis: "mundo",
    text: "Tu casa por dentro:",
    options: [
      { text: "Siempre hay alguien de visita", pole: "a", primary: "nori", secondary: "mofu" },
      { text: "Suena música todo el día", pole: "a", primary: "kaini", secondary: "charmy" },
      { text: "Llena de plantas y de cosas que hice yo", pole: "b", primary: "mimirosa", secondary: "charmy" },
      { text: "Con una repisa que es prácticamente mi museo", pole: "b", primary: "rakkun", secondary: "nyxie" },
    ],
  },
  {
    id: 20,
    axis: "mundo",
    text: "Si mañana cayeras en PuffiLand, ¿qué harías primero?",
    options: [
      { text: "Buscar a los locales y hacerme de amigos", pole: "a", primary: "mofu", secondary: "nori" },
      { text: "Organizarme una fiesta de bienvenida a mí mismo", pole: "a", primary: "kaini", secondary: "hanzo" },
      { text: "Explorar cada rincón antes de que alguien me lo cuente", pole: "b", primary: "hanzo", secondary: "charmy" },
      { text: "Aprender su magia desde cero", pole: "b", primary: "nyxie", secondary: "charmy" },
    ],
  },
];
