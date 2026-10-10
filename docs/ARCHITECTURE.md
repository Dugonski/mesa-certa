# Arquitetura do MesaCerta

O projeto é um monólito modular: um backend Node, um banco MySQL e vários clientes Electron. A refatoração mantém o protocolo, o modelo de dados, as telas e as regras existentes.

## Backend

- `index.js` monta configuração, banco, serviço e servidor TCP.
- `config/index.js` valida a URL MySQL, host e porta sem exibir credenciais em erros.
- `transport/tcp.js` trata conexões, enquadramento JSON, filas e respostas. `transport/router.js` associa comandos aos casos de uso.
- `service.js` autentica, valida contratos, autoriza e encaminha operações.
- `modules/auth` mantém login, sessão e proteção contra tentativas repetidas.
- `modules/tabs`, `tables`, `products`, `users` e `payments` agrupam operações e consultas específicas. Leituras comuns de fichas ficam em `database/queries.js`; não há uma camada genérica de CRUD.
- `modules/audit` registra operações dentro da transação da alteração.
- `database/transaction.js` centraliza isolamento Serializable e repetição de conflitos transitórios.
- `database/commands.js` centraliza recibos de comandos e idempotência. O handler recebe o mesmo cliente transacional `tx`; módulos não abrem transações independentes.
- `domain.js` contém regras puras de estado, peso, permissões e totais.
- `fiscal/nfce.js` gera o XML atual, sem dependência do transporte ou Prisma. A refatoração não altera sua situação fiscal.

Fluxo de escrita: TCP → contrato → sessão → permissão → recibo/transação → handler → auditoria → recibo → commit → aviso de atualização.

## Desktop

- `App.jsx` compõe navegação e telas.
- `hooks/useRestaurant.js` gerencia sessão, snapshot, atualização entre terminais, seleção de ficha, comandos e mensagens. A sequência das consultas impede uma resposta antiga de substituir uma mais recente.
- `pages` contém listas de fichas/caixa, produtos, usuários e atividades.
- `components` contém mapa de mesas, pedido, pagamento e campos reutilizáveis.
- `components/forms/OperationModal.jsx` contém os formulários de operações e a conferência de versão da ficha.
- `lib/format.js` reúne formatação e rótulos de apresentação.
- `electron` mantém conexão TCP, token, ponte IPC restrita e exportação em disco.

## Contratos compartilhados

`packages/shared/contracts.js` define os formatos Zod; `commands.cjs` define operações de escrita e permissões exigidas, também usado para limitar IPC no Electron. Dinheiro continua em centavos e peso em gramas inteiras, com entrada em kg. CSS, estados, nomes de ações e tabelas MySQL permanecem compatíveis.

## Manutenção dos registros

`scripts/reset-orders.mjs` exige o servidor parado e a opção explícita `--confirm-reset-fichas`. Ele reserva a porta TCP durante a manutenção, cria backup JSON com hash SHA-256 e verifica a gravação antes de apagar qualquer registro.

A limpeza libera as mesas e remove fichas, itens, pagamentos/XMLs, auditoria e recibos relacionados. Usuários, senhas, produtos, preços, quantidade de mesas e registros não relacionados são preservados e conferidos por comparação. O contador das fichas é reiniciado após o commit; MySQL executa ALTER TABLE fora da transação.

Os arquivos em `backups/` são dados locais, ignorados pelo Git e excluídos do instalador. O backup contém IDs e datas originais e permite recuperar fichas, itens, pagamentos e vínculos das mesas. Para recuperação, com o servidor parado, restaure primeiro fichas, depois itens/pagamentos, depois `activeTabId` das mesas e os registros de auditoria/recibos. Confira o hash e os cadastros referenciados antes de importar. Não sobrescreva novos atendimentos ao restaurar.

## Validação

`npm test`: regras, arredondamento, protocolo e configuração. `npm run test:integration`: transações MySQL com clientes TCP diferentes, permissões, idempotência, concorrência e XML. `npm run test:ui`: teste Electron com fixture em memória, incluindo navegação, formulários, pesos e pagamento. Os testes de integração devem preceder a limpeza final para não avançar a numeração zerada.
