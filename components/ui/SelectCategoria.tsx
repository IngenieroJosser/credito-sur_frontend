
import { useState, useEffect } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';
import { categoriasService, Categoria } from '@/services/categorias-service';
import { useNotification } from '@/components/providers/NotificationProvider';
import FieldLabel from '@/components/ui/FieldLabel';
import { logger } from '@/lib/logger';
import { Selector } from '@/components/ui/Selector'
import Tooltip from '@/components/ui/Tooltip'

interface SelectCategoriaProps {
  tipo: string; // 'CLIENTE', 'GASTO', etc.
  value?: string;
  onChange: (categoriaId: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onCreated?: (categoria: Categoria) => void;
}

export default function SelectCategoria({ 
  tipo, 
  value, 
  onChange, 
  label = 'Categoría',
  required = false,
  placeholder = 'Seleccionar...',
  disabled = false,
  onCreated
}: SelectCategoriaProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const { showNotification } = useNotification();

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const data = await categoriasService.obtenerTodas(tipo);
      setCategorias(data);
      
      // Auto-seleccionar categoría por defecto si existe y no hay valor seleccionado
      if (!value && data.length > 0) {
        // Buscar categoría que coincida con el tipo (INGRESO o EGRESO/GASTO)
        const defaultCat = data.find(c => c.nombre.toUpperCase() === tipo.toUpperCase()) || data[0];
        if (defaultCat) {
           onChange(defaultCat.id);
        }
      }
    } catch (error) {
      // Sin categorias el desplegable queda vacio; el formulario sigue usable.
      // Se avisa solo en desarrollo, que es donde sirve.
      logger.warn('No se pudieron cargar las categorias', error)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategorias();
  }, [tipo]);

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setCreating(true);
    try {
      const nueva = await categoriasService.crear({
        nombre: newCatName,
        tipo: tipo
      });
      setCategorias([...categorias, nueva]);
      onChange(nueva.id);
      if (onCreated) {
        onCreated(nueva);
      }
      setNewCatName('');
      setShowCreate(false);
      showNotification('success', 'Categoría creada', 'Éxito');
    } catch {
      showNotification('error', 'Error al crear categoría', 'Error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <FieldLabel required={required} className="mb-0">{label}</FieldLabel>
        <Tooltip texto="Crear categoría">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Crear
          </button>
        </Tooltip>
      </div>

      {showCreate ? (
        <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
          <input 
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nombre de la categoría..."
            className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm outline-none text-slate-900 placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === 'Escape') setShowCreate(false);
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newCatName.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button aria-label="Cancelar"
            type="button"
            onClick={() => setShowCreate(false)}
            className="shrink-0 p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          {/*
            * Este componente se llamaba «SelectCategoria» y por dentro era un
            * `<select>` NATIVO con `appearance-none` y una flecha SVG dibujada
            * encima: cambiaba la flecha, pero la lista de opciones seguia
            * siendola del sistema operativo. Ahora usa el selector propio, asi
            * que la flecha de adorno tambien sobra.
            */}
          <Selector
            value={value || ''}
            onChange={onChange}
            disabled={disabled || loading}
            etiqueta="Categoria"
            placeholder={loading ? 'Cargando...' : placeholder}
            className="bg-slate-50 font-medium text-slate-900"
            opciones={categorias.map((cat) => ({
              value: cat.id,
              label: cat.nombre,
            }))}
          />
        </div>
      )}
    </div>
  );
}
