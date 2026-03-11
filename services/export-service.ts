import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

/**
 * Generic export service that downloads files from backend endpoints.
 * Handles authentication, blob response, and triggers browser download.
 */
export const exportService = {
  /**
   * Download a file from a backend export endpoint
   */
  async downloadFile(
    endpoint: string,
    params: Record<string, string> = {},
    fallbackFilename: string = 'export.pdf',
  ): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/${endpoint}${queryString ? `?${queryString}` : ''}`;

    const response = await axios.get(url, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    // Extract filename from Content-Disposition header or use fallback
    const contentDisposition = response.headers['content-disposition'];
    let filename = fallbackFilename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }

    // Trigger browser download
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Export loans list as Excel or PDF
   */
  async exportLoans(
    format: 'excel' | 'pdf',
    filters: { estado?: string; ruta?: string; search?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.estado && filters.estado !== 'todos') params.estado = filters.estado;
    if (filters.ruta && filters.ruta !== 'todas') params.ruta = filters.ruta;
    if (filters.search) params.search = filters.search;

    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('loans/export', params, `cartera-creditos.${ext}`);
  },

  /**
   * Download a file from a backend POST endpoint
   */
  async downloadFilePost(
    endpoint: string,
    body: Record<string, any> = {},
    fallbackFilename: string = 'export.pdf',
  ): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const url = `${API_BASE}/${endpoint}`;

    const response = await axios.post(url, body, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = fallbackFilename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }

    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Export operational report as Excel or PDF
   */
  async exportOperationalReport(
    format: 'excel' | 'pdf',
    filters: { period?: string; startDate?: string; endDate?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.period) params.period = filters.period;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('reports/operational/export', params, `reporte-operativo.${ext}`);
  },

  /**
   * Export cuentas en mora report as Excel or PDF
   */
  async exportMora(
    format: 'excel' | 'pdf',
    filters: { busqueda?: string; nivelRiesgo?: string; rutaId?: string } = {},
  ): Promise<void> {
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFilePost('reports/exportar-mora', {
      filtros: filters,
      formato: format,
    }, `cuentas-mora.${ext}`);
  },

  /**
   * Export cuentas vencidas report as Excel or PDF
   */
  async exportCuentasVencidas(
    format: 'excel' | 'pdf',
    filters: { busqueda?: string; nivelRiesgo?: string; rutaId?: string } = {},
  ): Promise<void> {
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFilePost('reports/cuentas-vencidas/exportar', {
      formato: format,
      filtros: filters,
    }, `cuentas-vencidas.${ext}`);
  },

  /**
   * Export financial report as Excel or PDF
   */
  async exportFinancialReport(
    format: 'excel' | 'pdf',
    filters: { startDate?: string; endDate?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('reports/financial/export', params, `reporte-financiero.${ext}`);
  },

  /**
   * Export payment history as Excel or PDF
   */
  async exportPayments(
    format: 'excel' | 'pdf',
    filters: { startDate?: string; endDate?: string; rutaId?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.rutaId) params.rutaId = filters.rutaId;
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('payments/export', params, `historial-pagos.${ext}`);
  },

  /**
   * Export accounting report as Excel or PDF
   */
  async exportAccounting(
    format: 'excel' | 'pdf',
  ): Promise<void> {
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('accounting/export', { format }, `reporte-contable.${ext}`);
  },

  /**
   * Export audit log as Excel or PDF
   */
  async exportAudit(
    format: 'excel' | 'pdf',
    filters: { startDate?: string; endDate?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    const ext = format === 'excel' ? 'xlsm' : 'pdf';
    await this.downloadFile('audit/export', params, `auditoria.${ext}`);
  },

  /**
   * Download article credit contract PDF
   */
  async exportContrato(loanId: string): Promise<void> {
    await this.downloadFile(`loans/${loanId}/contrato`, {}, `contrato.pdf`);
  },

  /**
   * Exportar listado de clientes en Excel o PDF.
   * Endpoint: GET /clients/export?format=excel|pdf
   * Soporta filtros opcionales: nivelRiesgo, ruta, search
   */
  async exportClientes(
    format: 'excel' | 'pdf',
    filters: { nivelRiesgo?: string; ruta?: string; search?: string } = {},
  ): Promise<void> {
    const params: Record<string, string> = { format };
    if (filters.nivelRiesgo && filters.nivelRiesgo !== 'all') params.nivelRiesgo = filters.nivelRiesgo;
    if (filters.ruta) params.ruta = filters.ruta;
    if (filters.search) params.search = filters.search;
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    await this.downloadFile('api/v1/clients/export', params, `clientes.${ext}`);
  },

};

