/**
 * Кольори для нативних елементів навігації (React Navigation, StatusBar),
 * куди не можна передавати oklch(...) з global.css.
 * Значення підібрані під токени теми RehaFlow.
 */
export const navColors = {
  header: '#1D5AB0',
  headerForeground: '#FFFFFF',
  background: '#10141E',
  surface: '#161C26',
  border: '#2C3442',
  accent: '#2E90E5',
  muted: '#96A0B0',
  urgent: '#E07B1F',
  danger: '#D23B32',
  success: '#3FA96B',
  drawer: '#141A24',
} as const;
