export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const normalizeDocumentDigits = (value: string) => onlyDigits(value).slice(0, 14);

export const detectDocumentType = (value: string): "cpf" | "cnpj" | null => {
  const digits = normalizeDocumentDigits(value);
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
};

export const formatCpfCnpj = (value: string) => {
  const digits = normalizeDocumentDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const isRepeatedDigits = (value: string) => /^(\d)\1+$/.test(value);

export const validateCpf = (value: string) => {
  const cpf = normalizeDocumentDigits(value);
  if (cpf.length !== 11 || isRepeatedDigits(cpf)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
};

export const validateCnpj = (value: string) => {
  const cnpj = normalizeDocumentDigits(value);
  if (cnpj.length !== 14 || isRepeatedDigits(cnpj)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const sum = base.split("").reduce((acc, digit, index) => acc + Number(digit) * factors[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
};

export const validateCpfCnpj = (value: string) => {
  const type = detectDocumentType(value);
  if (type === "cpf") return validateCpf(value);
  if (type === "cnpj") return validateCnpj(value);
  return false;
};

export const normalizeBrazilPhoneDigits = (value: string) => {
  let digits = onlyDigits(value);
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

export const formatBrazilPhone = (value: string) => {
  const digits = normalizeBrazilPhoneDigits(value);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export const validateBrazilPhone = (value: string) => {
  const digits = normalizeBrazilPhoneDigits(value);
  if (![10, 11].includes(digits.length)) return false;
  if (digits.startsWith("0")) return false;

  const areaCode = Number(digits.slice(0, 2));
  if (areaCode < 11 || areaCode > 99) return false;

  const subscriberFirstDigit = digits[2];
  if (!subscriberFirstDigit || subscriberFirstDigit === "0") return false;

  return true;
};
