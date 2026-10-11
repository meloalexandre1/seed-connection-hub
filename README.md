# Seed Connection Hub

Crie AGORA um novo aplicativo chamado “Seed Connection | Intelligence OS” (plataforma privada para proprietário e até cinco colaboradores) em português brasileiro. É um produto existente como protótipo HTML fornecido abaixo; NÃO se trata de uma landing page. Preserve a identidade e a arquitetura visual do protótipo e converta para React/TypeScript/Tailwind/shadcn com design MOBILE-FIRST premium. O protótipo é apenas demonstrativo e seus dados são FICTÍCIOS. Não copie os handlers toast de sucesso como se fossem integrações reais. Não publique; acesso privado. Não envie mensagens a terceiros.

PRIORIDADE DESSA PRIMEIRA CONSTRUÇÃO:
1. Criar navegação responsiva completa: desktop com sidebar; celular com navegação inferior [Início,Pessoas,Capturar,Tarefas,SID], botão central Capturar, menus secundários [Oportunidades,Mapa,Projetos,Agenda,Relatórios,Configurações]. Preservar estilo escuro sofisticado com #0B0D0A fundo, #0F100D superfície, #2A2C26 divisória, verde lima #B4F000, texto #F4F2EA, tipografia legível, touch targets amplos, adaptação desktop elegante.
2. CRM Pessoas P0: lista pesquisável e filtros, tela de detalhe de pessoa com dados identificadores, contatos, empresa, classificações de proximidade (Multidão, Seguidor, Discípulo, Amigo próximo, Amigo íntimo) SEPARADAS de prioridade estratégica, necessidades/dores, habilidades/recursos, conexões, histórico cronológico e próximos follow-ups. Incluir importador CSV/XLSX como tela/fluxo demonstrativo até backend conectado (explicitar DEMO).
3. Central de Captura (muito importante): UI de gravar áudio, anexar áudio/video/imagem/PDF, fotografar, digitar nota, importar PLAUD (o usuário AINDA NÃO COMPROU o PLAUD, então é somente canal FUTURO/entrada manual, nunca exibir status conectado). Criar interface de prévia, estados esperando/gravando/enviando/processando/precisa revisar/concluído/erro. Se acesso à câmera/microfone do browser indisponível, mostrar limitação em vez de confirmar falsa gravação. Não prometa gravação longa em segundo plano dentro de browser/PWA: apontar necessidade de app híbrido nativo depois.
4. SID por texto e voz: microfone ao lado de caixa de perguntas, transcrição confirmável/editável antes do envio, botão de resposta falada, histórico de conversas e referências a fontes internas. Perguntas de CONSULTA não criam registros. Modo “Registrar” distinto de “Perguntar”; ações modificadoras precisam de revisão. Na versão sem backend, interface demonstrativa claramente rotulada e sem respostas que finjam consulta real aos contatos do usuário.
5. Fluxo de oportunidade: registrar necessidade, recursos, capacidade de terceiros, avaliar 7 fatores (retorno, urgência, esforço, complexidade, custo de oportunidade, capacidade de execução e potencial de conectar alguém), recomendar RESOLVER/CONECTAR/ADIAR/ENCERRAR com explicação. Kanban de tarefas, dashboard diário com prioridades e follow-ups, mapa visual, agenda e perfil de usuário.
6. Arquitetura pronta para EXTERNAL Supabase como única fonte de dados: estrutura de arquivos/services/types clara, tabelas propostas e RLS, mas NÃO criar backend Lovable Cloud paralelo definitivo nem inventar uma conexão Supabase que não existe; o projeto Supabase apropriado será conectado depois pelo proprietário. Sem dados reais em localStorage; sem service key no front. Se ainda sem backend, tela de demonstração com dados de exemplo CLARAMENTE rotulados e ações não persistentes com aviso; nunca oferecer login/persistência falsos. Preferir UI funcional com estados locais para demonstração sem manipular dados reais.
7. Componentes de estados vazios, erros, loading, segurança e acessibilidade. Use textos bem escritos em pt-BR. Explore interação real nas telas demonstrativas (menus, modais, formulários, tabs, filtros, drawer) e não deixe botões mortos. Não criar integrações WhatsApp/Gmail/Agenda/PLAUD reais sem credenciais e autorização. PLAUD somente importação futura. NÃO exibir números irreais como métricas reais.

CONTEÚDO FONTE A — especificação completa; priorize a evolução por fases mas implemente a casca visual navegável já nesta primeira entrega:
# SEED CONNECTION
## Especificação funcional e técnica — versão 1.0

**Produto:** Seed Connection — Connection Agent  
**Tipo:** plataforma privada de inteligência de relacionamentos, captura e execução  
**Público inicial:** proprietário e equipe interna de até cinco usuários  
**Estado:** especificação de referência para desenvolvimento; não representa software implementado  
**Data:** 11 de outubro de 2026  
**Base:** protótipo `Seed_Connection_Prototipo_Portal.html`, documentos técnicos discutidos anteriormente e decisões registradas nesta conversa.

> **Decisão central:** aplicativo *mobile-first* com Supabase como base central, captura multimídia, assistente de IA por texto e voz e integração progressiva com PLAUD, Google e WhatsApp. O Obsidian e o Trello deixam de ser dependências da versão 1.0.

---

# 1. Visão do produto

O Seed Connection deve ser a principal interface de entrada, armazenamento, consulta e execução da operação de relacionamentos. O sistema reúne informações sobre pessoas, empresas, necessidades, habilidades, projetos, oportunidades, conversas, reuniões, compromissos e conexões, preservando a fonte de cada afirmação.

A plataforma deve reduzir o esforço de registro sem abrir mão da rastreabilidade: o usuário envia ou grava um material, a IA interpreta, cria sugestões e atualiza os registros apenas dentro das regras de aprovação e permissão. Todo registro importante deve permitir responder **o que sabemos**, **como sabemos**, **quando foi registrado**, **quem precisa agir** e **qual foi o resultado**.

## 1.1 Objetivos

- Concentrar cadastros e conhecimento da operação em um único ambiente acessível no celular e no desktop.
- Importar e deduplicar uma base inicial potencialmente grande de contatos, sem exigir perfis completos.
- Tornar natural a captura de áudio, voz, fotos, vídeos, documentos e notas de reuniões.
- Consultar a inteligência por voz ou texto e receber resposta em texto, com áudio opcional.
- Relacionar pessoas, dores, competências, recursos, empresas e oportunidades.
- Recomendar **resolver**, **conectar**, **adiar** ou **encerrar** oportunidades, explicando o motivo.
- Transformar decisões em tarefas, compromissos e follow-ups rastreáveis.
- Produzir relatórios gerenciais diários e painéis com informações derivadas de dados reais.

## 1.2 Não objetivos da primeira versão

- Operar como SaaS público com assinatura, cobrança e múltiplas organizações independentes.
- Capturar automaticamente todas as ligações, mensagens privadas e grupos de WhatsApp.
- Gravar chamadas do sistema telefônico ou do WhatsApp diretamente, sem mecanismos e permissões apropriados.
- Garantir áudio literalmente ilimitado ou captura de vídeo ao vivo contínua no servidor.
- Disparar mensagens externas, propostas, compromissos financeiros ou conexões entre terceiros sem regras de autorização.
- Implantar Neo4j, múltiplos agentes e infraestrutura de microsserviços antes de evidência de necessidade.

