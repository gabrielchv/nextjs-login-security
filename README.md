# Login Security Lab

Duas telas de login em Next.js sobre o mesmo banco SQLite: uma escrita com as
defesas aplicadas (`/login`) e outra vulnerável de propósito (`/login-injection`).
O objetivo é rodar o mesmo payload nas duas rotas e ver a diferença.

> **A rota `/login-injection` é insegura de propósito.** Ela existe só para
> demonstração. Não copie esse código para nenhum projeto real.

## O que está demonstrado

| Defesa | Onde | Como |
| --- | --- | --- |
| CSRF | `src/lib/csrf.ts`, `src/proxy.ts` | Token de 32 bytes em cookie `httpOnly`, replicado num campo escondido do formulário. O POST só passa se as duas cópias baterem. |
| SQL injection (corrigida) | `src/app/api/login/route.ts` | `prepare(... WHERE username = ?)` — o input é vinculado como parâmetro, nunca concatenado. |
| SQL injection (vulnerável) | `src/app/api/login-injection/route.ts` | A query é montada por interpolação de string e a resposta devolve o SQL executado. |
| Bloqueio por tentativas | `src/lib/ratelimit.ts` | 5 senhas erradas bloqueiam a conta por 15 minutos (HTTP 429). |
| Anti-robô | `src/lib/captcha.ts`, `src/app/api/captcha/route.ts` | CAPTCHA em SVG gerado no próprio servidor. Sem rede externa, sem chave de API. |
| Enumeração de usuários por tempo | `src/lib/password.ts` | Um usuário inexistente paga o mesmo `scrypt` que uma senha errada, através de um hash-isca. Sem isso a resposta vinha ~4× mais rápido e denunciava quais logins existem. |
| Cabeçalhos de segurança | `next.config.ts` | CSP restringindo `frame-ancestors`, `base-uri`, `form-action` e `object-src`; `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, e HSTS apenas em produção. |

Extras: senhas guardadas como `scrypt` com salt (`src/lib/password.ts`), sessão
por cookie `httpOnly` apontando para a tabela `sessions` (`src/lib/session.ts`) e
testes de regressão em `tests/` (`npm test`).

### O canal de tempo, em números

O jeito óbvio de escrever o passo 5 da rota `/api/login` é
`user ? verifyPassword(...) : false`. Parece inofensivo, e um comentário antigo
até afirmava que os dois casos falhavam "do mesmo jeito" — mas só um deles roda
`scrypt`. Medido contra o servidor local, com senha errada:

```
usuário existente:  48–62 ms
usuário inexistente: 11–16 ms
```

Quatro vezes de diferença é sinal suficiente para descobrir, sem nenhum erro
visível, quais usernames têm conta. Depois da correção as duas faixas se
sobrepõem (~40–55 ms), e `tests/security.test.ts` falha se alguém reintroduzir o
atalho.

## Rodando

```bash
npm install
npm run db:seed   # cria data/app.db e as contas de teste
npm run dev       # http://localhost:3000
```

Contas de teste: `alice / senha123` e `bob / hunter2`.

Rode `npm run db:seed` de novo a qualquer momento para voltar ao estado inicial —
útil para limpar um bloqueio por tentativas. O script apaga as linhas em vez de
remover `data/app.db`, então é seguro executá-lo com o servidor rodando.

## Testando os ataques

Na página **/login-injection**, use os botões de payload pronto ou digite à mão:

| Usuário | Senha | Resultado |
| --- | --- | --- |
| `' OR '1'='1' --` | qualquer coisa | Entra como o primeiro usuário da tabela, sem senha |
| `alice' --` | qualquer coisa | Entra como `alice`, sem senha |
| `'` | qualquer coisa | Quebra a query e vaza a mensagem de erro do SQLite |

Os mesmos payloads em **/login** retornam apenas "Usuário ou senha inválidos" e
ainda consomem uma das 5 tentativas.

Para ver o CSRF barrando um POST forjado, com o servidor rodando:

```bash
curl -i -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"senha123"}'
# HTTP/1.1 403 Forbidden — {"error":"Token CSRF inválido ou ausente."}
```

### Testes

```bash
npm test
```

Cobrem os módulos puros — verificação de senha (incluindo a paridade de tempo
entre usuário existente e inexistente) e o token CSRF. Não precisam de servidor
nem de banco.

### Suíte de fumaça

Com o servidor rodando em outro terminal:

```bash
npm run db:seed
npm run smoke          # ou: BASE=http://localhost:3001 npm run smoke
```

O script exercita, via `curl`, os oito cenários: POST sem CSRF, CAPTCHA errado,
payload de injection na rota corrigida, as cinco tentativas até o bloqueio, a
tentativa bloqueada, o login válido, o acesso ao dashboard com a sessão e o
bypass na rota vulnerável. Ele resolve o CAPTCHA lendo as letras direto do SVG —
o que também mostra que um CAPTCHA renderizado como texto SVG segura robô
genérico, não um script escrito contra esta aplicação específica.

## Falhas propositais desta demo

Além da concatenação de SQL em `/login-injection`, estão aqui de propósito e
seriam inaceitáveis em produção:

- a tabela `users` guarda `password_plain`, sem o que a query vulnerável não
  teria como comparar a senha em texto na string SQL;
- a rota vulnerável não tem bloqueio por tentativas nem CAPTCHA, então o ataque
  pode ser automatizado à vontade;
- a resposta da rota vulnerável devolve o SQL executado e a mensagem de erro do
  banco para o cliente;
- o segredo do HMAC do CAPTCHA tem um valor padrão embutido (`src/lib/secret.ts`)
  para o projeto rodar sem configuração; o correto é ler de `APP_SECRET` e
  recusar iniciar se a variável não existir.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · better-sqlite3 ·
`node:crypto` para hash, HMAC e comparação em tempo constante. Nenhuma
dependência de serviço externo — roda inteiramente offline.
