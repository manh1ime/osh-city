/**
 * Единый логотип кафе «Ош-Сити».
 *
 * Два варианта одной графики:
 * - `full` — герб с надписью, для крупных блоков (герой лендинга, входы);
 * - `emblem` — только герб, для шапок и других мест меньше ~100px,
 *   где надпись превращается в нечитаемую полоску.
 *
 * Оба файла с прозрачным фоном: поверхности темы имеют разные оттенки
 * (#0d111d у фона, rgba(18,24,20,.96) у гостевой шапки, rgba(23,29,44,.94)
 * у карточек), поэтому логотип с залитым фоном давал бы видимую плашку.
 *
 * Компонент без "use client": используется и в серверных, и в клиентских частях.
 */

const SOURCE = {
  full: "/images/logo-osh.png",
  emblem: "/images/logo-osh.png",
} as const;

type Props = {
  variant?: keyof typeof SOURCE;
  /** Размер и скругление задаются снаружи, например "h-11 w-11". */
  className?: string;
  /**
   * Пустая строка, если рядом уже есть название кафе: озвучивать его дважды
   * скринридеру не нужно.
   */
  alt?: string;
};

export function Logo({
  variant = "emblem",
  className = "h-11 w-11",
  alt = "Логотип кафе «Ош-Сити»",
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SOURCE[variant]}
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