# 2. Continuidade com o protótipo atual

O arquivo HTML fornecido já demonstra visualmente sete áreas: **Dashboard**, **Inbox**, **Pessoas**, **Mapa da rede**, **Tarefas**, **Agenda** e **Configurações**. Apresenta o assistente **SID**, níveis de relacionamento, esferas, os cinco pilares exibidos no perfil (nome, cidade, trabalho, habilidade e dor), tarefas, sugestões de conexão, rascunhos de resposta e matriz de autonomia. A interface contém dados fictícios e operações demonstrativas: isso deve ser preservado como referência de experiência, não confundido com integrações prontas.

## 2.1 Princípios visuais a preservar

- Aparência escura e contemporânea; cartões com divisórias discretas.
- Identidade do protótipo: fundo `#0B0D0A`, superfícies `#0F100D`, divisórias `#2A2C26`, realce verde-lima `#B4F000`, texto claro `#F4F2EA`.
- Destaque de pendências, oportunidades e decisões por hierarquia visual, não por excesso de efeitos.
- Busca global como acesso rápido à inteligência e aos registros.
- Perfis com histórico, relações e próximos passos; mapa relacional interativo.
- Ações importantes sempre associadas a estado real de banco de dados, não a avisos demonstrativos de sucesso.

## 2.2 Alterações aprovadas nesta atualização

| Elemento | Protótipo existente | Especificação v1.0 |
|---|---|---|
| Base de dados | Dados em memória no HTML | Supabase/PostgreSQL + Storage privado |
| Interface | Desktop predominante | Mobile-first e desktop responsivo |
| Captura | Inbox orientada a conversas | Inbox universal: gravar, fotografar, filmar, anexar, escrever e importar |
| Assistente SID | Busca textual sugerida | Conversa por texto e voz, resposta textual e áudio opcional |
| Ligações | Conteúdo de mensagens simulado | Importação de gravações/transcrições do PLAUD |
| Áudio longo | Não especificado | Gravação durável, recuperação, upload retomável e processamento assíncrono |
| Pessoas | Cinco pilares + histórico simulado | Cadastro canônico, importação, deduplicação, fontes e eventos reais |
| Oportunidades | Conexões sugeridas | Necessidade + viabilidade + alternativas de execução/conexão/adiamento |
| Execução | Kanban simulado | Tarefas, responsáveis, prazos, agenda e auditoria reais |
| Segurança | Papéis demonstrativos | Autenticação, políticas RLS, escopos privados e logs reais |

# 3. Públicos, permissões e privacidade

**Escopo inicial:** um único ambiente privado, com até cinco usuários internos. Perfis iniciais: Administrador (configurações e acesso autorizado), Gestor (coordenação, CRM e oportunidades permitidas) e Operacional (captura e execução atribuída). Os papéis não conferem acesso irrestrito a dados pessoais; cada registro poderá ter visibilidade privada, equipe ou projeto.

**Requisitos:** autenticação; convite de usuários autorizado; isolamento dos registros privados; políticas de acesso no banco e nos arquivos; histórico de alterações; confirmação para operações sensíveis; gestão de retenção e exclusão; exportação de dados. O tratamento das informações deverá considerar a LGPD, aviso e consentimento para gravações quando aplicável, finalidade e necessidade de dados, além das regras de fornecedores integrados.

# 4. Navegação e experiência mobile-first

## 4.1 Navegação principal no celular

Barra inferior com cinco destinos: **Início**, **Pessoas**, **Capturar**, **Tarefas** e **SID**. O botão central Capturar é a ação de maior destaque. Mapa da rede, Oportunidades, Projetos, Agenda, Relatórios e Administração aparecem na navegação secundária. No desktop, manter a estrutura lateral inspirada no protótipo original.

## 4.2 Tela inicial no celular

A primeira dobra deve oferecer: captura imediata, campo de pergunta por voz/texto, três prioridades do dia, follow-ups atrasados e status das importações. KPI e relatórios detalhados ficam abaixo ou em telas próprias. Não mostrar dezenas de métricas para bloquear a ação principal.

## 4.3 Requisitos de usabilidade

- Design responsivo para celular e desktop, com áreas de toque amplas e legíveis.
- Operações de captura em até dois toques depois de abrir a tela inicial.
- Estado claro: **gravando**, **salvando no dispositivo**, **enviando**, **processando**, **aguardando revisão**, **registrado**, **falha/retentar**.
- Feedback explícito antes de descartar áudio ainda não enviado.
- Compartilhamento de arquivos a partir do celular, quando suportado pelo sistema operacional.
- Informar se a conexão caiu, sem fingir que o material já foi salvo no servidor.
- Acessibilidade: texto legível, controles rotulados, opção de reduzir animações e resposta em texto mesmo no modo de voz.

# 5. Central de Captura — requisito prioritário

Entradas previstas: **(1) gravação de áudio**, **(2) áudio enviado**, **(3) foto**, **(4) vídeo gravado/enviado**, **(5) documento**, **(6) anotação digitada**, **(7) arquivo exportado do PLAUD**, **(8) resumo recebido do Gemini/Gmail** e **(9) outros conectores autorizados**.

Toda captura precisa gerar um registro único de entrada (`capture`) com: origem, proprietário, data/hora de captura, data/hora recebida, tipo, situação de processamento, vínculos, arquivo original, hash, permissões e eventos de erro. O material original deve ser mantido conforme a política de retenção, mesmo quando a IA gerar transcrições ou resumos.

## 5.1 Fluxo único de captura

1. O usuário grava, anexa ou escreve.
2. O aplicativo persiste a entrada localmente quando cabível e confirma o recebimento pelo backend.
3. O Supabase salva metadados e arquivos no Storage privado.
4. Uma fila aciona o processamento assíncrono adequado ao tipo de material.
5. A IA produz transcrição ou extração, resumo, decisões, necessidades, oportunidades e tarefas propostas.
6. O sistema localiza pessoas existentes e indica correspondências incertas para revisão.
7. Um painel de **Revisar sugestões** permite aprovar, editar, ignorar ou adiar.
8. Registros aprovados são vinculados aos cadastros, projetos, oportunidades e tarefas com trilha de auditoria.

## 5.2 Gravações longas: o que significa 'sem limite prático'

A experiência deve permitir iniciar uma gravação e continuar por longos períodos **sem exigir interrupção ou fragmentação manual pelo usuário**. Isso não significa armazenamento, duração ou bateria ilimitados.

**Estratégia técnica:** escrita progressiva local, arquivos/segmentos com checkpoints, recuperação após encerramento inesperado, upload retomável, processamento em segundo plano no servidor e visão consolidada como um único registro. A união lógica das partes deve preservar a ordem e os marcadores de tempo; não é obrigatório gerar um arquivo físico único. O áudio não enviado não pode desaparecer ao bloquear a tela ou perder a conexão, dentro das capacidades reais do sistema operacional.

