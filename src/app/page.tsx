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
  Package,
  LogOut,
  Eye,
  EyeOff,
  UserPlus,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Timer,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  Search,
  ExternalLink,
  Paperclip,
  Download,
  Moon,
  Sun
} from 'lucide-react'
import { supabase, NotaFiscal } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface Usuario {
  id: number
  nome: string
  email: string
  tipo_autorizacao: 'solicitante' | 'aprovador' | 'administrador'
  transportador?: string
  primeiro_login?: boolean
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
  valorCustoAdicional?: number
  anexo?: File | null
  anexoUrl?: string
  anexoNome?: string
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  comments?: string
  approvalHistory?: Array<{
    action: string
    user: string
    timestamp: string
    comments?: string
  }>
}

interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
  requestId?: string
}

export default function CostApprovalApp() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirmPassword: '' })
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'approvals' | 'history' | 'users'>('dashboard')
  const [requests, setRequests] = useState<CostRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([])
  const [selectedNota, setSelectedNota] = useState<NotaFiscal | null>(null)
  const [notasSugeridas, setNotasSugeridas] = useState<NotaFiscal[]>([])
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)

  // Progressive disclosure state
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  // Real-time validation states
  const [tipoCustoError, setTipoCustoError] = useState('')
  const [showTipoCustoError, setShowTipoCustoError] = useState(false)
  const [descritivoError, setDescritivoError] = useState('')
  const [showDescritivoError, setShowDescritivoError] = useState(false)
  const [valorCustoError, setValorCustoError] = useState('')
  const [showValorCustoError, setShowValorCustoError] = useState(false)
  const [anexoError, setAnexoError] = useState('')
  const [showAnexoError, setShowAnexoError] = useState(false)

  // Upload states
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // User creation form
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserData, setNewUserData] = useState({
    nome: '',
    email: '',
    password: '',
    tipo_autorizacao: 'solicitante' as 'solicitante' | 'aprovador' | 'administrador',
    transportador: ''
  })
  const [creatingUser, setCreatingUser] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    numeroNotaFiscal: '',
    valorNotaFiscal: '',
    destinatario: '',
    cidadeDestino: '',
    quantidadeVolumes: '',
    tipoCustoExtra: '',
    descritivoTipoCusto: '',
    valorCustoAdicional: '',
    anexo: null as File | null
  })

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode))
    }
  }, [])

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  // Check user session on mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Initialize Storage bucket when user logs in
  useEffect(() => {
    if (user) {
      console.log('Usuário logado, bucket "attachments" deve estar disponível')
      checkFirstLogin()
    }
  }, [user])

  // Check if user needs to change password on first login
  const checkFirstLogin = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('primeiro_login')
        .eq('email', user.email)
        .single()
      
      if (error) {
        console.error('Erro ao verificar primeiro login:', error)
        return
      }
      
      if (data?.primeiro_login) {
        setShowPasswordChange(true)
      }
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error)
    }
  }

  // Handle password change for first login
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      alert('As senhas não coincidem')
      return
    }

    if (newPasswordData.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setPasswordChangeLoading(true)

    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPasswordData.password
      })

      if (authError) {
        alert(`Erro ao atualizar senha: ${authError.message}`)
        setPasswordChangeLoading(false)
        return
      }

      // Update primeiro_login flag in database
      const { error: dbError } = await supabase
        .from('usuarios')
        .update({ primeiro_login: false })
        .eq('email', user?.email)

      if (dbError) {
        console.error('Erro ao atualizar flag primeiro_login:', dbError)
      }

      alert('Senha alterada com sucesso!')
      setShowPasswordChange(false)
      setNewPasswordData({ password: '', confirmPassword: '' })

    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      alert('Erro ao alterar senha')
    }

    setPasswordChangeLoading(false)
  }

  // Load usuarios from Supabase
  useEffect(() => {
    if (!user) return

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
        
        // Find current user by email
        const currentUserData = data?.find(u => u.email === user.email)
        if (currentUserData) {
          setCurrentUser(currentUserData)
        }
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error)
      }
    }
    
    loadUsuarios()
  }, [user])

  // Load notas fiscais from Supabase
  useEffect(() => {
    if (!user) return

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
  }, [user])

  // Load solicitações from Supabase
  useEffect(() => {
    if (!user) return

    const loadSolicitacoes = async () => {
      try {
        // Primeiro, vamos tentar criar a tabela se não existir
        await createSolicitacoesTable()
        
        // Depois carregar os dados
        const { data, error } = await supabase
          .from('solicitacoes_autorizacao')
          .select('*')
          .order('data_criacao', { ascending: false })
        
        if (error) {
          console.error('Erro ao carregar solicitações:', error)
          // Se a tabela não existir, usar dados mock
          loadMockData()
          return
        }
        
        // Converter dados do Supabase para o formato do app
        const convertedRequests = data?.map(item => ({
          id: item.id.toString(),
          numeroNotaFiscal: item.numero_nota_fiscal,
          valorNotaFiscal: item.valor_nota_fiscal,
          destinatario: item.destinatario || '',
          cidadeDestino: item.cidade_destino || '',
          quantidadeVolumes: item.quantidade_volumes || 0,
          tipoCustoExtra: item.tipo_custo_extra,
          descritivoTipoCusto: item.descritivo_tipo_custo,
          valorCustoAdicional: item.valor_custo_adicional,
          anexoUrl: item.anexo_url,
          anexoNome: item.anexo_nome,
          requestedBy: item.usuario_criador,
          requestedAt: `${item.data_criacao}T${item.hora_criacao}`,
          status: item.status === 'pendente' ? 'pending' : 
                  item.status === 'aprovada' ? 'approved' : 'rejected',
          approvedBy: item.usuario_aprovador,
          approvedAt: item.data_aprovacao && item.hora_aprovacao ? 
                     `${item.data_aprovacao}T${item.hora_aprovacao}` : undefined,
          comments: item.observacao_aprovacao,
          approvalHistory: []
        })) || []
        
        setRequests(convertedRequests)
      } catch (error) {
        console.error('Erro ao conectar com Supabase:', error)
        loadMockData()
      }
    }
    
    loadSolicitacoes()
  }, [user])

  // Create table and load mock data
  const createSolicitacoesTable = async () => {
    try {
      // Tentar inserir dados mock - se a tabela não existir, será criada automaticamente pelo Supabase
      const mockData = [
        {
          numero_nota_fiscal: 'NF001234',
          valor_nota_fiscal: 15000.00,
          destinatario: 'Cliente ABC Ltda',
          cidade_destino: 'São Paulo - SP',
          quantidade_volumes: 25,
          tipo_custo_extra: 'Diaria',
          descritivo_tipo_custo: 'Necessário pernoite devido ao horário de entrega restrito do cliente',
          valor_custo_adicional: 350.00,
          usuario_criador: 'João Silva',
          data_criacao: '2024-01-15',
          hora_criacao: '09:30:00',
          status: 'aprovada',
          usuario_aprovador: 'Maria Santos',
          data_aprovacao: '2024-01-15',
          hora_aprovacao: '14:20:00',
          observacao_aprovacao: 'Aprovado conforme justificativa apresentada'
        },
        {
          numero_nota_fiscal: 'NF001235',
          valor_nota_fiscal: 8500.00,
          destinatario: 'Empresa XYZ S.A.',
          cidade_destino: 'Rio de Janeiro - RJ',
          quantidade_volumes: 12,
          tipo_custo_extra: 'Reentrega',
          descritivo_tipo_custo: 'Cliente não estava presente na primeira tentativa de entrega',
          valor_custo_adicional: 180.00,
          usuario_criador: 'Pedro Costa',
          data_criacao: '2024-01-16',
          hora_criacao: '11:15:00',
          status: 'aprovada',
          usuario_aprovador: 'Carlos Lima',
          data_aprovacao: '2024-01-16',
          hora_aprovacao: '16:45:00',
          observacao_aprovacao: 'Aprovado - situação comum neste cliente'
        },
        {
          numero_nota_fiscal: 'NF001236',
          valor_nota_fiscal: 22000.00,
          destinatario: 'Indústria DEF Ltda',
          cidade_destino: 'Belo Horizonte - MG',
          quantidade_volumes: 45,
          tipo_custo_extra: 'Veiculo Dedicado',
          descritivo_tipo_custo: 'Carga frágil requer transporte exclusivo com cuidados especiais',
          valor_custo_adicional: 1200.00,
          usuario_criador: 'Ana Oliveira',
          data_criacao: '2024-01-17',
          hora_criacao: '08:45:00',
          status: 'pendente'
        },
        {
          numero_nota_fiscal: 'NF001237',
          valor_nota_fiscal: 5200.00,
          destinatario: 'Comércio GHI ME',
          cidade_destino: 'Salvador - BA',
          quantidade_volumes: 8,
          tipo_custo_extra: 'Armazenagem',
          descritivo_tipo_custo: 'Necessário armazenagem por 3 dias devido a problemas no recebimento',
          valor_custo_adicional: 450.00,
          usuario_criador: 'Lucas Ferreira',
          data_criacao: '2024-01-18',
          hora_criacao: '14:20:00',
          status: 'recusada',
          usuario_aprovador: 'Maria Santos',
          data_aprovacao: '2024-01-18',
          hora_aprovacao: '17:30:00',
          observacao_aprovacao: 'Recusado - cliente deve arcar com custos de armazenagem conforme contrato'
        },
        {
          numero_nota_fiscal: 'NF001238',
          valor_nota_fiscal: 18500.00,
          destinatario: 'Distribuidora JKL S.A.',
          cidade_destino: 'Brasília - DF',
          quantidade_volumes: 32,
          tipo_custo_extra: 'Pernoite',
          descritivo_tipo_custo: 'Entrega em horário comercial exige pernoite do motorista',
          valor_custo_adicional: 280.00,
          usuario_criador: 'Fernanda Souza',
          data_criacao: '2024-01-19',
          hora_criacao: '10:10:00',
          status: 'pendente'
        }
      ]

      // Tentar inserir cada item individualmente
      for (const item of mockData) {
        try {
          await supabase
            .from('solicitacoes_autorizacao')
            .insert(item)
        } catch (insertError) {
          console.log('Item já existe ou erro na inserção:', insertError)
        }
      }
    } catch (error) {
      console.log('Tabela pode não existir ainda:', error)
    }
  }

  // Load mock data if Supabase is not available
  const loadMockData = () => {
    const mockRequests: CostRequest[] = [
      {
        id: '1',
        numeroNotaFiscal: 'NF001234',
        valorNotaFiscal: 15000.00,
        destinatario: 'Cliente ABC Ltda',
        cidadeDestino: 'São Paulo - SP',
        quantidadeVolumes: 25,
        tipoCustoExtra: 'Diaria',
        descritivoTipoCusto: 'Necessário pernoite devido ao horário de entrega restrito do cliente',
        valorCustoAdicional: 350.00,
        requestedBy: 'João Silva',
        requestedAt: '2024-01-15T09:30:00',
        status: 'approved',
        approvedBy: 'Maria Santos',
        approvedAt: '2024-01-15T14:20:00',
        comments: 'Aprovado conforme justificativa apresentada',
        approvalHistory: []
      },
      {
        id: '2',
        numeroNotaFiscal: 'NF001235',
        valorNotaFiscal: 8500.00,
        destinatario: 'Empresa XYZ S.A.',
        cidadeDestino: 'Rio de Janeiro - RJ',
        quantidadeVolumes: 12,
        tipoCustoExtra: 'Reentrega',
        descritivoTipoCusto: 'Cliente não estava presente na primeira tentativa de entrega',
        valorCustoAdicional: 180.00,
        requestedBy: 'Pedro Costa',
        requestedAt: '2024-01-16T11:15:00',
        status: 'approved',
        approvedBy: 'Carlos Lima',
        approvedAt: '2024-01-16T16:45:00',
        comments: 'Aprovado - situação comum neste cliente',
        approvalHistory: []
      },
      {
        id: '3',
        numeroNotaFiscal: 'NF001236',
        valorNotaFiscal: 22000.00,
        destinatario: 'Indústria DEF Ltda',
        cidadeDestino: 'Belo Horizonte - MG',
        quantidadeVolumes: 45,
        tipoCustoExtra: 'Veiculo Dedicado',
        descritivoTipoCusto: 'Carga frágil requer transporte exclusivo com cuidados especiais',
        valorCustoAdicional: 1200.00,
        requestedBy: 'Ana Oliveira',
        requestedAt: '2024-01-17T08:45:00',
        status: 'pending',
        approvalHistory: []
      },
      {
        id: '4',
        numeroNotaFiscal: 'NF001237',
        valorNotaFiscal: 5200.00,
        destinatario: 'Comércio GHI ME',
        cidadeDestino: 'Salvador - BA',
        quantidadeVolumes: 8,
        tipoCustoExtra: 'Armazenagem',
        descritivoTipoCusto: 'Necessário armazenagem por 3 dias devido a problemas no recebimento',
        valorCustoAdicional: 450.00,
        requestedBy: 'Lucas Ferreira',
        requestedAt: '2024-01-18T14:20:00',
        status: 'rejected',
        approvedBy: 'Maria Santos',
        approvedAt: '2024-01-18T17:30:00',
        comments: 'Recusado - cliente deve arcar com custos de armazenagem conforme contrato',
        approvalHistory: []
      },
      {
        id: '5',
        numeroNotaFiscal: 'NF001238',
        valorNotaFiscal: 18500.00,
        destinatario: 'Distribuidora JKL S.A.',
        cidadeDestino: 'Brasília - DF',
        quantidadeVolumes: 32,
        tipoCustoExtra: 'Pernoite',
        descritivoTipoCusto: 'Entrega em horário comercial exige pernoite do motorista',
        valorCustoAdicional: 280.00,
        requestedBy: 'Fernanda Souza',
        requestedAt: '2024-01-19T10:10:00',
        status: 'pending',
        approvalHistory: []
      }
    ]

    setRequests(mockRequests)
  }

  // Load data from localStorage on mount
  useEffect(() => {
    if (!user) return

    const savedNotifications = localStorage.getItem('notifications')
    
    if (savedNotifications) {
      const parsedNotifications = JSON.parse(savedNotifications)
      setNotifications(parsedNotifications)
    }

    // Close suggestions dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.nota-fiscal-container')) {
        setShowSugestoes(false)
      }
      if (!target.closest('.notifications-container')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user])

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (!user) return

    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications, user])

  // Real-time validation for Tipo de Custo Extra
  useEffect(() => {
    if (formData.tipoCustoExtra === '' && showTipoCustoError) {
      setTipoCustoError('Por favor, selecione o tipo de custo extra')
    } else {
      setTipoCustoError('')
    }
  }, [formData.tipoCustoExtra, showTipoCustoError])

  // Real-time validation for Descritivo
  useEffect(() => {
    if (formData.descritivoTipoCusto.trim() === '' && showDescritivoError) {
      setDescritivoError('Por favor, preencha o descritivo do tipo de custo')
    } else {
      setDescritivoError('')
    }
  }, [formData.descritivoTipoCusto, showDescritivoError])

  // Real-time validation for Valor Custo Adicional
  useEffect(() => {
    if (formData.tipoCustoExtra && formData.tipoCustoExtra !== '' && formData.valorCustoAdicional === '' && showValorCustoError) {
      setValorCustoError('Por favor, informe o valor do custo adicional')
    } else {
      setValorCustoError('')
    }
  }, [formData.valorCustoAdicional, formData.tipoCustoExtra, showValorCustoError])

  // Real-time validation for Anexo
  useEffect(() => {
    if (formData.tipoCustoExtra !== 'Veiculo Dedicado' && !formData.anexo && showAnexoError) {
      setAnexoError('Por favor, anexe um arquivo')
    } else {
      setAnexoError('')
    }
  }, [formData.anexo, formData.tipoCustoExtra, showAnexoError])

  // Progressive disclosure logic
  useEffect(() => {
    const hasBasicFields = formData.numeroNotaFiscal && formData.valorNotaFiscal && formData.tipoCustoExtra
    if (hasBasicFields && !showAdvancedFields) {
      setShowAdvancedFields(true)
    }
  }, [formData.numeroNotaFiscal, formData.valorNotaFiscal, formData.tipoCustoExtra, showAdvancedFields])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      })

      if (error) {
        console.error('Erro de login:', error)
        setLoginError('Email ou senha incorretos. Verifique suas credenciais.')
      } else {
        console.log('Login realizado com sucesso:', data)
      }
    } catch (error) {
      console.error('Erro inesperado:', error)
      setLoginError('Erro inesperado. Tente novamente.')
    }

    setLoginLoading(false)
  }

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setResetMessage(`Erro: ${error.message}`)
    } else {
      setResetMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Create notification
  const createNotification = (type: Notification['type'], title: string, message: string, requestId?: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      requestId
    }
    setNotifications(prev => [notification, ...prev])
  }

  // Mark notification as read
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ))
  }

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file: File, requestId: string): Promise<{ url: string; path: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${requestId}-${Date.now()}.${fileExt}`
      const filePath = `anexos/${fileName}`

      // Upload diretamente para o bucket 'attachments' que já existe
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Erro no upload:', error)
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)

      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Erro no upload:', error)
      return null
    }
  }

  // Download/View attachment
  const handleViewAttachment = async (url: string, fileName: string) => {
    try {
      // Open in new tab for viewing
      window.open(url, '_blank')
    } catch (error) {
      console.error('Erro ao abrir anexo:', error)
      alert('Erro ao abrir o anexo')
    }
  }

  // Create new user (Admin only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserData.email,
        password: newUserData.password,
        email_confirm: true,
        user_metadata: {
          nome: newUserData.nome
        }
      })

      if (authError) {
        alert(`Erro ao criar usuário: ${authError.message}`)
        setCreatingUser(false)
        return
      }

      // Add user to usuarios table
      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          nome: newUserData.nome,
          email: newUserData.email,
          tipo_autorizacao: newUserData.tipo_autorizacao,
          transportador: newUserData.transportador || null,
          primeiro_login: true // Flag para forçar mudança de senha
        })

      if (dbError) {
        console.error('Erro ao adicionar usuário na tabela:', dbError)
      }

      // Refresh usuarios list
      const { data: updatedUsuarios } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome')
      
      if (updatedUsuarios) {
        setUsuarios(updatedUsuarios)
      }

      // Reset form
      setNewUserData({
        nome: '',
        email: '',
        password: '',
        tipo_autorizacao: 'solicitante',
        transportador: ''
      })
      setShowCreateUser(false)
      alert('Usuário criado com sucesso! O usuário deverá alterar a senha no primeiro login.')

    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      alert('Erro ao criar usuário')
    }

    setCreatingUser(false)
  }

  // Handle nota fiscal input change and search
  const handleNotaFiscalInputChange = async (numeroNota: string) => {
    setFormData(prev => ({ ...prev, numeroNotaFiscal: numeroNota }))
    
    // Se o campo estiver vazio, limpa os dados
    if (!numeroNota.trim()) {
      setSelectedNota(null)
      setNotasSugeridas([])
      setShowSugestoes(false)
      setFormData(prev => ({
        ...prev,
        valorNotaFiscal: '',
        destinatario: '',
        cidadeDestino: '',
        quantidadeVolumes: ''
      }))
      return
    }

    // Busca notas fiscais compatíveis no Supabase
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .ilike('numero_nota', `%${numeroNota.trim()}%`)
        .order('numero_nota')
        .limit(10)
      
      if (error) {
        console.error('Erro ao buscar notas fiscais:', error)
        setNotasSugeridas([])
        setShowSugestoes(false)
        return
      }
      
      if (data && data.length > 0) {
        setNotasSugeridas(data)
        setShowSugestoes(true)
      } else {
        setNotasSugeridas([])
        setShowSugestoes(false)
      }
    } catch (error) {
      console.error('Erro ao buscar notas fiscais:', error)
      setNotasSugeridas([])
      setShowSugestoes(false)
    }
  }

  // Handle nota fiscal selection
  const handleNotaFiscalSelect = (nota: NotaFiscal) => {
    setSelectedNota(nota)
    setShowSugestoes(false)
    setNotasSugeridas([])
    setFormData(prev => ({
      ...prev,
      numeroNotaFiscal: nota.numero_nota,
      valorNotaFiscal: nota.valor_nota.toString(),
      destinatario: nota.destinatario,
      cidadeDestino: nota.cidade_destino,
      quantidadeVolumes: nota.quantidade_volumes.toString()
    }))
  }

  // Handle tipo custo change with validation
  const handleTipoCustoChange = (value: string) => {
    setFormData(prev => ({ ...prev, tipoCustoExtra: value, valorCustoAdicional: '' }))
    setShowTipoCustoError(true)
    setShowValorCustoError(false)
    setShowAnexoError(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, anexo: file }))
    setUploadError('')
    setShowAnexoError(true)
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    setShowTipoCustoError(true)
    setShowDescritivoError(true)
    setShowValorCustoError(true)
    setShowAnexoError(true)

    if (!formData.numeroNotaFiscal || !formData.tipoCustoExtra || !formData.descritivoTipoCusto.trim() || !currentUser) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (formData.tipoCustoExtra && !formData.valorCustoAdicional) {
      alert('Por favor, informe o valor do custo adicional')
      return
    }

    if (formData.tipoCustoExtra !== 'Veiculo Dedicado' && !formData.anexo) {
      alert('Por favor, anexe um arquivo (obrigatório para este tipo de custo)')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const requestId = Date.now().toString()
      let anexoUrl = ''
      let anexoNome = ''

      // Upload file if exists
      if (formData.anexo) {
        const uploadResult = await uploadFileToSupabase(formData.anexo, requestId)
        if (uploadResult) {
          anexoUrl = uploadResult.url
          anexoNome = formData.anexo.name
        } else {
          setUploadError('Erro ao fazer upload do anexo. Tente novamente.')
          setUploading(false)
          return
        }
      }

      // Save to Supabase
      const now = new Date()
      const solicitacaoData = {
        numero_nota_fiscal: formData.numeroNotaFiscal,
        valor_nota_fiscal: parseFloat(formData.valorNotaFiscal),
        destinatario: formData.destinatario,
        cidade_destino: formData.cidadeDestino,
        quantidade_volumes: parseInt(formData.quantidadeVolumes),
        tipo_custo_extra: formData.tipoCustoExtra,
        descritivo_tipo_custo: formData.descritivoTipoCusto,
        valor_custo_adicional: parseFloat(formData.valorCustoAdicional),
        anexo_url: anexoUrl,
        anexo_nome: anexoNome,
        usuario_criador: currentUser.nome,
        data_criacao: now.toISOString().split('T')[0],
        hora_criacao: now.toTimeString().split(' ')[0],
        status: 'pendente'
      }

      const { data: supabaseData, error: supabaseError } = await supabase
        .from('solicitacoes_autorizacao')
        .insert(solicitacaoData)
        .select()
        .single()

      if (supabaseError) {
        console.error('Erro ao salvar no Supabase:', supabaseError)
        // Continue with local storage as fallback
      }

      const newRequest: CostRequest = {
        id: supabaseData?.id?.toString() || requestId,
        numeroNotaFiscal: formData.numeroNotaFiscal,
        valorNotaFiscal: parseFloat(formData.valorNotaFiscal),
        destinatario: formData.destinatario,
        cidadeDestino: formData.cidadeDestino,
        quantidadeVolumes: parseInt(formData.quantidadeVolumes),
        tipoCustoExtra: formData.tipoCustoExtra,
        descritivoTipoCusto: formData.descritivoTipoCusto,
        valorCustoAdicional: parseFloat(formData.valorCustoAdicional),
        anexo: formData.anexo,
        anexoUrl: anexoUrl,
        anexoNome: anexoNome,
        requestedBy: currentUser.nome,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        approvalHistory: [{
          action: 'Solicitação criada',
          user: currentUser.nome,
          timestamp: new Date().toISOString()
        }]
      }

      setRequests(prev => [newRequest, ...prev])
      
      // Create notification
      createNotification(
        'info',
        'Solicitação Criada',
        `Sua solicitação NF${formData.numeroNotaFiscal} foi enviada para aprovação${anexoUrl ? ' com anexo' : ''}`,
        newRequest.id
      )
      
      // Reset form
      setFormData({
        numeroNotaFiscal: '',
        valorNotaFiscal: '',
        destinatario: '',
        cidadeDestino: '',
        quantidadeVolumes: '',
        tipoCustoExtra: '',
        descritivoTipoCusto: '',
        valorCustoAdicional: '',
        anexo: null
      })
      setSelectedNota(null)
      setShowAdvancedFields(false)
      setShowTipoCustoError(false)
      setShowDescritivoError(false)
      setShowValorCustoError(false)
      setShowAnexoError(false)

      // Show success message and switch to approvals tab
      alert('Solicitação enviada com sucesso!')
      setActiveTab('approvals')

    } catch (error) {
      console.error('Erro ao enviar solicitação:', error)
      setUploadError('Erro ao enviar solicitação. Tente novamente.')
    }

    setUploading(false)
  }

  const handleApproval = async (id: string, action: 'approved' | 'rejected', comments?: string) => {
    const request = requests.find(req => req.id === id)
    if (!request) return

    try {
      // Update in Supabase
      const now = new Date()
      const updateData = {
        status: action === 'approved' ? 'aprovada' : 'recusada',
        usuario_aprovador: currentUser?.nome || 'Gestor Responsável',
        data_aprovacao: now.toISOString().split('T')[0],
        hora_aprovacao: now.toTimeString().split(' ')[0],
        observacao_aprovacao: comments || ''
      }

      const { error: supabaseError } = await supabase
        .from('solicitacoes_autorizacao')
        .update(updateData)
        .eq('id', parseInt(id))

      if (supabaseError) {
        console.error('Erro ao atualizar no Supabase:', supabaseError)
      }
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error)
    }

    const updatedRequest = {
      ...request,
      status: action,
      approvedBy: currentUser?.nome || 'Gestor Responsável',
      approvedAt: new Date().toISOString(),
      comments: comments || '',
      approvalHistory: [
        ...(request.approvalHistory || []),
        {
          action: action === 'approved' ? 'Solicitação aprovada' : 'Solicitação rejeitada',
          user: currentUser?.nome || 'Gestor Responsável',
          timestamp: new Date().toISOString(),
          comments: comments
        }
      ]
    }

    setRequests(prev => prev.map(req => 
      req.id === id ? updatedRequest : req
    ))

    // Create notification for the requester
    const statusText = action === 'approved' ? 'aprovada' : 'recusada'
    const notificationType = action === 'approved' ? 'success' : 'error'
    
    createNotification(
      notificationType,
      `Solicitação ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
      `Sua solicitação NF${request.numeroNotaFiscal} foi ${statusText}${comments ? ` - ${comments}` : ''}`,
      id
    )
  }

  // Handle dashboard card clicks
  const handleDashboardCardClick = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'pending' && (currentUser?.tipo_autorizacao === 'aprovador' || currentUser?.tipo_autorizacao === 'administrador')) {
      setActiveTab('approvals')
    } else {
      setFilterStatus(status)
      setActiveTab('history')
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Filter requests based on user authorization and search
  const getFilteredRequests = () => {
    let filtered = requests.filter(req => 
      filterStatus === 'all' || req.status === filterStatus
    )

    // Se for solicitante, mostrar apenas suas próprias solicitações
    if (currentUser?.tipo_autorizacao === 'solicitante') {
      filtered = filtered.filter(req => req.requestedBy === currentUser.nome)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(req => 
        req.numeroNotaFiscal.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const filteredRequests = getFilteredRequests()
  const pendingRequests = requests.filter(req => req.status === 'pending')
  const unreadNotifications = notifications.filter(notif => !notif.read)

  // Dashboard calculations with 24h SLA
  const getDashboardData = () => {
    const totalRequests = requests.length
    const pendingRequests = requests.filter(req => req.status === 'pending')
    const approvedRequests = requests.filter(req => req.status === 'approved')
    const rejectedRequests = requests.filter(req => req.status === 'rejected')

    const pendingValue = pendingRequests.reduce((sum, req) => sum + req.valorNotaFiscal, 0)
    const approvedValue = approvedRequests.reduce((sum, req) => sum + req.valorNotaFiscal, 0)
    const rejectedValue = rejectedRequests.reduce((sum, req) => sum + req.valorNotaFiscal, 0)

    const avgTicket = approvedRequests.length > 0 ? approvedValue / approvedRequests.length : 0

    // Calculate SLA performance based on 24h target
    const slaTarget = 24 // hours
    let totalSlaTime = 0
    let slaCompliantCount = 0
    
    approvedRequests.forEach(req => {
      if (req.approvedAt) {
        const requestTime = new Date(req.requestedAt).getTime()
        const approvalTime = new Date(req.approvedAt).getTime()
        const hoursToApproval = (approvalTime - requestTime) / (1000 * 60 * 60)
        totalSlaTime += hoursToApproval
        if (hoursToApproval <= slaTarget) {
          slaCompliantCount++
        }
      }
    })

    const avgSLA = approvedRequests.length > 0 ? totalSlaTime / approvedRequests.length : 0
    const slaCompliance = approvedRequests.length > 0 ? (slaCompliantCount / approvedRequests.length) * 100 : 0

    // Calculate pending requests exceeding SLA
    const now = new Date().getTime()
    const overduePendingCount = pendingRequests.filter(req => {
      const requestTime = new Date(req.requestedAt).getTime()
      const hoursElapsed = (now - requestTime) / (1000 * 60 * 60)
      return hoursElapsed > slaTarget
    }).length

    return {
      totalRequests,
      pendingCount: pendingRequests.length,
      pendingValue,
      approvedCount: approvedRequests.length,
      approvedValue,
      rejectedCount: rejectedRequests.length,
      rejectedValue,
      avgTicket,
      avgSLA,
      slaCompliance,
      overduePendingCount
    }
  }

  // Generate mock data for charts
  const getChartData = () => {
    // Monthly evolution data (last 12 months)
    const monthlyData = [
      { month: 'Jan', aprovados: 45000, recusados: 12000, pendentes: 8000 },
      { month: 'Fev', aprovados: 52000, recusados: 15000, pendentes: 10000 },
      { month: 'Mar', aprovados: 48000, recusados: 18000, pendentes: 12000 },
      { month: 'Abr', aprovados: 61000, recusados: 14000, pendentes: 9000 },
      { month: 'Mai', aprovados: 55000, recusados: 16000, pendentes: 11000 },
      { month: 'Jun', aprovados: 67000, recusados: 13000, pendentes: 8500 },
      { month: 'Jul', aprovados: 59000, recusados: 17000, pendentes: 13000 },
      { month: 'Ago', aprovados: 63000, recusados: 15500, pendentes: 9500 },
      { month: 'Set', aprovados: 58000, recusados: 19000, pendentes: 14000 },
      { month: 'Out', aprovados: 71000, recusados: 12500, pendentes: 7500 },
      { month: 'Nov', aprovados: 65000, recusados: 16500, pendentes: 10500 },
      { month: 'Dez', aprovados: 69000, recusados: 14500, pendentes: 8800 }
    ]

    // Top 5 cost types
    const costTypesData = [
      { tipo: 'Diária', valor: 125000 },
      { tipo: 'Pernoite', valor: 98000 },
      { tipo: 'Veículo Dedicado', valor: 87000 },
      { tipo: 'Armazenagem', valor: 76000 },
      { tipo: 'Reentrega', valor: 65000 }
    ]

    // Top 5 clients/destinations
    const clientsData = [
      { nome: 'Cliente A - São Paulo', valor: 145000 },
      { nome: 'Cliente B - Rio de Janeiro', valor: 132000 },
      { nome: 'Cliente C - Belo Horizonte', valor: 118000 },
      { nome: 'Cliente D - Salvador', valor: 105000 },
      { nome: 'Cliente E - Brasília', valor: 98000 }
    ]

    // Status distribution
    const statusData = [
      { name: 'Aprovados', value: 65, color: '#10B981' },
      { name: 'Pendentes', value: 20, color: '#F59E0B' },
      { name: 'Recusados', value: 15, color: '#EF4444' }
    ]

    // Heatmap data (day of week x hour)
    const heatmapData = [
      { day: 'Seg', '08h': 12, '09h': 18, '10h': 25, '11h': 22, '14h': 28, '15h': 24, '16h': 19, '17h': 15 },
      { day: 'Ter', '08h': 15, '09h': 22, '10h': 28, '11h': 26, '14h': 32, '15h': 29, '16h': 23, '17h': 18 },
      { day: 'Qua', '08h': 18, '09h': 25, '10h': 31, '11h': 28, '14h': 35, '15h': 31, '16h': 26, '17h': 21 },
      { day: 'Qui', '08h': 16, '09h': 23, '10h': 29, '11h': 27, '14h': 33, '15h': 30, '16h': 24, '17h': 19 },
      { day: 'Sex', '08h': 14, '09h': 20, '10h': 26, '11h': 24, '14h': 29, '15h': 26, '16h': 21, '17h': 16 }
    ]

    return { monthlyData, costTypesData, clientsData, statusData, heatmapData }
  }

  const dashboardData = getDashboardData()
  const chartData = getChartData()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          backgroundImage: 'url(https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/4596df10-81e1-4174-b28d-e8bc8662ad74.jpg)', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="max-w-md w-full">
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Logo */}
            <div className="text-center mb-8">
              <img 
                src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/68fe0e32-ff18-4829-bbfc-2d8261113bee.png" 
                alt="Logo da Empresa" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Aprovação de Custos</h1>
              <p className="text-gray-700">Faça login para continuar</p>
            </div>

            {!showForgotPassword ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário
                  </label>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/20 backdrop-blur-sm"
                    placeholder="seu@email.com"
                    required
                    disabled={loginLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/20 backdrop-blur-sm"
                      placeholder="Sua senha"
                      required
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={loginLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{loginError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  {loginLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-slate-600 hover:text-slate-700 text-sm font-medium transition-colors"
                    disabled={loginLoading}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Recuperar Senha</h2>
                  <p className="text-gray-700 text-sm">
                    Digite seu email para receber as instruções de recuperação
                  </p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/20 backdrop-blur-sm"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  {resetMessage && (
                    <div className={`border rounded-lg p-3 backdrop-blur-sm ${
                      resetMessage.includes('Erro') 
                        ? 'bg-red-50/90 border-red-200 text-red-600' 
                        : 'bg-green-50/90 border-green-200 text-green-600'
                    }`}>
                      <p className="text-sm">{resetMessage}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                  >
                    Enviar Email de Recuperação
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false)
                        setResetMessage('')
                        setResetEmail('')
                      }}
                      className="text-slate-600 hover:text-slate-700 text-sm font-medium transition-colors"
                    >
                      Voltar ao login
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Password Change Modal for First Login
  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border">
            <div className="text-center mb-8">
              <img 
                src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/68fe0e32-ff18-4829-bbfc-2d8261113bee.png" 
                alt="Logo da Empresa" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Alterar Senha</h1>
              <p className="text-gray-700">Por favor, crie uma nova senha para continuar</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPasswordData.password}
                  onChange={(e) => setNewPasswordData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Digite sua nova senha"
                  required
                  minLength={6}
                  disabled={passwordChangeLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={newPasswordData.confirmPassword}
                  onChange={(e) => setNewPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Confirme sua nova senha"
                  required
                  minLength={6}
                  disabled={passwordChangeLoading}
                />
              </div>

              <button
                type="submit"
                disabled={passwordChangeLoading}
                className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {passwordChangeLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gray-900 text-white' 
        : 'bg-[#F2F2F2]'
    }`}>
      {/* Header */}
      <header className={`shadow-sm border-b transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/68fe0e32-ff18-4829-bbfc-2d8261113bee.png" 
                alt="Logo da Empresa" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Aprovação de Custos
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                  Gestão de despesas adicionais
                </p>
              </div>
            </div>
            
            {/* User Info and Notifications */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title={darkMode ? 'Modo claro' : 'Modo escuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {currentUser && (
                <div className="text-right">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentUser.nome}
                  </p>
                  <p className={`text-xs capitalize ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {currentUser.tipo_autorizacao}
                  </p>
                  {currentUser.transportador && (
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {currentUser.transportador}
                    </p>
                  )}
                </div>
              )}
              
              {/* Notifications */}
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative transition-colors ${
                    darkMode 
                      ? 'text-gray-300 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Notificações
                      </h3>
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>Nenhuma notificação</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b cursor-pointer transition-colors ${
                              darkMode 
                                ? `border-gray-700 hover:bg-gray-700 ${!notification.read ? 'bg-blue-900/30' : ''}` 
                                : `border-gray-100 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'success' ? 'bg-green-500' :
                                notification.type === 'error' ? 'bg-red-500' :
                                notification.type === 'warning' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {notification.title}
                                </p>
                                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {notification.message}
                                </p>
                                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                  {formatDate(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className={`transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`border-b transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? darkMode 
                    ? 'border-[#E5C85C] text-[#E5C85C]'
                    : 'border-[#4A6D99] text-[#4A6D99]'
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'new'
                  ? darkMode 
                    ? 'border-[#E5C85C] text-[#E5C85C]'
                    : 'border-[#4A6D99] text-[#4A6D99]'
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
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
                    ? darkMode 
                      ? 'border-[#E5C85C] text-[#E5C85C]'
                      : 'border-[#4A6D99] text-[#4A6D99]'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
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
                  ? darkMode 
                    ? 'border-[#E5C85C] text-[#E5C85C]'
                    : 'border-[#4A6D99] text-[#4A6D99]'
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Histórico</span>
              </div>
            </button>

            {currentUser?.tipo_autorizacao === 'administrador' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? darkMode 
                      ? 'border-[#E5C85C] text-[#E5C85C]'
                      : 'border-[#4A6D99] text-[#4A6D99]'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Gerenciar Usuários</span>
                </div>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                Dashboard de Custos Extras
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                Visão geral das solicitações e métricas do sistema
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-[#4A6D99]" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Total de Solicitações
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {dashboardData.totalRequests}
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleDashboardCardClick('pending')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-[#E5C85C]" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Solicitações Pendentes
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {dashboardData.pendingCount}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatCurrency(dashboardData.pendingValue)}
                    </p>
                    {dashboardData.overduePendingCount > 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        {dashboardData.overduePendingCount} acima de 24h
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className={`rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleDashboardCardClick('approved')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Solicitações Aprovadas
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {dashboardData.approvedCount}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatCurrency(dashboardData.approvedValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleDashboardCardClick('rejected')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Solicitações Recusadas
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {dashboardData.rejectedCount}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatCurrency(dashboardData.rejectedValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Ticket Médio Aprovado
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {formatCurrency(dashboardData.avgTicket)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Timer className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      SLA Médio de Aprovação
                    </p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      {dashboardData.avgSLA.toFixed(1)}h
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Meta: 24h | Compliance: {dashboardData.slaCompliance.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Evolution */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Evolução Mensal
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))} 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                        border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: darkMode ? '#FFFFFF' : '#000000'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="aprovados" stroke="#10B981" name="Aprovados" />
                    <Line type="monotone" dataKey="recusados" stroke="#EF4444" name="Recusados" />
                    <Line type="monotone" dataKey="pendentes" stroke="#E5C85C" name="Pendentes" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top 5 Cost Types */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Top 5 Tipos de Custo Extra
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.costTypesData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis dataKey="tipo" type="category" width={100} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))} 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                        border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: darkMode ? '#FFFFFF' : '#000000'
                      }}
                    />
                    <Bar dataKey="valor" fill="#4A6D99" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top 5 Clients */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Top 5 Clientes e Destinos
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.clientsData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis dataKey="nome" type="category" width={150} stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))} 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                        border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: darkMode ? '#FFFFFF' : '#000000'
                      }}
                    />
                    <Bar dataKey="valor" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Distribuição por Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value}%`} 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                        border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        color: darkMode ? '#FFFFFF' : '#000000'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap */}
            <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                Heatmap de Horários - Volume de Solicitações
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className={`px-4 py-2 text-left text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Dia
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        08h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        09h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        10h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        11h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        14h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        15h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        16h
                      </th>
                      <th className={`px-4 py-2 text-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        17h
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.heatmapData.map((row, index) => (
                      <tr key={index}>
                        <td className={`px-4 py-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {row.day}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['08h'] > 20 ? 'bg-red-500' : row['08h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['08h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['09h'] > 20 ? 'bg-red-500' : row['09h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['09h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['10h'] > 20 ? 'bg-red-500' : row['10h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['10h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['11h'] > 20 ? 'bg-red-500' : row['11h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['11h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['14h'] > 20 ? 'bg-red-500' : row['14h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['14h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['15h'] > 20 ? 'bg-red-500' : row['15h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['15h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['16h'] > 20 ? 'bg-red-500' : row['16h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['16h']}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className={`inline-block w-8 h-8 rounded text-xs flex items-center justify-center text-white ${
                            row['17h'] > 20 ? 'bg-red-500' : row['17h'] > 15 ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {row['17h']}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className={`mt-4 flex items-center space-x-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Baixo (≤15)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span>Médio (16-20)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Alto ({'>'}20)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Request Tab */}
        {activeTab === 'new' && (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-2xl shadow-lg border p-8 transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="mb-8">
                <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Solicitação de autorização para Generalidades
                </h2>
                <p className={`${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                  Preencha os dados abaixo para solicitar aprovação de custo adicional
                </p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-8">
                {/* Campos Básicos */}
                <div className="space-y-6">
                  <h3 className={`text-lg font-bold border-b pb-3 ${
                    darkMode 
                      ? 'text-white border-gray-600' 
                      : 'text-[#0C2746] border-gray-200'
                  }`}>
                    Informações Básicas
                  </h3>

                  {/* Número da Nota Fiscal */}
                  <div className="relative nota-fiscal-container">
                    <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      Número da Nota Fiscal *
                    </label>
                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Digite o número da nota fiscal para busca automática
                    </p>
                    <input
                      type="text"
                      value={formData.numeroNotaFiscal}
                      onChange={(e) => handleNotaFiscalInputChange(e.target.value)}
                      onFocus={() => {
                        if (notasSugeridas.length > 0) {
                          setShowSugestoes(true)
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C]' 
                          : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99]'
                      }`}
                      placeholder="Digite o número da nota fiscal"
                      required
                    />
                    
                    {/* Dropdown de sugestões */}
                    {showSugestoes && notasSugeridas.length > 0 && (
                      <div className={`absolute z-10 w-full mt-1 rounded-xl shadow-lg max-h-60 overflow-y-auto ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-white border-gray-300'
                      } border`}>
                        {notasSugeridas.map((nota) => (
                          <div
                            key={nota.id}
                            onClick={() => handleNotaFiscalSelect(nota)}
                            className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-600 border-gray-600' 
                                : 'hover:bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {nota.numero_nota}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {nota.destinatario}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {nota.cidade_destino}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {formatCurrency(nota.valor_nota)}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {nota.quantidade_volumes} vol.
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedNota && (
                      <p className="mt-2 text-sm text-green-600 font-medium">
                        ✓ Nota fiscal selecionada - dados preenchidos automaticamente
                      </p>
                    )}
                    
                    {formData.numeroNotaFiscal && !selectedNota && notasSugeridas.length === 0 && (
                      <p className="mt-2 text-sm text-orange-600 font-medium">
                        ⚠ Nenhuma nota fiscal encontrada com esse número
                      </p>
                    )}
                  </div>

                  {/* Valor da Nota Fiscal */}
                  <div>
                    <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      Valor da Nota Fiscal *
                    </label>
                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Valor em reais (R$) da nota fiscal
                    </p>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.valorNotaFiscal}
                        onChange={(e) => setFormData(prev => ({ ...prev, valorNotaFiscal: e.target.value }))}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                          selectedNota 
                            ? darkMode 
                              ? 'bg-gray-600 text-gray-300 cursor-not-allowed border-gray-600' 
                              : 'bg-gray-50 text-gray-600 cursor-not-allowed border-gray-300'
                            : darkMode 
                              ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C]' 
                              : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99]'
                        }`}
                        placeholder="0,00"
                        required
                        readOnly={!!selectedNota}
                      />
                    </div>
                  </div>

                  {/* Tipo de Custo Extra */}
                  <div>
                    <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                      Tipo de Custo Extra Solicitado para Aprovação *
                    </label>
                    <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Selecione o tipo de custo adicional que precisa de aprovação
                    </p>
                    <select
                      value={formData.tipoCustoExtra}
                      onChange={(e) => handleTipoCustoChange(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                        tipoCustoError 
                          ? 'border-red-300 bg-red-50' 
                          : darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99]'
                      }`}
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
                    
                    {/* Real-time validation error */}
                    {tipoCustoError && (
                      <div className="mt-2 flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{tipoCustoError}</span>
                      </div>
                    )}
                  </div>

                  {/* Valor do Custo Adicional - Aparece após selecionar tipo */}
                  {formData.tipoCustoExtra && (
                    <div className="animate-fadeIn">
                      <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                        Valor do Custo Adicional *
                      </label>
                      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Informe o valor em reais (R$) do custo adicional solicitado
                      </p>
                      <div className="relative">
                        <span className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-sm font-medium ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.valorCustoAdicional}
                          onChange={(e) => setFormData(prev => ({ ...prev, valorCustoAdicional: e.target.value }))}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 ${
                            valorCustoError 
                              ? 'border-red-300 bg-red-50' 
                              : darkMode 
                                ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C]' 
                                : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99]'
                          }`}
                          placeholder="0,00"
                          required
                        />
                      </div>
                      
                      {valorCustoError && (
                        <div className="mt-2 flex items-center space-x-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{valorCustoError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progressive Disclosure - Advanced Fields */}
                {showAdvancedFields && (
                  <div className={`space-y-6 border-t pt-8 transition-colors duration-300 ${
                    darkMode ? 'border-gray-600' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                        Dados da Nota Fiscal
                      </h3>
                    </div>

                    {/* Campos preenchidos automaticamente */}
                    {selectedNota && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                            Quantidade de Volumes
                          </label>
                          <div className="relative">
                            <Package className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              darkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            <input
                              type="text"
                              value={`${formData.quantidadeVolumes} volumes`}
                              readOnly
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl cursor-not-allowed ${
                                darkMode 
                                  ? 'bg-gray-600 text-gray-300 border-gray-600' 
                                  : 'bg-gray-50 text-gray-600 border-gray-300'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                            Destinatário
                          </label>
                          <div className="relative">
                            <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              darkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            <input
                              type="text"
                              value={formData.destinatario}
                              readOnly
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl cursor-not-allowed ${
                                darkMode 
                                  ? 'bg-gray-600 text-gray-300 border-gray-600' 
                                  : 'bg-gray-50 text-gray-600 border-gray-300'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                            Cidade Destino
                          </label>
                          <div className="relative">
                            <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              darkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                            <input
                              type="text"
                              value={formData.cidadeDestino}
                              readOnly
                              className={`w-full pl-12 pr-4 py-3 border rounded-xl cursor-not-allowed ${
                                darkMode 
                                  ? 'bg-gray-600 text-gray-300 border-gray-600' 
                                  : 'bg-gray-50 text-gray-600 border-gray-300'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Descritivo do Tipo de Custo */}
                    <div>
                      <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                        Descritivo do Tipo de Custo *
                      </label>
                      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Descreva detalhadamente o motivo e justificativa do custo adicional
                      </p>
                      <textarea
                        value={formData.descritivoTipoCusto}
                        onChange={(e) => setFormData(prev => ({ ...prev, descritivoTipoCusto: e.target.value }))}
                        rows={4}
                        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 resize-none ${
                          descritivoError 
                            ? 'border-red-300 bg-red-50' 
                            : darkMode 
                              ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C]' 
                              : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99]'
                        }`}
                        placeholder="Descreva detalhadamente o tipo de custo solicitado"
                        required
                      />
                      
                      {descritivoError && (
                        <div className="mt-2 flex items-center space-x-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{descritivoError}</span>
                        </div>
                      )}
                    </div>

                    {/* Anexo */}
                    <div>
                      <label className={`block text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                        Anexo {formData.tipoCustoExtra !== 'Veiculo Dedicado' && '*'}
                      </label>
                      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formData.tipoCustoExtra === 'Veiculo Dedicado' 
                          ? 'Anexo opcional para este tipo de custo'
                          : 'Anexo obrigatório - Fotos, documentos ou comprovantes'
                        }
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*,.html,.htm,.pdf,.doc,.docx,.txt"
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:transition-colors ${
                              anexoError 
                                ? 'border-red-300 bg-red-50' 
                                : darkMode 
                                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C] focus:border-[#E5C85C] file:bg-gray-600 file:text-gray-200 hover:file:bg-gray-500' 
                                  : 'border-gray-300 bg-white focus:ring-[#4A6D99] focus:border-[#4A6D99] file:bg-[#4A6D99] file:text-white hover:file:bg-[#0C2746]'
                            }`}
                            disabled={uploading}
                            required={formData.tipoCustoExtra !== 'Veiculo Dedicado'}
                          />
                        </div>
                        <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Upload className="w-5 h-5" />
                          <span>Fotos, HTML, PDF</span>
                        </div>
                      </div>
                      {formData.anexo && (
                        <p className="mt-2 text-sm text-green-600 font-medium">
                          ✓ Arquivo selecionado: {formData.anexo.name}
                        </p>
                      )}
                      {anexoError && (
                        <div className="mt-2 flex items-center space-x-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{anexoError}</span>
                        </div>
                      )}
                      {uploadError && (
                        <p className="mt-2 text-sm text-red-600 font-medium">
                          {uploadError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={uploading}
                    className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 ${
                      darkMode 
                        ? 'bg-[#E5C85C] text-[#0C2746] hover:bg-[#D4B84A]' 
                        : 'bg-[#E5C85C] text-[#0C2746] hover:bg-[#D4B84A]'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0C2746]"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Enviar Solicitação</span>
                      </>
                    )}
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
              <h2 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                Solicitações Pendentes
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                Analise e aprove ou rejeite as solicitações de custo
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className={`rounded-xl shadow-sm border p-8 text-center transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <Clock className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Nenhuma solicitação pendente
                </h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Todas as solicitações foram processadas
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.map((request) => (
                  <div key={request.id} className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(request.status)}
                            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              NF: {request.numeroNotaFiscal} - {request.tipoCustoExtra}
                            </h3>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(request.status)}`}>
                            Pendente
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <DollarSign className="w-4 h-4" />
                            <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(request.valorNotaFiscal)}
                            </span>
                          </div>
                          {request.valorCustoAdicional && (
                            <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <span className="text-xs bg-[#E5C85C] text-[#0C2746] px-2 py-1 rounded-full font-medium">
                                Custo Extra: {formatCurrency(request.valorCustoAdicional)}
                              </span>
                            </div>
                          )}
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <User className="w-4 h-4" />
                            <span>{request.destinatario}</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <MapPin className="w-4 h-4" />
                            <span>{request.cidadeDestino}</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className="w-4 h-4" />
                            <span>{request.quantidadeVolumes} volumes</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(request.requestedAt)}</span>
                          </div>
                          <div className={`flex items-center space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span>Por: {request.requestedBy}</span>
                          </div>
                        </div>

                        {request.descritivoTipoCusto && (
                          <div className="mb-4">
                            <h4 className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Descritivo do Tipo de Custo:
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {request.descritivoTipoCusto}
                            </p>
                          </div>
                        )}

                        {request.anexoUrl && request.anexoNome && (
                          <div className="mb-4">
                            <h4 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              Anexo:
                            </h4>
                            <a
                              href={request.anexoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center space-x-2 transition-colors px-3 py-2 rounded-md cursor-pointer ${
                                darkMode 
                                  ? 'text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50' 
                                  : 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100'
                              }`}
                            >
                              <Paperclip className="w-4 h-4" />
                              <span className="underline font-medium">{request.anexoNome}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-32">
                        <button
                          onClick={() => handleApproval(request.id, 'approved')}
                          className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprovar</span>
                        </button>
                        <button
                          onClick={() => {
                            const comments = prompt('Comentários (opcional):')
                            handleApproval(request.id, 'rejected', comments || undefined)
                          }}
                          className="bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
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
                <h2 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Histórico de Solicitações
                </h2>
                <p className={`${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                  {currentUser?.tipo_autorizacao === 'solicitante' 
                    ? 'Visualize suas solicitações e status'
                    : 'Visualize todas as solicitações e seus status'
                  }
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-0">
                {/* Search Field */}
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    placeholder="Buscar por número da nota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 w-full sm:w-64 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                        : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                    }`}
                  />
                </div>
                
                {/* Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                        : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                    }`}
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="approved">Aprovados</option>
                    <option value="rejected">Rejeitados</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className={`rounded-xl shadow-sm border p-8 text-center transition-colors duration-300 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <FileText className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Nenhuma solicitação encontrada
                </h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {searchTerm ? 'Nenhuma solicitação encontrada para o termo pesquisado' : 'Não há solicitações para o filtro selecionado'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredRequests.map((request) => (
                  <div key={request.id} className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}>
                    {/* Header Card */}
                    <div className={`px-6 py-4 border-b transition-colors duration-300 ${
                      darkMode 
                        ? 'bg-gray-750 border-gray-700' 
                        : 'bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              NF: {request.numeroNotaFiscal}
                            </h3>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {request.tipoCustoExtra}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                            {request.status === 'approved' ? 'Aprovado' : 
                             request.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                          </span>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(request.valorNotaFiscal)}
                            </p>
                            {request.valorCustoAdicional && (
                              <p className="text-sm text-[#E5C85C] font-medium">
                                +{formatCurrency(request.valorCustoAdicional)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Key Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div className={`rounded-lg p-3 transition-colors duration-300 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <User className="w-4 h-4" />
                            <span className="font-medium">Destinatário</span>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {request.destinatario}
                          </p>
                        </div>
                        
                        <div className={`rounded-lg p-3 transition-colors duration-300 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">Destino</span>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {request.cidadeDestino}
                          </p>
                        </div>
                        
                        <div className={`rounded-lg p-3 transition-colors duration-300 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Volumes</span>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {request.quantidadeVolumes} volumes
                          </p>
                        </div>
                        
                        <div className={`rounded-lg p-3 transition-colors duration-300 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Solicitado</span>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatDate(request.requestedAt)}
                          </p>
                        </div>
                        
                        <div className={`rounded-lg p-3 transition-colors duration-300 ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <User className="w-4 h-4" />
                            <span className="font-medium">Solicitante</span>
                          </div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {request.requestedBy}
                          </p>
                        </div>

                        {request.status !== 'pending' && request.approvedAt && (
                          <div className={`rounded-lg p-3 transition-colors duration-300 ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <div className={`flex items-center space-x-2 text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">
                                {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                              </span>
                            </div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatDate(request.approvedAt)}
                            </p>
                            {request.approvedBy && (
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Por: {request.approvedBy}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {request.descritivoTipoCusto && (
                        <div className="mb-6">
                          <h4 className={`font-semibold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <MessageSquare className="w-4 h-4" />
                            <span>Descritivo do Tipo de Custo</span>
                          </h4>
                          <div className={`rounded-lg p-4 transition-colors duration-300 ${
                            darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                          }`}>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {request.descritivoTipoCusto}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      {request.comments && (
                        <div className="mb-6">
                          <h4 className={`font-semibold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <MessageSquare className="w-4 h-4" />
                            <span>Comentários da Aprovação</span>
                          </h4>
                          <div className={`rounded-lg p-4 transition-colors duration-300 ${
                            darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
                          }`}>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {request.comments}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Attachment */}
                      {request.anexoUrl && request.anexoNome && (
                        <div className="mb-6">
                          <h4 className={`font-semibold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <Upload className="w-4 h-4" />
                            <span>Anexo</span>
                          </h4>
                          <div className={`rounded-lg p-4 transition-colors duration-300 ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <a
                              href={request.anexoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center space-x-2 transition-colors px-3 py-2 rounded-md cursor-pointer ${
                                darkMode 
                                  ? 'text-blue-400 hover:text-blue-300 bg-blue-900/30 hover:bg-blue-900/50' 
                                  : 'text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100'
                              }`}
                            >
                              <Paperclip className="w-4 h-4" />
                              <span className="underline font-medium">Abrir Anexo</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {request.anexoNome}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Approval Timeline */}
                      {request.approvalHistory && request.approvalHistory.length > 0 && (
                        <div>
                          <h4 className={`font-semibold mb-4 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <History className="w-4 h-4" />
                            <span>Rastro de Aprovação</span>
                          </h4>
                          <div className="space-y-4">
                            {request.approvalHistory.map((history, index) => (
                              <div key={index} className="flex items-start space-x-4">
                                <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                                  history.action.includes('aprovada') ? 'bg-green-500' :
                                  history.action.includes('rejeitada') ? 'bg-red-500' :
                                  'bg-blue-500'
                                }`} />
                                <div className="flex-1 pb-4">
                                  <div className={`rounded-lg p-4 transition-colors duration-300 ${
                                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                                  }`}>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {history.action}
                                    </p>
                                    <div className={`flex items-center space-x-4 mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <span>Por: {history.user}</span>
                                      <span>{formatDate(history.timestamp)}</span>
                                    </div>
                                    {history.comments && (
                                      <div className={`mt-3 p-3 rounded border-l-4 border-blue-500 transition-colors duration-300 ${
                                        darkMode ? 'bg-gray-600' : 'bg-white'
                                      }`}>
                                        <p className={`italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                          "{history.comments}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && currentUser?.tipo_autorizacao === 'administrador' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#0C2746]'}`}>
                  Gerenciar Usuários
                </h2>
                <p className={`${darkMode ? 'text-gray-300' : 'text-[#4A6D99]'}`}>
                  Visualize e gerencie os usuários do sistema
                </p>
              </div>
              
              <button
                onClick={() => setShowCreateUser(true)}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 mt-4 sm:mt-0 ${
                  darkMode 
                    ? 'bg-[#E5C85C] text-[#0C2746] hover:bg-[#D4B84A]' 
                    : 'bg-[#4A6D99] text-white hover:bg-[#0C2746]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className={`rounded-lg shadow-xl p-6 w-full max-w-md ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Criar Novo Usuário
                    </h3>
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className={`transition-colors ${
                        darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={newUserData.nome}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, nome: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Senha Temporária *
                      </label>
                      <input
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                        }`}
                        required
                        minLength={6}
                        placeholder="Usuário deverá alterar no primeiro login"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Tipo de Autorização *
                      </label>
                      <select
                        value={newUserData.tipo_autorizacao}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, tipo_autorizacao: e.target.value as any }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                        }`}
                        required
                      >
                        <option value="solicitante">Solicitante</option>
                        <option value="aprovador">Aprovador</option>
                        <option value="administrador">Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Transportador (opcional)
                      </label>
                      <input
                        type="text"
                        value={newUserData.transportador}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, transportador: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'border-gray-600 bg-gray-700 text-white focus:ring-[#E5C85C]' 
                            : 'border-gray-300 bg-white focus:ring-[#4A6D99]'
                        }`}
                        placeholder="Nome da transportadora"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className={`px-4 py-2 border rounded-md transition-colors ${
                          darkMode 
                            ? 'text-gray-300 border-gray-600 hover:bg-gray-700' 
                            : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        disabled={creatingUser}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={creatingUser}
                        className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2 ${
                          darkMode 
                            ? 'bg-[#E5C85C] text-[#0C2746] hover:bg-[#D4B84A]' 
                            : 'bg-[#4A6D99] text-white hover:bg-[#0C2746]'
                        }`}
                      >
                        {creatingUser ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            <span>Criando...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Criar Usuário</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-300 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`transition-colors duration-300 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Usuário
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Tipo
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Transportador
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 divide-gray-700' 
                      : 'bg-white divide-gray-200'
                  }`}>
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id} className={`transition-colors ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                darkMode ? 'bg-gray-600' : 'bg-slate-200'
                              }`}>
                                <User className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-slate-600'}`} />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {usuario.nome}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {usuario.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            usuario.tipo_autorizacao === 'administrador'
                              ? 'bg-purple-100 text-purple-800'
                              : usuario.tipo_autorizacao === 'aprovador'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {usuario.tipo_autorizacao}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {usuario.transportador || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {usuario.primeiro_login ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Primeiro Login
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Ativo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}