import type { CharacterId } from "@/lib/characters";

/**
 * Lo que lee la persona al terminar el test.
 *
 * Está escrito a propósito para que se sienta personal: retratos en
 * segunda persona, señales que dan ganas de decir "sí, exacto", y una
 * relectura amable de eso que le han criticado toda la vida. Es un test
 * de personalidad de feria, no un diagnóstico, y por eso la página lo
 * dice con todas sus letras en vez de disfrazarlo de ciencia.
 *
 * La parte que no es adorno: el resultado termina invitando a algo real
 * —un stand, una convocatoria, una fecha— porque de eso se trata.
 */

export interface QuizResult {
  /** El título grande del resultado. */
  headline: string;
  /** Dos párrafos que describen a la persona. */
  portrait: string[];
  /** Cosas que dan ganas de asentir. */
  signals: string[];
  /** Eso que te han criticado, leído al derecho. */
  reframe: string;
  /** Tu don, en una línea que se pueda presumir. */
  superpower: string;
  /** Qué eres dentro de la comunidad del market. */
  belonging: string;
  /** Qué hacer con esto cuando vengas. */
  invitation: string;
  /**
   * A dónde apunta el botón principal. Sigue a la invitación: si el
   * texto acaba de decir "inscríbete al dance cover", el botón grande
   * no puede decir "aparta tu stand".
   */
  cta: "stand" | "convocatoria";
}