**Limites a informar:** bateria, espaço local, permissões, interrupção por chamadas, políticas do iOS/Android, tamanho/custo de upload e limites do serviço de transcrição. Gravação em segundo plano requer aplicativo nativo/híbrido e validação em aparelhos reais; uma PWA sozinha não é especificação suficiente para esse requisito.

**Teste obrigatório:** pelo menos uma gravação presencial de duas horas com tela bloqueada, alternância de rede e retomada após interrupção simulada, em Android e iPhone de referência. Registrar o resultado antes de prometer confiabilidade em produção.

## 5.3 Vídeo, imagem e documentos

- Foto: leitura de texto quando aplicável e interpretação de elementos visuais com indicação de incerteza.
- Vídeo: extrair trilha de áudio, transcrever e selecionar quadros para análise visual; não prometer análise contínua de todos os quadros em tempo real na v1.0.
- PDF e documentos: extrair texto, preservar arquivo, identificar entidades e trechos com referência ao documento.
- Áudio: transcrição com marcadores de tempo e diarização quando o provedor suportar, sem inventar a identidade dos participantes.

# 6. SID: assistente conversacional por TEXTO e VOZ

O SID passa a ter um **microfone visível** ao lado do campo de texto nas interfaces mobile e desktop. A comunicação por voz deve funcionar tanto para perguntas de consulta quanto para comandos de captura ou gestão; porém os dois fluxos têm tratamentos diferentes.

## 6.1 Modo 'Perguntar ao SID'

1. Toque no microfone e dê permissão ao sistema.
2. Faça a pergunta em linguagem natural: 'Com quem devo falar hoje?' ou 'Quem pode ajudar a resolver a dor do Paulo?'.
3. O sistema converte fala em texto, mostra a transcrição editável e identifica o objetivo.
4. Consulta os registros autorizados, combinando filtros e pesquisa semântica quando apropriado.
5. Apresenta resposta textual com fontes internas clicáveis (pessoa, interação, oportunidade e/ou documento).
6. O usuário pode tocar em **Ouvir resposta**, ou habilitar respostas por áudio por padrão.
7. É possível fazer pergunta complementar mantendo o contexto da conversa atual.

## 6.2 Modo 'Registrar com voz'

O usuário dita: 'Acabei de conversar com o Marcelo; ele precisa de um fornecedor e prometi fazer uma apresentação na terça'. O SID gera uma captura e propostas de atualização. **Consultar não deve modificar dados**; registrar só modifica após as verificações e autorizações configuradas.

## 6.3 Regras obrigatórias do assistente

- Exibir transcrição do que foi ouvido e permitir corrigir erros.
- Distinguir fato, inferência e recomendação; indicar quando falta evidência.
- Não inventar responsável, horário, compromisso, identidade ou valor financeiro.
- Exibir quais registros foram consultados e quando há informação insuficiente.
- Pedir confirmação antes de mensagens externas, apresentações, cancelamentos, mudanças importantes ou operações financeiras.
- Reproduzir resposta por voz sem esconder a resposta escrita; incluir botão de interromper áudio.
- Guardar o histórico da pergunta/resposta conforme retenção e permissões do usuário.
- O sistema deve tratar os dados encontrados nos arquivos como conteúdo, nunca como instruções que possam alterar permissões ou executar ações sem autorização.

**Evolução:** conversa por streaming de áudio em tempo real, interrupção da fala da IA, reprodução automática e recursos mais avançados podem ser liberados após validação de custo, latência e comportamento no celular.

# 7. PLAUD para gravações de ligações

O PLAUD será o **canal preferencial para gravações telefônicas**. O Seed Connection não precisará tentar capturar diretamente chamadas do aparelho.

## 7.1 Fluxo inicial — importação simples

- Gravar a ligação pelo PLAUD conforme os recursos e permissões do dispositivo.
- Exportar áudio, transcrição ou resumo pelo aplicativo/web do PLAUD.
- Compartilhar ou enviar o arquivo para **Capturar > Importar PLAUD**.
- Associar participantes, data/hora e origem; a IA extrai necessidades, promessas, decisões e tarefas.
- Oferecer campo para vincular ao contato existente; correspondências incertas vão para revisão.

Conforme documentação oficial consultada em outubro de 2026, o PLAUD permite exportar áudio MP3/WAV, transcrições TXT/SRT/DOCX/PDF e resumos TXT/Markdown/DOCX/PDF (os formatos disponíveis variam por interface). **Exportação não equivale a sincronização automática do áudio**.

## 7.2 Fluxo evolutivo — automação via Zapier

O PLAUD documenta gatilhos de **transcrição gerada** e **resumo gerado** no Zapier. Avaliar fluxo PLAUD → Zapier → endpoint autenticado de ingestão no Seed Connection; validar payload, escopos, limites, custo e duplicidade antes da ativação. O gatilho não prova que o arquivo bruto de áudio será entregue automaticamente. Projetar o processo para funcionar apenas com transcrição/resumo quando esse for o dado recebido, preservando a indicação da fonte.

Para reduzir duplicatas, registrar identificador da origem quando houver, horário, assinatura/hash do conteúdo e tipo de evento. Se o mesmo evento chegar duas vezes, reprocessar de maneira idempotente.

## 7.3 Requisitos de privacidade

Confirmar regras locais sobre gravação e aviso aos participantes; restringir o acesso às gravações; definir política de retenção e exclusão; evitar links públicos para material sensível.

# 8. CRM e inteligência relacional

## 8.1 Pessoas como registros canônicos

Cada pessoa possui identificador interno estável e dados progressivos. Campos centrais: nome, aliases, meios de contato, empresa, cidade, setor/esfera, origem do cadastro, responsável interno, visibilidade, nível de proximidade, prioridade atual, última interação confirmada, próximo follow-up e grau de completude.

Preservar os cinco níveis presentes no protótipo: **Multidão, Seguidor, Discípulo, Amigo próximo e Amigo íntimo**. Eles medem proximidade relacional e não devem ser confundidos com potencial comercial ou prioridade operacional. Os cinco pilares do protótipo (nome, cidade, trabalho, habilidade e dor) continuam como uma visão resumida, não como limite do modelo.

## 8.2 Importação e deduplicação

- Importar CSV/XLSX e mapear colunas sem apagar valores originais.
- Normalizar telefones para formato comparável, sem usar telefone como identificador único absoluto.
- Identificar possíveis duplicatas por telefone, e-mail, nome e contexto, com pontuação explicável.
- Oferecer prévia: criar, atualizar, mesclar, ignorar ou revisar.
- Nunca mesclar automaticamente cadastros com evidência conflitante forte.
- Guardar origem da importação, lote, autor, timestamp e resultado por linha.
- Suportar cadastros mínimos com nome ou contato e enriquecer ao longo do tempo.

## 8.3 Histórico e vínculos

Interações e afirmações devem ter data, origem, autor ou sistema e nível de confiança. Pessoa pode estar ligada a empresa, outra pessoa, projeto, necessidade, habilidade, oportunidade ou evento. O sistema não deve transformar mera coocorrência em conexão pessoal comprovada.

