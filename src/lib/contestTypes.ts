// Qué le pregunta cada tipo de convocatoria a quien se inscribe.
//
// Las preguntas viven aquí y no en la base de datos: cambiar una es
// editar este archivo, sin migración. Las respuestas se guardan en
// contest_entries.answers usando el "id" de cada campo como llave, y de
// aquí también salen las columnas de su hoja del Excel.
//
// Nombre, teléfono y correo NO están en esta lista: son columnas
// propias de la tabla porque el panel admin los necesita siempre. Lo
// único que cambia entre tipos es cómo se llama el nombre, y para eso
// está "nameLabel".

export type ContestTypeId = "dance_cover" | "cosplay" | "tcg" | "otro";

export type ContestFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "song";

export interface ContestField {
  /** Llave dentro de answers. No cambiarla después de recibir inscritos. */
  id: string;
  label: string;
  type: ContestFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Opciones del select. */
  options?: readonly string[];
  maxLength?: number;
  /** El campo sólo aparece cuando otro campo tiene este valor. */
  showIf?: { field: string; equals: string };
}

export interface ContestType {
  id: ContestTypeId;
  label: string;
  /** Nombre que se propone al crear la convocatoria en el admin. */
  defaultName: string;
  /** Texto que ve quien se va a inscribir. */
  description: string;
  /** Etiqueta del campo de nombre, que cambia según el concurso. */
  nameLabel: string;
  namePlaceholder?: string;
  fields: readonly ContestField[];
}

const MODALIDAD = ["Individual", "Grupo"] as const;

export const CONTEST_TYPES: readonly ContestType[] = [
  {
    id: "dance_cover",
    label: "Dance cover",
    defaultName: "Concurso de dance cover",
    description:
      "Inscribe a tu grupo o tu participación individual en el concurso de dance cover.",
    nameLabel: "Nombre del grupo o del participante",
    namePlaceholder: "Como quieren que los presentemos en el escenario",
    fields: [
      {
        id: "modalidad",
        label: "¿Participan en grupo o individual?",
        type: "select",
        required: true,
        options: MODALIDAD,
      },
      {
        id: "integrantes",
        label: "¿Cuántos integrantes son?",
        type: "number",
        required: true,
        showIf: { field: "modalidad", equals: "Grupo" },
      },
      {
        id: "nombresIntegrantes",
        label: "Nombres de los integrantes",
        type: "textarea",
        showIf: { field: "modalidad", equals: "Grupo" },
        placeholder: "Uno por línea",
        maxLength: 1000,
      },
      {
        id: "representante",
        label: "Nombre del representante",
        type: "text",
        required: true,
        help: "Con esta persona nos comunicamos para todo lo del concurso.",
      },
      {
        id: "redes",
        label: "Redes sociales",
        type: "text",
        placeholder: "@usuario de Instagram, TikTok o Facebook",
      },
      {
        id: "cancion",
        label: "Canción que van a bailar",
        type: "song",
        required: true,
        help: "Pega el link de Spotify o YouTube. Si no lo tienes a la mano, escribe el nombre de la canción y el artista.",
      },
    ],
  },
  {
    id: "cosplay",
    label: "Concurso de cosplay",
    defaultName: "Concurso de cosplay",
    description: "Inscribe tu cosplay para desfilar y concursar en el escenario.",
    nameLabel: "Nombre del cosplayer",
    namePlaceholder: "Tu nombre artístico o como quieres que te presentemos",
    fields: [
      {
        id: "cosplay",
        label: "¿Qué cosplay vas a llevar?",
        type: "text",
        required: true,
        placeholder: "Personaje que vas a interpretar",
      },
      {
        id: "serie",
        label: "Serie, juego o película de origen",
        type: "text",
        required: true,
      },
      {
        id: "categoria",
        label: "¿Concursas solo o en grupo?",
        type: "select",
        required: true,
        options: ["Individual", "Dueto", "Grupo"],
      },
      {
        id: "integrantes",
        label: "Nombres de los demás integrantes",
        type: "textarea",
        showIf: { field: "categoria", equals: "Grupo" },
        placeholder: "Uno por línea",
        maxLength: 1000,
      },
      {
        id: "confeccion",
        label: "¿Cómo conseguiste tu cosplay?",
        type: "select",
        required: true,
        options: ["Hecho por mí", "Comprado", "Mixto (parte hecha, parte comprada)"],
        help: "Sirve para separar categorías de premiación, no para descalificar a nadie.",
      },
      {
        id: "redes",
        label: "Redes sociales",
        type: "text",
        placeholder: "@usuario de Instagram, TikTok o Facebook",
      },
      {
        id: "cancion",
        label: "Canción que quieres que suene en tu presentación",
        type: "song",
        help: "Pega el link de Spotify o YouTube, o escribe el nombre de la canción y el artista.",
      },
      {
        id: "presentacion",
        label: "¿Qué vas a hacer en el escenario?",
        type: "textarea",
        placeholder: "Pasarela, actuación, baile, poses... cuéntanos para acomodar los tiempos.",
        maxLength: 600,
      },
      {
        id: "necesidades",
        label: "Necesidades de audio o escenario",
        type: "textarea",
        placeholder: "Props grandes, ayuda para subir al escenario, luces, etc.",
        maxLength: 600,
      },
    ],
  },
  {
    id: "tcg",
    label: "Torneo TCG",
    defaultName: "Torneo TCG",
    description: "Regístrate en el torneo de cartas coleccionables.",
    nameLabel: "Nombre del jugador",
    fields: [
      {
        id: "juego",
        label: "¿En qué juego participas?",
        type: "select",
        required: true,
        options: [
          "Pokémon TCG",
          "Yu-Gi-Oh!",
          "Magic: The Gathering",
          "One Piece Card Game",
          "Digimon Card Game",
          "Dragon Ball Super Card Game",
          "Otro",
        ],
      },
      {
        id: "otroJuego",
        label: "¿Cuál juego?",
        type: "text",
        required: true,
        showIf: { field: "juego", equals: "Otro" },
      },
      {
        id: "nickname",
        label: "Nickname o ID de jugador",
        type: "text",
        help: "Si tu juego usa ID oficial (por ejemplo el Player ID de Pokémon), ponlo aquí.",
      },
      {
        id: "formato",
        label: "Formato en el que participas",
        type: "text",
        placeholder: "Ej. Estándar, Avanzado, Commander",
      },
      {
        id: "mazo",
        label: "Mazo o deck principal (opcional)",
        type: "text",
        placeholder: "Sólo si quieres decirnos con qué vas a jugar",
      },
      {
        id: "nivel",
        label: "¿Cómo describes tu nivel?",
        type: "select",
        options: ["Primera vez", "Casual", "Competitivo"],
      },
      {
        id: "redes",
        label: "Redes sociales",
        type: "text",
        placeholder: "@usuario de Instagram, TikTok o Facebook",
      },
      {
        id: "notas",
        label: "Algo que debamos saber",
        type: "textarea",
        placeholder: "Horario en el que puedes jugar, si llegas con acompañante, etc.",
        maxLength: 600,
      },
    ],
  },
  {
    id: "otro",
    label: "Otra convocatoria",
    defaultName: "Nueva convocatoria",
    description: "Inscríbete en esta convocatoria.",
    nameLabel: "Nombre del participante",
    fields: [
      {
        id: "descripcion",
        label: "Cuéntanos de tu participación",
        type: "textarea",
        required: true,
        maxLength: 1000,
      },
      {
        id: "redes",
        label: "Redes sociales",
        type: "text",
        placeholder: "@usuario de Instagram, TikTok o Facebook",
      },
      {
        id: "cancion",
        label: "Canción (si tu participación lleva música)",
        type: "song",
      },
      {
        id: "necesidades",
        label: "Necesidades de audio o escenario",
        type: "textarea",
        maxLength: 600,
      },
    ],
  },
];

