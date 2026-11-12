import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Logo } from '@/components/brand/Logo';
import { BRAND, FOREST_GRADIENT } from '@/theme/brand';
import { platformLegal, RETENTION } from '@/lib/legal';

export const metadata = { title: 'Política de Privacidade' };

function H({ children }: { children: React.ReactNode }) {
  return <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1.5 }}>{children}</Typography>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ mb: 1.5, lineHeight: 1.7 }}>{children}</Typography>;
}

export default function PrivacyPage() {
  const legal = platformLegal();
  const contact = legal.privacyEmail ? <a href={`mailto:${legal.privacyEmail}`} style={{ color: 'inherit', fontWeight: 700 }}>{legal.privacyEmail}</a> : 'o canal informado pela sua produtora';
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box sx={{ background: FOREST_GRADIENT, color: BRAND.cream, px: { xs: 3, md: 6 }, py: 4 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Logo color={BRAND.cream} />
          <Box component={Link} href="/login" sx={{ color: BRAND.lime, fontWeight: 700, textDecoration: 'none' }}>Entrar →</Box>
        </Box>
        <Box sx={{ maxWidth: 860, mx: 'auto', mt: 4 }}>
          <Typography variant="h2" component="h1">Política de Privacidade</Typography>
          <Typography sx={{ mt: 1, opacity: 0.85 }}>Como o {legal.name} trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Última atualização: {legal.updatedAt}.</Typography>
        </Box>
      </Box>

      <Box component="main" sx={{ maxWidth: 860, mx: 'auto', px: { xs: 3, md: 6 }, py: 5 }}>
        <H>1. Quem é responsável</H>
        <P>
          O {legal.name}{legal.document ? ` (CNPJ ${legal.document})` : ''} é um sistema de gestão para produtoras de shows. Para os dados que cada produtora
          cadastra (artistas, integrantes, contratantes, shows e financeiro), <b>a produtora é a controladora</b> e decide como esses dados são usados;
          o {legal.name} atua como <b>operador</b>, tratando-os apenas para prestar o serviço. Para os dados de cadastro e acesso dos usuários
          e para o site público, o {legal.name} é o controlador.
        </P>

        <H>2. Quais dados tratamos</H>
        <P><b>Usuários do sistema:</b> nome, e-mail, telefone (opcional), senha (guardada apenas como hash irreversível), papel na produtora e registros de uso (o que foi criado, alterado ou consultado, e quando).</P>
        <P><b>Dados cadastrados pelas produtoras:</b> artistas (dados públicos de divulgação); integrantes e equipe técnica (nome, função, contato e, para logística, RG, CPF e data de nascimento, guardados criptografados e visíveis só para a administração; preferências alimentares); contratantes (nome, casa, cidade, telefone, e-mail e redes); shows, contratos, horários, vendas de ingressos e lançamentos financeiros.</P>
        <P><b>Pedido de demonstração:</b> nome, produtora, cidade e contato que você digita. Esses dados não ficam guardados no sistema: são enviados direto pelo WhatsApp ou e-mail que você escolher, apenas para responder ao seu pedido.</P>

        <H>3. Para que usamos e com qual base legal</H>
        <P>• <b>Prestar o serviço contratado pela produtora</b> (agenda, logística, financeiro, documentos de produção): execução de contrato e procedimentos preliminares (art. 7º, V).</P>
        <P>• <b>Segurança, prevenção a fraudes e registro de operações</b> (logs de acesso, bloqueio de tentativas de login): legítimo interesse e cumprimento de obrigação legal (art. 7º, II e IX; Marco Civil da Internet, art. 15).</P>
        <P>• <b>Documentos de integrantes para viagens e hospedagem</b>: execução de contrato e exercício regular de direitos (art. 7º, V e VI), com acesso restrito e registrado.</P>
        <P>• <b>Integração com IA (Claude)</b>: só funciona se um(a) sócio(a) da produtora ativar e cada pessoa gerar a própria chave, após aviso específico.</P>
        <P>• <b>Responder pedidos de demonstração</b>: consentimento (art. 7º, I), que você pode retirar a qualquer momento.</P>

        <H>4. Com quem compartilhamos</H>
        <P>Não vendemos dados. Compartilhamos apenas com fornecedores necessários ao funcionamento, que tratam os dados em nosso nome: <b>hospedagem da aplicação</b> (Vercel) e <b>banco de dados</b> (Neon). Quando a produtora ativa a integração com IA, os dados consultados pelo Claude são enviados à <b>Anthropic</b> para gerar as respostas. Os mapas usam o OpenStreetMap e o roteador OSRM, que recebem apenas coordenadas de cidades (e, como qualquer site, o endereço IP do seu navegador ao carregar o mapa).</P>

        <H>5. Transferência internacional</H>
        <P>Esses fornecedores podem processar dados fora do Brasil, principalmente nos Estados Unidos. A transferência ocorre para a execução do contrato e com fornecedores que adotam cláusulas contratuais e medidas de segurança compatíveis com a LGPD (art. 33).</P>

        <H>6. Por quanto tempo guardamos</H>
        <P>Dados da produtora: enquanto o contrato estiver ativo, ou até a produtora excluí-los; depois, pelo prazo exigido por lei (por exemplo, fiscal). Registros de atividade: {RETENTION.activityMonths} meses. Registro de uso da integração com IA: {RETENTION.mcpLogDays} dias. Tentativas de login: {RETENTION.loginAttemptDays} dias. Esses registros antigos são apagados automaticamente.</P>

        <H>7. Como protegemos</H>
        <P>Conexão sempre criptografada (HTTPS); RG e CPF criptografados no banco (AES-256); senhas com hash bcrypt; acesso por papel (sócio, administração, produção, leitura), com cada produtora isolada das demais; registro de quem visualizou documentos; bloqueio após tentativas de login em sequência; chaves de integração guardadas apenas como hash, com validade e revogação.</P>

        <H>8. Seus direitos</H>
        <P>Você pode pedir: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre compartilhamentos; e revogação de consentimento (art. 18). Usuários podem baixar os próprios dados e excluir a conta em <i>Configurações → Meus dados</i>. Se você é integrante de banda ou contratante, faça o pedido à produtora com quem se relaciona (ela é a controladora) ou ao nosso canal abaixo, e encaminharemos. Respondemos em até 15 dias.</P>

        <H>9. Cookies</H>
        <P>Usamos apenas um cookie essencial de sessão (para manter você conectado) e guardamos no seu navegador a preferência de tema claro ou escuro. Não usamos cookies de publicidade nem ferramentas de rastreamento.</P>

        <H>10. Encarregado(a) e contato</H>
        <P>{legal.dpoName ? <>Encarregado(a) pelo tratamento de dados: <b>{legal.dpoName}</b>. </> : null}Dúvidas, pedidos ou incidentes de privacidade: {contact}. Cada produtora também informa seu(sua) encarregado(a) no sistema. Você também pode recorrer à Autoridade Nacional de Proteção de Dados (ANPD).</P>

        <H>11. Mudanças nesta política</H>
        <P>Podemos atualizar este texto para refletir mudanças no serviço ou na lei. A data no topo indica a versão vigente; mudanças relevantes serão avisadas no sistema.</P>
      </Box>
    </Box>
  );
}