# 9. Necessidades, oportunidades e decisão de viabilidade

Distinguir: **necessidade/dor** (o problema), **capacidade/recurso** (quem pode ajudar), **conexão** (relação entre partes) e **oportunidade** (possível ação ou resultado). Cada oportunidade recebe estado, origem, contatos envolvidos, responsável, prazo de reavaliação e próxima ação.

Avaliar sete fatores: retorno potencial, urgência, esforço/energia, complexidade, custo de oportunidade, capacidade de execução da equipe e potencial de encaminhamento a alguém da rede. A IA recomenda um caminho entre **resolver, conectar, adiar ou encerrar**, com justificativa textual, premissas e lacunas. Uma recomendação não é aprovação automática.

Fluxo sugerido: necessidade identificada → identificar solução interna ou pessoas da rede → avaliar viabilidade → apresentar opções → registrar decisão humana → criar tarefa e acompanhamento → registrar resultado e aprendizado.

# 10. Projetos, tarefas, follow-up e agenda

**Tarefas:** título, descrição, responsável, status, prioridade, prazo, data de conclusão, origem, pessoa/projeto/oportunidade relacionada e histórico. **Projetos:** objetivos, entregas, responsáveis, status, marcos e riscos. **Follow-ups:** pessoa, motivo, janela de contato, próximo passo, responsável e resultado.

A agenda deve permitir visualizar eventos e conflitos e, em fase posterior ou integração autorizada, criar e atualizar eventos no Google Calendar. Nunca transformar automaticamente toda data citada numa conversa em evento de calendário: diferenciar prazo de tarefa, follow-up e reunião com horário.

O Kanban do protótipo pode continuar para visualização; o banco de dados será a fonte das tarefas. O Trello deixa de ser requisito da v1.0.

# 11. Dados e arquitetura técnica

## 11.1 Componentes propostos

| Camada | Escolha proposta | Papel |
|---|---|---|
| Web responsiva | React/TypeScript ou stack compatível com builder de IA | Interface desktop e mobile |
| Aplicativo mobile | Empacotamento híbrido/nativo a validar | Microfone em segundo plano, armazenamento local, compartilhamento |
| Banco operacional | Supabase PostgreSQL | Pessoas, vínculos, tarefas, processos, histórico e auditoria |
| Arquivos | Supabase Storage privado | Áudio, vídeo, foto, documentos e versões originais |
| Identidade | Supabase Auth | Usuários e sessões |
| Controle de acesso | RLS + verificações de backend | Restringir registros e arquivos por visibilidade |
| Processamento | Workers/Edge Functions + fila persistente | Transcrição, OCR/visão, extrações e sincronizações |
| IA | Provedores por API, com adaptadores substituíveis | STT, LLM, TTS, embeddings e visão |
| Integrações | Conectores, webhooks ou automação | PLAUD, Gmail/Gemini, Agenda e futuramente WhatsApp |
| Observabilidade | Logs, métricas e alertas de falhas | Diagnóstico, reprocessamento e auditoria |

## 11.2 Entidades mínimas sugeridas

| Grupo | Entidades iniciais |
|---|---|
| Acesso | users, memberships, roles/permissions |
| CRM | people, organizations, contact_methods, people_organizations, relationships |
| Captura | captures, media_assets, transcripts, source_events, processing_jobs |
| Conhecimento | interactions, facts, notes, entity_links, fact_reviews |
| Oportunidades | needs, capabilities, opportunities, connection_suggestions |
| Execução | projects, tasks, task_links, followups, calendar_events |
| Governança | approvals, audit_log, imports, import_rows, sync_connections |

Os nomes são lógicos, não um SQL final. Definir chaves UUID, campos de `created_at`/`updated_at`, quem criou, visibilidade, IDs externos quando cabível e restrições de unicidade no projeto do schema. Relações muitos-para-muitos não devem ser armazenadas apenas em texto livre.

## 11.3 Busca e conhecimento

Combinar filtros estruturados (por exemplo: pessoa, setor, status, prazo) com busca em texto e busca semântica para transcrições, documentos e notas. Guardar referências ao trecho original e controlar acesso **antes** de usar conteúdo na resposta da IA. Busca vetorial não substitui deduplicação, autoria nem confirmação dos fatos.

## 11.4 Trabalhos assíncronos

Uploads finalizados geram jobs; workers consomem em fila, aplicam novas tentativas limitadas e registram falhas. Processamento de áudio/vídeo deve suportar longos tempos de execução e múltiplas etapas sem depender de uma única requisição HTTP aberta. Reprocessamento não pode gerar duplicatas de tarefas ou pessoas.

# 12. Segurança, retenção e qualidade

**Obrigatório antes de dados reais:** RLS nas tabelas expostas; buckets privados; URLs assinadas e com validade; credenciais privilegiadas apenas no servidor; MFA preferencial para administradores; criptografia em trânsito; backups testados; auditoria de operações de gravação, atualização, exclusão e acesso sensível.

Registrar separadamente **fonte original**, **transcrição**, **extração de IA**, **fato aprovado** e **recomendação**. Não sobrescrever a história ao atualizar o perfil. Informações com baixa confiança, ambíguas ou conflitantes ficam em fila de revisão; permitir corrigir e reprocessar.

Estabelecer política de retenção por categoria (por exemplo, áudio bruto e documento original podem ter prazos diferentes de tarefas e fatos aprovados). As durações exatas são decisões de governança, não estão fixadas nesta especificação. Implementar exclusão, exportação e investigação de origem dos dados.

# 13. Indicadores e relatórios

**Dashboard inicial:** tarefas de hoje/atrasadas, follow-ups vencidos, registros aguardando revisão, capturas em processamento, oportunidades com próxima ação e pessoas estratégicas sem interação recente.

**Relatórios diários:** agenda planejada versus realizada, capturas, reuniões, decisões, compromissos, entregas, bloqueios, oportunidades e prioridades do próximo dia. Separar fatos de hipóteses e recomendações.

**Inteligência de conexões:** necessidades abertas, soluções disponíveis na rede, sugestões com evidência, apresentações realizadas, resultados gerados e oportunidades paradas. Não apresentar métricas derivadas de dados incompletos como totais absolutos.

# 14. Requisitos de aceite — versão 1.0

