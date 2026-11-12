# Greenwaves OS — conformidade com a LGPD

Resumo de como o sistema atende à Lei 13.709/2018. **Não substitui orientação jurídica**: revise com o jurídico/encarregado(a) antes de comercializar.

## Papéis
| Quem | Papel | Sobre quais dados |
| --- | --- | --- |
| Cada produtora cliente | **Controladora** | Artistas, integrantes, contratantes, shows, financeiro que ela cadastra |
| Empresa que opera o Greenwaves OS | **Operadora** dos dados acima; **controladora** dos dados de conta/acesso e do site | Usuários, logs, pedidos de demo |
| Vercel (hospedagem), Neon (banco) | Suboperadores | Todos (infraestrutura) |
| Anthropic | Suboperadora, **só se a produtora ativar** a integração com IA | O que o Claude consultar |
| OpenStreetMap / OSRM | Terceiros | Só coordenadas de cidades e IP do navegador (mapas) |

> Feche um **contrato de tratamento de dados (DPA)** com cada produtora cliente e confirme os termos/DPA de Vercel, Neon e Anthropic (transferência internacional, art. 33).

## Inventário de dados
| Dado | Titular | Finalidade | Base legal (art. 7º) | Proteção |
| --- | --- | --- | --- | --- |
| Nome, e-mail, senha (hash), papel | Usuário | Acesso ao sistema | V (contrato) | bcrypt, sessão httpOnly, bloqueio de força bruta |
| Nome, função, telefone, e-mail | Integrante | Logística de shows | V | Isolamento por produtora, RBAC |
| RG, CPF, nascimento | Integrante | Passagens, hospedagem, listas | V e VI | **AES-256-GCM no banco**; só administração; visualização registrada; fora do conector de IA |
| Preferências/restrições | Integrante | Alimentação/camarim | V (orientar a não registrar diagnósticos; dado sensível, art. 11) | Só produção+; fora do conector de IA |
| Nome, casa, telefone, e-mail, redes | Contratante | Booking e contratos | V e IX | Contato só em consulta individual no conector de IA |
| Contato no dia | Contato da casa | Operação do show | V | — |
| Logs de atividade e de IA | Usuário | Segurança e prestação de contas | II e IX | Retenção 24 meses / 180 dias |
| Pedido de demo | Interessado | Responder o pedido | I (consentimento) | Não armazenado no sistema |

## Medidas implementadas
- **Segurança (art. 46):** HTTPS + HSTS; cabeçalhos de segurança; RG/CPF cifrados; senhas bcrypt; RBAC (sócio, administração, produção, leitura); isolamento multi-tenant; bloqueio após 8 falhas de login em 15 min; chaves de IA com hash, validade e revogação; documentos impressos sem cache e marcados como restritos.
- **Minimização (art. 6º, III):** documentos mascarados na tela (revelação sob demanda e registrada); conector de IA não envia RG/CPF/nascimento/restrições; seed versionado sem dados pessoais; planilha importada não é armazenada.
- **Registro das operações (art. 37):** `Activity` (quem fez o quê) e `McpAuditLog` (uso da IA, marcando acesso a dado pessoal).
- **Retenção (arts. 15–16):** limpeza automática — atividade 24 meses, IA 180 dias, tentativas de login 30 dias (`src/lib/retention.ts`).
- **Direitos dos titulares (art. 18):** Configurações → Privacidade e LGPD: busca do titular, exportação em JSON (acesso/portabilidade) e anonimização; usuários baixam os próprios dados e excluem a conta.
- **Transparência:** Política de Privacidade pública em `/privacidade`, links no login, na demo e no sistema; aceite no formulário de demo; aviso específico e aceite de sócio(a) para a integração com IA.
- **Encarregado(a) (art. 41):** por produtora (Configurações) e da plataforma (variáveis de ambiente).

## Configuração em produção
| Variável | Para quê |
| --- | --- |
| `PLATFORM_LEGAL_NAME`, `PLATFORM_CNPJ` | Identificação na Política de Privacidade |
| `PRIVACY_EMAIL`, `PLATFORM_DPO_NAME` | Canal de privacidade e encarregado(a) da plataforma |
| `DATA_ENCRYPTION_KEY` | Chave da criptografia de RG/CPF (se ausente, deriva de `AUTH_SECRET`). **Não troque depois de usar** sem migrar os dados |
| `APP_URL` | URL pública usada nos links do conector |

Depois do deploy, rode uma vez `npm run lgpd:encrypt` (com o `DATABASE_URL` de produção) para cifrar documentos gravados antes desta versão.

## Incidente de segurança (art. 48)
1. Conter: revogar chaves (desativar a integração com IA revoga todas), trocar `AUTH_SECRET` (derruba sessões) e senhas afetadas.
2. Avaliar: quais titulares/dados foram afetados (use `Activity` e `McpAuditLog`).
3. Comunicar a ANPD e os titulares em prazo razoável (referência da ANPD: 3 dias úteis) quando houver risco ou dano relevante; avisar as produtoras controladoras.
4. Registrar o incidente e as medidas tomadas.
