# Checklist de publicação

- [ ] Projeto importado na Vercel com `api/`, `public/`, `package.json`, `vercel.json` na raiz
- [ ] Framework Preset = Other
- [ ] Banco Redis criado e conectado ao projeto
- [ ] `REDIS_URL` definida em Production **ou** as duas variáveis REST do Upstash definidas em Production
- [ ] Deploy atualizado após adicionar variáveis
- [ ] Página `/` abre painel do apresentador
- [ ] Botão **Criar sala para a turma** gera código
- [ ] Botão **Criar nova sala** gera outro código com zero respostas
- [ ] `/aluno?sala=CODIGO` abre no celular por QR Code
- [ ] Aluno vota e contagem aparece no painel em alguns segundos
- [ ] Avançar etapa no painel atualiza a tela do aluno
- [ ] Botão de bloquear votação impede novos votos
- [ ] Ensaiar toda a sequência e conferir conexão Wi-Fi/dados móveis
