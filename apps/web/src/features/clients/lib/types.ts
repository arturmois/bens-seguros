import type { z } from 'zod'

import type { CreateClientBody } from '@/api/endpoints/clients/clients.zod'

export type ClientFormValues = z.infer<typeof CreateClientBody>
