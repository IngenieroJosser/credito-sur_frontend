// Esta página solo está disponible en desarrollo
// En producción redirige a 404 para no exponer endpoints internos
import { redirect, notFound } from 'next/navigation';

export default function TestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // En desarrollo, redirige al panel de admin para evitar acceso accidental
  // Si necesitas la página de pruebas, descomenta el componente original
  redirect('/admin');
}
