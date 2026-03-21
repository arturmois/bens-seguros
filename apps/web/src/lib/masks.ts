export const CPF_MASK = {
  mask: '___.___.___-__',
  replacement: { _: /\d/ },
};

export const CNPJ_MASK = {
  mask: '__.___.___/____-__',
  replacement: { _: /\d/ },
};

export const PHONE_MASK = {
  mask: '(__) _____-____',
  replacement: { _: /\d/ },
};

export const CEP_MASK = {
  mask: '_____-___',
  replacement: { _: /\d/ },
};

export function documentMask(value: string): { mask: string; replacement: Record<string, RegExp> } {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 11) {
    return CNPJ_MASK;
  }
  return CPF_MASK;
}
