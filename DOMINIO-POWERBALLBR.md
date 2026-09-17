# Publicar o site em `powerballbr.com.br`

Passo a passo do que fazer depois de comprar o domínio. O site continua sendo
servido pelo Railway; o domínio só passa a apontar para lá.

## 1. Por que entra a Cloudflare no meio

O Railway **não fornece endereço IP fixo** — ele entrega um alvo `CNAME`. O DNS
clássico não aceita `CNAME` no domínio raiz, então `powerballbr.com.br` (sem
`www`) só funciona em um provedor que faça "CNAME flattening" ou ALIAS. A
Hostinger e o Registro.br não fazem; a Cloudflare faz e é gratuita. Por isso o
DNS do domínio passa a ser gerenciado nela.

## 2. Ordem dos passos (Hostinger + Cloudflare + Railway)

A ordem importa. Em `.com.br`, o Registro.br recusa nameservers que ainda não
respondam pelo domínio — é o erro "pesquisa recusada". Ou seja: a zona precisa
existir na Cloudflare **antes** da troca de nameserver.

1. **Railway, domínios.** Serviço do frontend → Settings → Networking → Custom
   Domain → `powerballbr.com.br`; repita para `www.powerballbr.com.br`. Serviço
   da API → Custom Domain → `api.powerballbr.com.br`. Para cada um, o Railway
   mostra **dois** registros: um `CNAME` de roteamento e um `TXT`
   `_railway-verify`. Os dois são obrigatórios — só com o `CNAME` o domínio não
   valida. Deixe essa tela aberta.

2. **Cloudflare, zona.** Crie a conta, adicione o site `powerballbr.com.br`
   (plano Free) e cadastre os registros exatamente como o Railway mostrou:

   | Tipo    | Nome  | Valor                          | Proxy   |
   | ------- | ----- | ------------------------------ | ------- |
   | `CNAME` | `@`   | (alvo mostrado pelo Railway)   | Proxied |
   | `CNAME` | `www` | (alvo mostrado pelo Railway)   | Proxied |
   | `CNAME` | `api` | (alvo mostrado pelo Railway)   | Proxied |
   | `TXT`   | (o nome que o Railway mostrar) | (o valor que ele mostrar) | — |

   Em SSL/TLS, escolha o modo **Full (strict)**. Anote os dois nameservers que a
   Cloudflare atribuir (algo como `xxx.ns.cloudflare.com`).

3. **Troca de nameserver.** No hPanel: Domínios → `powerballbr.com.br` →
   DNS/Nameservers → nameservers personalizados, e informe os dois da
   Cloudflare. Se o campo estiver bloqueado por ser `.com.br`, a troca é feita
   no painel do Registro.br (a Hostinger é revendedora): entre com o CPF/CNPJ do
   titular, abra o domínio, role até **DNS** → **Alterar servidores DNS** e
   informe os mesmos dois nameservers.

4. **Espera.** A Cloudflare avisa por e-mail quando a zona fica ativa. Em
   `.com.br` costuma levar algumas horas; o limite é 24h. Depois disso o Railway
   valida a posse e emite o certificado sozinho.

Se em algum momento você preferir não mexer em nameserver, a alternativa é usar
só `www.powerballbr.com.br` no Railway (aí um `CNAME` comum resolve) e deixar a
raiz redirecionando para o `www` pelo painel do domínio.

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

## 6. Se algo não subir

| Sintoma                                   | Causa provável                                              |
| ----------------------------------------- | ----------------------------------------------------------- |
| Railway preso em "validating"             | Falta o `TXT` `_railway-verify`, ou o valor não bate         |
| Registro.br recusa os nameservers         | Zona ainda não criada na Cloudflare — faça o passo 2 antes   |
| Site abre, mas login falha                | `CORS_ORIGIN` no backend sem o domínio novo                  |
| Site abre e não carrega resultado nenhum  | `VITE_API_URL` apontando para endereço que não responde      |
| Mudou a variável e nada aconteceu         | `VITE_*` é lido no build; é preciso um deploy novo           |
| Erro de certificado                       | SSL/TLS da Cloudflare fora de **Full (strict)**              |
