
import { useState, useEffect } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';
import { categoriasService, Categoria } from '@/services/categorias-service';
import { useNotification } from '@/components/providers/NotificationProvider';

interface SelectCategoriaProps {
  tipo: string; // 'CLIENTE', 'GASTO', etc.
  value?: string;
  onChange: (categoriaId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function SelectCategoria({ 
  tipo, 
  value, 
  onChange, 
  label = 'Categoría',
  placeholder = 'Seleccionar...',
  disabled = false 
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
    } catch (err) {
      console.error(err);
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
      setNewCatName('');
      setShowCreate(false);
      showNotification('success', 'Categoría creada', 'Éxito');
    } catch (error) {
      console.error(error);
      showNotification('error', 'Error al crear categoría', 'Error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-bold text-slate-700">{label}</label>
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
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || loading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#08557f] focus:ring-0 font-medium text-slate-900 disabled:opacity-50 appearance-none"
          >
            <option value="">{loading ? 'Cargando...' : placeholder}</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
             <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
               <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
             </svg>
          </div>
        </div>
      )}
    </div>
  );
}
