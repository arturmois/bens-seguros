import { CURRENT_PRIVACY_VERSION } from '@repo/core'
import type { LegalDocument } from '../types'

export const privacyPolicy: LegalDocument = {
  title: 'Política de Privacidade',
  version: CURRENT_PRIVACY_VERSION,
  updatedAt: '2026-03-28',
  sections: [
    {
      id: 'introducao-e-compromisso',
      title: '1. Introdução e Compromisso',
      content: `O Bens Seguros, operado por [INSERIR RAZÃO SOCIAL], inscrita no CNPJ sob o nº [INSERIR CNPJ], com sede em [INSERIR ENDEREÇO], está comprometida com a proteção dos dados pessoais de seus usuários e dos clientes das corretoras que utilizam a plataforma. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).`,
    },
    {
      id: 'definicoes',
      title: '2. Definições',
      content: `Conforme a LGPD (Art. 5º), para fins desta Política:\n\n• Dados Pessoais: informação relacionada a pessoa natural identificada ou identificável.\n• Dados Pessoais Sensíveis: dados sobre origem racial/étnica, convicção religiosa, opinião política, saúde, vida sexual, dado genético ou biométrico.\n• Titular: pessoa natural a quem se referem os dados pessoais.\n• Controlador: pessoa natural ou jurídica a quem competem as decisões sobre o tratamento de dados pessoais.\n• Operador: pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador.\n• ANPD: Autoridade Nacional de Proteção de Dados, órgão responsável por fiscalizar o cumprimento da LGPD.\n• Tratamento: toda operação realizada com dados pessoais (coleta, armazenamento, uso, compartilhamento, eliminação, etc.).`,
    },
    {
      id: 'dados-que-coletamos',
      title: '3. Dados que Coletamos',
      content: `Cadastrais: Nome, email, telefone, senha (hash) — Fornecidos pelo usuário no registro.\n\nEmpresariais: Razão social, CNPJ, endereço da corretora — Fornecidos no onboarding da organização.\n\nDe uso: Endereço IP, navegador, dispositivo, páginas visitadas, horários de acesso — Coletados automaticamente.\n\nDe clientes da corretora: CPF, nome, telefone, dados de apólices, sinistros — Inseridos pela corretora na plataforma.\n\nFinanceiros: Dados de pagamento (processados por terceiros) — Fornecidos pelo usuário.\n\nDe comunicação: Mensagens de chat, WhatsApp, email — Gerados durante uso da plataforma.`,
    },
    {
      id: 'bases-legais',
      title: '4. Bases Legais (LGPD Art. 7º)',
      content: `• Consentimento (Art. 7º, I): Registro na plataforma, aceite de termos, comunicações de marketing.\n• Execução de contrato (Art. 7º, V): Prestação do serviço SaaS, processamento de pagamentos.\n• Obrigação legal (Art. 7º, II): Retenção de dados fiscais por 5 anos (legislação tributária brasileira).\n• Legítimo interesse (Art. 7º, IX): Analytics de uso, melhoria do produto, prevenção de fraude, segurança da plataforma.`,
    },
    {
      id: 'finalidade-do-tratamento',
      title: '5. Finalidade do Tratamento',
      content: `• Nome, email — Identificação, autenticação, comunicação (Execução de contrato).\n• CNPJ, razão social — Identificação da organização, multi-tenancy (Execução de contrato).\n• IP, navegador, dispositivo — Segurança, prevenção de fraude, auditoria (Legítimo interesse).\n• Dados de clientes da corretora — Gestão de seguros pelo usuário (Execução de contrato — operador).\n• Dados de pagamento — Cobrança dos planos contratados (Execução de contrato).\n• Mensagens de chat — Atendimento ao cliente da corretora (Execução de contrato — operador).\n• Dados de uso (analytics) — Melhoria do produto e experiência (Legítimo interesse).`,
    },
    {
      id: 'modelo-controlador-operador',
      title: '6. Modelo Controlador/Operador',
      content: `Bens Seguros como Controlador:\n• Dados de conta dos usuários (nome, email, senha, dados de uso)\n• Dados de pagamento e faturamento\n• Decisões sobre como esses dados são tratados\n\nBens Seguros como Operador:\n• Dados de clientes das corretoras (CPF, apólices, sinistros, mensagens)\n• Tratamento realizado exclusivamente conforme instruções da corretora (controladora)\n• A corretora é responsável por obter consentimento ou base legal adequada de seus clientes\n\nResponsabilidades:\n• Como controlador: responde diretamente perante os titulares e a ANPD\n• Como operador: responde conforme instruções do controlador (corretora) e deve notificar incidentes`,
    },
    {
      id: 'compartilhamento-de-dados',
      title: '7. Compartilhamento de Dados',
      content: `Compartilhamos dados pessoais apenas nas seguintes situações:\n\n• Processadores de pagamento — Cobrança de planos — Dados de pagamento (tokenizados).\n• Provedores de infraestrutura (cloud) — Hospedagem e armazenamento — Todos (criptografados).\n• Provedor de email transacional — Envio de notificações — Nome, email.\n• Provedores de IA (Anthropic, OpenAI) — Assistência inteligente — Dados anonimizados e com PII redatada.\n• Autoridades competentes — Ordem judicial ou obrigação legal — Conforme exigido.\n\nNunca vendemos dados pessoais. Nunca compartilhamos dados para fins publicitários de terceiros.`,
    },
    {
      id: 'transferencia-internacional',
      title: '8. Transferência Internacional',
      content: `Alguns de nossos provedores de infraestrutura e serviço podem estar localizados fora do Brasil. Nestes casos, asseguramos que a transferência internacional de dados pessoais ocorre com garantias adequadas, conforme previsto na LGPD (Art. 33), incluindo:\n\n• Cláusulas contratuais padrão\n• Provedores em países com nível adequado de proteção reconhecido pela ANPD\n• Medidas técnicas de segurança (criptografia em repouso e em trânsito)`,
    },
    {
      id: 'seguranca-dos-dados',
      title: '9. Segurança dos Dados',
      content: `Implementamos medidas técnicas e organizacionais para proteger dados pessoais:\n\n• Criptografia em repouso: AES-256-GCM para dados sensíveis (CPF, CNPJ) com hash SHA-256 para buscas\n• Criptografia em trânsito: TLS 1.2+ em todas as conexões\n• Isolamento multi-tenant: Row Level Security (RLS) no PostgreSQL, campo tenantId no MongoDB\n• Mascaramento de dados: Dados sensíveis mascarados por padrão em listagens, exposição baseada em perfil de acesso\n• Controle de acesso: RBAC com 5 níveis de permissão (Proprietário, Administrador, Gerente, Comercial, Visualizador)\n• Logs com redação: Dados sensíveis automaticamente removidos de logs (CPF, CNPJ, email, telefone, senha, tokens)\n• Monitoramento de erros: PII filtrada antes do envio para ferramentas de rastreamento\n• Cookies seguros: httpOnly, secure, sameSite\n• Cabeçalhos de segurança: Helmet (CSP, X-Frame-Options, etc.)\n• Rate limiting: Proteção contra ataques de força bruta`,
    },
    {
      id: 'retencao-e-eliminacao',
      title: '10. Retenção e Eliminação',
      content: `• Dados de conta: Enquanto conta ativa + 6 meses (Execução de contrato + período de reativação).\n• Dados fiscais (propostas, apólices, comissões): 5 anos após encerramento (Obrigação legal — legislação tributária).\n• Logs de acesso: 6 meses (Legítimo interesse — segurança).\n• Dados de clientes da corretora: Enquanto conta ativa ou até exclusão LGPD (Execução de contrato — operador).\n• Backups: 30 dias — rotação (Segurança e recuperação).\n\nExclusão LGPD: A plataforma oferece fluxo completo de exclusão de dados pessoais (anonimização em banco, exclusão de conversas, remoção de documentos, anonimização de logs de auditoria). Acessível em Configurações > Clientes > Exclusão LGPD. Requer confirmação forte (digitar nome do cliente). Restrito a perfis Proprietário e Administrador.`,
    },
    {
      id: 'direitos-do-titular',
      title: '11. Direitos do Titular (LGPD Art. 18)',
      content: `Você tem os seguintes direitos em relação aos seus dados pessoais:\n\n• Confirmação e acesso: Saber se tratamos seus dados e obter uma cópia.\n• Correção: Solicitar a correção de dados incompletos, inexatos ou desatualizados.\n• Anonimização, bloqueio ou eliminação: De dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.\n• Portabilidade: Solicitar a transferência de seus dados a outro fornecedor de serviço.\n• Eliminação: Dos dados tratados com base no consentimento, exceto quando houver obrigação legal de retenção.\n• Informação: Sobre as entidades com as quais compartilhamos seus dados.\n• Revogação do consentimento: A qualquer momento, sem prejuízo da licitude do tratamento realizado anteriormente.\n\nComo exercer seus direitos: Envie solicitação para [INSERIR EMAIL DO DPO] ou utilize as funcionalidades disponíveis na plataforma (Configurações > Perfil > Meus Dados). Responderemos em até 15 (quinze) dias úteis, conforme previsto na LGPD.`,
    },
    {
      id: 'cookies-e-tecnologias',
      title: '12. Cookies e Tecnologias',
      content: `• Sessão de autenticação — Essencial — Manter o usuário logado — Sessão / 30 dias.\n• CSRF token — Essencial — Proteção contra ataques CSRF — Sessão.\n• Preferências (tema, idioma) — Funcional — Personalização da interface — 1 ano.\n\nNão utilizamos cookies de terceiros para publicidade ou rastreamento. Todos os cookies são configurados com flags httpOnly, secure e sameSite quando aplicável.`,
    },
    {
      id: 'uso-de-inteligencia-artificial',
      title: '13. Uso de Inteligência Artificial',
      content: `A plataforma utiliza inteligência artificial para:\n• Sugestões e assistência na gestão de propostas e apólices\n• Resumo e análise de documentos\n• Assistência no atendimento ao cliente\n\nProteções implementadas:\n• Dados pessoais identificáveis (PII) são automaticamente redatados antes do envio para provedores de IA\n• Os prompts do sistema proíbem expressamente a solicitação de dados sensíveis\n• Nenhuma decisão automatizada é tomada sem supervisão humana\n• Os provedores de IA não utilizam os dados para treinamento de seus modelos (conforme contratos vigentes)`,
    },
    {
      id: 'dados-de-menores',
      title: '14. Dados de Menores',
      content: `O Bens Seguros é uma plataforma destinada a empresas (B2B) e profissionais do mercado de seguros. Não coletamos intencionalmente dados pessoais de menores de 18 anos. Caso tomemos conhecimento de que dados de um menor foram coletados inadvertidamente, procederemos à sua eliminação imediata.`,
    },
    {
      id: 'alteracoes-na-politica',
      title: '15. Alterações na Política',
      content: `• Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas práticas ou na legislação.\n• Alterações materiais serão comunicadas por email e por banner na plataforma com antecedência mínima de 15 (quinze) dias.\n• Alterações materiais exigirão re-aceite explícito para continuar utilizando a plataforma.\n• O histórico de versões anteriores estará disponível para consulta.`,
    },
    {
      id: 'encarregado-de-dados',
      title: '16. Encarregado de Dados (DPO)',
      content: `O Encarregado de Proteção de Dados do Bens Seguros é:\n\n• Nome: [INSERIR NOME DO DPO]\n• Email: [INSERIR EMAIL DO DPO]\n• Endereço: [INSERIR ENDEREÇO]\n\nO Encarregado é o canal direto para exercício de direitos dos titulares e comunicação com a ANPD.`,
    },
    {
      id: 'contato-e-anpd',
      title: '17. Contato e ANPD',
      content: `Para dúvidas, sugestões ou reclamações sobre esta Política de Privacidade:\n\n• Email: [INSERIR EMAIL]\n• Endereço: [INSERIR ENDEREÇO COMPLETO]\n\nCaso não fique satisfeito com nossa resposta, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) através do site: https://www.gov.br/anpd`,
    },
  ],
}
