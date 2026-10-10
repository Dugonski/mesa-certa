# MesaCerta — aplicação desktop

Protótipo funcional em **JavaScript, Electron e React**, com servidor **Node.js TCP**, mensagens JSON e **Prisma + MySQL 8**. Interface clara em português. Sem Socket.IO, envio à SEFAZ, cobrança financeira ou integração com balança.

## Estrutura

```text
apps/
  desktop/
    electron/       Janela, IPC seguro, cliente TCP e exportação de XML
    src/            Páginas React, componentes, formulários e hook de estado
  server/
    src/
      modules/      Autenticação, mesas, fichas, produtos, usuários e pagamentos
      transport/    Servidor e roteamento TCP
      database/     Conexão, transações, recibos e consultas comuns
      fiscal/       Geração do XML
      config/       Configuração validada
packages/shared/    Contratos, comandos, permissões, cálculos e protocolo TCP
prisma/
  migrations/       Migrações versionadas para MySQL
  schema.prisma     Modelo de dados
  seed.js           Usuários e cardápio de demonstração
scripts/            Inicialização do ambiente de desenvolvimento
tests/              Testes unitários, integração MySQL/TCP e interface
```

Responsabilidades e manutenção dos registros: [Arquitetura](docs/ARCHITECTURE.md).

## Preparar o banco no Windows

Pré-requisitos: Node.js 22.15 ou superior, npm e MySQL 8 instalado e em execução. Um servidor MySQL80 foi encontrado neste computador. O aplicativo não instala nem altera o serviço do Windows.

1. Crie um banco dedicado `restaurante` e um usuário com acesso somente a esse banco, usando o MySQL Workbench. Para as migrações, o usuário precisa de permissões DDL nesse banco.
2. Copie `.env.example` para `.env`, se ainda não existir.
3. Configure `DATABASE_URL` e as três senhas iniciais no `.env`. Caracteres especiais da senha dentro da URL precisam estar codificados (percent-encoding). O `.env` é ignorado pelo Git; não publique credenciais.
4. Execute na raiz:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

O seed cria `admin`, `atendente` e `caixa`, com as senhas definidas no `.env`. Não troca senhas existentes. As bebidas de demonstração são criadas somente quando não existe um produto com o mesmo nome. A migração cadastra **Buffet regular** e **Buffet especial carnes** sem preço e inativos: aparecem no pedido com **Definir preço**. O administrador pode selecionar o buffet e clicar em **Definir preço**, ou usar **Produtos → Editar**. Nenhum preço de buffet é presumido.

## Executar

No computador servidor, deixe este comando em execução:

```powershell
npm run server
```

Em outro terminal, inicie a aplicação:

```powershell
npm run build
npm start
```

Para desenvolver a interface com atualização automática: `npm run dev` (o servidor continua sendo iniciado separadamente).

Na tela de login, informe usuário, senha e um nome para identificar o terminal. Em **Servidor**, configure o endereço e a porta (5050 por padrão). O servidor é um processo separado; o instalador desktop não inicia MySQL ou backend automaticamente.

### Dois ou mais terminais

No servidor, configure `SERVER_HOST` com o IP da interface de rede local (ou `0.0.0.0`) e reinicie o backend. Configure o mesmo IP e porta na tela de login dos clientes. Libere a porta TCP escolhida no firewall somente para a rede local desejada. O MySQL pode continuar restrito a `127.0.0.1`: apenas o servidor acessa o banco.

Esta versão usa TCP sem TLS, apropriado apenas para demonstração em rede confiável. TLS/VPN é necessário antes de expor a comunicação fora desse ambiente. A interface avisa quando a conexão cai e exige novo login; não faz lançamentos offline nem reenvia pagamentos automaticamente.

## Fluxo e acesso

1. Atendente, caixa ou administrador seleciona uma mesa na grade. Uma mesa livre abre uma nova ficha; uma ocupada mostra o pedido existente. São 30 mesas inicialmente; o administrador pode alterar a quantidade em **Gerenciar mesas** (1 a 1.000). Reduzir desativa os números maiores sem apagar seu histórico; contas abertas impedem a redução.
2. Selecione a bebida ou o buffet, informe a quantidade ou **quantidade em kg** (ex.: 0,350), e clique em **Adicionar**. Selecionar o produto não lança o item. O preço do buffet é cadastrado por kg. Peso, quantidade e observação são redefinidos após o lançamento. **Editar** altera quantidade/peso e observação; **Remover** exclui o item após confirmação. Atendente e caixa podem usar essas ações somente antes do pagamento.
3. Outros terminais autenticados recebem um aviso de atualização e consultam o estado autorizado no servidor.
4. Caixa ou administrador acessa **Caixa** ou **Ir ao caixa** no pedido. Na tela separada de pagamento, confere a conta, clica em **Pagar** e escolhe **Pix** ou **cartão**.
5. O servidor registra o pagamento e salva o XML de pré-autorização na mesma transação. A mesa fica **paga** e não recebe novos itens.
6. **Salvar XML** exporta o documento. **Encerrar ficha** libera a mesa e mantém o atendimento no histórico. Reabrir a mesa cria outra ficha.

