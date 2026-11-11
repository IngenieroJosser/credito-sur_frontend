import {
  listaDeRespuesta,
  listaDeRespuestaConAviso,
} from '../lista-de-respuesta'

/**
 * Lo que se fija: que leer un listado no dependa de acertar la clave.
 *
 * Los siete listados de este backend vienen en cuatro formas distintas, y leer
 * la equivocada no da error: da `undefined`, que un `|| []` convierte en lista
 * vacía y la pantalla sale en blanco como si no hubiera datos.
 *
 * Las formas de abajo no son inventadas: son las que devolvió cada endpoint al
 * llamarlo con la sesión del superadministrador.
 */
describe('listaDeRespuesta', () => {
  describe('las cuatro formas que devuelve este backend', () => {
    it('GET /routes -> { data, meta }', () => {
      const respuesta = { data: [{ id: 'r1' }, { id: 'r2' }], meta: { total: 2 } }
      expect(listaDeRespuesta(respuesta)).toHaveLength(2)
    })

    it('GET /clients -> { clientes, estadisticas }', () => {
      const respuesta = { clientes: [{ id: 'c1' }], estadisticas: { total: 1 } }
      expect(listaDeRespuesta(respuesta)).toHaveLength(1)
    })

    it('GET /loans -> { prestamos, estadisticas, paginacion }', () => {
      const respuesta = { prestamos: [{ id: 'p1' }], paginacion: {} }
      expect(listaDeRespuesta(respuesta)).toHaveLength(1)
    })

    it('GET /payments -> { pagos, paginacion }', () => {
      expect(listaDeRespuesta({ pagos: [{ id: 'pg1' }] })).toHaveLength(1)
    })

    it('GET /inventory, /usuarios, /accounting/cajas -> el arreglo pelado', () => {
      expect(listaDeRespuesta([{ id: 'i1' }, { id: 'i2' }])).toHaveLength(2)
    })
  })

  describe('lo que evita que la pantalla reviente', () => {
    it('una respuesta sin lista devuelve [], no undefined', () => {
      // Esto es lo que permite `listaDeRespuesta(resp).map(...)` sin guarda.
      // En contabilidad y reportes hay varios `resp.data.map(...)` a pelo: si
      // la respuesta llega sin `data`, esa pantalla revienta.
      expect(listaDeRespuesta({ mensaje: 'sin resultados' })).toEqual([])
      expect(listaDeRespuesta({})).toEqual([])
    })

    it('null, undefined y los tipos raros devuelven []', () => {
      expect(listaDeRespuesta(null)).toEqual([])
      expect(listaDeRespuesta(undefined)).toEqual([])
      expect(listaDeRespuesta('texto')).toEqual([])
      expect(listaDeRespuesta(42)).toEqual([])
    })

    it('una lista vacía de verdad se devuelve vacía', () => {
      // Distinto de no entender la respuesta: aquí el vacío es el dato.
      expect(listaDeRespuesta({ clientes: [] })).toEqual([])
      expect(listaDeRespuesta([])).toEqual([])
    })

    it('no confunde un objeto con una lista', () => {
      // `data` existe pero no es un arreglo: devolverlo haría que `.map`
      // reventara igual que antes.
      expect(listaDeRespuesta({ data: { id: 'uno' } })).toEqual([])
    })
  })

  describe('listaDeRespuestaConAviso distingue el vacío del hueco', () => {
    it('reconoce las formas conocidas', () => {
      expect(listaDeRespuestaConAviso({ data: [1, 2] })).toEqual({
        lista: [1, 2],
        reconocida: true,
      })
      expect(listaDeRespuestaConAviso([1])).toEqual({
        lista: [1],
        reconocida: true,
      })
    })

    it('una lista vacía SÍ está reconocida: el vacío es el dato', () => {
      expect(listaDeRespuestaConAviso({ prestamos: [] })).toEqual({
        lista: [],
        reconocida: true,
      })
    })

    it('avisa cuando llegó contenido y no se supo leer', () => {
      // Este es el caso que hizo que una prueba de caos se saltara sola
      // diciendo «no hay ninguna ruta» con dos rutas en la base. Con el aviso,
      // quien llama puede fallar en vez de pasar por alto.
      expect(
        listaDeRespuestaConAviso({ algoQueNadieEsperaba: { total: 2 } }),
      ).toEqual({ lista: [], reconocida: false })
    })

    it('null y los tipos raros no están reconocidos', () => {
      expect(listaDeRespuestaConAviso(null).reconocida).toBe(false)
      expect(listaDeRespuestaConAviso('texto').reconocida).toBe(false)
    })

    it('un objeto vacío cuenta como reconocido: no hay nada sin leer', () => {
      expect(listaDeRespuestaConAviso({})).toEqual({
        lista: [],
        reconocida: true,
      })
    })
  })
})
