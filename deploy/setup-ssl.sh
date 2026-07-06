#!/bin/bash
# Rode no servidor após o DNS A apontar para o IP do Hetzner:
#   sistemaderegistros.youngempreendimentos.com.br → 5.161.255.208
set -e
DOMAIN="${1:-sistemaderegistros.youngempreendimentos.com.br}"
EMAIL="${2:-comercial@youngempreendimentos.com.br}"

echo "Verificando DNS de $DOMAIN ..."
IP=$(dig +short "$DOMAIN" A | head -1)
SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com)
if [ -z "$IP" ]; then
  echo "ERRO: $DOMAIN ainda não tem registro A. Crie no painel DNS antes de continuar."
  exit 1
fi
echo "DNS: $DOMAIN → $IP (servidor: $SERVER_IP)"
if [ "$IP" != "$SERVER_IP" ]; then
  echo "AVISO: o IP do DNS ($IP) difere do IP deste servidor ($SERVER_IP). Certbot pode falhar."
fi

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "HTTPS configurado: https://$DOMAIN/login"
