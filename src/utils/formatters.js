// src/utils/formatters.js

/**
 * Convierte texto a formato título (primera letra de cada palabra en mayúscula)
 * @param {string} text - Texto a formatear
 * @returns {string} Texto formateado
 */
export const formatTitleCase = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Manejar palabras con guiones (ej: "área-de-gobierno")
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Formatea nombres de personas (primera letra de nombre y apellido en mayúscula)
 * @param {string} name - Nombre completo
 * @returns {string} Nombre formateado
 */
export const formatPersonName = (name) => {
  if (!name) return '';
  
  const specialCases = ['ii', 'iii', 'iv', 'jr', 'sr'];
  
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index, array) => {
      // No capitalizar conectores comunes
      if (index > 0 && index < array.length - 1 && 
          ['de', 'del', 'la', 'las', 'los', 'y', 'e'].includes(word)) {
        return word;
      }
      
      // No capitalizar casos especiales
      if (specialCases.includes(word)) {
        return word.toUpperCase();
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};