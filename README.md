# Agente Multi-Fonte com IA

## Sobre o Projeto

Este é um **agente inteligente multi-fonte** desenvolvido em Node.js que utiliza inteligência artificial para responder perguntas combinando informações de múltiplas fontes de dados:

- **Banco de dados SQLite** - Consultas estruturadas
- **Documentos locais** - Busca em arquivos de texto
- **Pesquisa na internet** - Dados em tempo real via comandos bash

O agente utiliza **LangChain** e **LangGraph** para orquestrar um fluxo inteligente que decide automaticamente qual fonte de dados é mais apropriada para cada pergunta, podendo combinar múltiplas fontes quando necessário.

## Funcionalidades Principais

### Inteligência Multi-Fonte

- **Roteamento inteligente**: Decide automaticamente qual fonte usar
- **Combinação de fontes**: Integra informações de múltiplas origens
- **Sistema de fallback**: Se uma fonte falha, tenta alternativas
- **Pontuação de confiança**: Mostra o nível de confiança das respostas

### 🔧 Fontes de Dados

- **SQLite**: Consultas estruturadas em bancos `.db`
- **Documentos**: Busca semântica em arquivos `.txt`
- **Internet**: Pesquisa em tempo real via comandos bash

### 🛡️ Segurança e Controle

- **Aprovação de comandos**: Comandos bash requerem aprovação
- **Transparência**: Mostra quais fontes foram utilizadas
- **Métricas de execução**: Tempo de resposta e fontes citadas

## Como Usar

### 1. Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd hiring-challenge-alpha

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp env.example .env
# Edite .env e adicione sua chave da OpenAI
OPENAI_API_KEY=sua_chave_aqui
```

### 2. Preparação dos Dados

```bash
# Crie as pastas de dados
mkdir -p data/sqlite data/documents

# Adicione seus dados:
# - Bancos SQLite (.db) em data/sqlite/
# - Documentos (.txt) em data/documents/
```

### 3. Execução

```bash
# Modo interativo
npm run dev

```

## Guia de Uso

### Interface Interativa

Após executar `npm run dev`, você verá uma interface colorida onde você pode fazer perguntas

## 🧪 Sistema de Testes

O projeto inclui um sistema de testes avançado para validar todas as funcionalidades:

### **Teste Completo do Agente**

```bash
npm run test:agent
```

Executa 21+ testes categorizados (SQL, Documentos, Web, Multi-fonte)

### **Testes Específicos**

```bash
npm run test:docs      # Testa apenas documentos
npm run test:internet  # Testa apenas internet
npm run test:all       # Todos os testes
```

### **Métricas dos Testes**

- Taxa de sucesso por categoria
- Tempo médio de execução
- Validação de fontes utilizadas
- Respostas detalhadas

## Arquitetura do Projeto

```
src/
├── graph.ts              # Grafo principal do agente
├── index.ts              # Aqui que a magica acontece
├── functions/
│   ├── docsSearch.ts     # Busca em documentos
│   ├── sqliteFunction.ts # Consultas SQLite
│   └── internetSearch.ts # Pesquisa na internet com bash
├── agentsConfigs/
│   ├── config.ts         # Algumas configs
│   └── prompts.ts        # Treinamento para a llm
├── test-agents.ts        # Testes do agents
├── test-docs-embed.ts    # Testes da busca semantica
├── test-internet-search.ts # Testes da pesquisa na net
```

### **Fluxo de Execução**

1. **Recebe pergunta** do usuário
2. **Analisa contexto** e decide fontes apropriadas
3. **Executa consultas** nas fontes selecionadas
4. **Combina resultados** de múltiplas fontes
5. **Gera resposta final** com citações das fontes

## Configuração Avançada

### **Variáveis de Ambiente**

```bash
OPENAI_API_KEY=sua_chave_aqui #caro ta, tem que pagar
OPENAI_MODEL=gpt-4o-mini          # Modelo OpenAI (padrão: gpt-4o-mini pq é mais barato)
```

### **Personalização de Fontes**

#### **Adicionar Novo Banco SQLite**

```bash
# Coloque o arquivo .db em data/sqlite/
# O agente detectará automaticamente
```

#### **Adicionar Novos Documentos**

```bash
# Coloque arquivos .txt em data/documents/
# O agente fará busca semântica no conteúdo
```

## 📊 Exemplos de Uso

### **Exemplo 1: Consulta ao Banco**

```bash
> Verifique o que há no banco de dados

✅ Resultado:
O banco de dados contém informações sobre música, incluindo:
- Tabela 'artists' com 275 artistas
- Tabela 'albums' com 347 álbuns
- Tabela 'tracks' com 3503 músicas

 Fontes utilizadas: sqlite
```

### **Exemplo 2: Pesquisa Multi-Fonte**

```bash
> aonde nasceu karl marx

Resultado:
Karl Marx nasceu em Trier, Alemanha, e não no BRASIL, em 5 de maio de 1818.
Ele foi um filósofo, economista e revolucionário socialista,
fundador do marxismo junto com Friedrich Engels.

Fontes utilizadas: web, docs
```

### **Exemplo 3: Combinação de Fontes**

```bash
> qual a musica mais famosa de um album presente no banco de dados

Resultado:
No banco de dados encontrei o álbum "Back In Black" do AC/DC.
A música mais famosa deste álbum é "Back In Black", lançada em 1980,
que se tornou um hino do rock e uma das músicas mais reconhecidas
da história do rock and roll.

Fontes utilizadas: sqlite, web
```

## Bibliotecas, fontes de pesquisa

- [LangChain](https://js.langchain.com/) - Framework de IA
- [LangGraph](https://js.langchain.com/docs/langgraph/) - Orquestração de agentes
- [OpenAI](https://openai.com/) - Modelos de linguagem
- [Chalk](https://github.com/chalk/chalk) - Cores no terminal
- [Searxng](https://www.reddit.com/r/Searx/comments/1g3egc4/public_searxng_instance_that_supports_json/) - Pesquisa gratis com retorno json
- [Embeddings](https://stackoverflow.blog/2023/11/09/an-intuitive-introduction-to-text-embeddings/) - Encuquei a cabeça com isso

---

**🎉 Agora você tem um agente inteligente que combina múltiplas fontes de dados para responder suas perguntas de forma inteligente e contextualizada!**
