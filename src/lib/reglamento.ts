// Reglamento para expositores de MOFU MOFU MARKET.
// El expositor debe leerlo y aceptarlo antes de poder pagar su stand.
// Si se actualiza el reglamento, sube REGLAMENTO_VERSION para dejar
// constancia de qué versión aceptó cada quien.

export const REGLAMENTO_VERSION = "2026-08";

export interface ReglamentoSection {
  title: string;
  items: string[];
}

export const REGLAMENTO: ReglamentoSection[] = [
  {
    title: "1. Disposiciones generales",
    items: [
      "1.1. El presente reglamento tiene como finalidad garantizar una experiencia segura, ordenada y agradable para todos los participantes de MOFU MOFU MARKET.",
      "1.2. Todas las personas expositoras deberán cumplir obligatoriamente con estas disposiciones.",
      "1.3. La participación en el evento implica la aceptación total del presente reglamento.",
    ],
  },
  {
    title: "2. Montaje y desmontaje",
    items: [
      "2.1. Los horarios de montaje y desmontaje serán previamente asignados por el comité organizador y deberán respetarse puntualmente.",
      "2.2. Cada expositor deberá instalarse únicamente en el espacio asignado, sin invadir otras áreas.",
      "2.3. No está permitido desmontar o retirarse antes del cierre del evento sin autorización previa.",
      "2.4. Al finalizar, el espacio deberá entregarse limpio, sin residuos ni daños.",
    ],
  },
  {
    title: "3. Espacio y equipamiento",
    items: [
      "3.1. Cada expositor recibirá instalados un toldo, 1 mesa y 2 sillas, y contarán con extensión de luz. El expositor deberá traer sus extensiones, multicontactos y un foco, los necesarios según sea el caso.",
      "3.2. El área deberá mantenerse ordenada, limpia y visualmente acorde al ambiente familiar y temático del evento.",
      "3.3. Queda estrictamente prohibido clavar, perforar, pintar o dañar cualquier instalación del parque, así como tirar agua dentro del parque. Si así lo ocuparan, dirigirse con el STAFF para las indicaciones necesarias.",
      "3.4. Cada expositor deberá informar y registrar con anticipación, de manera específica y detallada, todos los utensilios, aparatos y equipos eléctricos que utilizará durante el evento, incluyendo el consumo energético aproximado de cada uno cuando sea aplicable. Esto incluye, de manera enunciativa mas no limitativa: cargadores, extensiones, multicontactos, focos, tiras LED, lámparas, monitores, pantallas, ventiladores, bocinas, licuadoras, cafeteras, freidoras, parrillas eléctricas, hornos, refrigeradores, equipos de cocina, herramientas especializadas y cualquier otro dispositivo que requiera suministro eléctrico.",
      "3.5. El uso de equipos o utensilios eléctricos que no hayan sido previamente registrados y autorizados por el comité organizador estará estrictamente prohibido. En caso de detectarse algún aparato no reportado, se solicitará al expositor suspender inmediatamente su uso y retirarlo del área del evento.",
      "3.6. Si el expositor se niega a acatar esta indicación o reincide en el uso de equipos no autorizados, el comité organizador podrá retirar el utensilio o equipo en cuestión y, de considerarlo necesario, proceder al retiro del expositor y su stand del evento, sin derecho a reembolso alguno.",
    ],
  },
  {
    title: "4. Productos y ventas",
    items: [
      "4.1. Solo podrán comercializarse productos previamente autorizados por el comité organizador.",
      "4.2. Se prohíbe la venta de artículos ilegales, peligrosos o que incumplan disposiciones sanitarias o legales aplicables.",
      "4.3. Las personas expositoras son responsables de la calidad, seguridad, precios y cumplimiento de sus productos.",
      "4.4. En caso de alimentos o bebidas, deberán cumplirse las normas básicas de higiene y manejo adecuado.",
    ],
  },
  {
    title: "5. Conducta y ambiente",
    items: [
      "5.1. Se espera un comportamiento respetuoso, amable y acorde al espíritu kawaii y familiar de MOFU MOFU MARKET.",
      "5.2. No se permite música a volumen alto que afecte la experiencia de otros expositores o visitantes.",
      "5.3. Está prohibido el consumo de alcohol o sustancias ilegales dentro del evento.",
      "5.4. Cualquier conducta agresiva, discriminatoria o inapropiada será motivo de sanción.",
    ],
  },
  {
    title: "6. Seguridad y responsabilidad",
    items: [
      "6.1. Cada expositor es responsable de sus pertenencias, productos y equipo en todo momento.",
      "6.2. El comité organizador no se hace responsable por pérdidas, robos, daños o accidentes.",
      "6.3. Se deberán mantener libres los pasillos, accesos y salidas de emergencia.",
      "6.4. Contaremos con una persona que vigilará sus pertenencias de la noche del sábado para el domingo. Es de suma importancia que tomen sus precauciones y, si dejan mercancía, que quede muy bien asegurada en cajas o emplayada.",
    ],
  },
  {
    title: "7. Imagen y publicidad",
    items: [
      "7.1. La promoción de productos deberá realizarse únicamente dentro del espacio asignado.",
      "7.2. No se permite repartir publicidad fuera del stand ni dentro del parque.",
      "7.3. Al participar, el expositor autoriza el uso de imágenes del evento donde pudiera aparecer su stand con fines promocionales.",
    ],
  },
  {
    title: "8. Cancelaciones y sanciones",
    items: [
      "8.1. El incumplimiento de este reglamento podrá resultar en la suspensión de actividades o retiro del expositor, sin derecho a reembolso.",
      "8.2. El comité organizador se reserva el derecho de admisión y permanencia.",
      "8.3. En caso de cancelación por parte del expositor, no se realiza reembolso del espacio; en dado caso y que aplique, se le podrá bonificar para una siguiente edición según sea el caso.",
      "8.4. En caso de lluvia o condiciones climatológicas desfavorables para el evento, suficientes para la cancelación del mismo, la organización avisará con tiempo y reagendará la fecha. En caso de que el expositor no pueda asistir a la fecha reagendada, todo el dinero que el expositor abonó será considerado para futuras ediciones. El reembolso en estos casos no es posible.",
      "8.5. En caso de cancelación por parte del expositor, se tendrá que hacer como máximo hasta dos semanas antes del evento para poder ser reembolsado el dinero abonado. En caso de que la cancelación sea dentro de las dos semanas antes del evento, el dinero será tomado en cuenta en su totalidad para otra edición del evento.",
      "8.6. En caso de no liquidar antes de la fecha límite establecida sin avisar a la organización anteriormente, no se podrá garantizar su espacio ni su abono para siguientes ediciones.",
      "8.7. En caso de que el expositor lleve equipo de gas o eléctrico no registrado anteriormente, tanto los organizadores del evento como la organización del parque tienen el derecho de pedir que se retiren y se guarden dichos elementos. Si no se acata la orden, esto puede ser causante de la expulsión del evento sin derecho a reembolso.",
      "8.8. En caso de que el expositor lleve giros que anteriormente se anunciaron como restringidos, puede ser acreedor de una multa o de que se le solicite retirar el producto restringido. Revisar los giros prohibidos es responsabilidad del expositor y la organización no se hará responsable en caso de no acatar dichas indicaciones.",
    ],
  },
  {
    title: "9. Disposiciones finales",
    items: [
      "9.1. Cualquier situación no prevista será resuelta por el comité organizador.",
      "9.2. El comité organizador podrá realizar modificaciones al presente reglamento cuando lo considere necesario.",
      "9.3. Ser expositor de Mofu Mofu Market hace que estés de acuerdo con este contrato y que tengas conocimiento de la existencia del mismo.",
    ],
  },
];

export const STAFF_CONTACTS = [
  { name: "Roberto Coronado", phone: "8127562745" },
  { name: "Claudia Luna", phone: "8117998618" },
];

// Giros restringidos: se muestran solo cuando la edición del evento los
// tiene activados (campo restricted_giros_enabled en la tabla events).
export const RESTRICTED_GIROS = [
  "Crepas y frappes",
  "Paninis y chilaquiles",
  "Rusas / bebidas preparadas",
  "Tamales",
  "Elotes y tostitos",
  "Plantitas suculentas",
  "Duritos y tostadas",
  "Bisutería",
  "Repostería",
  "Burbuwaffles y banderillas",
  "Aguas frescas",
  "Crepas & smoothies",
  "Hot dogs, papas y boneless",
  "Aguas y snacks",
  "Menudo, tortas y yukis",
  "Gorditas y tacos",
  "Mini panqueques con cobertura líquida, topping y fruta",
  "Alcancías / pintura",
];
