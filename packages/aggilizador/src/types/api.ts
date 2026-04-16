export interface ApiPhone {
  Ddd: string | null
  Numero: string | null
}

export interface ApiInsured {
  CpfCnpj: string
  NomeCompleto: string
  DataNascimento: string
  Sexo: string
  EstadoCivil: string
  TempoHabilitacao: string
  NumeroHabilitacao: string
  Cep: string
  Email: string
  TelefoneResidencial: ApiPhone
  TelefoneCelular: ApiPhone
  RelacaoSeguradoCondutor: string
  Perfil?: boolean
}

export interface ApiDriver {
  CpfCnpj: string
  NomeCompleto: string
  DataNascimento: string
  Sexo: string
  EstadoCivil: string
  TempoHabilitacao: string
  NumeroHabilitacao: string
}

export interface ApiFipeInfo {
  Modelo: string
  Marca: string
  Codigo: string
  TipoVeiculo: number
}

export interface ApiVehicle {
  NumeroChassi: string
  Placa: string
  Modelo: string
  Fabricante: string
  AnoFabricacao: string
  AnoModelo: string
  CodigoFipe: string
  ZeroKm: string
  Rastreador: string
  Antifurto: string
  Alienado: string
  Combustivel: string
  CepPernoite: string
  KitGas: string
  Blindado: string
  Fipe: ApiFipeInfo
}

export interface ApiQuestionnaire {
  TipoResidencia: string
  VeiculosResidencia: string
  QuilometragemMensal: string
  GaragemTrabalho: string
  GaragemResidencia: string
  GaragemEstudo: string
  UsoVeiculo: string
  UsoDependentes: string
  FaixaEtariaDependentes: string
  DistanciaResidenciaTrabalho: string
  Associado: string
  PeriodoUso: string
  Pcd: string
  Profissao: string | null
  IsencaoFiscal: string | null
}

export interface ApiInsurance {
  Banco: string
  Bonus: string
  TipoSeguro: string
  VigenciaInicial: string
  VigenciaFinal: string
  VigenciaFinalAnterior: string | null
  SeguradoraAnterior: string
  CodigoIdentificacao: string
  NumeroApoliceAnterior: string
  Sinistros: string
  Comissao: string
  Agenciamento: string
  Observacoes: string
  RenovacaoGarantida: boolean
  ComissaoSeguradora: string | null
}

export interface ApiContactPayload {
  CalculationType: number
  Id: string | null
  BrokerId: number
  InsuranceBroker: string
  Data: ApiInsured
}

export interface ApiContactResponse {
  Id: string
  ErrorMessages: string[]
}

export interface ApiAutoSubmitPayload {
  CalculationType: number
  Id: string | null
  BrokerId: number
  InsuranceBroker: string
  CalculationAuto: {
    Segurado: ApiInsured
    Veiculo: ApiVehicle
    Questionario: ApiQuestionnaire
    Seguro: ApiInsurance
    Condutor: ApiDriver
  }
  CalculationHealth: null
  CalculationLife: null
  CalculationResidential: null
  CalculationBusiness: null
  CalculationCondominium: null
  CalculationRural: null
  CalculationTravel: null
  CalculationPet: null
  CalculationBike: null
  CalculationPhone: null
}

export interface ApiEnumOption {
  Key: string
  Value: string
}

export type ApiAutoDataResponse = Record<string, ApiEnumOption[]>