| ID | Resultado verificável | Prioridade |
|---|---|---|
| RF-01 | Cadastrar, editar, pesquisar e abrir perfil de pessoa, com persistência real. | P0 |
| RF-02 | Importar amostra CSV/XLSX com mapeamento, prévia e revisão de duplicidades. | P0 |
| RF-03 | Capturar nota de texto, foto, arquivo e áudio pelo celular. | P0 |
| RF-04 | Confirmar o upload de um arquivo ao Storage privado, com estado visível. | P0 |
| RF-05 | Processar um áudio e guardar transcrição, resumo e arquivo original. | P0 |
| RF-06 | Perguntar ao SID em áudio; mostrar transcrição e resposta textual fundamentada. | P0 |
| RF-07 | Ouvir a resposta do SID pelo alto-falante, com opção de desligar. | P0 |
| RF-08 | Extrair tarefas/necessidades e aprovar antes de atualizar pessoas e projetos. | P0 |
| RF-09 | Importar um arquivo exportado do PLAUD e associá-lo a pessoa/interação. | P0 |
| RF-10 | Criar e concluir tarefas e follow-ups vinculados a pessoas. | P0 |
| RF-11 | Restringir acesso a registros e mídia com autenticação/RLS. | P0 |
| RF-12 | Retomar upload interrompido sem recomeçar sempre do zero. | P1 |
| RF-13 | Gravar áudio longo com checkpoints; recuperar ao simular uma falha. | P1 |
| RF-14 | Exibir mapa relacional alimentado por dados reais. | P1 |
| RF-15 | Avaliar necessidade por retorno/esforço/viabilidade; sugerir resolver/conectar/adiar/encerrar. | P1 |
| RF-16 | Gerar relatório diário baseado nos registros e eventos reais. | P1 |
| RF-17 | Consultar Google Calendar e criar eventos após confirmação. | P1 |
| RF-18 | Automatizar importação de transcrição/resumo do PLAUD via gatilho validado. | P2 |
| RF-19 | Importar automaticamente resumos de reunião recebidos no Gmail, se autorizado. | P2 |
| RF-20 | Adicionar integração de WhatsApp Business via API oficial após validação técnica e jurídica. | P2 |

**Definição de pronto:** teste com dados fictícios e um pequeno conjunto autorizado de dados reais; ausência de duplicatas causadas por reprocessamento; trilha de auditoria; falhas visíveis; testes de permissão; teste mobile em iOS/Android; usuário consegue verificar que uma tarefa criada pela IA realmente existe no banco.

# 15. Sequência de implantação recomendada

**Sprint A — Fundação:** migrar o visual desktop original para componentes responsivos, configurar autenticação, Supabase e layout mobile. Entrega: login e navegação funcionais.

**Sprint B — CRM utilizável:** pessoas, contatos, empresa, classificação, importação pequena, busca e vínculo relacional. Entrega: operação inicial com pessoas reais autorizadas.

**Sprint C — Captura e IA:** inbox universal, arquivo/áudio, transcrição, resumo, revisão e atualização do cadastro. Entrega: uma reunião percorre o fluxo inteiro.

**Sprint D — SID por voz:** ditado, perguntas faladas, transcrição corrigível, consulta com fontes e resposta falada. Entrega: consulta de uma pessoa e criação assistida de follow-up pelo celular.

**Sprint E — Execução:** necessidades, oportunidades, decisão de viabilidade, tarefas, agenda e relatórios. Entrega: uma oportunidade identificada vira ação e resultado rastreável.

**Sprint F — Integrações:** importação de PLAUD, gatilhos Zapier, resumos do Gmail e piloto do WhatsApp Business conforme viabilidade. A entrada manual permanece funcional como contingência.

A ordem operacional pode ser paralelizada pelo time. Não implementar todas as telas sem concluir pelo menos um fluxo vertical de captura → inteligência → revisão → cadastro → tarefa → consulta.

# 16. Questões para validação na implementação

- Quais aparelhos serão usados para gravação (modelos/versões de iOS e Android)?
- Qual dispositivo/plano PLAUD é utilizado e quais recursos estão habilitados?
- Qual política de retenção para áudio bruto, vídeo e transcrições?
- Quais dados são privados do proprietário e quais são compartilháveis com a equipe?
- O SID continuará com o mesmo nome, personalidade e identidade do protótipo?
- Quem poderá aprovar envio de mensagens, conexões entre terceiros e eventos de agenda?
- Qual provedor de IA será escolhido para transcrição, fala, visão e linguagem; como controlar custos por minuto/arquivo?

Essas dúvidas não impedem o desenvolvimento do CRM, da Central de Captura e dos fluxos básicos; impedem apenas promessas específicas ainda não validadas.

# 17. Referências e notas de origem

**Fonte principal de interface:** `Seed_Connection_Prototipo_Portal.html` (arquivo enviado; protótipo com dados fictícios). **Decisões de escopo:** conversa atual (até cinco usuários, Supabase central, sem dependência do Obsidian/Trello, prioridade mobile, uso de voz e PLAUD). **Estudos anteriores:** `01_Possibilidades_e_Viabilidade`, `02_Arquitetura_Stack_e_Agentes` e `03_Modelo_de_Dados_e_Arestas`, conforme conceitos discutidos; o texto integral desses três PDFs não pôde ser novamente verificado nesta execução, portanto esta revisão não afirma reproduzir todos os seus requisitos.

**Fontes públicas verificadas:**

- PLAUD — exportação de gravações, transcrições e resumos: https://support.plaud.ai/hc/en-us/articles/50835453223705-Export-recordings-transcripts-and-summaries
- PLAUD — integração Zapier (gatilhos transcrições/resumos): https://support.plaud.ai/hc/en-us/articles/12200669941647-Zapier-integration
- Supabase — Storage: https://supabase.com/docs/guides/storage
- Supabase — uploads retomáveis: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- Supabase — filas: https://supabase.com/docs/guides/queues
- Apple — gravação e modo de áudio em segundo plano: https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playandrecord

**Versão e mudança:** esta v1.0 atualiza a especificação do produto. O HTML original do protótipo não foi modificado nem convertido em aplicativo por este documento.

CONTEÚDO FONTE B — HTML+CSS de referência visual original, removidas somente definições de fonte base64 e bloco de JS fictício; use para reproduzir navegação, cores, densidade e estilos; converta em componentes adequados, não incorporar documento monolítico em iframe:
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seed Connection · Connection Agent — Protótipo</title><style>