A migração das mesas preserva as fichas antigas, exibidas em **Fichas anteriores** quando ainda estão abertas. Não deduzimos uma mesa física pelo texto dessas fichas. A grade distingue livres (verde), ocupadas (azul) e pagas (amarelo), sempre com legenda escrita. Os antigos pratos de demonstração são desativados no catálogo; itens já registrados permanecem inalterados.

| Perfil | Operações |
|---|---|
| Administrador | Todas, incluindo produtos, criação de usuários e consulta de atividades |
| Atendente | Consultar mesas, abrir fichas, adicionar, editar e remover itens antes do pagamento |
| Caixa | Operações do atendente, pagamento, XML, encerramento e histórico |

O XML segue a estrutura de pré-autorização da **NFC-e 4.00**, modelo 65, em ambiente de homologação (`tpAmb=2`). Ele inclui chave de acesso, identificação, emitente, itens, grupos tributários provisórios, totais, transporte e pagamento. Ainda não contém assinatura digital, protocolo, autorização, QR Code/CSC ou comunicação com a SEFAZ. CNPJ, IE, endereço, NCM, CFOP e tributação precisam ser configurados e validados antes da futura integração fiscal. O protótipo também ainda não processa Pix ou cartão com um adquirente.

## Consistência e segurança

- Valores monetários em centavos inteiros; total calculado exclusivamente no servidor.
- Buffet: entrada em kg com até três casas decimais e armazenamento em gramas inteiras, preço por kg, arredondamento por item para o centavo mais próximo (meio centavo para cima). Exemplo de cálculo: 0,250 kg × R$ 65,90/kg = R$ 16,48. O peso e o preço aplicado são preservados no item e no XML demonstrativo. Não há leitura de balança.
- Edição e remoção validam o vínculo do item com a ficha, as permissões e a versão; auditoria registra as alterações. Contas pagas e encerradas não podem ser editadas.
- Nome e preço do produto copiados para o item no momento do lançamento. Editar o catálogo não altera vendas anteriores.
- Alterações da ficha usam versão e transação serializável. Ao detectar concorrência, a interface exige nova conferência.
- Abertura e reserva da mesa ocorrem na mesma transação. Dois terminais não podem criar dois atendimentos ativos para a mesma mesa. O fechamento libera a reserva atomicamente.
- Cada comando de escrita tem um UUID e recibo persistente na mesma transação; repetir o mesmo comando não duplica a operação.
- Um pagamento por ficha, protegido por índice único. Pagamento, XML, estado e auditoria são gravados juntos.
- Senhas com bcrypt, sessões de 12 horas com tokens armazenados como hash e permissões verificadas no servidor.
- Auditoria de operações concluídas com usuário, terminal, ação, entidade, horário e detalhes, sem senha/token. Não equivale a um log externo imutável.
- Electron com isolamento de contexto, renderer sem Node e ponte IPC limitada. O token fica no processo principal.
- JSON delimitado por nova linha, limite de frame e tratamento de fragmentação UTF-8. Eventos não enviam dados da venda sem autenticação.

## Testar e gerar instalador

```powershell
npm test
npm run test:integration
npm run build
node tests/ui-smoke.mjs
npm run dist
```

`npm test` cobre regras e protocolo sem banco. A integração exige MySQL migrado e usa registros identificados exclusivamente para o teste, removendo-os ao terminar. Verifica clientes TCP distintos, permissões, idempotência, concorrência, preço preservado, XML e encerramento. O teste visual abre o Electron contra um servidor TCP de fixtures em memória; ele não comprova persistência MySQL.

O instalador Windows será gerado em `release/`. É um pacote de demonstração sem assinatura de código. O backend é distribuído como projeto Node separado.

## Próximas decisões

Fora desta versão: cancelamento de fichas, descontos, taxa de serviço, pagamento dividido, estorno, troca/desativação de usuários, paginação além dos últimos 100 registros no histórico/atividades, recuperação automática após queda, TLS, backups operacionais, atualização automática, fiscal e balança. Essas regras precisam ser definidas antes da implementação.

Referências técnicas: [Electron — isolamento de contexto](https://www.electronjs.org/docs/latest/tutorial/context-isolation), [Prisma 6 — transações](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). Prisma 6 foi fixado para a integração MySQL com o cliente tradicional utilizado neste projeto.