export function getContestType(id: string): ContestType {
  return CONTEST_TYPES.find((t) => t.id === id) ?? CONTEST_TYPES[CONTEST_TYPES.length - 1];
}

/**
 * Un campo condicionado sólo cuenta (para validar y para mostrarse) si
 * su condición se cumple; si no, se ignora aunque sea obligatorio.
 */
export function isFieldVisible(
  field: ContestField,
  answers: Record<string, string>
): boolean {
  if (!field.showIf) return true;
  return answers[field.showIf.field] === field.showIf.equals;
}

/**
 * Valida las respuestas contra la definición del tipo. Devuelve el
 * primer error encontrado, o null si todo está bien. La usan el
 * formulario y la API, para que el navegador y el servidor apliquen
 * exactamente la misma regla.
 */
export function validateAnswers(
  type: ContestType,
  answers: Record<string, string>
): { field: string; message: string } | null {
  for (const field of type.fields) {
    if (!isFieldVisible(field, answers)) continue;

    const value = (answers[field.id] ?? "").trim();

    if (field.required && !value) {
      return { field: field.id, message: `Completa "${field.label}".` };
    }
    if (!value) continue;

    if (field.maxLength && value.length > field.maxLength) {
      return {
        field: field.id,
        message: `"${field.label}" no puede pasar de ${field.maxLength} caracteres.`,
      };
    }
    if (field.type === "select" && field.options && !field.options.includes(value)) {
      return { field: field.id, message: `Elige una opción válida en "${field.label}".` };
    }
    if (field.type === "number" && !/^\d{1,4}$/.test(value)) {
      return { field: field.id, message: `"${field.label}" debe ser un número.` };
    }
  }
  return null;
}

/** Deja sólo las respuestas que el tipo conoce y que se ven. */
export function cleanAnswers(
  type: ContestType,
  answers: Record<string, string>
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const field of type.fields) {
    if (!isFieldVisible(field, answers)) continue;
    const value = (answers[field.id] ?? "").trim();
    if (value) clean[field.id] = value;
  }
  return clean;
}

/**
 * Saca el id de una pista de Spotify de cualquiera de sus formatos de
 * link, para poder mostrar el reproductor incrustado. Devuelve null si
 * lo que pegaron no es un link de Spotify (lo normal si escribieron el
 * nombre de la canción o pegaron YouTube).
 */
export function spotifyTrackId(value: string): string | null {
  const match = value
    .trim()
    .match(/(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/);
  return match ? match[1] : null;
}
