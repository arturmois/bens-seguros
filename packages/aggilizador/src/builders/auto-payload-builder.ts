import type { EnumRegistry } from '../mappings/enum-registry.js'
import type {
  ApiAutoSubmitPayload,
  ApiContactPayload,
  ApiDriver,
  ApiInsurance,
  ApiInsured,
  ApiQuestionnaire,
  ApiVehicle,
} from '../types/api.js'
import type { AutoQuoteInput } from '../types/auto.js'
import { boolToApi, formatDateToApi, formatPhone } from './formatters.js'

export class AutoPayloadBuilder {
  constructor(private readonly registry: EnumRegistry) {}

  async buildContactPayload(input: AutoQuoteInput): Promise<ApiContactPayload> {
    const insured = await this.buildInsured(input)
    return {
      CalculationType: 1,
      Id: null,
      BrokerId: input.brokerId,
      InsuranceBroker: input.insuranceBroker,
      Data: insured,
    }
  }

  async buildSubmitPayload(
    input: AutoQuoteInput,
    id: string
  ): Promise<ApiAutoSubmitPayload> {
    const [insured, vehicle, questionnaire, insurance, driver] =
      await Promise.all([
        this.buildInsured(input),
        this.buildVehicle(input),
        this.buildQuestionnaire(input),
        this.buildInsurance(input),
        this.buildDriver(input),
      ])
    return {
      Id: id,
      OnlineId: null,
      BrokerId: input.brokerId,
      DeviceId: null,
      InsuranceBroker: input.insuranceBroker,
      CalculationAuto: {
        Segurado: insured,
        CondutorPrincipal: driver,
        Veiculo: vehicle,
        Questionario: questionnaire,
        Caminhao: null,
        Cobertura: null,
        Seguro: insurance,
      },
      CalculationResidence: null,
      CalculationLife: null,
      CalculationTravel: null,
      CalculationBusiness: null,
      CalculationCondominium: null,
      CalculationRural: null,
      CalculationHealth: null,
      CalculationPet: null,
      CalculationBike: null,
      CalculationPhone: null,
      Type: 0,
      Renovation: input.insurance.type === 'RENEWAL',
    }
  }

  private async buildInsured(input: AutoQuoteInput): Promise<ApiInsured> {
    const { insured } = input
    const [sexo, estadoCivil, relacao] = await Promise.all([
      this.registry.resolve('Sexo', insured.gender),
      this.registry.resolve('EstadoCivil', insured.maritalStatus),
      this.registry.resolve(
        'RelacaoSeguradoCondutor',
        input.mainDriver.relationship
      ),
    ])
    return {
      CpfCnpj: insured.cpf,
      NomeCompleto: insured.fullName,
      DataNascimento: formatDateToApi(insured.birthDate),
      Sexo: sexo,
      EstadoCivil: estadoCivil,
      TempoHabilitacao: '',
      NumeroHabilitacao: '',
      Cep: insured.cep,
      Email: insured.email,
      TelefoneResidencial: formatPhone(insured.homePhone),
      TelefoneCelular: formatPhone(insured.cellPhone),
      RelacaoSeguradoCondutor: relacao,
    }
  }

  private async buildVehicle(input: AutoQuoteInput): Promise<ApiVehicle> {
    const { vehicle } = input
    const [combustivel, rastreador, antifurto] = await Promise.all([
      this.registry.resolve('Combustivel', vehicle.fuelType),
      this.registry.resolve('Rastreador', vehicle.tracker),
      this.registry.resolve('Antifurto', vehicle.antitheft),
    ])
    return {
      NumeroChassi: vehicle.chassisNumber ?? '',
      Placa: vehicle.licensePlate ?? '',
      Modelo: vehicle.model,
      Fabricante: vehicle.manufacturer,
      AnoFabricacao: String(vehicle.manufactureYear),
      AnoModelo: String(vehicle.modelYear),
      CodigoFipe: vehicle.fipeCode,
      ZeroKm: boolToApi(vehicle.isZeroKm),
      Rastreador: rastreador,
      Antifurto: antifurto,
      Alienado: boolToApi(vehicle.isFinanced),
      Combustivel: combustivel,
      CepPernoite: vehicle.overnightCep,
      KitGas: boolToApi(vehicle.hasGasKit),
      Blindado: boolToApi(vehicle.isArmored),
      Fipe: {
        Modelo: vehicle.model,
        Marca: vehicle.manufacturer,
        Codigo: vehicle.fipeCode,
        TipoVeiculo: 0,
      },
    }
  }

