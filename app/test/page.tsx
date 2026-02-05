'use client';

import { useState } from 'react';
import { usuariosService } from '@/services/usuarios-service';
import { clientesService } from '@/services/clientes-service';
import { rutasService } from '@/services/rutas-service';
import { inventarioService } from '@/services/inventario-service';
import { pagosService } from '@/services/pagos-service';
import { prestamosService } from '@/services/prestamos-service';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log(`Ejecutando: ${testName}`);
      const data = await testFn();
      setResult({ test: testName, data, success: true });
      console.log(`Resultado ${testName}:`, data);
    } catch (err: any) {
      const errorMsg = err?.message || err?.error || 'Error desconocido';
      setError(errorMsg);
      setResult({ test: testName, error: errorMsg, success: false });
      console.error(`Error en ${testName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const tests = [
    {
      category: 'Usuarios',
      items: [
        { name: 'Obtener todos los usuarios', fn: () => usuariosService.obtenerTodos() },
      ]
    },
    {
      category: 'Clientes',
      items: [
        { name: 'Obtener todos los clientes', fn: () => clientesService.obtenerTodos() },
      ]
    },
    {
      category: 'Rutas',
      items: [
        { name: 'Obtener todas las rutas', fn: () => rutasService.obtenerRutas() },
        { name: 'Obtener estadisticas de rutas', fn: () => rutasService.obtenerEstadisticas() },
        { name: 'Obtener lista de cobradores', fn: () => rutasService.obtenerCobradores() },
      ]
    },
    {
      category: 'Inventario',
      items: [
        { name: 'Obtener productos', fn: () => inventarioService.obtenerProductos() },
        { name: 'Obtener estadisticas', fn: () => inventarioService.obtenerEstadisticas() },
      ]
    },
    {
      category: 'Pagos',
      items: [
        { name: 'Obtener pagos', fn: () => pagosService.obtenerPagos() },
      ]
    },
    {
      category: 'Prestamos',
      items: [
        { name: 'Obtener prestamos', fn: () => prestamosService.obtenerPrestamos() },
        { name: 'Obtener cuotas (requiere ID)', fn: async () => {
          const prestamos = await prestamosService.obtenerPrestamos({ limit: 1 });
          if (prestamos.prestamos.length > 0) {
            return prestamosService.obtenerCuotas(prestamos.prestamos[0].id);
          }
          throw new Error('No hay prestamos para obtener cuotas');
        }},
      ]
    },
  ];

  return (
    <div style={{ 
      padding: '40px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ marginBottom: '30px', color: '#333' }}>
        Panel de Pruebas - API Creditos del Sur
      </h1>

      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginTop: 0 }}>Instrucciones:</h3>
        <ol style={{ marginBottom: 0 }}>
          <li>Asegurate de que el backend este corriendo en http://localhost:3001</li>
          <li>Primero debes hacer login (si es necesario)</li>
          <li>Haz clic en cualquier boton para probar el endpoint</li>
          <li>Los resultados apareceran abajo</li>
        </ol>
      </div>

      {tests.map((category, idx) => (
        <div key={idx} style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#495057',
            borderBottom: '2px solid #007bff',
            paddingBottom: '10px'
          }}>
            {category.category}
          </h2>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            {category.items.map((test, testIdx) => (
              <button
                key={testIdx}
                onClick={() => runTest(test.name, test.fn)}
                disabled={loading}
                style={{
                  padding: '15px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff',
                  backgroundColor: loading ? '#6c757d' : '#007bff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#0056b3';
                }}
                onMouseOut={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#007bff';
                }}
              >
                {test.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {loading && (
        <div style={{
          padding: '20px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <strong>Cargando...</strong>
        </div>
      )}

      {error && (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c2c7',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3 style={{ marginTop: 0, color: '#842029' }}>Error:</h3>
          <p style={{ margin: 0, color: '#58151c' }}>{error}</p>
        </div>
      )}

      {result && result.success && (
        <div style={{
          padding: '20px',
          backgroundColor: '#d1e7dd',
          border: '1px solid #badbcc',
          borderRadius: '8px',
          marginTop: '30px'
        }}>
          <h3 style={{ marginTop: 0, color: '#0f5132' }}>
            Exito: {result.test}
          </h3>
          <div style={{
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            <pre style={{ 
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.5'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
