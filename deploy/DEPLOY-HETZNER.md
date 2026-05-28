# Deploy no Hetzner — Controle de Registros

## Visão geral

```
Internet → Nginx (443) → Docker :3000 → Next.js (server.js + cron 02:00)
                              ↓
                    Supabase (vvtympzatclvjaqucebr) + Sienge API + SMTP
```

## 1. Preparar o servidor (uma vez)

Ubuntu 22/24 no Hetzner:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER
# sair e entrar de novo no SSH para o grupo docker valer
```

## 2. Clonar o projeto no servidor

```bash
sudo mkdir -p /opt/registros
sudo chown $USER:$USER /opt/registros
cd /opt/registros
git clone https://github.com/Young-Empreendimentos/Registros.git .
# ou: git pull  (em atualizações)
```

## 3. Variáveis de ambiente no servidor

Crie `/opt/registros/.env.local` (nunca commitar):

```bash
nano /opt/registros/.env.local
```

Use o mesmo conteúdo do seu `.env.local` local, com:

- `SUPABASE_TI_URL`, `SUPABASE_TI_SERVICE_KEY`, `SUPABASE_TI_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mesmo projeto vvtympzatclvjaqucebr)
- `SUPABASE_SERVICE_ROLE_KEY` (= service key do espelho)
- `SIENGE_*`, `SMTP_*`, `JWT_SECRET`, `SYNC_API_SECRET`
- `NODE_ENV=production` (opcional; o Docker já define)

## 4. Subir com Docker

```bash
cd /opt/registros
docker compose build --no-cache
docker compose up -d
docker compose logs -f app
```

Teste: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login` → deve retornar `200`.

## 5. Nginx + HTTPS (recomendado)

```bash
sudo cp deploy/nginx-registros.conf.example /etc/nginx/sites-available/registros
sudo nano /etc/nginx/sites-available/registros   # trocar server_name
sudo ln -sf /etc/nginx/sites-available/registros /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# DNS: A sistemaderegistros.youngempreendimentos.com.br → IP do Hetzner
bash deploy/setup-ssl.sh sistemaderegistros.youngempreendimentos.com.br comercial@youngempreendimentos.com.br
```

## 6. Atualizar após `git push`

No servidor:

```bash
cd /opt/registros
git pull
docker compose build
docker compose up -d
```

Ou da sua máquina (com SSH configurado):

```powershell
# Windows — ajuste DEPLOY_HOST e usuário
$env:DEPLOY_HOST = "SEU_IP_HETZNER"
$env:DEPLOY_USER = "root"
.\deploy\deploy-remoto.ps1
```

```bash
# Linux/Mac
DEPLOY_HOST=SEU_IP DEPLOY_USER=root ./deploy/deploy-remoto.sh
```

## 7. Cron automático (02:00)

O pipeline diário roda **dentro do container** via `server.js` + `node-cron`, desde que o container esteja no ar com `restart: unless-stopped`.

Não é necessário cron no host, salvo se preferir chamar a API externamente:

```bash
# alternativa no host (opcional)
0 2 * * * curl -s -X POST http://127.0.0.1:3000/api/pipeline-diario \
  -H "Content-Type: application/json" \
  -d '{"secret":"SEU_SYNC_API_SECRET"}' >> /var/log/registros-cron.log 2>&1
```

## Checklist pós-deploy

- [ ] Login em `/login` funciona
- [ ] Registros carregam (Supabase vvtympzatclvjaqucebr)
- [ ] Sync manual em Configurações (gestor)
- [ ] E-mail de teste (SMTP comercial@)
- [ ] Firewall Hetzner: portas 22, 80, 443 abertas (3000 só local)

## Firewall Hetzner Cloud

No painel Hetzner → Firewall: permitir TCP 22, 80, 443. Não exponha a 3000 publicamente se usar Nginx.