  private async buildQuestionnaire(
    input: AutoQuoteInput
  ): Promise<ApiQuestionnaire> {
    const { questionnaire } = input
    const [
      tipoResidencia,
      garagemResidencia,
      garagemTrabalho,
      garagemEstudo,
      usoVeiculo,
    ] = await Promise.all([
      this.registry.resolve('TipoResidencia', questionnaire.residenceType),
      this.registry.resolve('GaragemResidencia', questionnaire.residenceGarage),
      this.registry.resolve('GaragemTrabalho', questionnaire.workGarage),
      this.registry.resolve('GaragemEstudo', questionnaire.studyGarage),
      this.registry.resolve('UsoVeiculo', questionnaire.vehicleUsage),
    ])
    return {
      TipoResidencia: tipoResidencia,
      VeiculosResidencia: '1',
      QuilometragemMensal: String(questionnaire.monthlyMileage),
      GaragemTrabalho: garagemTrabalho,
      GaragemResidencia: garagemResidencia,
      GaragemEstudo: garagemEstudo,
      UsoVeiculo: usoVeiculo,
      UsoDependentes: boolToApi(questionnaire.livesWithUnder26),
      FaixaEtariaDependentes: '',
      DistanciaResidenciaTrabalho: questionnaire.workDistance ?? '',
      Associado: '0',
      PeriodoUso: questionnaire.usagePeriod ?? '',
      Pcd: boolToApi(questionnaire.isPcd),
      Profissao: questionnaire.profession ?? null,
      IsencaoFiscal: null,
    }
  }

  private async buildInsurance(input: AutoQuoteInput): Promise<ApiInsurance> {
    const { insurance } = input
    const tipoSeguro = await this.registry.resolve('TipoSeguro', insurance.type)
    return {
      Banco: '',
      Bonus: insurance.bonus ?? '0',
      TipoSeguro: tipoSeguro,
      VigenciaInicial: formatDateToApi(insurance.startDate),
      VigenciaFinal: formatDateToApi(insurance.endDate),
      VigenciaFinalAnterior: null,
      SeguradoraAnterior: insurance.previousInsurer ?? '',
      CodigoIdentificacao: '',
      NumeroApoliceAnterior: insurance.previousPolicyNumber ?? '',
      Sinistros: insurance.hasClaims ? '1' : '0',
      Comissao: String(insurance.commission),
      Agenciamento: '0',
      Observacoes: insurance.observations ?? '',
      RenovacaoGarantida: false,
      ComissaoSeguradora: null,
    }
  }

  private async buildDriver(input: AutoQuoteInput): Promise<ApiDriver> {
    const { mainDriver } = input
    const [sexo, estadoCivil] = await Promise.all([
      this.registry.resolve('Sexo', mainDriver.gender),
      this.registry.resolve('EstadoCivil', mainDriver.maritalStatus),
    ])
    return {
      CpfCnpj: mainDriver.cpf,
      NomeCompleto: mainDriver.fullName,
      DataNascimento: formatDateToApi(mainDriver.birthDate),
      Sexo: sexo,
      EstadoCivil: estadoCivil,
      TempoHabilitacao: mainDriver.licenseYears
        ? String(mainDriver.licenseYears)
        : '',
      NumeroHabilitacao: '',
    }
  }
}