:root{--lime:#B4F000;--lime3:#BBF53C;--g600:#7FBA00;--g700:#638A00;--g900:#2D4300;--g950:#192700;--ink:#0B0D0A;--raiz:#07130F;--surf:#0F100D;--graf:#1A1B17;--graf2:#22241E;--line:#2A2C26;--pedra:#6C6C63;--nevoa:#979994;--areia:#C5C1B9;--ceu:#F4F2EA;--folha:#5EE07B;--colheita:#F2B33D;--azul:#8EC9E8;--brasa:#F0564A;--n1:#2D4300;--n2:#638A00;--n3:#9BD400;--n4:#B4F000;--n5:#E1FCBA}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--ink);color:var(--ceu);font:13px/1.55 "Plus Jakarta Sans",sans-serif;word-spacing:.12em;-webkit-font-smoothing:antialiased;overflow:hidden}
button{font:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,select,textarea{font:inherit;color:var(--ceu);background:var(--graf);border:1px solid var(--line);border-radius:10px;padding:9px 12px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--g600)}
.app{display:grid;grid-template-columns:232px 1fr;height:100vh}
/* sidebar */
.side{background:linear-gradient(180deg,var(--raiz),var(--ink));border-right:1px solid var(--line);display:flex;flex-direction:column;padding:18px 14px}
.brand{display:flex;align-items:center;gap:10px;padding:4px 8px 22px}
.brand .s{width:34px;height:34px}
.brand b{font:600 14px "Plus Jakarta Sans",sans-serif;display:block;line-height:1.1}
.brand small{font:600 10px "Plus Jakarta Sans",sans-serif;letter-spacing:.08em;color:var(--nevoa);text-transform:uppercase}
.nav a{display:flex;align-items:center;gap:11px;padding:8px 11px;font-size:13px;border-radius:10px;color:var(--areia);text-decoration:none;margin-bottom:2px;font-weight:500}
.nav a svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.nav a:hover{background:var(--graf);color:var(--ceu)}
.nav a.on{background:var(--g950);color:var(--lime)}
.nav a .cnt{margin-left:auto;background:var(--lime);color:var(--ink);font-size:11px;font-weight:700;border-radius:99px;padding:1px 8px}
.navsec{font:600 10px "Plus Jakarta Sans",sans-serif;letter-spacing:.08em;color:var(--pedra);text-transform:uppercase;padding:16px 12px 6px}
.sidfoot{margin-top:auto;background:var(--graf);border:1px solid var(--line);border-radius:12px;padding:12px}
.sidfoot .row{display:flex;align-items:center;gap:8px;font-weight:600}
.dot{width:8px;height:8px;border-radius:50%;background:var(--folha);box-shadow:0 0 0 4px rgba(94,224,123,.15)}
.sidfoot p{font-size:12px;color:var(--nevoa);margin-top:4px}
.proto{font-size:10.5px;color:var(--pedra);padding:10px 8px 0;line-height:1.4}
/* main */
.main{display:flex;flex-direction:column;min-width:0;height:100vh}
.top{display:flex;align-items:center;gap:16px;padding:14px 26px;border-bottom:1px solid var(--line);background:rgba(11,13,10,.9)}
.top h1{font:600 18px "Plus Jakarta Sans",sans-serif;white-space:nowrap}
.top .search{flex:1;max-width:460px;margin-left:auto;position:relative}
.top .search input{width:100%;padding-left:36px;background:var(--surf)}
.top .search svg{position:absolute;left:12px;top:11px;width:16px;height:16px;stroke:var(--nevoa);fill:none;stroke-width:2}
.me{display:flex;align-items:center;gap:10px}
.av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:600;font-size:11.5px;flex:none;color:var(--ink)}
.me small{display:block;color:var(--nevoa);font-size:11.5px}
.view{flex:1;overflow:auto;padding:20px 24px 36px}
.hide{display:none!important}
/* common */
.eyebrow{font:600 10.5px "Plus Jakarta Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--lime)}
.card{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:16px}
.card h3{font:600 14px "Plus Jakarta Sans",sans-serif;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.card h3 .more{margin-left:auto;font:500 12px "Plus Jakarta Sans",sans-serif;color:var(--g600)}
.grid{display:grid;gap:16px}
.g4{grid-template-columns:repeat(4,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g2{grid-template-columns:1fr 1fr}
.kpi .v{font:600 26px "Plus Jakarta Sans",sans-serif;color:var(--lime);line-height:1.1;margin:6px 0 2px}
.kpi small{color:var(--nevoa);font-size:12.5px}
.kpi .d{font-size:12px;color:var(--folha)}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:500;padding:2px 9px;border-radius:99px;white-space:nowrap}
.lv{white-space:nowrap;text-transform:none!important;font:600 10px "Plus Jakarta Sans",sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:2px 8px;border-radius:6px;color:var(--ink)}
.btn{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:9px;font-weight:600;font-size:12.5px}
.b1{background:var(--lime);color:var(--ink)}.b1:hover{background:var(--lime3)}
.b2{border:1px solid #3A3D35;color:var(--ceu)}.b2:hover{border-color:var(--nevoa)}
.b3{background:var(--graf);color:var(--lime)}
.muted{color:var(--nevoa)}
.list .it{display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}
.list .it:last-child{border:none}
.list .it .t{flex:1;min-width:0}
.list .it b{display:block;font-weight:500}
.list .it span{color:var(--nevoa);font-size:12.5px}
.chip{display:inline-flex;padding:6px 12px;border-radius:99px;border:1px solid var(--line);font-size:12.5px;color:var(--areia);margin:0 6px 6px 0;cursor:pointer;user-select:none}
.chip.on{background:var(--g950);border-color:var(--g700);color:var(--lime)}
.bars .b{display:grid;grid-template-columns:130px 1fr 36px;gap:10px;align-items:center;margin:9px 0;font-size:12.5px}
.bars .track{height:10px;background:var(--graf);border-radius:99px;overflow:hidden}
.bars .fill{height:100%;border-radius:99px}
table.t{width:100%;border-collapse:collapse}
table.t th{font:600 10.5px "Plus Jakarta Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--nevoa);text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}
table.t td{padding:9px 12px;font-size:12.5px;border-bottom:1px solid var(--line);vertical-align:middle}
table.t tr.cl{cursor:pointer}table.t tr.cl:hover td{background:var(--graf)}
.prog{height:6px;background:var(--graf2);border-radius:99px;width:90px;overflow:hidden;display:inline-block;vertical-align:middle;margin-right:8px}
.prog i{display:block;height:100%;background:var(--lime)}
/* inbox */
.inbox{display:grid;grid-template-columns:320px 1fr 320px;gap:0;height:calc(100vh - 64px - 64px);border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surf)}
.convs{border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.convs .f{padding:12px;border-bottom:1px solid var(--line)}
.convs .ls{overflow:auto;flex:1}
.cv{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);cursor:pointer}
.cv:hover{background:var(--graf)}.cv.on{background:var(--g950)}
.cv .t{flex:1;min-width:0}
.cv .n{display:flex;justify-content:space-between;gap:6px;font-weight:500}
.cv .n time{font-weight:400;color:var(--nevoa);font-size:11.5px}
.cv .p{color:var(--nevoa);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cv .tags{margin-top:5px;display:flex;gap:6px;flex-wrap:wrap}
.thread{display:flex;flex-direction:column;min-width:0;min-height:0}
.thhead{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--line)}
.thhead .own{margin-left:auto;display:flex;gap:8px;align-items:center}
.msgs{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:10px;background:radial-gradient(600px 300px at 80% 0%,rgba(180,240,0,.05),transparent 70%)}
.m{max-width:72%;padding:8px 12px;border-radius:12px;font-size:13px;position:relative}
.m .w{display:block;font:600 10px "Plus Jakarta Sans",sans-serif;letter-spacing:.04em;text-transform:uppercase;margin-bottom:3px}
.m time{display:block;text-align:right;font-size:10.5px;opacity:.6;margin-top:3px}
.m.in{background:var(--graf2);align-self:flex-start;border-top-left-radius:4px}
.m.in .w{color:var(--azul)}
.m.out{align-self:flex-end;border-top-right-radius:4px}
.m.sid{background:var(--g950);border:1px solid var(--g700)}.m.sid .w{color:var(--lime)}
.m.sidney{background:#1F2B3A}.m.sidney .w{color:var(--azul)}
.m.team{background:#2B2433}.m.team .w{color:#C9B6F2}
.m.audio .wave{display:flex;gap:2px;align-items:center;height:22px;margin:4px 0}
.m.audio .wave i{width:3px;background:var(--nevoa);border-radius:2px}
.sysm{align-self:center;font-size:11.5px;color:var(--nevoa);background:var(--graf);border-radius:99px;padding:4px 12px}
.draft{border-top:1px solid var(--line);padding:14px 18px;background:var(--graf)}
.draft .hd{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--lime);font-weight:600;margin-bottom:8px}
.draft textarea{width:100%;min-height:74px;resize:vertical;background:var(--surf)}
.draft .ac{display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap}
.draft .why{flex-basis:100%;font-size:11.5px;color:var(--nevoa)}
.ctx{border-left:1px solid var(--line);overflow:auto;padding:16px}
.ctx h4{font:600 10.5px "Plus Jakarta Sans",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--nevoa);margin:18px 0 8px}
.pil{display:grid;grid-template-columns:92px 1fr;gap:6px;font-size:12.5px;padding:5px 0;border-bottom:1px dashed var(--line)}
.pil b{font:600 10px "Plus Jakarta Sans",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--lime);padding-top:2px}
.ex{background:var(--graf);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12.5px}
.ex .h{display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:4px}
.ex .a{display:flex;gap:6px;margin-top:8px}
.ex .a button{font-size:11.5px;padding:4px 10px;border-radius:8px}
.conf{font-size:11px;color:var(--nevoa);margin-left:auto}
/* kanban */
.kb{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:start}
.col{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:12px}
.col>h4{font:600 11px "Plus Jakarta Sans",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--areia);display:flex;justify-content:space-between;padding:4px 6px 10px}
.tk{background:var(--graf);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;cursor:grab}
.tk:hover{border-color:var(--pedra)}
.tk b{display:block;margin-bottom:6px;font-weight:500}
.tk .meta{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--nevoa);flex-wrap:wrap}
.tk .ft{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.tk .av{width:26px;height:26px;font-size:11px}
.late{color:var(--brasa)!important;font-weight:600}
/* agenda */
.cal{display:grid;grid-template-columns:54px repeat(5,1fr);border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surf);position:relative}
.cal .hd{padding:10px;text-align:center;border-bottom:1px solid var(--line);font-weight:600;border-left:1px solid var(--line)}
.cal .hd small{display:block;color:var(--nevoa);font-weight:400;font-size:11.5px}
.cal .hd.today{color:var(--lime)}
.cal .hr{font-size:11px;color:var(--pedra);text-align:right;padding:2px 8px 0 0;height:46px;border-bottom:1px solid var(--line)}
.cal .cell{height:46px;border-left:1px solid var(--line);border-bottom:1px solid var(--line);position:relative}
.ev{position:absolute;left:4px;right:4px;border-radius:8px;padding:5px 8px;font-size:11.5px;line-height:1.3;overflow:hidden;z-index:2;color:var(--ink)}
.ev b{display:block;font-weight:600}
.ev.conf{outline:2px solid var(--brasa);outline-offset:1px}
/* map */
.mapwrap{display:grid;grid-template-columns:1fr 300px;gap:16px;height:calc(100vh - 64px - 64px)}
#graph{width:100%;height:100%;display:block;background:radial-gradient(900px 500px at 70% 0%,rgba(180,240,0,.10),transparent 70%),var(--surf);border:1px solid var(--line);border-radius:16px;cursor:grab}
.legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--areia)}
.legend i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:-1px}
/* drawer */
.drawer{position:fixed;top:0;right:0;width:460px;height:100vh;background:var(--surf);border-left:1px solid var(--line);box-shadow:-20px 0 60px rgba(0,0,0,.5);z-index:50;overflow:auto;padding:24px;transform:translateX(100%);transition:transform .25s}
.drawer.open{transform:none}
.drawer .x{position:absolute;top:16px;right:18px;font-size:22px;color:var(--nevoa)}
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:40;display:none}.scrim.open{display:block}
.sug{background:var(--g950);border:1px solid var(--g700);border-radius:12px;padding:12px;margin-bottom:10px;font-size:13px}
.sug b{color:var(--lime)}
/* config */
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:18px}
.tabs button{padding:10px 16px;color:var(--nevoa);font-weight:600;border-bottom:2px solid transparent}
.tabs button.on{color:var(--lime);border-color:var(--lime)}
.mx select{width:100%;padding:7px 10px;font-size:12.5px}
.wa{background:#0B141A;border-radius:14px;padding:18px;min-height:220px}
.wa .bb{background:#1F2C33;border-radius:10px;border-top-left-radius:3px;padding:10px 12px;max-width:88%;font-size:13.5px;white-space:pre-wrap}
.wa .bb small{display:block;text-align:right;color:#8696A0;font-size:10.5px;margin-top:4px}
.var{background:rgba(180,240,0,.18);color:var(--lime);border-radius:4px;padding:0 3px}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(30px);background:var(--lime);color:var(--ink);font-weight:600;padding:11px 18px;border-radius:12px;opacity:0;transition:.25s;z-index:99}
.toast.show{opacity:1;transform:translateX(-50%)}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--line);border-radius:10px}

