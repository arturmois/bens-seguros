import { CURRENT_TERMS_VERSION } from '@repo/core/legal'
import type { LegalDocument } from '../types'

export const termsOfUse: LegalDocument = {
  title: 'Termos de Uso',
  version: CURRENT_TERMS_VERSION,
  updatedAt: '2026-03-28',
  sections: [
    {
      id: 'aceitacao-dos-termos',
      title: '1. Aceitação dos Termos',
      content: `Ao criar uma conta ou utilizar o Bens Seguros, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso. O uso continuado da plataforma após alterações constitui aceitação dos termos revisados.`,
    },
    {
      id: 'descricao-do-servico',
      title: '2. Descrição do Serviço',
      content: `O Bens Seguros é uma plataforma SaaS (Software as a Service) de gestão para corretoras de seguros, oferecendo funcionalidades de:\n\n• Gestão de propostas e apólices\n• Controle de comissões\n• Cadastro de clientes\n• Atendimento multicanal (WhatsApp, chat web, Messenger, Instagram)\n• Gestão de documentos\n• Relatórios e dashboard analítico\n• Assistência com inteligência artificial`,
    },
    {
      id: 'cadastro-e-conta',
      title: '3. Cadastro e Conta',
      content: `• O usuário deve fornecer informações verdadeiras, atualizadas e completas.\n• Cada organização (corretora) é identificada por CNPJ único.\n• O usuário é responsável pela confidencialidade de suas credenciais de acesso.\n• É proibido compartilhar credenciais ou permitir acesso de terceiros não autorizados.\n• O Bens Seguros pode suspender contas com informações falsas ou incompletas.`,
    },
    {
      id: 'planos-e-pagamento',
      title: '4. Planos e Pagamento',
      content: `• A plataforma oferece planos gratuitos e pagos com diferentes limites de funcionalidades.\n• A cobrança dos planos pagos é recorrente (mensal ou anual), conforme o plano contratado.\n• Reajustes de preço serão comunicados com antecedência mínima de 30 (trinta) dias.\n• O não pagamento após o vencimento poderá resultar em suspensão do acesso às funcionalidades do plano contratado.\n• Não há reembolso proporcional em caso de cancelamento antes do fim do período contratado, salvo disposição legal em contrário.`,
    },
    {
      id: 'obrigacoes-do-usuario',
      title: '5. Obrigações do Usuário',
      content: `O usuário compromete-se a:\n\n• Utilizar a plataforma exclusivamente para fins lícitos e relacionados à atividade de corretagem de seguros.\n• Não realizar engenharia reversa, descompilação ou tentativa de acesso ao código-fonte.\n• Não utilizar ferramentas automatizadas (bots, scrapers) sem autorização prévia.\n• Respeitar os limites de uso do plano contratado.\n• Manter seus dados cadastrais atualizados.\n• Cumprir a legislação vigente, incluindo a LGPD, no tratamento de dados pessoais de seus clientes.`,
    },
    {
      id: 'obrigacoes-da-plataforma',
      title: '6. Obrigações da Plataforma',
      content: `O Bens Seguros compromete-se a:\n\n• Disponibilizar a plataforma de forma contínua, ressalvadas manutenções programadas e eventos de força maior.\n• Realizar backups periódicos dos dados armazenados.\n• Implementar medidas de segurança compatíveis com o estado da técnica para proteção dos dados.\n• Oferecer suporte técnico nos canais disponibilizados.\n• Comunicar incidentes de segurança que possam afetar dados pessoais, conforme exigido pela LGPD.\n\nA plataforma não garante disponibilidade ininterrupta (SLA formal não está incluído nos termos gerais).`,
    },
    {
      id: 'propriedade-intelectual',
      title: '7. Propriedade Intelectual',
      content: `• A plataforma Bens Seguros, incluindo seu código-fonte, design, marcas, logotipos e documentação, é propriedade exclusiva de [INSERIR RAZÃO SOCIAL].\n• Os dados inseridos pelo usuário e por sua organização permanecem de propriedade do usuário/organização.\n• O usuário concede ao Bens Seguros uma licença limitada, não exclusiva e revogável para processar seus dados exclusivamente para a prestação do serviço.\n• É vedada a reprodução, distribuição ou criação de obras derivadas da plataforma sem autorização prévia por escrito.`,
    },
    {
      id: 'dados-e-privacidade',
      title: '8. Dados e Privacidade',
      content: `O tratamento de dados pessoais realizado pelo Bens Seguros é regido pela Política de Privacidade, disponível em /privacy, que é parte integrante destes Termos de Uso. Ao aceitar estes Termos, o usuário declara ter lido e concordado também com a Política de Privacidade.`,
    },
    {
      id: 'limitacao-de-responsabilidade',
      title: '9. Limitação de Responsabilidade',
      content: `• O Bens Seguros não garante resultados específicos decorrentes do uso da plataforma.\n• A responsabilidade do Bens Seguros por danos diretos está limitada ao valor total pago pelo usuário nos últimos 12 (doze) meses.\n• O Bens Seguros não será responsável por danos indiretos, incidentais, consequenciais, lucros cessantes ou perda de dados, exceto nos casos previstos em lei.\n• O Bens Seguros não se responsabiliza por decisões de negócio tomadas pelo usuário com base em informações da plataforma, incluindo sugestões geradas por inteligência artificial.`,
    },
    {
      id: 'suspensao-e-rescisao',
      title: '10. Suspensão e Rescisão',
      content: `• O Bens Seguros poderá suspender ou encerrar a conta do usuário em caso de violação destes Termos, sem prejuízo de outras medidas cabíveis.\n• O usuário pode cancelar sua conta a qualquer momento através das configurações da plataforma.\n• Após o cancelamento, os dados do usuário permanecerão acessíveis para exportação por 30 (trinta) dias, após os quais serão eliminados conforme a Política de Privacidade.\n• Dados sujeitos a obrigação legal de retenção (fiscal, regulatória) serão mantidos pelo prazo exigido por lei, mesmo após o cancelamento.`,
    },
    {
      id: 'alteracoes-nos-termos',
      title: '11. Alterações nos Termos',
      content: `• O Bens Seguros pode alterar estes Termos a qualquer momento.\n• Alterações materiais serão comunicadas por email e por banner na plataforma com antecedência mínima de 15 (quinze) dias.\n• Alterações materiais exigirão re-aceite explícito do usuário para continuar utilizando a plataforma.\n• O histórico de versões estará disponível para consulta.`,
    },
    {
      id: 'disposicoes-gerais',
      title: '12. Disposições Gerais',
      content: `• Estes Termos são regidos pelas leis da República Federativa do Brasil.\n• Fica eleito o foro da comarca de [INSERIR CIDADE/UF] para dirimir quaisquer controvérsias, com exclusão de qualquer outro, por mais privilegiado que seja.\n• A invalidade ou nulidade de qualquer cláusula não compromete as demais disposições destes Termos.\n• A tolerância de qualquer das partes quanto ao descumprimento de qualquer cláusula não constituirá renúncia ao direito de exigi-la.`,
    },
    {
      id: 'contato',
      title: '13. Contato',
      content: `Para dúvidas sobre estes Termos de Uso:\n\n• Email: [INSERIR EMAIL]\n• Endereço: [INSERIR ENDEREÇO COMPLETO]`,
    },
  ],
}
