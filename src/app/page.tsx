'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Bell, 
  Filter,
  Calendar,
  User,
  MessageSquare,
  Upload,
  MapPin,
  Package
} from 'lucide-react'
import { supabase, NotaFiscal } from '@/lib/supabase'

interface Usuario {
  id: number
  nome: string
  email: string
  tipo_autorizacao: 'solicitante' | 'aprovador' | 'administrador'
  transportador?: string
}

interface CostRequest {
  id: string
  numeroNotaFiscal: string
  valorNotaFiscal: number
  destinatario: string
  cidadeDestino: string
  quantidadeVolumes: number
  tipoCustoExtra: string
  descritivoTipoCusto: string
  anexo?: File | null
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  comments?: string
}

export default function CostApprovalApp() {
  const [activeTab, setActiveTab] = useState<'new' | 'approvals' | 'history'>('new')
  const [requests, setRequests] = useState<CostRequest[]>([])
  const [notifications, setNotifications] = useState(0)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([])
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    numeroNotaFiscal: '',
    valorNotaFiscal: '',
    destinatario: '',
    cidadeDestino: '',
    quantidadeVolumes: '',
    tipoCustoExtra: '',
    descritivoTipoCusto: '',
    anexo: null as File | null
  })

  // Load usuarios from Supabase
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('nome')
        
        if (error) {
          console.error('Erro ao carregar usuários:', error)
          return
        }
        
        setUsuarios(data || [])
        
        // Simular usuário logado (primeiro solicitante para demonstração)
        const solicitante = data?.find(u => u.tipo_autorizacao === 'solicitante')
        if (solicitante) {
          setCurrentUser(solicitante)
        }
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error)
      }
    }
    
    loadUsuarios()
  }, [])

  // Load notas fiscais from Supabase
  useEffect(() => {
    const loadNotasFiscais = async () => {
      try {
        const { data, error } = await supabase
          .from('notas_fiscais')
          .select('*')
          .order('numero_nota')
        
        if (error) {
          console.error('Erro ao carregar notas fiscais:', error)
          return
        }
        
        setNotasFiscais(data || [])
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error)
      }
    }
    
    loadNotasFiscais()
  }, [])

  // Load data from localStorage on mount
  useEffect(() => {
    const savedRequests = localStorage.getItem('costRequests')
    if (savedRequests) {
      const parsedRequests = JSON.parse(savedRequests)
      setRequests(parsedRequests)
      
      // Count pending notifications
      const pendingCount = parsedRequests.filter((req: CostRequest) => req.status === 'pending').length
      setNotifications(pendingCount)
    }
  }, [])

  // Save to localStorage whenever requests change
  useEffect(() => {
    localStorage.setItem('costRequests', JSON.stringify(requests))
    const pendingCount = requests.filter(req => req.status === 'pending').length
    setNotifications(pendingCount)
  }, [requests])

  // Handle nota fiscal input change and search
  const handleNotaFiscalInputChange = async (numeroNota: string) => {
    setFormData(prev => ({ ...prev, numeroNotaFiscal: numeroNota }))
    
    // Se o campo estiver vazio, limpa os dados
    if (!numeroNota.trim()) {
      setSelectedNota(null)
      setFormData(prev => ({
        ...prev,
        valorNotaFiscal: '',
        destinatario: '',
        cidadeDestino: '',
        quantidadeVolumes: ''
      }))
      return
    }

    // Busca a nota fiscal no Supabase
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('numero_nota', numeroNota.trim())
        .single()
      
      if (error) {
        // Se não encontrou a nota, limpa os campos preenchidos automaticamente
        setSelectedNota(null)
        setFormData(prev => ({
          ...prev,
          valorNotaFiscal: '',
          destinatario: '',
          cidadeDestino: '',
          quantidadeVolumes: ''
        }))
        return
      }
      
      if (data) {
        // Se encontrou a nota, preenche os campos automaticamente
        setSelectedNota(data)
        setFormData(prev => ({
          ...prev,
          valorNotaFiscal: data.valor_nota.toString(),
          destinatario: data.destinatario,
          cidadeDestino: data.cidade_destino,
          quantidadeVolumes: data.quantidade_volumes.toString()
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar nota fiscal:', error)
      setSelectedNota(null)
      setFormData(prev => ({
        ...prev,
        valorNotaFiscal: '',
        destinatario: '',
        cidadeDestino: '',
        quantidadeVolumes: ''
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, anexo: file }))
  }

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.numeroNotaFiscal || !formData.tipoCustoExtra || !currentUser) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    const newRequest: CostRequest = {
      id: Date.now().toString(),
      numeroNotaFiscal: formData.numeroNotaFiscal,
      valorNotaFiscal: parseFloat(formData.valorNotaFiscal),
      destinatario: formData.destinatario,
      cidadeDestino: formData.cidadeDestino,
      quantidadeVolumes: parseInt(formData.quantidadeVolumes),
      tipoCustoExtra: formData.tipoCustoExtra,
      descritivoTipoCusto: formData.descritivoTipoCusto,
      anexo: formData.anexo,
      requestedBy: currentUser.nome,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    }

    setRequests(prev => [newRequest, ...prev])
    
    // Reset form
    setFormData({
      numeroNotaFiscal: '',
      valorNotaFiscal: '',
      destinatario: '',
      cidadeDestino: '',
      quantidadeVolumes: '',
      tipoCustoExtra: '',
      descritivoTipoCusto: '',
      anexo: null
    })
    setSelectedNota(null)

    // Show success message and switch to approvals tab
    alert('Solicitação enviada com sucesso!')
    setActiveTab('approvals')
  }

  const handleApproval = (id: string, action: 'approved' | 'rejected', comments?: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id 
        ? {
            ...req,
            status: action,
            approvedBy: currentUser?.nome || 'Gestor Responsável',
            approvedAt: new Date().toISOString(),
            comments: comments || ''
          }
        : req
    ))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter requests based on user authorization
  const getFilteredRequests = () => {
    let filtered = requests.filter(req => 
      filterStatus === 'all' || req.status === filterStatus
    )

    // Se for solicitante, mostrar apenas suas próprias solicitações
    if (currentUser?.tipo_autorizacao === 'solicitante') {
      filtered = filtered.filter(req => req.requestedBy === currentUser.nome)
    }

    return filtered
  }

  const filteredRequests = getFilteredRequests()
  const pendingRequests = requests.filter(req => req.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-600 p-2 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Aprovação de Custos</h1>
                <p className="text-sm text-gray-500">Gestão de despesas adicionais</p>
              </div>
            </div>
            
            {/* User Info and Notifications */}
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.tipo_autorizacao}</p>
                  {currentUser.transportador && (
                    <p className="text-xs text-gray-500">{currentUser.transportador}</p>
                  )}
                </div>
              )}
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600" />
                {notifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'new'
                  ? 'border-slate-600 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nova Solicitação</span>
              </div>
            </button>
            
            {(currentUser?.tipo_autorizacao === 'aprovador' || currentUser?.tipo_autorizacao === 'administrador') && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                  activeTab === 'approvals'
                    ? 'border-slate-600 text-slate-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Aprovações</span>
                  {pendingRequests.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingRequests.length}
                    </span>
                  )}
                </div>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-slate-600 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Histórico</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Request Tab */}
        {activeTab === 'new' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Nova Solicitação de Custo</h2>
                <p className="text-gray-600">Preencha os dados abaixo para solicitar aprovação de custo adicional</p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-6">
                {/* Número da Nota Fiscal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número da Nota Fiscal *
                  </label>
                  <input
                    type="text"
                    value={formData.numeroNotaFiscal}
                    onChange={(e) => handleNotaFiscalInputChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Digite o número da nota fiscal"
                    required
                  />
                  {selectedNota && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Nota fiscal encontrada - dados preenchidos automaticamente
                    </p>
                  )}
                </div>

                {/* Campos preenchidos automaticamente */}
                {selectedNota && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor da Nota Fiscal
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formatCurrency(parseFloat(formData.valorNotaFiscal))}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantidade de Volumes
                      </label>
                      <div className="relative">
                        <Package className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={`${formData.quantidadeVolumes} volumes`}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destinatário
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.destinatario}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cidade Destino
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.cidadeDestino}
                          readOnly
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tipo de Custo Extra */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Custo Extra Solicitado para Aprovação *
                  </label>
                  <select
                    value={formData.tipoCustoExtra}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipoCustoExtra: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione o tipo de custo</option>
                    <option value="Diaria">Diária</option>
                    <option value="Pernoite">Pernoite</option>
                    <option value="Veiculo Dedicado">Veículo Dedicado</option>
                    <option value="Armazenagem">Armazenagem</option>
                    <option value="Retrabalho">Retrabalho</option>
                    <option value="Reentrega">Reentrega</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                {/* Descritivo do Tipo de Custo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descritivo do Tipo de Custo
                  </label>
                  <textarea
                    value={formData.descritivoTipoCusto}
                    onChange={(e) => setFormData(prev => ({ ...prev, descritivoTipoCusto: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Descreva detalhadamente o tipo de custo solicitado"
                  />
                </div>

                {/* Anexo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anexo
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.html,.htm,.pdf,.doc,.docx,.txt"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                      />
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Upload className="w-4 h-4" />
                      <span>Fotos, HTML, PDF</span>
                    </div>
                  </div>
                  {formData.anexo && (
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Arquivo selecionado: {formData.anexo.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-slate-600 text-white px-6 py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enviar Solicitação</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (currentUser?.tipo_autorizacao === 'aprovador' || currentUser?.tipo_autorizacao === 'administrador') && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Solicitações Pendentes</h2>
              <p className="text-gray-600">Analise e aprove ou rejeite as solicitações de custo</p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação pendente</h3>
                <p className="text-gray-600">Todas as solicitações foram processadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            NF: {request.numeroNotaFiscal} - {request.tipoCustoExtra}
                          </h3>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Pendente
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-lg text-gray-900">
                              {formatCurrency(request.valorNotaFiscal)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{request.destinatario}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{request.cidadeDestino}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Package className="w-4 h-4" />
                            <span>{request.quantidadeVolumes} volumes</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.requestedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Por: {request.requestedBy}</span>
                          </div>
                        </div>

                        {request.descritivoTipoCusto && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-1">Descritivo do Tipo de Custo:</h4>
                            <p className="text-gray-700 text-sm">{request.descritivoTipoCusto}</p>
                          </div>
                        )}

                        {request.anexo && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900 mb-1">Anexo:</h4>
                            <p className="text-blue-600 text-sm underline">{request.anexo.name}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-32">
                        <button
                          onClick={() => handleApproval(request.id, 'approved')}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprovar</span>
                        </button>
                        <button
                          onClick={() => {
                            const comments = prompt('Comentários (opcional):')
                            handleApproval(request.id, 'rejected', comments || undefined)
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Rejeitar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Histórico de Solicitações</h2>
                <p className="text-gray-600">
                  {currentUser?.tipo_autorizacao === 'solicitante' 
                    ? 'Visualize suas solicitações e status'
                    : 'Visualize todas as solicitações e seus status'
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="approved">Aprovados</option>
                  <option value="rejected">Rejeitados</option>
                </select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação encontrada</h3>
                <p className="text-gray-600">Não há solicitações para o filtro selecionado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            NF: {request.numeroNotaFiscal} - {request.tipoCustoExtra}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            request.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status === 'approved' ? 'Aprovado' : 
                             request.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(request.valorNotaFiscal)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{request.destinatario}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.requestedAt)}</span>
                          </div>
                        </div>

                        {request.descritivoTipoCusto && (
                          <div className="mb-3">
                            <p className="text-gray-700 text-sm">{request.descritivoTipoCusto}</p>
                          </div>
                        )}

                        {request.approvedBy && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                            <span>Processado por: {request.approvedBy}</span>
                            <span>•</span>
                            <span>{formatDate(request.approvedAt!)}</span>
                          </div>
                        )}

                        {request.comments && (
                          <div className="flex items-start space-x-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                            <div>
                              <span className="font-medium text-gray-700">Comentários:</span>
                              <p className="text-gray-600">{request.comments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}