table.t td{white-space:normal}table.t td:nth-child(6),table.t td:nth-child(2){white-space:nowrap}

input,select,textarea{font-size:12.5px}
button,input,select,textarea{word-spacing:inherit}
</style></head><body><div class="app">
<aside class="side">
  <div class="brand"><div class="s"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%"><g transform="translate(20 20) scale(1.6)"><g stroke="#F4F2EA" stroke-width="3.6" fill="none" stroke-linecap="round"><path d="M50 5 Q30 14 22 38 Q16 74 50 95 Q84 74 78 38 Q70 14 50 5"/><line x1="50" y1="60" x2="50" y2="5"/><line x1="50" y1="60" x2="22" y2="38"/><line x1="50" y1="60" x2="78" y2="38"/><line x1="50" y1="60" x2="50" y2="95"/></g>
<circle cx="50" cy="5" r="6.2" fill="#B4F000"/><circle cx="22" cy="38" r="6.2" fill="#B4F000"/><circle cx="78" cy="38" r="6.2" fill="#B4F000"/><circle cx="50" cy="95" r="6.2" fill="#B4F000"/><circle cx="50" cy="60" r="9" fill="#B4F000"/></g></svg></div><div><b>Seed Connection</b><small>Connection Agent</small></div></div>
  <nav class="nav" id="nav">
    <a href="#dashboard" data-v="dashboard"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>Dashboard</a>
    <a href="#inbox" data-v="inbox"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Inbox<span class="cnt">12</span></a>
    <a href="#pessoas" data-v="pessoas"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M1 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/><path d="M17 4a4 4 0 0 1 0 8M23 21v-1a6 6 0 0 0-4-5.6"/></svg>Pessoas</a>
    <a href="#mapa" data-v="mapa"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4"/></svg>Mapa da rede</a>
    <a href="#tarefas" data-v="tarefas"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Tarefas<span class="cnt">5</span></a>
    <a href="#agenda" data-v="agenda"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Agenda</a>
    <div class="navsec">Administração</div>
    <a href="#config" data-v="config"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>Configurações</a>
  </nav>
  <div class="sidfoot"><div class="row"><span class="dot"></span>SID ativo</div><p>Modo rascunho para amigos próximos e íntimos · 3 números conectados</p></div>
  <div class="proto">Protótipo navegável · dados fictícios · logo provisório (opção B)</div>
