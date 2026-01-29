/**
 * ============================================================================
 * ROOT PATH REDIRECT
 * ============================================================================
 * Redirige el tráfico de raíz ('/') al Login.
 * Si en el futuro se crea una Landing Page pública, se implementaría aquí.
 */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
