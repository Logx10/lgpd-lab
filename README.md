# LGPD Lab + EntregaFácil — Vercel (salas ao vivo)

Aplicação de ensino com **duas telas diferentes**:

- `/` ou `/apresentador`: painel reservado para o apresentador, com sala, QR Code, controle de etapas, gráficos de votação e explicações jurídicas;
- `/aluno`: aplicativo fictício de delivery, com atividades para alunos no celular, sem mostrar o gabarito e sem formulários reais de dados pessoais.

O aluno entra por QR Code ou pelo código de 6 caracteres. O apresentador escolhe uma das **6 etapas**; os aparelhos atualizam automaticamente (consulta a cada 3 segundos). Cada aparelho pode alterar a resposta enquanto a etapa estiver aberta. O painel mostra resultados agregados em tempo real.

## Publicação na Vercel

1. Suba **o conteúdo desta pasta** para um repositório GitHub (os arquivos `api/`, `public/`, `package.json` e `vercel.json` devem estar na raiz do projeto).
2. Na Vercel, clique em **Add New → Project → Import Git Repository**.
3. Selecione **Framework Preset: Other**, **Root Directory: `./`** e deixe o **Build Command vazio**. Não é preciso instalar pacotes ou gerar uma pasta `dist`.
4. Em **Storage → Create Database**, conecte um banco Redis ao projeto. A integração oficial **Redis** cria `REDIS_URL` automaticamente. Alternativamente, use **Upstash Redis** com as credenciais REST.
5. Em **Project → Settings → Environment Variables**, confira as variáveis em **Production**:
   - Redis oficial: `REDIS_URL` (URL privada de conexão);
   - Upstash: `UPSTASH_REDIS_REST_URL` (URL HTTPS REST) e `UPSTASH_REDIS_REST_TOKEN` (token privado REST).
   A API usa `REDIS_URL` quando ela está definida; caso contrário, usa as duas variáveis do Upstash.
6. Clique **Redeploy** após conectar o banco ou adicionar variáveis. Configure **Preview** também se desejar testar previews.
7. Acesse a raiz do domínio da Vercel, clique em **Criar sala para a turma** e compartilhe o QR Code. Os alunos podem abrir `https://seu-dominio.vercel.app/aluno` e digitar o código.

> **Importante:** `REDIS_URL` e o token REST do Upstash são segredos. Mantenha-os apenas nas variáveis do servidor. **Não** os coloque no JavaScript ou HTML do navegador e **não** envie um arquivo `.env` para o GitHub.

Sem Redis, as interfaces estáticas abrem normalmente, mas **criar sala, responder e sincronizar não funcionam**. A API mostra um erro informando que é necessário configurar o serviço. A Vercel não fornece armazenamento compartilhado persistente entre funções automaticamente.

## Desenvolvimento local

Requer Node.js 20 ou superior e Vercel CLI. Execute:

```bash
npm install -g vercel
vercel login
vercel link
```

Crie um `.env.local` com `REDIS_URL` ou com as duas variáveis REST do Upstash (ou execute `vercel env pull .env.local`) e depois:

```bash
vercel dev
```

Abra a URL exibida no terminal. **Não** execute apenas `python -m http.server` para testar a votação, pois esse comando não executa a API serverless.

## Dinâmica da aula

1. **Introdução à LGPD:** cadastro pede permissões excessivas;
2. **Conceitos e agentes:** titular, controlador e operador;
3. **Princípios e bases legais:** seleção de dados necessários;
4. **Direitos do titular:** pedidos de acesso, correção, eliminação e revogação;
5. **Punições:** situação fictícia de fiscalização e caso real Telekall/ANPD;
6. **Boas práticas:** melhorias para o aplicativo.

O modo apresentador pode abrir/encerrar respostas e revelar explicações jurídicas **sem exibi-las nas telas dos alunos**.

## Privacidade e limitações

- Nenhum nome real, endereço, CPF, e-mail, localização ou acesso aos contatos é coletado.
- A API usa identificadores aleatórios por navegador, sem autenticação individual dos alunos; respostas são contadas uma vez por navegador/etapa (novas respostas substituem antigas). Um participante pode acessar por mais de um dispositivo, o que pode duplicar votos.
- O Redis armazena temporariamente apenas sala, etapa, identificadores pseudônimos e respostas. Os dados expiram em aproximadamente **6 horas**, sujeitos à política operacional do provedor.
- O código de acesso de apresentador é um segredo criado pela API e guardado no **localStorage** daquele navegador. Use um navegador privado para apresentar, não compartilhe esse dispositivo e evite acessar a página de apresentador em dispositivos públicos.
- O código público de 6 caracteres serve apenas para entrar na sala como aluno; não autoriza mudar etapas.
- O QR Code é renderizado usando **api.qrserver.com**. Esse serviço recebe o link público da sala para produzir a imagem. O acesso por link ou código funciona mesmo se o QR externo falhar.
- O MVP usa **polling de 3 segundos**, não WebSocket. Durante a apresentação, considere os limites de requisições do seu plano no Redis e na Vercel.
- Este protótipo tem finalidade acadêmica, não substitui avaliação jurídica ou soluções de votação com identidade verificada, controle antifraude ou uso em grandes públicos.

### Fontes jurídicas

- [LGPD — Lei nº 13.709/2018 (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — primeira multa por descumprimento da LGPD (2023)](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aplica-a-primeira-multa-por-descumprimento-a-lgpd)

As explicações do app são didáticas e devem ser revisadas pelo grupo antes da apresentação.
