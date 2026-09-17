# Publicar o site em `powerballbr.com.br`

Passo a passo do que fazer depois de comprar o domínio. O site continua sendo
servido pelo Railway; o domínio só passa a apontar para lá.

## 1. Onde o DNS é gerenciado

`.com.br` é registrado no Registro.br. Se você comprou pela Hostinger, ela é a
revendedora e o DNS fica no hPanel; se comprou direto no Registro.br, o DNS fica
lá. O que importa é saber em qual painel você edita a zona DNS.

O Railway **não fornece endereço IP fixo** — ele entrega um alvo `CNAME`. Isso
cria um problema no domínio raiz (`powerballbr.com.br`, sem `www`), porque o DNS
clássico não aceita `CNAME` na raiz. Duas saídas, descritas abaixo.

## 2. Caminho recomendado: Cloudflare + Railway

A Cloudflare é gratuita e faz "CNAME flattening", que é exatamente o que falta.

1. Crie conta na Cloudflare, adicione o site `powerballbr.com.br` e anote os
   dois nameservers que ela mostrar.
2. No painel onde o domínio está (Hostinger ou Registro.br), troque os
   nameservers pelos da Cloudflare. A propagação costuma levar de minutos a
   algumas horas.
3. No Railway, serviço **frontend** → Settings → Networking → Custom Domain →
   `powerballbr.com.br`. Repita para `www.powerballbr.com.br`.
4. No Railway, serviço **backend** (API) → Custom Domain → `api.powerballbr.com.br`.
5. Para cada domínio, o Railway mostra **dois** registros: um `CNAME` de
   roteamento e um `TXT` `_railway-verify` de verificação. Os dois são
   obrigatórios — só com o `CNAME` o domínio não valida. Copie exatamente como
   aparece e crie na Cloudflare:

   | Tipo    | Nome  | Valor                         | Proxy      |
   | ------- | ----- | ----------------------------- | ---------- |
   | `CNAME` | `@`   | (alvo mostrado pelo Railway)  | Proxied    |
   | `CNAME` | `www` | (alvo mostrado pelo Railway)  | Proxied    |
   | `CNAME` | `api` | (alvo mostrado pelo Railway)  | Proxied    |
   | `TXT`   | (o nome que o Railway mostrar) | (o valor que ele mostrar) | — |

6. Em SSL/TLS na Cloudflare, use o modo **Full (strict)**. O certificado do
   Railway é emitido sozinho depois que a verificação passa.

Se não quiser mexer em nameserver, a alternativa é usar só
`www.powerballbr.com.br` no Railway (aí um `CNAME` comum resolve) e configurar,
no painel do domínio, um redirecionamento da raiz para o `www`.

## 3. Variáveis a ajustar depois que o domínio responder

| Onde                | Variável        | Valor                                |
| ------------------- | --------------- | ------------------------------------ |
| Railway — frontend  | `VITE_SITE_URL` | `https://powerballbr.com.br`         |
| Railway — frontend  | `VITE_API_URL`  | `https://api.powerballbr.com.br`     |
| Railway — backend   | `CORS_ORIGIN`   | `https://powerballbr.com.br,https://www.powerballbr.com.br` |

`VITE_*` é lido em tempo de build: depois de alterar, é preciso um novo deploy
do frontend para valer. `VITE_SITE_URL` fixa a URL canônica das páginas de
resultado; sem ele, o Google veria o mesmo conteúdo em dois endereços (o
domínio novo e o `.up.railway.app`).

Atenção ao `CORS_ORIGIN`: assim que ele deixar de ser `*`, o endereço antigo
`.up.railway.app` para de conseguir falar com a API. Mantenha-o na lista
enquanto estiver testando os dois.

## 4. Google

1. Search Console → adicionar propriedade `https://powerballbr.com.br`
   (verificação por registro `TXT` no DNS).
2. Enviar `https://powerballbr.com.br/sitemap.xml`.

O sitemap já é gerado com esse domínio (`pnpm seo:sitemap`; dá para
sobrescrever com a variável `SITE_URL`). Ele lista as páginas públicas de
resultado e o termo de uso — o gerador fica atrás de login e não é indexado.

## 5. Conferir no fim

- `https://powerballbr.com.br` abre com cadeado e cai na tela de login.
- `https://www.powerballbr.com.br` também abre (ou redireciona para a raiz).
- Login e aceite do termo funcionam, o que prova que a API respondeu — se
  falhar, quase sempre é `CORS_ORIGIN` ou `VITE_API_URL`.
- `https://powerballbr.com.br/robots.txt` aponta para o sitemap certo.
- Em uma página de resultado, a canônica no código-fonte usa o domínio novo.
