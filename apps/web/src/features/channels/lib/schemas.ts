import { z } from 'zod';

const BROKER_TYPES = ['BAILEYS', 'META'] as const;

export const channelFormSchema = z
  .object({
    name: z.string().min(1, 'Nome e obrigatorio').max(100, 'Nome muito longo'),
    brokerType: z.enum(BROKER_TYPES, {
      required_error: 'Tipo de conexao e obrigatorio',
    }),
    phoneNumber: z.string().optional(),
    metaToken: z.string().optional(),
    phoneNumberId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.brokerType === 'META') {
      if (!data.metaToken || data.metaToken.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Token e obrigatorio para conexao Meta',
          path: ['metaToken'],
        });
      }
      if (!data.phoneNumberId || data.phoneNumberId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Phone Number ID e obrigatorio para conexao Meta',
          path: ['phoneNumberId'],
        });
      }
    }
  });

export type ChannelFormValues = z.infer<typeof channelFormSchema>;

export const EMPTY_CHANNEL_FORM: ChannelFormValues = {
  name: '',
  brokerType: 'BAILEYS',
  phoneNumber: '',
  metaToken: '',
  phoneNumberId: '',
};