</aside>
<div class="main">
  <header class="top"><h1 id="vtitle">Dashboard</h1>
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Pergunte ao SID ou busque pessoas, conversas, tarefas…"></div>
    <div class="me"><div class="av" style="background:#9BD400">F</div><div><b>Fábio</b><small>Gestor</small></div></div>
  </header>

  <!-- DASHBOARD -->
  <section class="view" id="v-dashboard">
    <div class="eyebrow">Quarta-feira, 23 de setembro</div>
    <h2 style="font:600 22px 'Plus Jakarta Sans',sans-serif;margin:4px 0 20px">Bom dia! Hoje a rede pede atenção em <span style="color:var(--lime)">3 pessoas próximas</span>.</h2>
    <div class="grid g4">
      <div class="card kpi"><small>Conversas aguardando retorno</small><div class="v">12</div><div class="d">↓ 306 triadas pelo SID esta semana</div></div>
      <div class="card kpi"><small>Tempo médio até a 1ª resposta</small><div class="v">9 min</div><div class="d">antes: dias a semanas</div></div>
      <div class="card kpi"><small>Tarefas vencendo hoje</small><div class="v" style="color:var(--colheita)">5</div><div class="d" style="color:var(--nevoa)">2 atrasadas · assessoria</div></div>
      <div class="card kpi"><small>Aniversários nesta semana</small><div class="v">4</div><div class="d">mensagens agendadas pelo SID</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1.3fr 1fr;margin-top:16px">
      <div class="card"><h3>Precisa da sua atenção <a class="more" href="#inbox">abrir inbox →</a></h3><div class="list" id="attn"></div></div>
      <div class="card"><h3>Agenda de hoje <a class="more" href="#agenda">semana →</a></h3><div class="list" id="today"></div></div>
    </div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card"><h3>Pendências por nível</h3><div class="bars" id="lvbars"></div></div>
      <div class="card"><h3>O que o SID fez hoje</h3><div class="list" id="feed"></div></div>
      <div class="card"><h3>Conexões sugeridas <a class="more" href="#mapa">mapa →</a></h3><div id="sugs"></div></div>
    </div>
  </section>

  <!-- INBOX -->
  <section class="view hide" id="v-inbox" style="padding-bottom:0">
    <div class="inbox">
      <div class="convs"><div class="f"><div id="ifilters"></div></div><div class="ls" id="clist"></div></div>
      <div class="thread"><div class="thhead" id="thhead"></div><div class="msgs" id="msgs"></div><div class="draft" id="draft"></div></div>
      <div class="ctx" id="ctx"></div>
    </div>
  </section>

  <!-- PESSOAS -->
  <section class="view hide" id="v-pessoas">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <div id="pfilters"></div>
      <div style="margin-left:auto;display:flex;gap:8px"><button class="btn b2" onclick="toast('Importador: envie a planilha no modelo Seed_Modelo_Importacao_Pessoas.xlsx')">⤓ Importar planilha</button><button class="btn b1" onclick="toast('Novo cadastro (protótipo)')">+ Nova pessoa</button></div>
    </div>
    <div class="card" style="padding:6px 8px"><table class="t" id="ptable"></table></div>
  </section>

  <!-- MAPA -->
  <section class="view hide" id="v-mapa" style="padding-bottom:0">
    <div class="mapwrap">
      <canvas id="graph"></canvas>
      <div style="overflow:auto">
        <div class="card"><h3>Filtros</h3>
          <div class="eyebrow" style="margin:4px 0 8px">Esferas</div><div id="mfilters"></div>
          <div class="eyebrow" style="margin:12px 0 8px">Exibir</div>
          <span class="chip on" id="tgSug" onclick="this.classList.toggle('on');G.sug=this.classList.contains('on')">Conexões sugeridas pela IA</span>
          <p class="muted" style="font-size:12px;margin-top:8px">Tamanho do nó = nível de relacionamento · arraste para mover · clique para ver a pessoa</p>
        </div>
        <div class="card" style="margin-top:14px" id="minfo"><h3>Rede de relacionamentos</h3><p class="muted">64 pessoas · 142 conexões · 9 sugestões novas</p><div class="legend" id="mleg" style="margin-top:12px"></div></div>
      </div>
    </div>
  </section>

  <!-- TAREFAS -->
  <section class="view hide" id="v-tarefas">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px"><span class="chip on">Todas</span><span class="chip">Minhas</span><span class="chip">Assessoria</span><span class="chip">Atrasadas</span><button class="btn b1" style="margin-left:auto" onclick="toast('Nova tarefa (protótipo)')">+ Nova tarefa</button></div>
    <div class="kb" id="kb"></div>
  </section>

  <!-- AGENDA -->
  <section class="view hide" id="v-agenda">
    <div class="grid" style="grid-template-columns:1fr 300px">
      <div><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><b style="font:600 15px 'Plus Jakarta Sans',sans-serif">21 – 25 de setembro</b><span class="muted" style="font-size:12.5px">· sincronizado com Google Agenda</span></div><div class="cal" id="cal"></div></div>
      <div>
        <div class="card"><h3>Pedidos de agenda (SID)</h3><div id="areq"></div></div>
        <div class="card" style="margin-top:14px;border-color:var(--brasa)"><h3 style="color:var(--brasa)">⚠ Conflito detectado</h3><p style="font-size:13px">Quinta 14h: <b>Reunião Instituto Horizonte</b> sobrepõe <b>Gravação podcast</b>. O SID sugeriu mover a gravação para 16h e aguarda aprovação.</p><div style="margin-top:10px;display:flex;gap:8px"><button class="btn b1" onclick="toast('Gravação movida para 16h · participantes avisados')">Aprovar</button><button class="btn b2">Ver opções</button></div></div>
      </div>
    </div>
  </section>

  <!-- CONFIG -->
  <section class="view hide" id="v-config">
    <div class="tabs" id="ctabs"><button class="on" data-t="aut">Autonomia do SID</button><button data-t="tpl">Templates WhatsApp</button><button data-t="usr">Usuários e permissões</button><button data-t="num">Números conectados</button></div>
    <div id="t-aut"></div><div id="t-tpl" class="hide"></div><div id="t-usr" class="hide"></div><div id="t-num" class="hide"></div>
  </section>
</div>
</div>
<div class="scrim" id="scrim" onclick="closeDrawer()"></div>
<aside class="drawer" id="drawer"></aside>
<div class="toast" id="toast"></div>


CRITÉRIO FINAL: Entregar preview navegável responsivo, nenhum dado privado, todos os componentes visíveis com estados de demo honestos. Informar ao terminar quais telas foram construídas, quais funcionam somente no demo e qual a próxima etapa para conectar Supabase externo.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/718b52cc-fdd3-4e05-b17c-627c3ac9a88c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
