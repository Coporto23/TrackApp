// Ejercicios base que se copian a cada usuario nuevo (split de 5 días).
// Cada usuario recibe su propia copia y puede renombrarla o archivarla libremente.
export const DEFAULT_EXERCISES = [
  // Pecho
  "Press de Banca",
  "Press Inclinado con Mancuernas",
  "Aperturas en Máquina",
  "Fondos en Paralelas",
  "Cruce de Poleas",
  // Espalda
  "Dominadas",
  "Remo con Barra",
  "Jalón al Pecho",
  "Remo en Polea Baja",
  "Peso Muerto",
  // Piernas
  "Sentadilla",
  "Prensa de Piernas",
  "Peso Muerto Rumano",
  "Extensión de Cuádriceps",
  "Curl Femoral",
  "Elevación de Talones",
  // Hombros
  "Press Militar",
  "Press de Hombros con Mancuernas",
  "Elevaciones Laterales",
  "Pájaros (Deltoide Posterior)",
  "Face Pull",
  // Brazos
  "Curl con Barra",
  "Curl Martillo",
  "Curl en Banco Scott",
  "Extensión de Tríceps en Polea",
  "Press Francés",
] as const;
