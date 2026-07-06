# Criar servidor Hetzner do zero — Controle de Registros

Siga na ordem. Tempo estimado: 15–20 min.

---

## Parte 1 — Chave SSH no seu PC (Windows)

No PowerShell:

```powershell
# Se ainda não tiver chave (ou quiser uma só para este projeto):
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\hetzner_registros -N '""'

# Copiar a chave PÚBLICA (cole no Hetzner no passo 2)
Get-Content $env:USERPROFILE\.ssh\hetzner_registros.pub
```

Guarde o caminho da chave **privada**: `C:\Users\Rafael\.ssh\hetzner_registros`

Chave que você já usou (se for a mesma do PC):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGl6f/m2SJsxrtg1vC5O1MT3a53pzXv8JX2/gWRWUaig antonio alves@DESKTOP-3I3VI04
```

---

## Parte 2 — Hetzner Cloud (painel)

### 2.1 Adicionar chave SSH no projeto

1. [console.hetzner.cloud](https://console.hetzner.cloud/) → seu projeto
2. Menu lateral **Security** → **SSH keys** → **Add SSH key**
3. Nome: `antonio-desktop`
4. Cole a chave pública (uma linha, começa com `ssh-ed25519`)
5. Salvar

### 2.2 Firewall (recomendado)

**Firewalls** → **Create firewall**:

| Regra | Protocolo | Porta | Origem |
|-------|-----------|-------|--------|
| SSH | TCP | 22 | 0.0.0.0/0 (ou seu IP fixo) |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |

Não abra a 3000 publicamente (Docker fica atrás do Nginx).

Aplique o firewall ao servidor ao criá-lo (passo 2.3).

### 2.3 Criar servidor

**Servers** → **Add server**:

| Campo | Valor sugerido |
|-------|----------------|
| Location | Helsinki (ou Nuremberg) |
| Image | **Ubuntu 24.04** |
| Type | **CX23** (2 vCPU, 4 GB) — suficiente |
| Networking | IPv4 + IPv6 |
| SSH keys | Marque **antonio-desktop** (obrigatório) |
| Firewall | Selecione o firewall criado |
| Name | `young-registros` |
| Backups | Opcional |

**Create & buy now.**

Anote o **IPv4** (ex: `77.x.x.x`).

### 2.4 Primeiro acesso

Aguarde ~30 segundos, depois no PowerShell:

```powershell
ssh-keygen -R SEU_IP_NOVO
ssh -i $env:USERPROFILE\.ssh\hetzner_registros root@SEU_IP_NOVO
```

Se usou a chave antiga `id_ed25519`:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519 root@SEU_IP_NOVO
```

Deve entrar **sem pedir senha**. Se pedir senha, a chave não foi marcada na criação — use Console do painel ou recrie o servidor marcando a chave.

### 2.4 Senha do root (opcional — como em outros servidores)

No Ubuntu do Hetzner a senha do `root` vem **bloqueada**; o login padrão é só com chave. Para usar `ssh root@IP` + senha que **você** escolher:

1. Entre com a chave (comando acima).
2. Defina a senha (não fica salva em lugar nenhum do projeto):

```bash
passwd
```

Digite a senha nova duas vezes (não aparece na tela).

3. No PC, teste:

```powershell
ssh root@5.161.255.208
```

A chave `hetzner_registros` continua funcionando; a senha passa a funcionar também.

**Servidor atual:** login com senha já habilitado no SSH; falta só rodar `passwd` se ainda não definiu.

| Forma de entrar | Comando |
|-----------------|---------|
| Com chave | `ssh -i ~/.ssh/hetzner_registros root@5.161.255.208` |
| Com senha | `ssh root@5.161.255.208` (após `passwd`) |

Use senha forte (mistura de letras, números e símbolos). A senha do SSH **não** é a senha do login do app em `/login`.

---

## Parte 3 — Instalar Docker no servidor

Já logado por SSH:

```bash
apt update && apt upgrade -y
apt install -y git docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
usermod -aG docker root
```

Teste: `docker --version`

---

## Parte 4 — Deploy do app

```bash
mkdir -p /opt/registros && cd /opt/registros
git clone https://github.com/Young-Empreendimentos/Registros.git .
nano .env.local
```

Cole o `.env.local` do seu PC (Supabase vvtympzatclvjaqucebr, Sienge, SMTP, JWT, SYNC_API_SECRET).

```bash
docker compose build
docker compose up -d
docker compose logs -f app
```

Teste: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login` → `200`

Acesse temporariamente: `http://SEU_IP:3000/login` (abra porta 3000 no firewall só para teste, ou configure Nginx abaixo).

---

## Parte 5 — Nginx + domínio (opcional)

Com domínio apontando para o IP:

```bash
cp deploy/nginx-registros.conf.example /etc/nginx/sites-available/registros
nano /etc/nginx/sites-available/registros   # trocar server_name
ln -sf /etc/nginx/sites-available/registros /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d registros.seudominio.com.br
```

---

## Parte 6 — Atualizações futuras

No PC:

```powershell
$env:DEPLOY_HOST = "SEU_IP_NOVO"
$env:DEPLOY_USER = "root"
.\deploy\deploy-remoto.ps1
```

(Ajuste o script para usar `ssh -i` se necessário.)

---

## Checklist

- [ ] Chave SSH no projeto Hetzner
- [ ] Servidor criado **com** a chave marcada
- [ ] SSH entra sem senha
- [ ] `.env.local` no servidor
- [ ] `docker compose up -d` OK
- [ ] Login no app funciona
