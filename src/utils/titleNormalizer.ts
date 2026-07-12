/**
 * Normaliza un título convirtiéndolo a minúsculas, eliminando caracteres especiales,
 * guiones, dos puntos, comillas y normalizando espacios en blanco.
 */
export function normalizeTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD") // Descomponer acentos y diacríticos
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, " ") // Reemplazar caracteres especiales por espacio
    .replace(/\s+/g, " ") // Colapsar espacios múltiples
    .trim();
}

/**
 * Elimina sufijos comunes que agregan las fuentes de video a los títulos de los episodios.
 */
export function cleanVideoSuffixes(title: string): string {
  if (!title) return "";
  
  // Limpieza iterativa de sufijos comunes de temporada, parte, idioma y formato
  let cleaned = title;
  
  // Regex para remover (Sub), (Dub), [Sub], [Dub], etc.
  cleaned = cleaned.replace(/\s*[\(\[][^]*?(sub|dub|español|latino|castellano)[^]*?[\)\]]/gi, "");
  
  // Regex para remover sufijos como "TV", "HD", "BD", "Uncensored", "Censored"
  cleaned = cleaned.replace(/\b(tv|hd|bd|uncensored|censored)\b/gi, "");
  
  // Regex para remover temporadas ("season X", "temporada X", "part X", "parte X", "court X")
  cleaned = cleaned.replace(/\b(season|temporada|part|parte|court|capitulo|episodio)\s*\d+/gi, "");
  
  // Regex para limpiar números de episodios sueltos al final
  cleaned = cleaned.replace(/\s+\d+$/gi, "");
  
  // Volver a colapsar espacios
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de caracteres.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // Deletion
          dp[i][j - 1] + 1,    // Insertion
          dp[i - 1][j - 1] + 1 // Substitution
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * Realiza una comparación de similitud difusa (Fuzzy Matching) basada en la distancia de Levenshtein.
 * Devuelve un porcentaje entre 0 (sin coincidencia) y 1 (coincidencia perfecta).
 */
export function fuzzyMatch(s1: string, s2: string): number {
  const norm1 = cleanVideoSuffixes(normalizeTitle(s1));
  const norm2 = cleanVideoSuffixes(normalizeTitle(s2));
  
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 1.0;
  
  return 1.0 - (distance / maxLength);
}