export const QUIZ_RESULTS: Record<CharacterId, QuizResult> = {
  mofu: {
    headline: "Eres Mofu",
    portrait: [
      "Tienes una costumbre que casi nadie nota: revisas que todos estén bien antes de revisar cómo estás tú. Te sale tan natural que a veces terminas el día cansada sin saber exactamente de qué. Por fuera te ven tranquila —y lo eres— pero por dentro traes una cabeza que no para de acomodar cosas: quién no ha hablado en el grupo, a quién hay que escribirle, qué falta para que todo salga bien.",
      "Guardas cosas que otros tirarían: mensajes, boletos, una foto borrosa de un día cualquiera. Extrañas lugares en los que todavía estás. Esa nostalgia tuya no es tristeza, es la forma en que le pones valor a lo que viviste mientras lo estás viviendo.",
    ],
    signals: [
      "Eres quien crea el grupo del chat y quien lo mantiene vivo",
      "Te acuerdas de detalles que los demás ya olvidaron",
      "Te cuesta muchísimo más pedir ayuda que darla",
      "Cuando llega alguien nuevo, tú eres quien lo integra",
      "Has llorado con una canción que ni siquiera es triste",
    ],
    reframe:
      "Te han dicho que eres demasiado sentimental. No lo eres: te tomas en serio a la gente, y en un mundo con prisa eso se confunde con debilidad.",
    superpower: "Haces que un lugar se sienta casa en menos de diez minutos",
    belonging:
      "Mofu fundó este bazar. Los que salen Mofu son los que hacen que el market se sienta reunión de amigos y no puesto de venta: los que se quedan a platicar, los que presentan a dos personas que se van a caer bien.",
    invitation:
      "Si alguna vez pensaste en poner tu propio stand, este es el resultado que te lo estaba diciendo.",
    cta: "stand",
  },

  nyxie: {
    headline: "Eres Nyxie",
    portrait: [
      "La gente te busca cuando algo se descompuso. No porque lo pidas —de hecho te da un poco de flojera— sino porque saben que tú vas a entenderlo antes de opinar. Por eso a veces te quedas callada mientras todos ya están discutiendo: no estás desconectada, estás armando el problema completo en tu cabeza.",
      "Hay algo que casi nadie ve: te da miedo equivocarte en grande. Y sin embargo, si haces memoria, tus mejores cosas salieron justo de algo que no salió como esperabas.",
    ],
    signals: [
      "Alguien te escribe «¿me ayudas con algo rápido?» casi cada semana",
      "Prefieres hacerlo tú que explicarlo… y acabas explicándolo igual",
      "Te cuesta pedir ayuda porque sientes que deberías poder sola",
      "Cuando todos se alteran, tú bajas la voz en vez de subirla",
      "Investigas de más antes de decidir, y no te arrepientes",
    ],
    reframe:
      "Te han dicho que eres fría o distante. No es cierto: procesas antes de reaccionar, y quien no espera esos segundos se pierde la mejor parte de ti.",
    superpower: "Ves el problema real, no el que todos están discutiendo",
    belonging:
      "Nyxie abrió los portales que trajeron a todos aquí. Los que salen Nyxie son los que ven cómo arreglar algo antes que nadie: la persona a la que el staff termina preguntándole aunque no traiga gafete.",
    invitation:
      "Ven y busca el stand más raro del mapa. Es el tipo de cosa que sólo tú vas a saber apreciar.",
    cta: "convocatoria",
  },

  mimirosa: {
    headline: "Eres Mimirosa",
    portrait: [
      "Necesitas terminar el día con algo entre las manos. Aunque sea poquito, aunque nadie lo vea. Eres de las personas que en una fiesta encuentra al perro de la casa y se queda platicando con él un rato, y no lo dices, pero esa fue tu parte favorita.",
      "Te cuesta el ruido, pero no la gente: con los tuyos eres otra completamente. Y hay algo que casi nadie sabe de ti — cuando alguien que quieres está en problemas, la timidez se te quita de golpe y apareces con una firmeza que sorprende hasta a quien te conoce.",
    ],
    signals: [
      "Tienes materiales guardados «por si algún día»",
      "Prefieres escribir el mensaje que hacer la llamada",
      "Te tardas en abrirte, y cuando te abres es de verdad",
      "Has hecho un regalo a mano y te dio pena entregarlo",
      "Después de un día con mucha gente necesitas un rato en silencio",
    ],
    reframe:
      "Te han dicho que eres callada, o que «no se te nota». Lo que pasa es que no hablas por hablar: cuando dices algo, es porque de verdad valía la pena decirlo.",
    superpower: "Haces con las manos lo que otros sólo saben describir",
    belonging:
      "Mimirosa vivía en un bosque entero y lo cambió por este bazar. Los que salen Mimirosa son el corazón artesanal del market: los que hacen pieza por pieza y te cuentan el proceso si les preguntas.",
    invitation:
      "Si haces algo con las manos, aquí hay un lugar con tu nombre. En serio: aparta tu stand.",
    cta: "stand",
  },

  hanzo: {
    headline: "Eres Hanzo",
    portrait: [
      "Tú primero te lanzas y luego averiguas. Te ha salido mal las veces suficientes como para saber que valió la pena de todas formas. Tienes una habilidad rara y muy tuya: haces que la gente se anime a hacer cosas que sola nunca haría.",
      "Lo que pocos ven es que no eres tan despreocupado como pareces. Te importa muchísimo que los tuyos la estén pasando bien, y si alguien se quedó fuera de la broma, tú eres el primero en notarlo — aunque nadie se entere de que lo notaste.",
    ],
    signals: [
      "Eres el que propone el plan y el que logra que todos digan que sí",
      "Te aburres antes que los demás",
      "Has aprendido algo nada más porque se veía divertido",
      "Te acuerdas de las anécdotas, jamás de las fechas",
      "Alguien te dijo «contigo nunca sé qué va a pasar» y lo tomaste como cumplido",
    ],
    reframe:
      "Te han dicho que eres disperso, que no terminas lo que empiezas. La verdad es que necesitas que algo te emocione para darle todo — y cuando algo te emociona, no hay quien te pare.",
    superpower: "Convences a media docena de personas de una idea absurda, y funciona",
    belonging:
      "Hanzo se metió al portal sin preguntar a dónde iba. Los que salen Hanzo son los que llegan primero y se van al final: los que se meten a todos los concursos aunque no hayan practicado.",
    invitation:
      "Hay convocatorias abiertas. Ya sabemos que te vas a inscribir, así que mejor hazlo ya.",
    cta: "convocatoria",
  },

  rakkun: {
    headline: "Eres Rakkun",
    portrait: [
      "Antes de opinar quieres tener los datos, y eso te ha hecho quedar como el prudente del grupo cuando en realidad eres el que más ganas tiene de hablar. Tienes un tema —o cinco— del que podrías hablar horas, y esperas pacientemente a que alguien pregunte para soltarlo todo.",
      "Ayudas de una manera que casi nunca se agradece en voz alta: la de resolverle a alguien un problema a las once de la noche sin quejarte. Lo haces porque te gusta entender cómo funcionan las cosas, y porque te gusta todavía más que alguien más las entienda.",
    ],
    signals: [
      "Tienes una colección ordenada de una forma que sólo tú entiendes del todo",
      "Lees los instructivos, los términos y las notas al pie",
      "Prefieres el mensaje de texto a la llamada, sin discusión",
      "Has explicado algo con demasiado detalle y visto cómo la otra persona se pierde",
      "Te tranquiliza tener un plan B aunque el A vaya bien",
    ],
    reframe:
      "Te han dicho que le das demasiadas vueltas. No es eso: ya viste tres problemas que los demás no vieron, y prefieres resolverlos antes de que aparezcan.",
    superpower: "Entiendes las reglas tan bien que sabes exactamente dónde doblarlas",
    belonging:
      "Rakkun cayó por un portal mientras leía un cómic y aquí encontró el TCG. Los que salen Rakkun son los que se saben el meta, los que arman el mazo raro que nadie vio venir y ganan con él.",
    invitation:
      "El torneo de TCG te está esperando. Y sí, ya puedes ir revisando el reglamento — sabemos que lo vas a leer completo.",
    cta: "convocatoria",
  },

  charmy: {
    headline: "Eres Charmy",
    portrait: [
      "Ves cosas que los demás pasan de largo: una textura, dos colores que combinaron por accidente, cómo le pega la luz a algo completamente ordinario. Y cuando lo señalas, los demás también lo ven, y se preguntan cómo no lo habían notado antes.",
      "Empiezas muchas cosas. Unas las terminas y otras se quedan a medias, y alguna vez eso te hizo sentir culpa. No debería: cada una de esas cosas incompletas te enseñó algo que hoy usas sin darte cuenta de dónde salió.",
    ],
    signals: [
      "Tu galería está llena de fotos de cielos, paredes y charcos",
      "Te distraes a media conversación porque viste algo",
      "Has cambiado de estilo varias veces y no te arrepientes de ninguno",
      "Te adaptas al grupo en el que caigas sin dejar de ser tú",
      "Compraste algo porque te gustó, no porque lo necesitaras",
    ],
    reframe:
      "Te han dicho que eres distraída. Lo que pasa es que tu atención está en otro lado — y ese otro lado casi siempre es más bonito.",
    superpower: "Le encuentras belleza a lo que todos ya dieron por visto",
    belonging:
      "Charmy pintaba obras que hipnotizaban a medio PuffiLand. Los que salen Charmy son los que se paran diez minutos en un stand nada más viendo, y terminan llevándose lo que ni sabían que querían.",
    invitation:
      "Trae con qué tomar fotos. Y si dibujas, pintas o creas algo: aquí se vende eso, y se vende bien.",
    cta: "stand",
  },

  nori: {
    headline: "Eres Nori",
    portrait: [
      "Cuidas a la gente de una forma muy concreta: no preguntas «¿estás bien?», llegas con algo. Un café, comida, un mensaje en el momento exacto. Te sale tan natural que te sorprende genuinamente cuando alguien te lo agradece.",
      "Tienes dos velocidades. La de afuera es cálida, divertida y con chispa. La de adentro casi nadie la ha visto, y no es que escondas algo malo — es que eliges con mucho cuidado a quién le abres esa puerta.",
    ],
    signals: [
      "Has cocinado para alguien nada más porque estaba triste",
      "Te acuerdas de lo que le gusta y lo que no le gusta a cada quien",
      "Te incomoda tantito recibir, aunque das todo el tiempo",
      "Tienes una versión tuya para el mundo y otra para tres personas",
      "Alguien te dijo «no sé cómo lo haces» sobre algo que para ti fue normal",
    ],
    reframe:
      "Te han dicho que eres misteriosa, difícil de leer. No es distancia: te tomas en serio a quién dejas entrar, que es justo lo contrario de ser superficial.",
    superpower: "Sabes exactamente qué necesita alguien antes de que lo diga",
    belonging:
      "Nori viene de un linaje antiguo de chefs y cocina con magia de verdad. Los que salen Nori son los que hacen que el market huela bien: los que dan de comer y se quedan viendo la cara del primer bocado.",
    invitation:
      "Si cocinas, tenemos un pasillo con tu nombre. Los lugares de comida son contados y se van rapidísimo.",
    cta: "stand",
  },

  kaini: {
    headline: "Eres Kaini",
    portrait: [
      "Vives las cosas al cien o no las vives. Cuando algo te gusta no te gusta: te obsesiona, te lo aprendes completo, y necesitas que alguien más lo escuche contigo para que sea real.",
      "La gente te ve pura energía y ni se imagina cuánto piensas en si estás siendo demasiado. No lo eres. Lo que tienes es entusiasmo, y el entusiasmo es lo más contagioso que existe — por eso la gente se anima cuando tú te animas.",
    ],
    signals: [
      "Te sabes coreografías y letras que nadie te pidió aprender",
      "Cada pieza de tu colección tiene su historia y la puedes contar",
      "Mandas mensajes de «TIENES QUE VER ESTO» a media noche",
      "Te emocionas por los planes de otros como si fueran tuyos",
      "Has llorado de felicidad en un concierto",
    ],
    reframe:
      "Te han dicho que eres intensa. Sí lo eres, y es exactamente lo que hace que la gente quiera estar cerca: contigo todo se siente más importante de lo que sería sin ti.",
    superpower: "Contagias emoción por algo que la otra persona ni conocía",
    belonging:
      "Kaini es la más nueva del elenco y ya se sabe todas las coreografías. Los que salen Kaini son los que se ponen hasta adelante en el escenario, los que gritan más fuerte y los que hacen que un concurso se sienta concierto.",
    invitation:
      "El dance cover te está llamando. Puedes inscribirte en grupo o sola, y las dos cosas se valen.",
    cta: "convocatoria",
  },
};
