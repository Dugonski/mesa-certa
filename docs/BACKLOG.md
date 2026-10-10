# MesaCerta — roteiro da primeira versão

## Implementado

- [x] Aplicação Electron + React em JavaScript, visual claro e navegação por perfil.
- [x] Servidor Node.js TCP com JSON delimitado por nova linha.
- [x] Modelo Prisma/MySQL e migração inicial versionada.
- [x] Login, senhas com hash e sessões com expiração.
- [x] Administrador, atendente e caixa, com autorização no servidor.
- [x] Cadastro e edição de produtos; criação de usuários.
- [x] Abertura de fichas e lançamento de produtos com quantidade e observações.
- [x] Grade de 30 mesas fixas, com estados livre, ocupada e paga.
- [x] Seleção de produto com botão Adicionar, quantidade/peso e observação opcional.
- [x] Buffet por kg, quantidade manual em kg, valores preservados no pedido e XML.
- [x] Caixa abre mesas, lança, edita, remove e recebe; atendente lança e edita sem receber.
- [x] Edição e remoção antes do pagamento, com auditoria e controle de concorrência.
- [x] Administrador gerencia a quantidade de mesas sem apagar histórico ou desativar mesas ocupadas.
- [x] Interface simplificada: navegação superior, catálogo por categoria, pedido e total visíveis.
- [x] Fechamento libera a mesa; novo atendimento preserva o histórico anterior.
- [x] Fichas preexistentes preservadas sem atribuição automática a mesas físicas.
- [x] Aviso de atualização entre terminais e nova consulta ao servidor.
- [x] Conferência, escolha Pix/cartão e registro de pagamento no protótipo.
- [x] XML de pré-autorização NFC-e 4.00 em homologação, persistido com o pagamento e exportado em arquivo.
- [x] Encerramento e consulta ao histórico recente.
- [x] Auditoria das operações concluídas.
- [x] Transações, controle por versão, restrição de pagamento único e recibos de comandos.
- [x] Instalador Windows gerado.
- [x] Arquitetura modular: contratos compartilhados, autenticação, operações, transações e XML separados; páginas, hook de estado e formulários extraídos da interface.
- [x] Rotina offline de limpeza de fichas com backup verificado e preservação dos cadastros.

## Validação

- [x] Compilação da interface e validação do schema Prisma.
- [x] Onze testes unitários de domínio, peso, catálogo, protocolo TCP e configuração.
- [x] Teste visual no Electron em desenvolvimento e no executável Windows empacotado: login, abertura, lançamento, pagamento Pix, encerramento e histórico.
- [x] Capturas de tela revisadas. Os testes visuais usam um servidor de fixtures, sem banco real.
- [x] Auditoria npm sem vulnerabilidades após atualização do Electron, Prisma e dependência transitiva de configuração.
- [x] Configuração da conexão MySQL e senhas iniciais pelo usuário no `.env`.
- [x] Execução da migração e do seed no banco configurado.
- [x] Teste de integração MySQL com múltiplas conexões TCP e comandos concorrentes: aprovado no banco local.
- [x] Reserva simultânea da mesma mesa, liberação e reabertura testadas com MySQL.
- [ ] Validação em dois computadores físicos da rede do restaurante.

## Depois da demonstração — decisões a combinar

1. Cancelamento de fichas e regras adicionais de justificativa.
2. Administração de usuários existentes, recuperação de senha e desativação.
3. Paginação completa, filtros de histórico e auditoria.
4. TLS, reconexão, distribuição do servidor, backups e atualização do aplicativo.
5. Integração com balança.
6. Requisitos fiscais, provedor de emissão e homologação, quando entrarem no escopo.

Não há cozinha, cobrança real ou emissão fiscal nesta entrega. O fluxo com persistência foi validado no MySQL local; resta a validação em computadores físicos distintos na rede do restaurante.
