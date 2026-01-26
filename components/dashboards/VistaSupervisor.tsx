'use client'

import { Eye } from 'lucide-react'

const VistaSupervisor = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Eye className="h-5 w-5" />
          Vista Supervisor
        </div>
      </div>
    </div>
  )
}

export default VistaSupervisor