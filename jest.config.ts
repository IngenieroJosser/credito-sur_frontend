import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Ruta de la app Next.js para cargar next.config.js y los .env en el entorno de pruebas
  dir: './',
})

// Configuración propia que se le pasa a Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Opciones que se ejecutan antes de cada prueba
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Alias de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

// Se exporta así para que next/jest pueda cargar la configuración de Next.js, que es asíncrona
export default createJestConfig(config)
