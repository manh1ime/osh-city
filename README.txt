Исправлена страница отчетов менеджера для Next.js 15.5.24.

Распакуйте архив в корень проекта с заменой файла и выполните:

Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
npx tsc --noEmit
npm run build
