import { renderToBuffer } from '@react-pdf/renderer'
import type { PolicyPdfRenderInput, PolicyPdfRenderer } from '@repo/core'

import { PolicySummaryPdf } from '../pdf-templates/policy-summary-pdf.js'

export class ReactPolicyPdfRenderer implements PolicyPdfRenderer {
  async render(input: PolicyPdfRenderInput): Promise<Buffer> {
    return Buffer.from(
      await renderToBuffer(
        PolicySummaryPdf({
          policy: input.policy,
          organization: input.organization,
          clientFull: input.clientFull,
        })
      )
    )
  }
}
