/** URL pública do sistema (login). Usada em e-mails de credenciais. */
export function getAppPublicUrl(): string {
  const url =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://sistemaderegistros.youngempreendimentos.com.br';
  return url.replace(/\/$/, '');
}
