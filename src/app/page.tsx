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
  MessageSquare
} from 'lucide-react'

interface CostRequest {
  id: string
  title: string
  description: string
  amount: number
  justification: string
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

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    justification: '',
    requestedBy: ''
  })

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

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.description || !formData.amount || !formData.justification || !formData.requestedBy) {
      alert('Por favor, preencha todos os campos')
      return
    }

    const newRequest: CostRequest = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      amount: parseFloat(formData.amount),
      justification: formData.justification,
      requestedBy: formData.requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    }

    setRequests(prev => [newRequest, ...prev])
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      amount: '',
      justification: '',
      requestedBy: ''
    })

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
            approvedBy: 'Gestor Responsável',
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

  const filteredRequests = requests.filter(req => 
    filterStatus === 'all' || req.status === filterStatus
  )

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
            
            {/* Notifications */}
            <div className="flex items-center space-x-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título da Solicitação
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Ex: Compra de equipamento adicional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição Detalhada
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Descreva detalhadamente o que será adquirido ou o serviço a ser contratado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Justificativa
                  </label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Explique por que este custo adicional é necessário e como impactará o projeto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solicitante
                  </label>
                  <input
                    type="text"
                    value={formData.requestedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
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
        {activeTab === 'approvals' && (
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
                          <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Pendente
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-lg text-gray-900">
                              {formatCurrency(request.amount)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{request.requestedBy}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.requestedAt)}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-1">Descrição:</h4>
                          <p className="text-gray-700 text-sm">{request.description}</p>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-1">Justificativa:</h4>
                          <p className="text-gray-700 text-sm">{request.justification}</p>
                        </div>
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
                <p className="text-gray-600">Visualize todas as solicitações e seus status</p>
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
                          <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
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
                              {formatCurrency(request.amount)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{request.requestedBy}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.requestedAt)}</span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-gray-700 text-sm">{request.description}</p>
                        </div>

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